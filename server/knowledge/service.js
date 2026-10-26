import { parseSections } from '../lib/text.js';
import { BRANDS, SUBJECTS } from '../domain.js';

export const SOURCE_LIST_SQL = `
  SELECT s.id, s.slug, s.status, s.created_at, s.updated_at, s.archived_at,
         s.approved_version_id, s.latest_version_id,
         s.collection_id, s.position, s.group_label, s.split_into_collection_id,
         c.name AS collection_name, c.kind AS collection_kind, c.position AS collection_position,
         lv.version AS latest_version, lv.title AS latest_title, lv.brand AS latest_brand, lv.subjects AS latest_subjects,
         lv.personas AS latest_personas, lv.as_of_date AS latest_as_of, lv.created_at AS latest_created_at,
         lv.evidence_basis AS latest_evidence_basis, av.evidence_basis AS approved_evidence_basis,
         av.version AS approved_version, av.title AS approved_title, av.brand AS approved_brand, av.subjects AS approved_subjects,
         av.personas AS approved_personas, av.as_of_date AS approved_as_of, av.caveats AS approved_caveats,
         av.approved_at, length(COALESCE(av.content, lv.content)) AS content_length
    FROM knowledge_sources s
    JOIN knowledge_versions lv ON lv.id = s.latest_version_id
    LEFT JOIN knowledge_versions av ON av.id = s.approved_version_id
    LEFT JOIN knowledge_collections c ON c.id = s.collection_id`;

// Library order: collections in their order, sections in theirs; other documents last, newest first.
export const SOURCE_LIST_ORDER = `ORDER BY c.position NULLS LAST, s.position, CASE WHEN s.collection_id IS NULL THEN s.updated_at END DESC, s.created_at, s.id`;

export function shapeSourceRow(r, { forManager }) {
  const approved = r.approved_version_id
    ? {
        id: r.approved_version_id,
        version: r.approved_version,
        title: r.approved_title,
        brand: r.approved_brand,
        subjects: r.approved_subjects,
        personas: r.approved_personas,
        asOfDate: r.approved_as_of,
        caveats: r.approved_caveats,
        evidenceBasis: r.approved_evidence_basis,
        approvedAt: r.approved_at,
      }
    : null;
  const latest = {
    id: r.latest_version_id,
    version: r.latest_version,
    title: r.latest_title,
    brand: r.latest_brand,
    subjects: r.latest_subjects,
    personas: r.latest_personas,
    asOfDate: r.latest_as_of,
    evidenceBasis: r.latest_evidence_basis,
    createdAt: r.latest_created_at,
  };
  const shown = forManager ? latest : approved;
  return {
    id: r.id,
    slug: r.slug,
    status: r.status,
    title: shown.title,
    brand: shown.brand,
    subjects: shown.subjects,
    personas: shown.personas,
    asOfDate: shown.asOfDate,
    evidenceBasis: shown.evidenceBasis,
    approved: forManager ? approved : approved && { id: approved.id, version: approved.version, approvedAt: approved.approvedAt },
    latest: forManager ? latest : undefined,
    hasPendingDraft: forManager ? Boolean(approved && latest.id !== approved.id) : undefined,
    collectionId: r.collection_id || null,
    collectionName: r.collection_name || null,
    group: r.group_label || '',
    position: r.position,
    splitIntoCollectionId: r.split_into_collection_id || null,
    updatedAt: r.updated_at,
    contentLength: r.content_length,
  };
}

// Collections with their section counts. Learners see a collection only once it has an approved section.
export async function listCollections(q, { forManager }) {
  const rows = await q.many(
    `SELECT c.*,
            count(s.id) FILTER (WHERE s.status <> 'archived') AS sections,
            count(s.id) FILTER (WHERE s.status = 'approved') AS approved,
            count(s.id) FILTER (WHERE s.status = 'draft') AS drafts,
            count(s.id) FILTER (WHERE s.status = 'approved' AND s.latest_version_id <> s.approved_version_id) AS pending_edits
       FROM knowledge_collections c
       LEFT JOIN knowledge_sources s ON s.collection_id = c.id
      GROUP BY c.id
      ORDER BY c.position, c.name`,
  );
  return rows
    .filter((c) => forManager || c.approved > 0)
    .map((c) => shapeCollection(c, { forManager }));
}

export function shapeCollection(c, { forManager }) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    kind: c.kind,
    brand: c.brand,
    description: c.description,
    position: c.position,
    counts:
      c.sections === undefined
        ? undefined
        : forManager
          ? { sections: c.sections, approved: c.approved, drafts: c.drafts, pendingEdits: c.pending_edits }
          : { sections: c.approved },
    updatedAt: c.updated_at,
  };
}

