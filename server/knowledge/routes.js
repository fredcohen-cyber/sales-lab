import { Router } from 'express';
import { z } from 'zod';
import { HttpError, notFound, parseBody, route } from '../lib/errors.js';
import { audit } from '../lib/audit.js';
import { clientIp, requireManager } from '../auth/middleware.js';
import { parseSections } from '../lib/text.js';
import { isValidDateString } from '../lib/time.js';
import { coverage, listCollections, loadVersionSections, mapSections, shapeCollection, shapeSourceRow, SOURCE_LIST_ORDER, SOURCE_LIST_SQL } from './service.js';
import { COLLECTION_KINDS, createCollection, positionFor, previewSplit, splitSourceIntoCollection } from './sections.js';
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
const groupField = z.string().trim().max(80, 'Keep the group name under 80 characters.').default('');
const createSchema = versionSchema.extend({ collectionId: z.string().uuid().nullable().optional(), group: groupField });

const collectionSchema = z.object({
  name: z.string().trim().min(2, 'Add a name.').max(120),
  kind: z.enum(Object.keys(COLLECTION_KINDS)),
  brand: z.enum(Object.keys(BRANDS)),
  description: z.string().max(4000).default(''),
});
const arrangeSchema = z.object({
  sections: z.array(z.object({ id: z.string().uuid(), group: groupField })).min(1).max(500),
});
const placementSchema = z.object({ collectionId: z.string().uuid().nullable(), group: groupField });
const splitSchema = z
  .object({ collectionId: z.string().uuid().optional(), newCollection: collectionSchema.optional() })
  .refine((b) => Boolean(b.collectionId) !== Boolean(b.newCollection), { message: 'Choose a collection for the sections, or name a new one.' });

// A document that was split lives on only as history; its sections are edited instead.
function refuseIfSplit(src) {
  if (src?.split_into_collection_id) {
    throw new HttpError(409, 'document_split', 'This document was split into sections. Edit, approve, or restore the sections in its collection instead.');
  }
}

// The version a reader sees: managers see the approved version, or the draft when nothing is approved yet.
const shownVersion = (forManager) => (forManager ? 'COALESCE(s.approved_version_id, s.latest_version_id)' : 's.approved_version_id');
const visible = (forManager) => (forManager ? `s.status <> 'archived'` : `s.status = 'approved'`);

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

// Drills whose chosen sections cannot be found in a version of a source (followed by title, so
// renumbering alone is fine; removed or retitled sections are reported).
export async function drillImpact(q, sourceId, targetVersionId) {
  const drills = await q.many(
    `SELECT d.id, d.status, v.title, v.source_refs FROM drills d JOIN drill_versions v ON v.id = d.current_version_id
      WHERE d.status <> 'archived' AND v.source_refs @> $1::jsonb`,
    [JSON.stringify([{ sourceId }])],
  );
  const refs = drills.map((d) => ({ d, ref: (d.source_refs || []).find((x) => x.sourceId === sourceId) })).filter((x) => x.ref?.sections?.length);
  const sections = await loadVersionSections(q, [targetVersionId, ...refs.map((x) => x.ref.versionId)]);
  const target = sections.get(targetVersionId) || [];
  const out = [];
  for (const { d, ref } of refs) {
    const { matched, missing } = mapSections(ref.sections, sections.get(ref.versionId) || null, target);
    if (missing.length) out.push({ drillId: d.id, title: d.title, status: d.status, missing, allMissing: matched.length === 0 });
  }
  return out;
}

