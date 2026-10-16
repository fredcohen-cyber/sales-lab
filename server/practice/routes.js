import { Router } from 'express';
import { z } from 'zod';
import { notFound, parseBody, route } from '../lib/errors.js';
import { previewOf } from './scenario.js';
import { attemptView, createAttempt, resolvePractice, retryCoaching } from './service.js';
import { scheduleEvaluation } from '../ai/evaluate.js';
import { UNAVAILABLE_TEXT } from '../drills/service.js';
import { FIT_TEXT } from '../knowledge/service.js';

const level = z.number().int().min(1).max(5).optional();
const practiceInput = {
  drillId: z.string().uuid().optional(),
  drillVersionId: z.string().uuid().optional(),
  assignmentItemId: z.string().uuid().optional(),
  persona: z.string().max(60).optional(),
  difficulty: level,
  skepticism: level,
  depth: level,
};
const previewSchema = z.object(practiceInput).refine((v) => v.drillId || v.assignmentItemId, { message: 'Choose a drill.' });
const attemptSchema = z
  .object({
    ...practiceInput,
    clientRequestId: z.string().uuid(),
    mode: z.enum(['coached', 'unscored']),
    answer: z.string().max(20_000),
  })
  .refine((v) => v.drillId || v.assignmentItemId, { message: 'Choose a drill.' });

export const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));

export function practiceRoutes({ db, config, provider, log }) {
  const r = Router();
  const ctx = { db, config, provider, log };

  r.post(
    '/preview',
    route(async (req, res) => {
      const body = parseBody(previewSchema, req.body);
      const p = await db.tx((q) => resolvePractice(q, config, req.user, body));
      res.json({
        scenario: previewOf(p.scenario),
        drill: { id: p.drill.id, versionId: p.drill.version_id, personas: p.drill.personas, status: p.drill.status },
        assigned: p.assigned
          ? { itemId: p.assigned.id, assignmentId: p.assigned.assignment_id, title: p.assigned.assignment_title, position: p.assigned.position, dueDate: p.assigned.due_date }
          : null,
        coaching: {
          available: p.coachingAvailable,
          reason: p.unavailableReason,
          message: p.unavailableReason ? UNAVAILABLE_TEXT[p.unavailableReason] : null,
        },
        // Managers also see why a source is not used and which chosen sections are missing.
        sourceDetails: req.user.isManager
          ? p.sources.map((s) => ({
              sourceId: s.sourceId,
              title: s.title || s.latestTitle,
              reason: s.reason,
              reasonText: s.reason ? FIT_TEXT[s.reason] : null,
              missingSections: s.missingSections,
            }))
          : undefined,
      });
    }),
  );

  r.post(
    '/attempts',
    route(async (req, res) => {
      const body = parseBody(attemptSchema, req.body);
      const out = await createAttempt(db, config, req.user, body, { provider });
      if (out.runId) scheduleEvaluation(ctx, out.runId);
      res.status(out.duplicate ? 200 : 201).json(await attemptView(db, config, req.user, out.attemptId));
    }),
  );

  r.get(
    '/attempts/:id',
    route(async (req, res) => {
      if (!isUuid(req.params.id)) throw notFound('That answer was not found.');
      res.set('Cache-Control', 'no-store');
      res.json(await attemptView(db, config, req.user, req.params.id));
    }),
  );

  r.post(
    '/attempts/:id/evaluate',
    route(async (req, res) => {
      if (!isUuid(req.params.id)) throw notFound('That answer was not found.');
      const out = await retryCoaching(db, config, req.user, req.params.id, { provider });
      scheduleEvaluation(ctx, out.runId);
      res.status(202).json(await attemptView(db, config, req.user, out.attemptId));
    }),
  );

  // History list. Learners only ever see their own answers.
  r.get(
    '/attempts',
    route(async (req, res) => {
      const learnerId = req.user.isManager && isUuid(req.query.learnerId) ? req.query.learnerId : req.user.isManager && req.query.learnerId === 'all' ? null : req.user.id;
      const params = [];
      const where = [];
      if (learnerId) {
        params.push(learnerId);
        where.push(`a.learner_id = $${params.length}`);
      }
      if (isUuid(req.query.drillId)) {
        params.push(req.query.drillId);
        where.push(`a.drill_id = $${params.length}`);
      }
      const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
      params.push(limit);
      const rows = await db.many(
        `SELECT a.id, a.learner_id, u.name AS learner_name, a.drill_id, a.scenario->>'title' AS drill_title, a.stage, a.brand, a.persona,
                a.scenario->'persona'->>'label' AS persona_label, a.difficulty, a.skepticism, a.depth, a.mode, a.attempt_number, a.coached_number,
                a.submitted_at, a.assignment_item_id, e.overall_score, e.review_status, e.meets_target,
                (SELECT count(*) FROM jsonb_array_elements(COALESCE(e.critical_failures, '[]'::jsonb)) c WHERE c->>'status' = 'confirmed') AS critical_count,
                r.status AS run_status
           FROM attempts a
           JOIN users u ON u.id = a.learner_id
           LEFT JOIN evaluations e ON e.id = a.evaluation_id
           LEFT JOIN evaluation_runs r ON r.id = a.latest_run_id
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY a.submitted_at DESC LIMIT $${params.length}`,
        params,
      );
      res.json({ attempts: rows });
    }),
  );

  return r;
}
