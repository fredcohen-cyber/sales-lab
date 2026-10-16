import { Router } from 'express';
import { z } from 'zod';
import { HttpError, notFound, parseBody, route } from '../lib/errors.js';
import { audit } from '../lib/audit.js';
import { clientIp, requireManager } from '../auth/middleware.js';
import { isUuid } from '../practice/routes.js';

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
      else if (filter === 'critical') where.push(`jsonb_array_length(e.critical_failures) > 0`);
      else if (filter === 'reviewed') where.push(`e.reviewed_at IS NOT NULL`);
      if (isUuid(req.query.learnerId)) {
        params.push(req.query.learnerId);
        where.push(`a.learner_id = $${params.length}`);
      }
      const rows = await db.many(
        `SELECT a.id AS attempt_id, a.learner_id, u.name AS learner_name, u.role AS learner_role, a.scenario->>'title' AS drill_title,
                a.scenario->>'stageLabel' AS stage_label, a.brand, a.scenario->'persona'->>'label' AS persona_label, a.difficulty,
                a.attempt_number, a.submitted_at, e.id AS evaluation_id, e.overall_score, e.weighted_score, e.review_status,
                jsonb_array_length(e.critical_failures) AS critical_count, jsonb_array_length(e.review_flags) AS flag_count,
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
                count(*) FILTER (WHERE jsonb_array_length(critical_failures) > 0) AS critical
           FROM evaluations`,
      );
      res.json({ items: rows, counts });
    }),
  );

  const decisionSchema = z.object({ note: z.string().trim().max(2000).default('') });
  const disputeSchema = z.object({ note: z.string().trim().min(3, 'Say briefly why you are disputing this evaluation.').max(2000) });

  async function decide(req, res, status, schema) {
    if (!isUuid(req.params.id)) throw notFound('That evaluation was not found.');
    const { note } = parseBody(schema, req.body);
    await db.tx(async (q) => {
      const ev = await q.one(`SELECT * FROM evaluations WHERE id = $1 FOR UPDATE`, [req.params.id]);
      if (!ev) throw notFound('That evaluation was not found.');
      if (ev.review_status === status) throw new HttpError(409, 'unchanged', `This evaluation is already ${status}.`);
      await q.query(`UPDATE evaluations SET review_status = $2, reviewed_by = $3, reviewed_at = now(), review_note = $4 WHERE id = $1`, [
        ev.id,
        status,
        req.user.id,
        note || null,
      ]);
      const attempt = await q.one(`SELECT learner_id FROM attempts WHERE id = $1`, [ev.attempt_id]);
      await audit(q, {
        actorId: req.user.id,
        action: status === 'confirmed' ? 'evaluation.confirmed' : 'evaluation.disputed',
        targetUserId: attempt.learner_id,
        entityType: 'evaluation',
        entityId: ev.id,
        details: { from: ev.review_status, to: status, note: note || null },
        ip: clientIp(req),
      });
    });
    res.json({ ok: true });
  }

  r.post('/evaluations/:id/confirm', requireManager, route((req, res) => decide(req, res, 'confirmed', decisionSchema)));
  r.post('/evaluations/:id/dispute', requireManager, route((req, res) => decide(req, res, 'disputed', disputeSchema)));

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
