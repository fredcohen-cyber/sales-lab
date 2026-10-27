import { Router } from 'express';
import { z } from 'zod';
import { HttpError, notFound, parseBody, route } from '../lib/errors.js';
import { audit } from '../lib/audit.js';
import { clientIp, requireManager } from '../auth/middleware.js';
import { BRANDS, DIMENSION_KEYS, MAX_PUSHBACKS, PRODUCT_LINES, STAGE_KEYS, SUBJECTS, defaultProductLine } from '../domain.js';
import { coachingAvailability, DRILL_SQL, shapeDrill, sourceIndexFor } from './service.js';
import { idealAnswerFields, MAX_IDEAL_CHARS, PROPOSALS_PER_MANAGER_PER_HOUR, proposeIdealAnswer } from './ideal.js';

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
  // Added to goodLooksLike for reps in that role, when the drill is for both roles.
  roleGuidance: z
    .object({ ae: z.string().trim().max(2000).optional(), am: z.string().trim().max(2000).optional() })
    .default({}),
  // The buyer's likely follow-up objections, in order (used word for word when coaching is off).
  // At most four: the buyer pushes back up to four times (see pushbacksFor).
  pushbacks: z
    .array(z.string().trim().min(3, 'Write each pushback as the buyer would say it.').max(600))
    .max(MAX_PUSHBACKS, `List at most ${MAX_PUSHBACKS} pushbacks.`)
    .default([]),
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
    .max(50, 'Choose at most 50 sections.')
    .default([]),
  changeNote: z.string().max(500).default(''),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  // What the question sells (for the Practice Studio's product filter); defaults from the brand.
  productLine: z.enum(Object.keys(PRODUCT_LINES)).optional(),
  // Questions that test the same skill share a concept, so the feed rotates through concepts.
  concept: z.string().trim().max(120).default(''),
  // The ideal answer as the manager left it. The server records who approved it and when.
  idealAnswer: z
    .object({
      text: z.string().trim().max(MAX_IDEAL_CHARS, `Keep the ideal answer under ${MAX_IDEAL_CHARS.toLocaleString()} characters.`).default(''),
      approved: z.boolean().default(false),
      // Proposed by the AI and kept as written, proposed and then edited, or written by the manager.
      origin: z.enum(['ai', 'ai_edited', 'manager']).default('manager'),
      approach: z.string().trim().max(1000).default(''),
      notes: z.string().trim().max(1500).default(''),
      claims: z
        .array(
          z.object({
            claim: z.string().max(600),
            sourceTitle: z.string().max(300).nullable().default(null),
            sourceQuote: z.string().max(800).default(''),
            verified: z.boolean().default(false),
          }),
        )
        .max(20)
        .default([]),
      persona: z.object({ key: z.string().max(60), label: z.string().max(120) }).nullable().default(null),
      model: z.string().max(120).nullable().default(null),
    })
    .optional(),
});

// A question draft to propose an ideal answer for: the same fields, but it needs no title or criteria yet.
const proposeSchema = drillSchema.extend({
  title: z.string().trim().max(140).default(''),
  goodLooksLike: z.string().trim().max(3000).default(''),
  assessedDimensions: z.array(z.enum(DIMENSION_KEYS)).default([]),
});

// The product line must belong to the question's brand.
function tidyProductLine(body) {
  const line = body.productLine || defaultProductLine(body.brand);
  if (PRODUCT_LINES[line].brand !== body.brand) {
    throw new HttpError(400, 'validation_failed', `${PRODUCT_LINES[line].label} is not a product of ${BRANDS[body.brand]}. Choose a product that matches the brand.`);
  }
  body.productLine = line;
}

// Role expectations only for a drill for both roles (a drill for one role keeps all its criteria in
// goodLooksLike, as the editor shows it), and no empty ones.
function tidyRoleGuidance(body) {
  const out = {};
  if (body.roles.length > 1) for (const role of body.roles) if (body.roleGuidance?.[role]?.trim()) out[role] = body.roleGuidance[role].trim();
  body.roleGuidance = out;
}

