import { Router } from 'express';
import { z } from 'zod';
import { HttpError, notFound, parseBody, route } from '../lib/errors.js';
import { audit } from '../lib/audit.js';
import { clientIp, requireManager } from '../auth/middleware.js';
import { BRANDS, DIMENSION_KEYS, STAGE_KEYS, SUBJECTS } from '../domain.js';
import { coachingAvailability, DRILL_SQL, shapeDrill, sourceIndexFor } from './service.js';

const level = z.number().int().min(1).max(5);
const drillSchema = z.object({
  title: z.string().trim().min(3, 'Add a title.').max(140),
  brand: z.enum(Object.keys(BRANDS)),
  subject: z.enum(Object.keys(SUBJECTS)),
  stage: z.enum(STAGE_KEYS),
  roles: z.array(z.enum(['ae', 'am'])).min(1, 'Choose at least one role.'),
  personas: z.array(z.string().max(60)).min(1, 'Choose at least one buyer persona.'),
  situation: z.string().trim().min(10, 'Describe the situation.').max(3000),
  buyerLine: z.string().trim().min(3, 'Add what the buyer says.').max(1500),
  personaLines: z.record(z.string().max(1500)).default({}),
  objective: z.string().trim().min(5, 'Add the objective.').max(1000),
  goodLooksLike: z.string().trim().min(5, 'Describe what a good answer does.').max(3000),
  assessedDimensions: z.array(z.enum(DIMENSION_KEYS)).min(1, 'Choose at least one scored dimension.'),
  defaults: z.object({ difficulty: level, skepticism: level, depth: level }),
  sourceRefs: z
    .array(
      z.object({
        sourceId: z.string().uuid(),
        sections: z.array(z.string().max(80)).max(40).default([]),
        // The editor says explicitly when a reference means the whole source, so a drill is never
        // widened by accident when its chosen sections disappear from a source.
        wholeSource: z.boolean().optional(),
      }),
    )
    .max(10)
    .default([]),
  changeNote: z.string().max(500).default(''),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

async function validateRefs(q, body) {
  const personas = new Set((await q.many(`SELECT key FROM personas`)).map((p) => p.key));
  if (body.personas.some((p) => !personas.has(p))) throw new HttpError(400, 'validation_failed', 'Choose personas from the list.');
  for (const key of Object.keys(body.personaLines)) {
    if (!body.personas.includes(key)) delete body.personaLines[key];
    else if (!body.personaLines[key].trim()) delete body.personaLines[key];
  }
  for (const ref of body.sourceRefs) {
    if (ref.wholeSource === false && ref.sections.length === 0) {
      throw new HttpError(400, 'validation_failed', 'Choose at least one section for each source, or use the whole source.');
    }
  }
  if (body.sourceRefs.length) {
    const ids = body.sourceRefs.map((s) => s.sourceId);
    const found = await q.many(`SELECT id, latest_version_id FROM knowledge_sources WHERE id = ANY($1::uuid[])`, [ids]);
    if (found.length !== new Set(ids).size) throw new HttpError(400, 'validation_failed', 'One of the selected sources no longer exists.');
    // The editor lists the sections of each source's latest version, so the chosen keys come from it.
    const latest = new Map(found.map((f) => [f.id, f.latest_version_id]));
    body.sourceRefs = body.sourceRefs.map((ref) => ({ sourceId: ref.sourceId, sections: ref.sections, versionId: latest.get(ref.sourceId) }));
  }
}

async function insertDrillVersion(q, drillId, body, userId) {
  const next = await q.one(`SELECT COALESCE(max(version), 0) + 1 AS v FROM drill_versions WHERE drill_id = $1`, [drillId]);
  return q.one(
    `INSERT INTO drill_versions (drill_id, version, title, brand, subject, stage, roles, personas, situation, buyer_line, persona_lines,
       objective, good_looks_like, assessed_dimensions, default_difficulty, default_skepticism, default_depth, source_refs, change_note, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id, version`,
    [
      drillId,
      next.v,
      body.title,
      body.brand,
      body.subject,
      body.stage,
      body.roles,
      body.personas,
      body.situation,
      body.buyerLine,
      JSON.stringify(body.personaLines || {}),
      body.objective,
      body.goodLooksLike,
      body.assessedDimensions,
      body.defaults.difficulty,
      body.defaults.skepticism,
      body.defaults.depth,
      JSON.stringify(body.sourceRefs || []),
      body.changeNote || '',
      userId,
    ],
  );
}

export function drillRoutes({ db, config }) {
  const r = Router();

  r.get(
    '/',
    route(async (req, res) => {
      const forManager = req.user.isManager;
      const status = forManager ? String(req.query.status || '') : 'active';
      const rows = await db.many(`${DRILL_SQL} ${status ? 'WHERE d.status = $1' : ''} ORDER BY v.title`, status ? [status] : []);
      const index = await sourceIndexFor(db, rows);
      let drills = rows.map((row) => shapeDrill(row, coachingAvailability(config, row, index), { forManager }));
      const { brand, stage, persona, role, subject } = req.query;
      drills = drills.filter(
        (d) =>
          (!brand || d.brand === brand || (brand !== 'both' && d.brand === 'both')) &&
          (!stage || d.stage === stage) &&
          (!persona || d.personas.includes(persona)) &&
          (!role || d.roles.includes(role)) &&
          (!subject || d.subject === subject),
      );
      res.json({ drills });
    }),
  );

  r.get(
    '/:id',
    route(async (req, res) => {
      const row = await db.one(`${DRILL_SQL} WHERE d.id = $1`, [req.params.id]).catch(() => null);
      if (!row || (!req.user.isManager && row.status !== 'active')) throw notFound('That drill was not found.');
      const index = await sourceIndexFor(db, [row]);
      const drill = shapeDrill(row, coachingAvailability(config, row, index), { forManager: req.user.isManager, index });
      let versions;
      if (req.user.isManager) {
        versions = await db.many(
          `SELECT v.id, v.version, v.title, v.change_note, v.created_at, u.name AS created_by_name
             FROM drill_versions v LEFT JOIN users u ON u.id = v.created_by WHERE v.drill_id = $1 ORDER BY v.version DESC`,
          [row.id],
        );
      }
      res.json({ drill, versions });
    }),
  );

  r.post(
    '/',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(drillSchema, req.body);
      const id = await db.tx(async (q) => {
        await validateRefs(q, body);
        const drill = await q.one(`INSERT INTO drills (status, created_by) VALUES ($1, $2) RETURNING id`, [body.status || 'active', req.user.id]);
        const v = await insertDrillVersion(q, drill.id, body, req.user.id);
        await q.query(`UPDATE drills SET current_version_id = $2 WHERE id = $1`, [drill.id, v.id]);
        await audit(q, { actorId: req.user.id, action: 'drill.created', entityType: 'drill', entityId: drill.id, details: { title: body.title }, ip: clientIp(req) });
        return drill.id;
      });
      res.status(201).json({ id });
    }),
  );

  r.put(
    '/:id',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(drillSchema, req.body);
      const out = await db.tx(async (q) => {
        const drill = await q.one(`SELECT * FROM drills WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!drill) throw notFound('That drill was not found.');
        await validateRefs(q, body);
        const v = await insertDrillVersion(q, drill.id, body, req.user.id);
        await q.query(`UPDATE drills SET current_version_id = $2, status = COALESCE($3, status), updated_at = now() WHERE id = $1`, [
          drill.id,
          v.id,
          body.status || null,
        ]);
        await audit(q, {
          actorId: req.user.id,
          action: 'drill.version_added',
          entityType: 'drill',
          entityId: drill.id,
          details: { version: v.version, changeNote: body.changeNote || null },
          ip: clientIp(req),
        });
        return v;
      });
      res.json({ versionId: out.id, version: out.version });
    }),
  );

  const statusSchema = z.object({ status: z.enum(['draft', 'active', 'archived']) });
  r.post(
    '/:id/status',
    requireManager,
    route(async (req, res) => {
      const { status } = parseBody(statusSchema, req.body);
      await db.tx(async (q) => {
        const drill = await q.one(`SELECT * FROM drills WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!drill) throw notFound('That drill was not found.');
        await q.query(`UPDATE drills SET status = $2, updated_at = now() WHERE id = $1`, [drill.id, status]);
        await audit(q, { actorId: req.user.id, action: 'drill.status_changed', entityType: 'drill', entityId: drill.id, details: { from: drill.status, to: status }, ip: clientIp(req) });
      });
      res.json({ ok: true });
    }),
  );

  return r;
}