// Which brand/subject combinations have approved, active material. Drives "missing material" notices.
export async function coverage(q) {
  const rows = await q.many(
    `SELECT av.brand, unnest(av.subjects) AS subject, count(*) AS n
       FROM knowledge_sources s JOIN knowledge_versions av ON av.id = s.approved_version_id
      WHERE s.status = 'approved'
      GROUP BY 1, 2`,
  );
  const out = {};
  for (const brand of ['omnizant', 'ravenly']) {
    out[brand] = {};
    for (const subject of Object.keys(SUBJECTS)) {
      out[brand][subject] = rows
        .filter((r) => r.subject === subject && (r.brand === brand || r.brand === 'both'))
        .reduce((a, r) => a + r.n, 0);
    }
  }
  const missing = [];
  for (const brand of ['omnizant', 'ravenly']) {
    for (const subject of ['product', 'competitive']) {
      if (!out[brand][subject]) missing.push({ brand, subject, label: `${BRANDS[brand]} ${SUBJECTS[subject].toLowerCase()}` });
    }
  }
  return { counts: out, missing };
}

// Product facts and competitive facts about the same brand support each other's drills: a competitor
// comparison needs the product's own facts, and a product drill may need the competitive context.
const SUPPORTING_SUBJECTS = { product: ['competitive'], competitive: ['product'], sales_technique: [] };

// Whether an approved source version may support coaching for a drill. A source fits when its brand
// matches (or either side covers both brands), it covers the drill's subject, a related subject, or
// sales technique, and it is not limited to other buyer personas. Only a source that covers the drill's
// own subject can make coaching available; supporting material never stands in for missing facts.
export function sourceFit(source, { brand, subject, persona = null }) {
  const reasons = [];
  if (!(source.brand === 'both' || brand === 'both' || source.brand === brand)) reasons.push('brand');
  const subjects = source.subjects || [];
  const coversSubject = subjects.includes(subject);
  const supports = subjects.includes('sales_technique') || (SUPPORTING_SUBJECTS[subject] || []).some((s) => subjects.includes(s));
  if (!coversSubject && !supports) reasons.push('subject');
  if (persona && (source.personas || []).length && !source.personas.includes(persona)) reasons.push('persona');
  return { usable: reasons.length === 0, primary: reasons.length === 0 && coversSubject, reasons };
}

export const FIT_TEXT = {
  brand: 'covers a different brand',
  subject: 'does not cover this subject, a related one, or sales technique',
  persona: 'is limited to other buyer personas',
  not_approved: 'is not approved yet',
  archived: 'is archived',
  missing: 'was deleted',
  sections_missing: 'no longer has the sections this drill uses',
};

// Parsed sections of immutable versions, kept in memory: a version's text never changes. The result is
// built from what this call fetched, so evicting older cache entries can never drop a version it needs.
const sectionCache = new Map();
export const SECTION_CACHE_MAX = 500;
export async function loadVersionSections(q, versionIds) {
  const ids = [...new Set(versionIds.filter(Boolean))];
  const out = new Map();
  const needed = [];
  for (const id of ids) {
    if (sectionCache.has(id)) out.set(id, sectionCache.get(id));
    else needed.push(id);
  }
  if (needed.length) {
    const rows = await q.many(`SELECT id, content FROM knowledge_versions WHERE id = ANY($1::uuid[])`, [needed]);
    for (const r of rows) {
      const parsed = parseSections(r.content);
      out.set(r.id, parsed);
      if (sectionCache.size >= SECTION_CACHE_MAX) sectionCache.delete(sectionCache.keys().next().value);
      sectionCache.set(r.id, parsed);
    }
  }
  return out;
}

