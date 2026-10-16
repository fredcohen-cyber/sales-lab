import { Router } from 'express';
import { z } from 'zod';
import { HttpError, notFound, parseBody, route } from '../lib/errors.js';
import { audit } from '../lib/audit.js';
import { clientIp, requireManager } from '../auth/middleware.js';
import { parseSections } from '../lib/text.js';
import { isValidDateString } from '../lib/time.js';
import { coverage, shapeSourceRow, SOURCE_LIST_SQL } from './service.js';
import { BRANDS, EVIDENCE_BASIS, SUBJECTS } from '../domain.js';

const MAX_CONTENT = 1_000_000;

const versionFields = {
  title: z.string().trim().min(1, 'Add a title.').max(200),
  brand: z.enum(Object.keys(BRANDS)),
  subjects: z.array(z.enum(Object.keys(SUBJECTS))).min(1, 'Choose at least one subject.').max(3),
  personas: z.array(z.string().max(60)).max(10).default([]),
  asOfDate: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((v) => !v || isValidDateString(v), { message: 'Use a date like 2026-10-11.' }),
  caveats: z.string().max(4000).default(''),
  evidenceBasis: z.enum(Object.keys(EVIDENCE_BASIS)).default('documented'),
  content: z
    .string()
    .max(MAX_CONTENT, 'This document is too long (limit 1,000,000 characters).')
    .refine((v) => v.trim().length > 0, { message: 'Add the source text.' }),
  changeNote: z.string().max(500).default(''),
  importedFrom: z.string().max(200).optional(),
};
const versionSchema = z.object({ ...versionFields, approve: z.boolean().default(false) });

async function personaKeys(q) {
  return new Set((await q.many(`SELECT key FROM personas`)).map((p) => p.key));
}

async function insertVersion(q, sourceId, body, userId) {
  const next = await q.one(`SELECT COALESCE(max(version), 0) + 1 AS v FROM knowledge_versions WHERE source_id = $1`, [sourceId]);
  return q.one(
    `INSERT INTO knowledge_versions (source_id, version, title, brand, subjects, personas, as_of_date, caveats, content, change_note, created_by, evidence_basis)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, version`,
    [
      sourceId,
      next.v,
      body.title,
      body.brand,
      body.subjects,
      body.personas,
      body.asOfDate || null,
      body.caveats || '',
      body.content.replace(/\r\n?/g, '\n'),
      body.changeNote || (body.importedFrom ? `Imported from ${body.importedFrom}` : ''),
      userId,
      body.evidenceBasis,
    ],
  );
}

async function approveVersion(q, sourceId, versionId, userId, ip) {
  await q.query(`UPDATE knowledge_versions SET approved_at = now(), approved_by = $2 WHERE id = $1 AND approved_at IS NULL`, [versionId, userId]);
  await q.query(
    `UPDATE knowledge_sources SET approved_version_id = $2, status = 'approved', archived_at = NULL, archived_by = NULL, updated_at = now()
      WHERE id = $1`,
    [sourceId, versionId],
  );
  await audit(q, { actorId: userId, action: 'knowledge.approved', entityType: 'knowledge_source', entityId: sourceId, details: { versionId }, ip });
}

// Drills whose chosen sections are missing from, or titled differently in, a version of a source.
export async function drillImpact(q, sourceId, currentContent, targetContent) {
  const targetSections = parseSections(targetContent);
  const currentSections = currentContent ? parseSections(currentContent) : [];
  const drills = await q.many(
    `SELECT d.id, d.status, v.title, v.source_refs FROM drills d JOIN drill_versions v ON v.id = d.current_version_id
      WHERE d.status <> 'archived' AND v.source_refs @> $1::jsonb`,
    [JSON.stringify([{ sourceId }])],
  );
  const out = [];
  for (const d of drills) {
    const ref = (d.source_refs || []).find((x) => x.sourceId === sourceId);
    const wanted = (ref?.sections || []).filter(Boolean);
    const missing = [];
    const retitled = [];
    for (const key of wanted) {
      const t = targetSections.find((s) => s.key === key);
      if (!t) {
        missing.push({ key, title: currentSections.find((s) => s.key === key)?.title || key });
        continue;
      }
      const c = currentSections.find((s) => s.key === key);
      if (c && c.title.trim() !== t.title.trim()) retitled.push({ key, from: c.title, to: t.title });
    }
    if (missing.length || retitled.length) out.push({ drillId: d.id, title: d.title, status: d.status, missing, retitled });
  }
  return out;
}

