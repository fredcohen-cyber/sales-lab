import { Router } from 'express';
import { z } from 'zod';
import { HttpError, notFound, parseBody, route } from '../lib/errors.js';
import { audit } from '../lib/audit.js';
import { clientIp, requireManager } from '../auth/middleware.js';
import { isUuid } from '../practice/routes.js';
import { isValidDateString, nyDate } from '../lib/time.js';
import { DIMENSION_KEYS, stageLabel } from '../domain.js';

const level = z.number().int().min(1).max(5);
const itemSchema = z.object({
  drillId: z.string().uuid(),
  persona: z.string().max(60),
  difficulty: level,
  skepticism: level,
  depth: level,
});
const dueDate = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || isValidDateString(v), { message: 'Use a valid due date.' });

// Load assignments with their items, item states, and the latest attempt on each item.
export async function loadAssignments(q, { learnerId = null, status = null, assignmentId = null } = {}) {
  const params = [];
  const where = [];
  if (learnerId) {
    params.push(learnerId);
    where.push(`a.learner_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`a.status = $${params.length}`);
  }
  if (assignmentId) {
    params.push(assignmentId);
    where.push(`a.id = $${params.length}`);
  }
  const assignments = await q.many(
    `SELECT a.*, u.name AS learner_name, u.role AS learner_role, b.name AS assigned_by_name, p.name AS path_name
       FROM assignments a JOIN users u ON u.id = a.learner_id JOIN users b ON b.id = a.assigned_by
       LEFT JOIN learning_paths p ON p.id = a.path_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY (a.status = 'active') DESC, a.due_date NULLS LAST, a.assigned_at DESC`,
    params,
  );
  if (assignments.length === 0) return [];
  const items = await q.many(
    `SELECT i.*, v.title, v.stage, v.brand, p.label AS persona_label,
            la.id AS last_attempt_id, la.submitted_at AS last_attempt_at, lr.status AS last_run_status,
            le.overall_score AS last_score, le.review_status AS last_review_status,
            ce.overall_score AS completed_score, ce.meets_target AS completed_meets_target, ce.review_status AS completed_review_status
       FROM assignment_items i
       JOIN drill_versions v ON v.id = i.drill_version_id
       LEFT JOIN personas p ON p.key = i.persona
       LEFT JOIN LATERAL (SELECT * FROM attempts x WHERE x.assignment_item_id = i.id ORDER BY x.submitted_at DESC LIMIT 1) la ON true
       LEFT JOIN evaluation_runs lr ON lr.id = la.latest_run_id
       LEFT JOIN evaluations le ON le.id = la.evaluation_id
       LEFT JOIN attempts ca ON ca.id = i.completed_attempt_id
       LEFT JOIN evaluations ce ON ce.id = ca.evaluation_id
      WHERE i.assignment_id = ANY($1::uuid[])
      ORDER BY i.assignment_id, i.position`,
    [assignments.map((a) => a.id)],
  );
  const today = nyDate();
  return assignments.map((a) => {
    const own = items.filter((i) => i.assignment_id === a.id);
    let blocked = false;
    const shaped = own.map((i) => {
      let state;
      if (i.completed_at) state = 'completed';
      else if (a.status !== 'active') state = 'closed';
      else if (blocked) state = 'locked';
      else state = 'available';
      if (!i.completed_at) blocked = true;
      return {
        id: i.id,
        position: i.position,
        drillId: i.drill_id,
        drillVersionId: i.drill_version_id,
        title: i.title,
        stage: i.stage,
        stageLabel: stageLabel(i.stage),
        brand: i.brand,
        persona: i.persona,
        personaLabel: i.persona_label,
        settings: { difficulty: i.difficulty, skepticism: i.skepticism, depth: i.depth },
        state,
        completedAt: i.completed_at,
        completedAttemptId: i.completed_attempt_id,
        proficiency:
          i.completed_at && i.completed_review_status !== 'disputed'
            ? { score: i.completed_score, metTarget: i.completed_meets_target, reviewStatus: i.completed_review_status }
            : null,
        lastAttempt: i.last_attempt_id
          ? { id: i.last_attempt_id, at: i.last_attempt_at, runStatus: i.last_run_status, score: i.last_score, reviewStatus: i.last_review_status }
          : null,
      };
    });
    const done = shaped.filter((i) => i.state === 'completed').length;
    return {
      id: a.id,
      learnerId: a.learner_id,
      learnerName: a.learner_name,
      learnerRole: a.learner_role,
      title: a.title,
      note: a.note,
      kind: a.kind,
      targetDimension: a.target_dimension,
      pathName: a.path_name,
      dueDate: a.due_date,
      status: a.status,
      overdue: a.status === 'active' && a.due_date !== null && a.due_date < today,
      assignedAt: a.assigned_at,
      assignedByName: a.assigned_by_name,
      completedAt: a.completed_at,
      cancelledAt: a.cancelled_at,
      cancelReason: a.cancel_reason,
      progress: { done, total: shaped.length },
      items: shaped,
    };
  });
}

export function curriculumRoutes({ db }) {
  const r = Router();

  // The signed-in learner's curriculum: next exercise, upcoming, overdue, completed.
  r.get(
    '/curriculum/mine',
    route(async (req, res) => {
      res.set('Cache-Control', 'no-store');
      const all = await loadAssignments(db, { learnerId: req.user.id });
      const active = all.filter((a) => a.status === 'active');
      const next =
        active
          .slice()
          .sort((x, y) => (x.dueDate || '9999-12-31').localeCompare(y.dueDate || '9999-12-31'))
          .flatMap((a) => a.items.filter((i) => i.state === 'available').map((i) => ({ ...i, assignmentId: a.id, assignmentTitle: a.title, dueDate: a.dueDate, overdue: a.overdue })))[0] || null;
      res.json({
        next,
        active,
        overdue: active.filter((a) => a.overdue),
        completed: all.filter((a) => a.status === 'completed'),
        cancelled: all.filter((a) => a.status === 'cancelled'),
        today: nyDate(),
      });
    }),
  );

  // ------------------------------------------------------------ manager
  r.get(
    '/assignments',
    requireManager,
    route(async (req, res) => {
      const learnerId = isUuid(req.query.learnerId) ? req.query.learnerId : null;
      const status = ['active', 'completed', 'cancelled'].includes(req.query.status) ? req.query.status : null;
      res.json({ assignments: await loadAssignments(db, { learnerId, status }), today: nyDate() });
    }),
  );

  const assignSchema = z.object({
    learnerIds: z.array(z.string().uuid()).min(1, 'Choose at least one rep.').max(50),
    title: z.string().trim().min(2, 'Add a title.').max(140),
    note: z.string().max(2000).default(''),
    dueDate,
    pathId: z.string().uuid().optional().nullable(),
    kind: z.enum(['curriculum', 'targeted']).default('curriculum'),
    targetDimension: z.enum(DIMENSION_KEYS).optional().nullable(),
    items: z.array(itemSchema).min(1, 'Add at least one drill.').max(40),
  });

  r.post(
    '/assignments',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(assignSchema, req.body);
      const ids = await db.tx(async (q) => {
        const learners = await q.many(`SELECT id, role, status FROM users WHERE id = ANY($1::uuid[])`, [body.learnerIds]);
        if (learners.length !== new Set(body.learnerIds).size) throw new HttpError(400, 'validation_failed', 'One of the selected people was not found.');
        if (learners.some((l) => l.status !== 'active')) throw new HttpError(400, 'validation_failed', 'Assignments can only go to active accounts.');
        const resolved = [];
        for (const it of body.items) {
          const d = await q.one(
            `SELECT d.id, d.status, v.id AS version_id, v.personas, v.title FROM drills d JOIN drill_versions v ON v.id = d.current_version_id WHERE d.id = $1`,
            [it.drillId],
          );
          if (!d || d.status !== 'active') throw new HttpError(400, 'validation_failed', 'Only active drills can be assigned.');
          if (!d.personas.includes(it.persona)) throw new HttpError(400, 'validation_failed', `“${d.title}” does not include that buyer persona.`);
          resolved.push({ ...it, versionId: d.version_id });
        }
        const created = [];
        for (const learnerId of new Set(body.learnerIds)) {
          const a = await q.one(
            `INSERT INTO assignments (learner_id, title, note, path_id, kind, target_dimension, due_date, assigned_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
            [learnerId, body.title, body.note, body.pathId || null, body.kind, body.targetDimension || null, body.dueDate || null, req.user.id],
          );
          let pos = 1;
          for (const it of resolved) {
            await q.query(
              `INSERT INTO assignment_items (assignment_id, position, drill_id, drill_version_id, persona, difficulty, skepticism, depth)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [a.id, pos++, it.drillId, it.versionId, it.persona, it.difficulty, it.skepticism, it.depth],
            );
          }
          await audit(q, {
            actorId: req.user.id,
            action: 'assignment.created',
            targetUserId: learnerId,
            entityType: 'assignment',
            entityId: a.id,
            details: { title: body.title, items: resolved.length, dueDate: body.dueDate || null, kind: body.kind },
            ip: clientIp(req),
          });
          created.push(a.id);
        }
        return created;
      });
      res.status(201).json({ ids });
    }),
  );

  const cancelSchema = z.object({ reason: z.string().trim().max(500).default('') });
  r.post(
    '/assignments/:id/cancel',
    requireManager,
    route(async (req, res) => {
      if (!isUuid(req.params.id)) throw notFound('That assignment was not found.');
      const { reason } = parseBody(cancelSchema, req.body);
      await db.tx(async (q) => {
        const a = await q.one(`SELECT * FROM assignments WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!a) throw notFound('That assignment was not found.');
        if (a.status !== 'active') throw new HttpError(409, 'not_active', 'Only active assignments can be cancelled.');
        await q.query(`UPDATE assignments SET status = 'cancelled', cancelled_at = now(), cancelled_by = $2, cancel_reason = $3 WHERE id = $1`, [
          a.id,
          req.user.id,
          reason || null,
        ]);
        await audit(q, { actorId: req.user.id, action: 'assignment.cancelled', targetUserId: a.learner_id, entityType: 'assignment', entityId: a.id, details: { reason: reason || null }, ip: clientIp(req) });
      });
      res.json({ ok: true });
    }),
  );

  // ------------------------------------------------------------ learning paths
  r.get(
    '/paths',
    requireManager,
    route(async (_req, res) => {
      const paths = await db.many(`SELECT * FROM learning_paths WHERE status = 'active' ORDER BY name`);
      const drills = await db.many(`SELECT d.id, d.status, v.title, v.personas FROM drills d JOIN drill_versions v ON v.id = d.current_version_id`);
      const byId = new Map(drills.map((d) => [d.id, d]));
      res.json({
        paths: paths.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          audience: p.audience,
          items: p.items.map((it) => ({ ...it, title: byId.get(it.drillId)?.title || 'Missing drill', drillStatus: byId.get(it.drillId)?.status || 'missing' })),
          updatedAt: p.updated_at,
        })),
      });
    }),
  );

  const pathSchema = z.object({
    name: z.string().trim().min(2).max(140),
    description: z.string().max(2000).default(''),
    audience: z.enum(['new_hire_ae', 'experienced_ae', 'am', 'all']).default('all'),
    items: z.array(itemSchema).min(1, 'Add at least one drill.').max(40),
  });
  r.post(
    '/paths',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(pathSchema, req.body);
      const row = await db.one(
        `INSERT INTO learning_paths (name, description, audience, items, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [body.name, body.description, body.audience, JSON.stringify(body.items), req.user.id],
      );
      await audit(db, { actorId: req.user.id, action: 'path.created', entityType: 'learning_path', entityId: row.id, details: { name: body.name }, ip: clientIp(req) });
      res.status(201).json({ id: row.id });
    }),
  );
  r.put(
    '/paths/:id',
    requireManager,
    route(async (req, res) => {
      if (!isUuid(req.params.id)) throw notFound('That learning path was not found.');
      const body = parseBody(pathSchema, req.body);
      const row = await db.one(
        `UPDATE learning_paths SET name = $2, description = $3, audience = $4, items = $5, updated_at = now() WHERE id = $1 RETURNING id`,
        [req.params.id, body.name, body.description, body.audience, JSON.stringify(body.items)],
      );
      if (!row) throw notFound('That learning path was not found.');
      await audit(db, { actorId: req.user.id, action: 'path.updated', entityType: 'learning_path', entityId: row.id, details: { name: body.name }, ip: clientIp(req) });
      res.json({ id: row.id });
    }),
  );

  return r;
}