// "05 · Pricing" and "6. Pricing" are the same section title once the number is set aside.
export function sectionTitleKey(title) {
  return String(title || '')
    .replace(/^\s*\d{1,3}\s*(?:[·.:)\-]|\s)\s*/, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Finds the sections a drill chose (keys from the version it was authored against) in another version.
// Sections are followed by title, so renumbering is harmless. A key whose title changed is not used,
// because the number may now point at different material; managers see it as missing.
export function mapSections(wanted, authored, current) {
  const matched = [];
  const missing = [];
  for (const key of wanted) {
    const a = authored ? authored.find((s) => s.key === key) : null;
    const t = a ? sectionTitleKey(a.title) : null;
    let hit = t ? current.find((s) => sectionTitleKey(s.title) === t) : null;
    if (!hit) {
      const byKey = current.find((s) => s.key === key);
      if (byKey && (!t || sectionTitleKey(byKey.title) === t)) hit = byKey;
      else if (byKey) {
        missing.push({ key, title: a.title, why: 'retitled', nowTitle: byKey.title });
        continue;
      }
    }
    if (hit) {
      if (!matched.includes(hit)) matched.push(hit);
    } else {
      missing.push({ key, title: a?.title || key, why: 'removed' });
    }
  }
  return { matched, missing };
}

const SOURCE_ROWS_SQL = `
  SELECT s.id, s.slug, s.status, s.approved_version_id, s.latest_version_id, av.version, av.title, av.as_of_date, av.caveats,
         av.brand, av.subjects, av.personas, av.evidence_basis, lv.title AS latest_title,
         s.collection_id, c.name AS collection_name
    FROM knowledge_sources s
    JOIN knowledge_versions lv ON lv.id = s.latest_version_id
    LEFT JOIN knowledge_versions av ON av.id = s.approved_version_id
    LEFT JOIN knowledge_collections c ON c.id = s.collection_id`;

// Everything needed to judge many drills' sources at once: source rows plus parsed sections of the
// approved versions and of the versions the drills were authored against.
export async function buildSourceIndex(q, drills, { sourceIds = null } = {}) {
  const rows = sourceIds ? await q.many(`${SOURCE_ROWS_SQL} WHERE s.id = ANY($1::uuid[])`, [sourceIds]) : await q.many(SOURCE_ROWS_SQL);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const versionIds = rows.flatMap((r) => [r.approved_version_id, r.latest_version_id]);
  for (const d of drills) for (const ref of d.source_refs || []) versionIds.push(ref.versionId);
  return { byId, sections: await loadVersionSections(q, versionIds) };
}

// Resolve one drill source reference against the approved version, and judge whether it fits.
// Titles of sources that are not approved are only returned as latestTitle, for managers.
export function resolveRef(ref, index, drill = null, persona = null) {
  const r = index.byId.get(ref.sourceId);
  const wanted = (ref.sections || []).filter(Boolean);
  if (!r) {
    return { sourceId: ref.sourceId, available: false, usable: false, primary: false, reason: 'missing', title: null, latestTitle: 'Deleted source', collectionName: null, sections: [], requestedSections: wanted, missingSections: [] };
  }
  const approved = r.status === 'approved' && Boolean(r.approved_version_id);
  let matched = [];
  let missing = [];
  if (approved) {
    const current = index.sections.get(r.approved_version_id) || [];
    if (wanted.length) {
      const authored = ref.versionId ? index.sections.get(ref.versionId) || null : null;
      ({ matched, missing } = mapSections(wanted, authored, current));
    } else {
      matched = current;
    }
  }
  let reason = approved ? null : r.status === 'archived' ? 'archived' : 'not_approved';
  // If none of the sections the drill relies on can be found, the source cannot support it.
  if (approved && wanted.length && matched.length === 0) reason = 'sections_missing';
  const fit = approved && drill ? sourceFit({ brand: r.brand, subjects: r.subjects, personas: r.personas }, { brand: drill.brand, subject: drill.subject, persona }) : null;
  if (!reason && fit && !fit.usable) reason = fit.reasons[0];
  const available = reason === null;
  return {
    sourceId: r.id,
    slug: r.slug,
    title: approved ? r.title : null,
    latestTitle: r.latest_title,
    // The collection a section belongs to, so people and coaching see "Sales Playbook › Objections".
    collectionId: r.collection_id || null,
    collectionName: r.collection_name || null,
    available,
    usable: available,
    primary: available && (fit ? fit.primary : true),
    reason,
    versionId: approved ? r.approved_version_id : null,
    version: approved ? r.version : null,
    asOfDate: approved ? r.as_of_date : null,
    caveats: approved ? r.caveats : '',
    brand: approved ? r.brand : null,
    subjects: approved ? r.subjects : [],
    evidenceBasis: approved ? r.evidence_basis : null,
    requestedSections: wanted,
    sections: matched.map((x) => ({ key: x.key, title: x.title })),
    missingSections: missing,
  };
}

export async function resolveSourceRefs(q, sourceRefs, drill = null, persona = null) {
  const refs = Array.isArray(sourceRefs) ? sourceRefs : [];
  if (refs.length === 0) return [];
  const index = await buildSourceIndex(q, [{ source_refs: refs }], { sourceIds: refs.map((x) => x.sourceId) });
  return refs.map((ref) => resolveRef(ref, index, drill, persona));
}

const MAX_SOURCE_CHARS = 90_000;

// Load the exact text of the snapshot's source versions for the coaching prompt (versions are immutable).
export async function loadSourceText(q, sourceVersions) {
  const usable = (sourceVersions || []).filter((s) => s.versionId);
  if (usable.length === 0) return [];
  const rows = await q.many(`SELECT id, content FROM knowledge_versions WHERE id = ANY($1::uuid[])`, [usable.map((s) => s.versionId)]);
  const byId = new Map(rows.map((r) => [r.id, r.content]));
  let budget = MAX_SOURCE_CHARS;
  const out = [];
  usable.forEach((s, i) => {
    const content = byId.get(s.versionId) || '';
    const all = parseSections(content);
    const keys = (s.sections || []).map((x) => x.key);
    const chosen = keys.length ? all.filter((sec) => keys.includes(sec.key)) : all;
    const parts = [];
    for (const sec of chosen) {
      if (budget <= 0) break;
      const text = sec.text.length > budget ? sec.text.slice(0, budget) + '\n[…section truncated for length]' : sec.text;
      budget -= text.length;
      // The text before any "## " heading (all of a typical collection section) is named after the source.
      const title = sec.key === 'intro' ? s.title : sec.title;
      parts.push({ key: sec.key, title, text });
    }
    out.push({
      ref: `S${i + 1}`,
      sourceId: s.sourceId,
      versionId: s.versionId,
      version: s.version,
      title: s.title,
      collectionName: s.collectionName || null,
      asOfDate: s.asOfDate,
      caveats: s.caveats,
      evidenceBasis: s.evidenceBasis || null,
      sections: parts,
    });
  });
  return out;
}
