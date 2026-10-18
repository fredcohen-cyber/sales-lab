import { Router } from 'express';
import { z } from 'zod';
import { HttpError, notFound, parseBody, route } from '../lib/errors.js';
import { audit } from '../lib/audit.js';
import { clientIp, requireManager } from '../auth/middleware.js';
import { aiConfigured } from '../config.js';
import { ProviderError } from '../ai/provider.js';
import { ALLOWED_EMAIL_DOMAINS, BRANDS, CRITICAL_FAILURE_TYPES, DEPTH_TEXT, DIFFICULTY_TEXT, DIMENSION_KEYS, EVIDENCE_BASIS, EXPERIENCE, REVIEW_STATUS, ROLES, SKEPTICISM_TEXT, STAGES, SUBJECTS } from '../domain.js';

export async function currentRubric(q) {
  return q.one(
    `SELECT r.*, u.name AS created_by_name FROM workspace_settings w JOIN rubric_versions r ON r.id = w.current_rubric_id
       LEFT JOIN users u ON u.id = r.created_by WHERE w.id = 1`,
  );
}

export function settingsRoutes({ db, config, provider }) {
  const r = Router();

  // Vocabulary and current rubric for every signed-in person.
  r.get(
    '/meta',
    route(async (_req, res) => {
      const rubric = await currentRubric(db);
      const personas = await db.many(`SELECT key, label, responsibilities, concerns FROM personas ORDER BY position, label`);
      const settings = await db.one(`SELECT proficiency_threshold, strength_threshold, weakness_threshold, min_evidence FROM workspace_settings WHERE id = 1`);
      res.json({
        roles: ROLES,
        experience: EXPERIENCE,
        brands: BRANDS,
        subjects: SUBJECTS,
        evidenceBasis: EVIDENCE_BASIS,
        stages: STAGES,
        personas,
        dimensions: rubric.dimensions,
        rubricVersion: rubric.version,
        levels: { difficulty: DIFFICULTY_TEXT, skepticism: SKEPTICISM_TEXT, depth: DEPTH_TEXT },
        reviewStatus: REVIEW_STATUS,
        criticalFailureTypes: CRITICAL_FAILURE_TYPES,
        thresholds: {
          proficiency: settings.proficiency_threshold,
          strength: settings.strength_threshold,
          weakness: settings.weakness_threshold,
          minEvidence: settings.min_evidence,
        },
        coaching: { configured: aiConfigured(config) },
      });
    }),
  );

  r.get(
    '/settings',
    requireManager,
    route(async (_req, res) => {
      const rubric = await currentRubric(db);
      const history = await db.many(
        `SELECT r.id, r.version, r.dimensions, r.note, r.created_at, u.name AS created_by_name
           FROM rubric_versions r LEFT JOIN users u ON u.id = r.created_by ORDER BY r.version DESC LIMIT 20`,
      );
      const s = await db.one(`SELECT * FROM workspace_settings WHERE id = 1`);
      const owner = await db.one(`SELECT email, name FROM users WHERE is_owner`);
      res.json({
        rubric: { id: rubric.id, version: rubric.version, dimensions: rubric.dimensions, note: rubric.note, createdAt: rubric.created_at, createdByName: rubric.created_by_name },
        rubricHistory: history,
        thresholds: { proficiency: s.proficiency_threshold, strength: s.strength_threshold, weakness: s.weakness_threshold, minEvidence: s.min_evidence },
        ai: {
          provider: config.ai.provider,
          model: config.ai.model,
          configured: aiConfigured(config),
          timeoutSeconds: Math.round(config.ai.timeoutMs / 1000),
        },
        owner,
        allowedDomains: ALLOWED_EMAIL_DOMAINS,
        personas: await db.many(`SELECT * FROM personas ORDER BY position, label`),
      });
    }),
  );

  const rubricSchema = z.object({
    weights: z.record(z.number().int().min(0).max(100)),
    note: z.string().trim().max(500).default(''),
  });
  r.put(
    '/settings/rubric',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(rubricSchema, req.body);
      const keys = Object.keys(body.weights);
      if (keys.length !== DIMENSION_KEYS.length || !DIMENSION_KEYS.every((k) => keys.includes(k))) {
        throw new HttpError(400, 'validation_failed', 'Set a weight for each of the six dimensions.');
      }
      const total = keys.reduce((a, k) => a + body.weights[k], 0);
      if (total <= 0) throw new HttpError(400, 'validation_failed', 'At least one dimension needs a weight above zero.');
      const out = await db.tx(async (q) => {
        const current = await currentRubric(q);
        const dims = current.dimensions.map((d) => ({ ...d, weight: body.weights[d.key] }));
        const next = await q.one(`SELECT max(version) + 1 AS v FROM rubric_versions`);
        const row = await q.one(
          `INSERT INTO rubric_versions (version, dimensions, note, created_by) VALUES ($1, $2, $3, $4) RETURNING id, version`,
          [next.v, JSON.stringify(dims), body.note, req.user.id],
        );
        await q.query(`UPDATE workspace_settings SET current_rubric_id = $1, updated_at = now(), updated_by = $2 WHERE id = 1`, [row.id, req.user.id]);
        await audit(q, {
          actorId: req.user.id,
          action: 'settings.rubric_changed',
          entityType: 'rubric',
          entityId: row.id,
          details: { version: row.version, weights: body.weights, note: body.note || null },
          ip: clientIp(req),
        });
        return row;
      });
      res.json({ version: out.version });
    }),
  );

  const thresholdSchema = z
    .object({
      proficiency: z.number().int().min(1).max(100),
      strength: z.number().int().min(1).max(100),
      weakness: z.number().int().min(1).max(100),
      minEvidence: z.number().int().min(3, 'Strengths and weaknesses need at least 3 scored examples.').max(50),
    })
    .refine((v) => v.weakness < v.strength, { message: 'The weakness threshold must be lower than the strength threshold.' });
  r.put(
    '/settings/thresholds',
    requireManager,
    route(async (req, res) => {
      const t = parseBody(thresholdSchema, req.body);
      await db.query(
        `UPDATE workspace_settings SET proficiency_threshold = $1, strength_threshold = $2, weakness_threshold = $3, min_evidence = $4,
                updated_at = now(), updated_by = $5 WHERE id = 1`,
        [t.proficiency, t.strength, t.weakness, t.minEvidence, req.user.id],
      );
      await audit(db, { actorId: req.user.id, action: 'settings.thresholds_changed', entityType: 'settings', details: t, ip: clientIp(req) });
      res.json({ ok: true });
    }),
  );

  const personaSchema = z.object({
    label: z.string().trim().min(2).max(80),
    responsibilities: z.string().trim().min(10).max(1500),
    concerns: z.string().trim().min(10).max(1500),
  });
  r.put(
    '/personas/:key',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(personaSchema, req.body);
      const row = await db.one(
        `UPDATE personas SET label = $2, responsibilities = $3, concerns = $4, updated_at = now(), updated_by = $5 WHERE key = $1 RETURNING key`,
        [req.params.key, body.label, body.responsibilities, body.concerns, req.user.id],
      );
      if (!row) throw notFound('That persona was not found.');
      await audit(db, { actorId: req.user.id, action: 'persona.updated', entityType: 'persona', entityId: row.key, ip: clientIp(req) });
      res.json({ ok: true });
    }),
  );

  // A tiny request that contains no learner data, to confirm the key and model work.
  r.post(
    '/settings/ai-test',
    requireManager,
    route(async (_req, res) => {
      if (!provider) return res.json({ ok: false, message: 'No AI key is configured on the server.' });
      try {
        const out = await provider.ping({ timeoutMs: 20_000 });
        res.json({ ok: true, message: `Connected. The AI service answered using ${out.model}.` });
      } catch (err) {
        // The service's own words help a manager fix the setting; keep them whole up to a sensible length.
        const detail = err instanceof ProviderError && err.detail ? String(err.detail) : '';
        const shown = detail.length > 400 ? `${detail.slice(0, 400).replace(/\s+\S*$/, '')}…` : detail;
        const msg = err instanceof ProviderError ? `${err.message}${shown ? ` (${shown})` : ''}` : 'The test request failed.';
        res.json({ ok: false, message: msg });
      }
    }),
  );

  return r;
}
