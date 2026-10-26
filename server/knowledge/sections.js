// Collections and sections: the Sales Playbook and each brand's product knowledge are collections, and
// each section of a collection is a knowledge source of its own (edited, versioned, and approved alone).
import { HttpError, notFound } from '../lib/errors.js';
import { audit } from '../lib/audit.js';
import { parseSections, slugify } from '../lib/text.js';
import { mapSections, sectionTitleKey } from './service.js';

export const COLLECTION_KINDS = {
  playbook: 'Sales playbook',
  product: 'Product knowledge',
};

// The subjects a new section starts with, by the kind of collection it belongs to.
export const KIND_SUBJECTS = { playbook: ['sales_technique'], product: ['product'] };

// Split Markdown at its "## " headings. The text before the first heading (without a "# " title line)
// is returned as the introduction. Each section's own heading becomes its title, not part of its text.
export function splitDocument(markdown) {
  const parts = parseSections(markdown);
  const introPart = parts.find((p) => p.key === 'intro');
  const intro = introPart
    ? introPart.text
        .split('\n')
        .filter((line) => !/^#\s+/.test(line))
        .join('\n')
        .trim()
    : '';
  const sections = parts
    .filter((p) => p.key !== 'intro')
    .map((p) => ({ key: p.key, title: p.title, content: p.text.replace(/^##\s+.*(\n|$)/, '').trim() }));
  return { intro, sections };
}

async function uniqueSlug(q, base) {
  const root = base.slice(0, 120) || 'section';
  let slug = root;
  for (let n = 2; await q.one(`SELECT 1 FROM knowledge_sources WHERE slug = $1`, [slug]); n += 1) slug = `${root}-${n}`;
  return slug;
}

export async function createCollection(q, { slug = null, name, kind, brand, description = '', position = null, actorId }) {
  const pos = position ?? (await q.one(`SELECT COALESCE(max(position), 0) + 1 AS p FROM knowledge_collections`)).p;
  return q.one(
    `INSERT INTO knowledge_collections (slug, name, kind, brand, description, position, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
    [slug, name, kind, brand, description, pos, actorId],
  );
}

// Where a new or moved section goes: right after the last section of its group, or at the end.
export async function positionFor(q, collectionId, group = '', { excludeId = null } = {}) {
  if (group) {
    const last = await q.one(
      `SELECT max(position) AS p FROM knowledge_sources
        WHERE collection_id = $1 AND group_label = $2 AND status <> 'archived' AND id IS DISTINCT FROM $3`,
      [collectionId, group, excludeId],
    );
    if (last.p !== null) {
      await q.query(`UPDATE knowledge_sources SET position = position + 1 WHERE collection_id = $1 AND position > $2`, [collectionId, last.p]);
      return last.p + 1;
    }
  }
  return (await q.one(`SELECT COALESCE(max(position), 0) + 1 AS p FROM knowledge_sources WHERE collection_id = $1`, [collectionId])).p;
}
const nextPosition = (q, collectionId, group) => positionFor(q, collectionId, group);

// A new section with its first version. Approved only when asked (the seed's drafts are not).
export async function createSection(q, { collection, title, content, brand, subjects, personas = [], asOfDate = null, caveats = '', evidenceBasis = 'documented', group = '', changeNote = '', approve = false, append = false, actorId }) {
  const slug = await uniqueSlug(q, `${collection.slug || slugify(collection.name)}/${slugify(sectionTitleKey(title)) || 'section'}`);
  const src = await q.one(
    `INSERT INTO knowledge_sources (slug, collection_id, position, group_label, status, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [slug, collection.id, await nextPosition(q, collection.id, append ? '' : group), group, approve ? 'approved' : 'draft', actorId],
  );
  const v = await q.one(
    `INSERT INTO knowledge_versions (source_id, version, title, brand, subjects, personas, as_of_date, caveats, content, change_note, created_by,
       approved_at, approved_by, evidence_basis)
     VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $11 THEN now() END, CASE WHEN $11 THEN $10::uuid END, $12) RETURNING id`,
    [src.id, title, brand, subjects, personas, asOfDate, caveats, content, changeNote, actorId, approve, evidenceBasis],
  );
  await q.query(`UPDATE knowledge_sources SET latest_version_id = $2, approved_version_id = CASE WHEN $3 THEN $2::uuid END WHERE id = $1`, [src.id, v.id, approve]);
  return { sourceId: src.id, versionId: v.id, slug };
}

// Which version a split uses: the approved version, or the only draft when nothing is approved yet. An
// unapproved draft on top of an approved version blocks the split, so no edit is left behind.
async function splitBasis(q, src) {
  const approved = src.status === 'approved' && Boolean(src.approved_version_id);
  const version = await q.one(`SELECT * FROM knowledge_versions WHERE id = $1`, [approved ? src.approved_version_id : src.latest_version_id]);
  const draft =
    approved && src.latest_version_id !== src.approved_version_id
      ? await q.one(`SELECT version FROM knowledge_versions WHERE id = $1`, [src.latest_version_id])
      : null;
  return { approved, version, draft, doc: splitDocument(version.content) };
}

// What splitting a document would do, for the split dialog. Null when the document cannot be split at all.
export async function previewSplit(q, src) {
  if (src.collection_id || src.split_into_collection_id || src.status === 'archived' || !src.latest_version_id) return null;
  const { version, draft, doc } = await splitBasis(q, src);
  if (doc.sections.length < 2) return null;
  return { version: version.version, sections: doc.sections.length, hasIntro: Boolean(doc.intro), pendingDraftVersion: draft ? draft.version : null };
}

// Turn one long document into sections of a collection. The document's approved version (or its only
// draft) is split at its "## " headings; each section keeps the document's metadata unless `meta` gives
// it its own subjects or group. Sections of an approved document start approved, since their text is
// exactly what was approved. Every drill that pointed at the document's sections now points at the
// matching new sections, and the document is archived with a pointer to the collection, so past answers
// keep the exact versions they were scored with.
export async function splitSourceIntoCollection(q, { sourceId, collectionId, actorId, meta = () => ({}), intro = 'auto', changeNote = '', ip = null }) {
  const src = await q.one(`SELECT * FROM knowledge_sources WHERE id = $1 FOR UPDATE`, [sourceId]);
  if (!src) throw notFound('That source was not found.');
  if (src.collection_id) throw new HttpError(409, 'already_section', 'This is already a section of a collection.');
  if (src.split_into_collection_id) throw new HttpError(409, 'already_split', 'This document was already split into sections.');
  if (src.status === 'archived') throw new HttpError(409, 'archived', 'Restore this document before splitting it.');
  const collection = await q.one(`SELECT * FROM knowledge_collections WHERE id = $1 FOR UPDATE`, [collectionId]);
  if (!collection) throw notFound('That collection was not found.');

  const { approved, version, draft, doc } = await splitBasis(q, src);
  if (draft) {
    throw new HttpError(
      409,
      'pending_draft',
      `This document has an unapproved draft (version ${draft.version}). Approve it, or save the approved text again as the newest version, before splitting, so no edit is left behind.`,
    );
  }
  if (doc.sections.length < 2) {
    throw new HttpError(400, 'nothing_to_split', 'This document has fewer than two sections that start with “## ”, so there is nothing to split.');
  }
  const note = changeNote || `Split from “${version.title}” (version ${version.version}) so each section can be edited and approved on its own.`;
  const base = {
    collection,
    brand: version.brand,
    personas: version.personas,
    asOfDate: version.as_of_date,
    caveats: version.caveats,
    evidenceBasis: version.evidence_basis,
    changeNote: note,
    approve: approved,
    append: true,
    actorId,
  };

  // The introduction becomes the collection's description when it has none, otherwise its own section.
  const byKey = new Map();
  if (doc.intro && intro !== 'skip') {
    if (intro === 'auto' && !collection.description.trim()) {
      await q.query(`UPDATE knowledge_collections SET description = $2, updated_at = now(), updated_by = $3 WHERE id = $1`, [collection.id, doc.intro, actorId]);
    } else {
      byKey.set('intro', await createSection(q, { ...base, title: 'Introduction', content: doc.intro, subjects: version.subjects }));
    }
  }
  for (const sec of doc.sections) {
    const m = meta(sec) || {};
    const made = await createSection(q, { ...base, title: sec.title, content: sec.content, subjects: m.subjects || version.subjects, group: m.group || '' });
    byKey.set(sec.key, made);
  }

  // Re-point drills. A reference to chosen sections is followed by title from the version it was written
  // against (as coaching does); a reference to the whole document becomes every section. Chosen sections
  // that cannot be found stay pointed at the archived document, so the drill editor lists them as no
  // longer available instead of dropping them without a trace.
  const splitSections = parseSections(version.content);
  const affected = await q.many(`SELECT id, source_refs FROM drill_versions WHERE source_refs @> $1::jsonb`, [JSON.stringify([{ sourceId }])]);
  const authoredIds = [...new Set(affected.flatMap((d) => d.source_refs.filter((r) => r.sourceId === sourceId && r.versionId).map((r) => r.versionId)))];
  const authored = new Map(
    (await q.many(`SELECT id, content FROM knowledge_versions WHERE id = ANY($1::uuid[])`, [authoredIds])).map((r) => [r.id, parseSections(r.content)]),
  );
  const unmatched = [];
  for (const d of affected) {
    const refs = [];
    const add = (ref) => {
      if (!refs.some((r) => r.sourceId === ref.sourceId)) refs.push(ref);
    };
    for (const ref of d.source_refs) {
      if (ref.sourceId !== sourceId) {
        add(ref);
        continue;
      }
      let keys = [];
      const lost = [];
      if (ref.sections?.length) {
        for (const k of ref.sections) {
          const hit = mapSections([k], authored.get(ref.versionId) || null, splitSections).matched[0];
          if (hit && byKey.has(hit.key)) keys.push(hit.key);
          else lost.push(k);
        }
      } else {
        keys = [...byKey.keys()];
      }
      for (const key of keys) {
        const made = byKey.get(key);
        add({ sourceId: made.sourceId, sections: [], versionId: made.versionId });
      }
      if (lost.length) {
        add({ sourceId, sections: lost, versionId: ref.versionId });
        unmatched.push({ drillVersionId: d.id, sections: lost });
      }
    }
    await q.query(`UPDATE drill_versions SET source_refs = $2 WHERE id = $1`, [d.id, JSON.stringify(refs)]);
  }

  await q.query(
    `UPDATE knowledge_sources SET status = 'archived', archived_at = now(), archived_by = $2, split_into_collection_id = $3, updated_at = now() WHERE id = $1`,
    [sourceId, actorId, collection.id],
  );
  await audit(q, {
    actorId,
    action: 'knowledge.split',
    entityType: 'knowledge_source',
    entityId: sourceId,
    details: {
      collectionId: collection.id,
      versionId: version.id,
      sections: byKey.size,
      drillVersionsUpdated: affected.length,
      // References that could not follow their section; they still point at the archived document.
      unmatched: unmatched.slice(0, 100),
    },
    ip,
  });
  return { sections: [...byKey.values()], drillVersionsUpdated: affected.length, unmatched };
}
