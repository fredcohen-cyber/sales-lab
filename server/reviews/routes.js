import { Router } from 'express';
import { z } from 'zod';
import { HttpError, notFound, parseBody, route } from '../lib/errors.js';
import { audit } from '../lib/audit.js';
import { clientIp, requireManager } from '../auth/middleware.js';
import { isUuid } from '../practice/routes.js';
import { applyReviewDecisions } from '../ai/scoring.js';

const CF_TYPES = ['invented_capability', 'contradicts_approved_fact', 'unauthorized_guarantee'];
const LIVE_CF = `EXISTS (SELECT 1 FROM jsonb_array_elements(e.critical_failures) c WHERE c->>'status' IN ('pending', 'confirmed'))`;

export function reviewRoutes({ db }) {
  const r = Router();
  // Mounted at the API root, so every route here checks the manager role itself.

  // Queue of evaluations that need a manager's attention, newest first.
  r.get(
    '/reviews',
    requireManager,
    route(async (req, res) => {
      const filter = String(req.query.filter || 'pending');
      const params = [];
      const where = [];
      if (filter === 'pending') where.push(`e.review_status = 'provisional'`);
      else if (filter === 'disputed') where.push(`e.review_status = 'disputed'`);
      else if (filter === 'critical') where.push(LIVE_CF);
      else if (filter === 'reviewed') where.push(`e.reviewed_at IS NOT NULL`);
      if (isUuid(req.query.learnerId)) {
        params.push(req.query.learnerId);
        where.push(`a.learner_id = $${params.length}`);
      }
      const rows = await db.many(
        `SELECT a.id AS attempt_id, a.learner_id, u.name AS learner_name, a.learner_role, a.scenario->>'title' AS drill_title,
                a.scenario->>'stageLabel' AS stage_label, a.brand, a.scenario->'persona'->>'label' AS persona_label, a.difficulty,
                a.attempt_number, a.coached_number, a.mode, a.submitted_at, a.turn_number, a.replies_planned,
                e.id AS evaluation_id, e.overall_score, e.weighted_score, e.review_status,
                (SELECT count(*) FROM jsonb_array_elements(e.critical_failures) c WHERE c->>'status' IN ('pending', 'confirmed')) AS critical_count,
                (SELECT count(*) FROM jsonb_array_elements(e.critical_failures) c WHERE c->>'status' = 'pending') AS pending_critical_count,
                (SELECT count(*) FROM jsonb_array_elements(e.review_flags) f WHERE f->>'status' = 'open') AS flag_count,
                e.reviewed_at, rv.name AS reviewed_by_name,
                (SELECT count(*) FROM coaching_notes n WHERE n.attempt_id = a.id) AS note_count
           FROM evaluations e
           JOIN attempts a ON a.id = e.attempt_id
           JOIN users u ON u.id = a.learner_id
           LEFT JOIN users rv ON rv.id = e.reviewed_by
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY a.submitted_at DESC LIMIT 200`,
        params,
      );
      const counts = await db.one(
        `SELECT count(*) FILTER (WHERE review_status = 'provisional') AS pending,
                count(*) FILTER (WHERE review_status = 'disputed') AS disputed,
                count(*) FILTER (WHERE ${LIVE_CF}) AS critical
           FROM evaluations e`,
      );
      res.json({ items: rows, counts });
    }),
  );

  const decisionSchema = z.object({ note: z.string().trim().max(2000).default('') });
  const disputeSchema = z.object({ note: z.string().trim().min(3, 'Say briefly why you are disputing this evaluation.').max(2000) });
  const idKey = z.string().regex(/^(cf|f)\d{1,3}$/);
  const reviewSchema = z.object({
    criticalFailures: z.record(idKey, z.enum(['confirm', 'reject'])).default({}),
    flags: z.record(idKey, z.enum(['dismiss', 'critical'])).default({}),
    flagTypes: z.record(idKey, z.enum(CF_TYPES)).default({}),
    added: z
      .array(
        z.object({
          type: z.enum(CF_TYPES),
          claimQuote: z.string().trim().min(3, 'Quote the words from the answer.').max(600),
          explanation: z.string().trim().min(3, 'Explain the critical failure.').max(1200),
        }),
      )
      .max(5)
      .default([]),
    note: z.string().trim().max(2000).default(''),
  });

  const OPEN_CF = ['pending', 'set_aside'];
  const OPEN_FLAG = ['open', 'set_aside'];
  const unresolvedCount = (ev) =>
    (ev.critical_failures || []).filter((c) => OPEN_CF.includes(c.status)).length + (ev.review_flags || []).filter((f) => OPEN_FLAG.includes(f.status)).length;

  async function loadForReview(q, id) {
    if (!isUuid(id)) throw notFound('That evaluation was not found.');
    const ev = await q.one(`SELECT * FROM evaluations WHERE id = $1 FOR UPDATE`, [id]);
    if (!ev) throw notFound('That evaluation was not found.');
    const attempt = await q.one(`SELECT id, learner_id, answer FROM attempts WHERE id = $1`, [ev.attempt_id]);
    return { ev, attempt };
  }

  const historyEntry = (req, action, extra = {}) => JSON.stringify([{ at: new Date().toISOString(), by: req.user.name, byId: req.user.id, action, ...extra }]);

  // Confirm as scored. Only for evaluations with nothing left to decide; flagged ones go through /review.
  r.post(
    '/evaluations/:id/confirm',
    requireManager,
    route(async (req, res) => {
      const { note } = parseBody(decisionSchema, req.body);
      await db.tx(async (q) => {
        const { ev, attempt } = await loadForReview(q, req.params.id);
        if (ev.review_status === 'confirmed') throw new HttpError(409, 'unchanged', 'This evaluation is already confirmed.');
        if (unresolvedCount(ev) > 0) {
          throw new HttpError(409, 'needs_decisions', 'This evaluation has flagged items. Decide each one in the review before confirming.');
        }
        await q.query(
          `UPDATE evaluations SET review_status = 'confirmed', reviewed_by = $2, reviewed_at = now(), review_note = $3,
                  review_history = review_history || $4::jsonb
            WHERE id = $1`,
          [ev.id, req.user.id, note || null, historyEntry(req, 'confirmed', { from: ev.review_status, note: note || null })],
        );
        await audit(q, {
          actorId: req.user.id,
          action: 'evaluation.confirmed',
          targetUserId: attempt.learner_id,
          entityType: 'evaluation',
          entityId: ev.id,
          details: { from: ev.review_status, to: 'confirmed', note: note || null },
          ip: clientIp(req),
        });
      });
      res.json({ ok: true });
    }),
  );

  r.post(
    '/evaluations/:id/dispute',
    requireManager,
    route(async (req, res) => {
      const { note } = parseBody(disputeSchema, req.body);
      await db.tx(async (q) => {
        const { ev, attempt } = await loadForReview(q, req.params.id);
        if (ev.review_status === 'disputed') throw new HttpError(409, 'unchanged', 'This evaluation is already disputed.');
        // A disputed evaluation is set aside as a whole: undecided items are no longer waiting for review,
        // and they need a fresh decision if a manager reviews the evaluation again.
        const cfs = (ev.critical_failures || []).map((c) => (c.status === 'pending' ? { ...c, status: 'set_aside' } : c));
        const flags = (ev.review_flags || []).map((f) => (f.status === 'open' ? { ...f, status: 'set_aside' } : f));
        await q.query(
          `UPDATE evaluations SET review_status = 'disputed', reviewed_by = $2, reviewed_at = now(), review_note = $3,
                  review_history = review_history || $4::jsonb, critical_failures = $5, review_flags = $6
            WHERE id = $1`,
          [ev.id, req.user.id, note, historyEntry(req, 'disputed', { from: ev.review_status, note }), JSON.stringify(cfs), JSON.stringify(flags)],
        );
        await audit(q, {
          actorId: req.user.id,
          action: 'evaluation.disputed',
          targetUserId: attempt.learner_id,
          entityType: 'evaluation',
          entityId: ev.id,
          details: { from: ev.review_status, to: 'disputed', note },
          ip: clientIp(req),
        });
      });
      res.json({ ok: true });
    }),
  );

  // Decide each critical failure and flag, optionally add one the coach missed, and confirm the result.
  r.post(
    '/evaluations/:id/review',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(reviewSchema, req.body);
      const out = await db.tx(async (q) => {
        const { ev, attempt } = await loadForReview(q, req.params.id);
        const result = applyReviewDecisions(ev, body, { answer: attempt.answer, threshold: ev.proficiency_threshold, reviewerName: req.user.name });
        if (result.problems.length) throw new HttpError(400, 'validation_failed', result.problems[0]);
        if (result.unresolved > 0) throw new HttpError(409, 'needs_decisions', 'Decide every flagged item before saving the review.');
        const summary = {
          confirmedCritical: result.criticalFailures.filter((c) => c.status === 'confirmed').length,
          rejectedCritical: result.criticalFailures.filter((c) => c.status === 'rejected').length,
          dismissedFlags: result.reviewFlags.filter((f) => f.status === 'dismissed').length,
          flagsMadeCritical: result.reviewFlags.filter((f) => f.status === 'made_critical').length,
          added: body.added.length,
        };
        await q.query(
          `UPDATE evaluations
              SET critical_failures = $2, review_flags = $3, overall_score = $4, meets_target = $5, review_status = 'confirmed',
                  reviewed_by = $6, reviewed_at = now(), review_note = $7, review_history = review_history || $8::jsonb
            WHERE id = $1`,
          [
            ev.id,
            JSON.stringify(result.criticalFailures),
            JSON.stringify(result.reviewFlags),
            result.overallScore,
            result.meetsTarget,
            req.user.id,
            body.note || null,
            historyEntry(req, 'reviewed', { from: ev.review_status, note: body.note || null, ...summary }),
          ],
        );
        await audit(q, {
          actorId: req.user.id,
          action: 'evaluation.reviewed',
          targetUserId: attempt.learner_id,
          entityType: 'evaluation',
          entityId: ev.id,
          details: { from: ev.review_status, to: 'confirmed', overallScore: result.overallScore, ...summary },
          ip: clientIp(req),
        });
        return { overallScore: result.overallScore };
      });
      res.json({ ok: true, ...out });
    }),
  );

  const noteSchema = z.object({ body: z.string().trim().min(1, 'Write a note.').max(4000) });
  r.post(
    '/attempts/:id/notes',
    requireManager,
    route(async (req, res) => {
      if (!isUuid(req.params.id)) throw notFound('That answer was not found.');
      const { body } = parseBody(noteSchema, req.body);
      const note = await db.tx(async (q) => {
        const attempt = await q.one(`SELECT id, learner_id FROM attempts WHERE id = $1`, [req.params.id]);
        if (!attempt) throw notFound('That answer was not found.');
        const n = await q.one(`INSERT INTO coaching_notes (attempt_id, author_id, body) VALUES ($1, $2, $3) RETURNING *`, [attempt.id, req.user.id, body]);
        await audit(q, { actorId: req.user.id, action: 'note.added', targetUserId: attempt.learner_id, entityType: 'attempt', entityId: attempt.id, ip: clientIp(req) });
        return n;
      });
      res.status(201).json({ note: { ...note, author_name: req.user.name } });
    }),
  );

  return r;
}