export function knowledgeRoutes({ db }) {
  const r = Router();

  r.get(
    '/',
    route(async (req, res) => {
      const forManager = req.user.isManager;
      const rows = await db.many(`${SOURCE_LIST_SQL} ${forManager ? '' : `WHERE s.status = 'approved'`} ${SOURCE_LIST_ORDER}`);
      let sources = rows.map((row) => shapeSourceRow(row, { forManager }));
      const { brand, subject, persona, status, evidence, collection } = req.query;
      const qtext = String(req.query.q || '').toLowerCase().trim();
      sources = sources.filter(
        (s) =>
          (!brand || s.brand === brand || (brand !== 'both' && s.brand === 'both')) &&
          (!subject || s.subjects.includes(subject)) &&
          (!persona || s.personas.length === 0 || s.personas.includes(persona)) &&
          (!status || s.status === status) &&
          (!evidence || s.evidenceBasis === evidence) &&
          (!collection || s.collectionId === collection) &&
          (!qtext || s.title.toLowerCase().includes(qtext)),
      );
      res.json({ collections: await listCollections(db, { forManager }), sources, coverage: await coverage(db) });
    }),
  );

  // ------------------------------------------------------------ collections
  r.get(
    '/collections',
    route(async (req, res) => {
      res.json({ collections: await listCollections(db, { forManager: req.user.isManager }) });
    }),
  );

  // A whole collection, section by section, for reading end to end.
  r.get(
    '/collections/:cid',
    route(async (req, res) => {
      const forManager = req.user.isManager;
      const c = await db.one(`SELECT * FROM knowledge_collections WHERE id = $1`, [req.params.cid]).catch(() => null);
      if (!c) throw notFound('That collection was not found.');
      const rows = await db.many(
        `SELECT s.id, s.status, s.position, s.group_label, s.approved_version_id, s.latest_version_id,
                v.id AS version_id, v.version, v.title, v.brand, v.subjects, v.personas, v.as_of_date, v.caveats, v.evidence_basis, v.content
           FROM knowledge_sources s JOIN knowledge_versions v ON v.id = ${shownVersion(forManager)}
          WHERE s.collection_id = $1 AND ${visible(forManager)}
          ORDER BY s.position, s.created_at, s.id`,
        [c.id],
      );
      if (!forManager && rows.length === 0) throw notFound('That collection was not found.');
      res.json({
        collection: shapeCollection(c, { forManager }),
        sections: rows.map((r) => ({
          id: r.id,
          status: r.status,
          group: r.group_label,
          position: r.position,
          versionId: r.version_id,
          version: r.version,
          title: r.title,
          brand: r.brand,
          subjects: r.subjects,
          personas: r.personas,
          asOfDate: r.as_of_date,
          caveats: r.caveats,
          evidenceBasis: r.evidence_basis,
          content: r.content,
          isApproved: r.version_id === r.approved_version_id,
          hasPendingDraft: forManager ? Boolean(r.approved_version_id && r.latest_version_id !== r.approved_version_id) : undefined,
        })),
      });
    }),
  );

  r.post(
    '/collections',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(collectionSchema, req.body);
      const c = await db.tx(async (q) => {
        const made = await createCollection(q, { ...body, actorId: req.user.id });
        await audit(q, { actorId: req.user.id, action: 'knowledge.collection_created', entityType: 'knowledge_collection', entityId: made.id, details: { name: made.name }, ip: clientIp(req) });
        return made;
      });
      res.status(201).json({ id: c.id });
    }),
  );

  r.put(
    '/collections/:cid',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(collectionSchema, req.body);
      await db.tx(async (q) => {
        const c = await q.one(`SELECT id FROM knowledge_collections WHERE id = $1 FOR UPDATE`, [req.params.cid]).catch(() => null);
        if (!c) throw notFound('That collection was not found.');
        await q.query(
          `UPDATE knowledge_collections SET name = $2, kind = $3, brand = $4, description = $5, updated_at = now(), updated_by = $6 WHERE id = $1`,
          [c.id, body.name, body.kind, body.brand, body.description, req.user.id],
        );
        await audit(q, { actorId: req.user.id, action: 'knowledge.collection_updated', entityType: 'knowledge_collection', entityId: c.id, details: { name: body.name }, ip: clientIp(req) });
      });
      res.json({ ok: true });
    }),
  );

  // Order and group a collection's sections. Structure only: no section gets a new version.
  r.post(
    '/collections/:cid/arrange',
    requireManager,
    route(async (req, res) => {
      const { sections } = parseBody(arrangeSchema, req.body);
      await db.tx(async (q) => {
        const c = await q.one(`SELECT id FROM knowledge_collections WHERE id = $1 FOR UPDATE`, [req.params.cid]).catch(() => null);
        if (!c) throw notFound('That collection was not found.');
        const current = await q.many(`SELECT id FROM knowledge_sources WHERE collection_id = $1 AND status <> 'archived'`, [c.id]);
        const ids = sections.map((s) => s.id);
        const known = new Set(current.map((x) => x.id));
        if (new Set(ids).size !== ids.length || ids.length !== known.size || ids.some((id) => !known.has(id))) {
          throw new HttpError(409, 'stale_order', 'The sections in this collection changed while you were arranging them. Reload and try again.');
        }
        for (const [i, s] of sections.entries()) {
          await q.query(`UPDATE knowledge_sources SET position = $2, group_label = $3 WHERE id = $1 AND collection_id = $4`, [s.id, i + 1, s.group, c.id]);
        }
        await audit(q, { actorId: req.user.id, action: 'knowledge.arranged', entityType: 'knowledge_collection', entityId: c.id, details: { sections: ids.length }, ip: clientIp(req) });
      });
      res.json({ ok: true });
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
      // Where a section sits, and the sections before and after it, for reading in order.
      const collection = source.collection_id
        ? await db.one(`SELECT id, name, kind, brand FROM knowledge_collections WHERE id = $1`, [source.collection_id])
        : null;
      let neighbors = null;
      if (collection) {
        const siblings = await db.many(
          `SELECT s.id, v.title FROM knowledge_sources s JOIN knowledge_versions v ON v.id = ${shownVersion(forManager)}
            WHERE s.collection_id = $1 AND ${visible(forManager)} ORDER BY s.position, s.created_at, s.id`,
          [collection.id],
        );
        const i = siblings.findIndex((x) => x.id === source.id);
        neighbors = {
          index: i + 1,
          count: siblings.length,
          prev: i > 0 ? siblings[i - 1] : null,
          next: i >= 0 && i < siblings.length - 1 ? siblings[i + 1] : null,
        };
      }
      const splitInto = source.split_into_collection_id
        ? await db.one(`SELECT id, name FROM knowledge_collections WHERE id = $1`, [source.split_into_collection_id])
        : null;
      // Managers see which drills an edit to this source will change once approved.
      const usedBy = forManager
        ? await db.many(
            `SELECT d.id, d.status, v.title FROM drills d JOIN drill_versions v ON v.id = d.current_version_id
              WHERE d.status <> 'archived' AND v.source_refs @> $1::jsonb ORDER BY v.title`,
            [JSON.stringify([{ sourceId: source.id }])],
          )
        : undefined;
      // Managers see what splitting a long document would create (null when it cannot be split).
      const splitPreview = forManager ? await previewSplit(db, source) : undefined;
      res.json({
        source: {
          id: source.id,
          slug: source.slug,
          status: source.status,
          approvedVersionId: source.approved_version_id,
          latestVersionId: source.latest_version_id,
          collection,
          group: source.group_label,
          neighbors,
          splitInto,
          splitPreview,
          usedBy,
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
      const body = parseBody(createSchema, req.body);
      const known = await personaKeys(db);
      if (body.personas.some((p) => !known.has(p))) throw new HttpError(400, 'validation_failed', 'Choose personas from the list.');
      const ip = clientIp(req);
      const id = await db.tx(async (q) => {
        let position = 0;
        if (body.collectionId) {
          const c = await q.one(`SELECT id FROM knowledge_collections WHERE id = $1 FOR UPDATE`, [body.collectionId]);
          if (!c) throw new HttpError(400, 'validation_failed', 'That collection no longer exists.');
          position = await positionFor(q, c.id, body.group);
        }
        const src = await q.one(
          `INSERT INTO knowledge_sources (created_by, collection_id, position, group_label) VALUES ($1, $2, $3, $4) RETURNING id`,
          [req.user.id, body.collectionId || null, position, body.collectionId ? body.group : ''],
        );
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
        refuseIfSplit(src);
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
        .one(`SELECT id FROM knowledge_versions WHERE id = $1 AND source_id = $2`, [String(req.query.versionId || ''), source.id])
        .catch(() => null);
      if (!target) throw notFound('That version was not found.');
      res.json({ drills: await drillImpact(db, source.id, target.id) });
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
        refuseIfSplit(await q.one(`SELECT * FROM knowledge_sources WHERE id = $1 FOR UPDATE`, [req.params.id]));
        await approveVersion(q, req.params.id, versionId, req.user.id, clientIp(req));
      });
      res.json({ ok: true });
    }),
  );

  // Move a section to another collection or group, or out of collections. No new version is needed.
  r.patch(
    '/:id/placement',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(placementSchema, req.body);
      await db.tx(async (q) => {
        const src = await q.one(`SELECT * FROM knowledge_sources WHERE id = $1 FOR UPDATE`, [req.params.id]).catch(() => null);
        if (!src) throw notFound('That source was not found.');
        refuseIfSplit(src);
        let position = src.position;
        if (body.collectionId && (body.collectionId !== src.collection_id || body.group !== src.group_label)) {
          const c = await q.one(`SELECT id FROM knowledge_collections WHERE id = $1 FOR UPDATE`, [body.collectionId]);
          if (!c) throw new HttpError(400, 'validation_failed', 'That collection no longer exists.');
          position = await positionFor(q, c.id, body.group, { excludeId: src.id });
        }
        if (!body.collectionId) position = 0;
        await q.query(`UPDATE knowledge_sources SET collection_id = $2, group_label = $3, position = $4 WHERE id = $1`, [
          src.id,
          body.collectionId,
          body.collectionId ? body.group : '',
          position,
        ]);
        await audit(q, {
          actorId: req.user.id,
          action: 'knowledge.moved',
          entityType: 'knowledge_source',
          entityId: src.id,
          details: { from: src.collection_id, to: body.collectionId, group: body.group },
          ip: clientIp(req),
        });
      });
      res.json({ ok: true });
    }),
  );

  // Split a long document at its "## " headings into sections of a collection (see sections.js).
  r.post(
    '/:id/split',
    requireManager,
    route(async (req, res) => {
      const body = parseBody(splitSchema, req.body);
      if (!z.string().uuid().safeParse(req.params.id).success) throw notFound('That source was not found.');
      const out = await db.tx(async (q) => {
        let collectionId = body.collectionId;
        if (body.newCollection) {
          const made = await createCollection(q, { ...body.newCollection, actorId: req.user.id });
          await audit(q, { actorId: req.user.id, action: 'knowledge.collection_created', entityType: 'knowledge_collection', entityId: made.id, details: { name: made.name }, ip: clientIp(req) });
          collectionId = made.id;
        }
        const result = await splitSourceIntoCollection(q, { sourceId: req.params.id, collectionId, actorId: req.user.id, ip: clientIp(req) });
        return { collectionId, sections: result.sections.length, drillVersionsUpdated: result.drillVersionsUpdated, unmatched: result.unmatched.length };
      });
      res.json(out);
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
        refuseIfSplit(src);
        const status = src.approved_version_id ? 'approved' : 'draft';
        const position = src.collection_id ? await positionFor(q, src.collection_id, src.group_label, { excludeId: src.id }) : src.position;
        await q.query(`UPDATE knowledge_sources SET status = $2, position = $3, archived_at = NULL, archived_by = NULL, updated_at = now() WHERE id = $1`, [
          src.id,
          status,
          position,
        ]);
        await audit(q, { actorId: req.user.id, action: 'knowledge.restored', entityType: 'knowledge_source', entityId: src.id, details: { status }, ip: clientIp(req) });
      });
      res.json({ ok: true });
    }),
  );

  return r;
}