async function validateRefs(q, body) {
  tidyRoleGuidance(body);
  tidyProductLine(body);
  const personas = new Set((await q.many(`SELECT key FROM personas`)).map((p) => p.key));
  if (body.personas.some((p) => !personas.has(p))) throw new HttpError(400, 'validation_failed', 'Choose personas from the list.');
  for (const key of Object.keys(body.personaLines)) {
    if (!body.personas.includes(key)) delete body.personaLines[key];
    else if (!body.personaLines[key].trim()) delete body.personaLines[key];
  }
  if (body.sourceRefs.length) {
    const ids = body.sourceRefs.map((s) => s.sourceId);
    const found = await q.many(`SELECT id, latest_version_id, collection_id FROM knowledge_sources WHERE id = ANY($1::uuid[])`, [ids]);
    if (found.length !== new Set(ids).size) throw new HttpError(400, 'validation_failed', 'One of the selected sources no longer exists.');
    // A section of a collection is always used whole. A long document is used whole only when the
    // editor says so explicitly, so a drill is never widened by accident.
    const inCollection = new Set(found.filter((f) => f.collection_id).map((f) => f.id));
    for (const ref of body.sourceRefs) {
      if (!inCollection.has(ref.sourceId) && ref.wholeSource === false && ref.sections.length === 0) {
        throw new HttpError(400, 'validation_failed', 'Choose at least one section for each source, or use the whole source.');
      }
    }
    // The editor lists the sections of each source's latest version, so the chosen keys come from it.
    const latest = new Map(found.map((f) => [f.id, f.latest_version_id]));
    body.sourceRefs = body.sourceRefs.map((ref) => ({ sourceId: ref.sourceId, sections: ref.sections, versionId: latest.get(ref.sourceId) }));
  }
}

async function insertDrillVersion(q, drillId, body, userId, ideal) {
  const next = await q.one(`SELECT COALESCE(max(version), 0) + 1 AS v FROM drill_versions WHERE drill_id = $1`, [drillId]);
  return q.one(
    `INSERT INTO drill_versions (drill_id, version, title, brand, subject, stage, roles, personas, situation, buyer_line, persona_lines,
       objective, good_looks_like, assessed_dimensions, default_difficulty, default_skepticism, default_depth, source_refs, change_note, created_by,
       role_guidance, pushbacks, product_line, concept, ideal_answer, ideal_answer_status, ideal_answer_review)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) RETURNING id, version`,
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
      JSON.stringify(body.roleGuidance || {}),
      JSON.stringify(body.pushbacks || []),
      body.productLine,
      body.concept || '',
      ideal.text,
      ideal.status,
      JSON.stringify(ideal.review || {}),
    ],
  );
}