export function knowledgeRoutes({ db }) {
  const r = Router();

  r.get(
    '/',
    route(async (req, res) => {
      const forManager = req.user.isManager;
      const rows = await db.many(`${SOURCE_LIST_SQL} ${forManager ? '' : `WHERE s.status = 'approved'`} ORDER BY s.updated_at DESC`);
      let sources = rows.map((row) => shapeSourceRow(row, { forManager }));
      const { brand, subject, persona, status, evidence } = req.query;
      const qtext = String(req.query.q || '').toLowerCase().trim();
      sources = sources.filter(
        (s) =>
          (!brand || s.brand === brand || (brand !== 'both' && s.brand === 'both')) &&
          (!subject || s.subjects.includes(subject)) &&
          (!persona || s.personas.length === 0 || s.personas.includes(persona)) &&
          (!status || s.status === status) &&
          (!evidence || s.evidenceBasis === evidence) &&
          (!qtext || s.title.toLowerCase().includes(qtext)),
      );
      res.json({ sources, coverage: await coverage(db) });
    }),
  );

  r.get(
    '/:id',
    route(async (req, res) => {
      const source = await db.one(`SELECT * FROM knowledge_sources WHERE id = $1`, [req.params.id]).catch(() => null);
      if (!source) throw notFound('That source was not found.');
      const forManager = req.user.isManager;
      if (!forManager && source.status !== 'approved') throw notFound('That source was not found.');
      let versionId = forManager ? source.latest_version_id : source.approved_version_id;
      if (forManager && req.query.version) {
        const v = await db.one(`SELECT id FROM knowledge_versions WHERE source_id = $1 AND version = $2`, [source.id, Number(req.query.version) || 0]);
        if (!v) throw notFound('That version was not found.');
        versionId = v.id;
      }
      const version = await db.one(
        `SELECT v.*, c.name AS created_by_name, a.name AS approved_by_name
           FROM knowledge_versions v LEFT JOIN users c ON c.id = v.created_by LEFT JOIN users a ON a.id = v.approved_by
          WHERE v.id = $1`,
        [versionId],
      );
      const versions = forManager
        ? await db.many(
            `SELECT v.id, v.version, v.title, v.change_note, v.created_at, v.approved_at, c.name AS created_by_name
               FROM knowledge_versions v LEFT JOIN users c ON c.id = v.created_by
              WHERE v.source_id = $1 ORDER BY v.version DESC`,
            [source.id],
          )
        : undefined;
      res.json({
        source: {
          id: source.id,
          slug: source.slug,
          status: source.status,
          approvedVersionId: source.approved_version_id,
          latestVersionId: source.latest_version_id,
        },
        version: {
          id: version.id,
          version: version.version,
          title: version.title,
          brand: version.brand,
          subjects: version.subjects,
          personas: version.personas,
          asOfDate: version.as_of_date,
          caveats: version.caveats,
          evidenceBasis: version.evidence_basis,
          content: version.content,
          changeNote: version.change_note,
          createdAt: version.created_at,
          createdByName: version.created_by_name,
          approvedAt: version.approved_at,
          approvedByName: version.approved_by_name,
          isApproved: version.id === source.approved_version_id,
          sections: parseSections(version.content).map((s) => ({ key: s.key, title: s.title })),
        },
        versions,
      });
    }),
  );

  r.post(
    '/',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(versionSchema, req.body);
      const known = await personaKeys(db);
      if (body.personas.some((p) => !known.has(p))) throw new HttpError(400, 'validation_failed', 'Choose personas from the list.');
      const ip = clientIp(req);
      const id = await db.tx(async (q) => {
        const src = await q.one(`INSERT INTO knowledge_sources (created_by) VALUES ($1) RETURNING id`, [req.user.id]);
        const v = await insertVersion(q, src.id, body, req.user.id);
        await q.query(`UPDATE knowledge_sources SET latest_version_id = $2 WHERE id = $1`, [src.id, v.id]);
        await audit(q, {
          actorId: req.user.id,
          action: 'knowledge.created',
          entityType: 'knowledge_source',
          entityId: src.id,
          details: { title: body.title, importedFrom: body.importedFrom || null },
          ip,
        });
        if (body.approve) await approveVersion(q, src.id, v.id, req.user.id, ip);
        return src.id;
      });
      res.status(201).json({ id });
    }),
  );

  r.post(
    '/:id/versions',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(versionSchema, req.body);
      const known = await personaKeys(db);
      if (body.personas.some((p) => !known.has(p))) throw new HttpError(400, 'validation_failed', 'Choose personas from the list.');
      const ip = clientIp(req);
      const out = await db.tx(async (q) => {
        const src = await q.one(`SELECT * FROM knowledge_sources WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!src) throw notFound('That source was not found.');
        const v = await insertVersion(q, src.id, body, req.user.id);
        await q.query(`UPDATE knowledge_sources SET latest_version_id = $2, updated_at = now() WHERE id = $1`, [src.id, v.id]);
        await audit(q, {
          actorId: req.user.id,
          action: 'knowledge.version_added',
          entityType: 'knowledge_source',
          entityId: src.id,
          details: { version: v.version, changeNote: body.changeNote || null },
          ip,
        });
        if (body.approve) await approveVersion(q, src.id, v.id, req.user.id, ip);
        return v;
      });
      res.status(201).json({ versionId: out.id, version: out.version });
    }),
  );

  // Before approving a version: which drills rely on sections that it drops or retitles.
  r.get(
    '/:id/drill-impact',
    requireManager,
    route(async (req, res) => {
      const source = await db.one(`SELECT * FROM knowledge_sources WHERE id = $1`, [req.params.id]).catch(() => null);
      if (!source) throw notFound('That source was not found.');
      const target = await db
        .one(`SELECT id, content FROM knowledge_versions WHERE id = $1 AND source_id = $2`, [String(req.query.versionId || ''), source.id])
        .catch(() => null);
      if (!target) throw notFound('That version was not found.');
      const current = source.approved_version_id
        ? await db.one(`SELECT content FROM knowledge_versions WHERE id = $1`, [source.approved_version_id])
        : null;
      res.json({ drills: await drillImpact(db, source.id, current?.content || null, target.content) });
    }),
  );

  const approveSchema = z.object({ versionId: z.string().uuid() });
  r.post(
    '/:id/approve',
    requireManager,
    route(async (req, res) => {
      const { versionId } = parseBody(approveSchema, req.body);
      await db.tx(async (q) => {
        const v = await q.one(`SELECT id FROM knowledge_versions WHERE id = $1 AND source_id = $2`, [versionId, req.params.id]);
        if (!v) throw notFound('That version was not found.');
        await approveVersion(q, req.params.id, versionId, req.user.id, clientIp(req));
      });
      res.json({ ok: true });
    }),
  );

  r.post(
    '/:id/archive',
    requireManager,
    route(async (req, res) => {
      await db.tx(async (q) => {
        const src = await q.one(`SELECT id FROM knowledge_sources WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!src) throw notFound('That source was not found.');
        await q.query(`UPDATE knowledge_sources SET status = 'archived', archived_at = now(), archived_by = $2, updated_at = now() WHERE id = $1`, [
          src.id,
          req.user.id,
        ]);
        await audit(q, { actorId: req.user.id, action: 'knowledge.archived', entityType: 'knowledge_source', entityId: src.id, ip: clientIp(req) });
      });
      res.json({ ok: true });
    }),
  );

  r.post(
    '/:id/restore',
    requireManager,
    route(async (req, res) => {
      await db.tx(async (q) => {
        const src = await q.one(`SELECT * FROM knowledge_sources WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!src) throw notFound('That source was not found.');
        const status = src.approved_version_id ? 'approved' : 'draft';
        await q.query(`UPDATE knowledge_sources SET status = $2, archived_at = NULL, archived_by = NULL, updated_at = now() WHERE id = $1`, [src.id, status]);
        await audit(q, { actorId: req.user.id, action: 'knowledge.restored', entityType: 'knowledge_source', entityId: src.id, details: { status }, ip: clientIp(req) });
      });
      res.json({ ok: true });
    }),
  );

  return r;
}