export function drillRoutes({ db, config, provider, log = () => {} }) {
  const r = Router();

  // The AI proposes an ideal answer for a question draft, from its approved source material. Nothing is
  // saved: the manager reviews the proposal in the editor and saves it with the question.
  r.post(
    '/ideal-answer',
    requireManager,
    route(async (req, res) => {
      const draft = parseBody(proposeSchema, req.body);
      await validateRefs(db, draft);
      const recent = await db.one(
        `SELECT count(*)::int AS n FROM audit_events WHERE actor_id = $1 AND action = 'drill.ideal_answer_proposed' AND created_at > now() - interval '1 hour'`,
        [req.user.id],
      );
      if (recent.n >= PROPOSALS_PER_MANAGER_PER_HOUR) {
        throw new HttpError(429, 'ideal_rate_limited', 'You have asked for many ideal answers in the last hour. Try again in a few minutes, or write one yourself.');
      }
      const proposal = await proposeIdealAnswer({ q: db, config, provider, draft, log });
      await audit(db, {
        actorId: req.user.id,
        action: 'drill.ideal_answer_proposed',
        entityType: 'drill',
        entityId: req.body?.drillId && /^[0-9a-f-]{36}$/.test(req.body.drillId) ? req.body.drillId : null,
        details: { title: draft.title || null, model: proposal.model, claims: proposal.claims.length, unmatched: proposal.claims.filter((c) => !c.verified).length },
        ip: clientIp(req),
      });
      res.json({ proposal });
    }),
  );

  // The question bank is for managers: reps are served questions by stage and never choose one.
  r.get(
    '/',
    requireManager,
    route(async (req, res) => {
      const forManager = req.user.isManager;
      const status = forManager ? String(req.query.status || '') : 'active';
      if (status === 'deleted') throw new HttpError(400, 'validation_failed', 'Deleted questions are not listed.');
      const rows = await db.many(`${DRILL_SQL} WHERE d.status <> 'deleted' ${status ? 'AND d.status = $1' : ''} ORDER BY v.title`, status ? [status] : []);
      // How many conversations reps have started on each question, so a manager knows what deleting affects.
      const counts = new Map(
        (await db.many(`SELECT drill_id, count(*)::int AS n FROM attempts WHERE turn_number = 1 GROUP BY drill_id`)).map((c) => [c.drill_id, c.n]),
      );
      for (const row of rows) row.answers = counts.get(row.id) || 0;
      const index = await sourceIndexFor(db, rows);
      let drills = rows.map((row) => shapeDrill(row, coachingAvailability(config, row, index), { forManager }));
      const { brand, stage, persona, role, subject, product } = req.query;
      drills = drills.filter(
        (d) =>
          (!brand || d.brand === brand || (brand !== 'both' && d.brand === 'both')) &&
          (!stage || d.stage === stage) &&
          (!persona || d.personas.includes(persona)) &&
          (!role || d.roles.includes(role)) &&
          (!subject || d.subject === subject) &&
          (!product || d.productLine === product),
      );
      res.json({ drills });
    }),
  );

  r.get(
    '/:id',
    requireManager,
    route(async (req, res) => {
      const row = await db.one(`${DRILL_SQL} WHERE d.id = $1`, [req.params.id]).catch(() => null);
      if (!row || row.status === 'deleted' || (!req.user.isManager && row.status !== 'active')) throw notFound('That drill was not found.');
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
        const v = await insertDrillVersion(q, drill.id, body, req.user.id, idealAnswerFields(body.idealAnswer, null, req.user));
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
        if (!drill || drill.status === 'deleted') throw notFound('That drill was not found.');
        await validateRefs(q, body);
        const current = await q.one(`SELECT ideal_answer, ideal_answer_status, ideal_answer_review FROM drill_versions WHERE id = $1`, [drill.current_version_id]);
        const v = await insertDrillVersion(q, drill.id, body, req.user.id, idealAnswerFields(body.idealAnswer, current, req.user));
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
        if (!drill || drill.status === 'deleted') throw notFound('That drill was not found.');
        await q.query(`UPDATE drills SET status = $2, updated_at = now() WHERE id = $1`, [drill.id, status]);
        await audit(q, { actorId: req.user.id, action: 'drill.status_changed', entityType: 'drill', entityId: drill.id, details: { from: drill.status, to: status }, ip: clientIp(req) });
      });
      res.json({ ok: true });
    }),
  );

  // Deleting a question takes it out of the bank and out of practice for good. Answers reps already gave
  // stay in their history and reports, an open conversation can still be finished, and exercises already
  // assigned stay as they are.
  r.delete(
    '/:id',
    requireManager,
    route(async (req, res) => {
      const out = await db.tx(async (q) => {
        const drill = await q.one(
          `SELECT d.*, v.title FROM drills d JOIN drill_versions v ON v.id = d.current_version_id WHERE d.id = $1 FOR UPDATE OF d`,
          [req.params.id],
        ).catch(() => null);
        if (!drill || drill.status === 'deleted') throw notFound('That question was not found.');
        const used = await q.one(`SELECT count(*)::int AS n FROM attempts WHERE drill_id = $1 AND turn_number = 1`, [drill.id]);
        await q.query(`UPDATE drills SET status = 'deleted', deleted_at = now(), deleted_by = $2, updated_at = now() WHERE id = $1`, [drill.id, req.user.id]);
        // A rep who was served it and has not answered yet gets another question from the stage.
        await q.query(`DELETE FROM practice_draws WHERE drill_id = $1`, [drill.id]);
        await audit(q, {
          actorId: req.user.id,
          action: 'drill.deleted',
          entityType: 'drill',
          entityId: drill.id,
          details: { title: drill.title, from: drill.status, answers: used.n },
          ip: clientIp(req),
        });
        return { answers: used.n };
      });
      res.json({ deleted: true, answers: out.answers });
    }),
  );

  return r;
}
