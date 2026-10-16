import { parseSections } from '../lib/text.js';
import { BRANDS, SUBJECTS } from '../domain.js';

export const SOURCE_LIST_SQL = `
  SELECT s.id, s.slug, s.status, s.created_at, s.updated_at, s.archived_at,
         s.approved_version_id, s.latest_version_id,
         lv.version AS latest_version, lv.title AS latest_title, lv.brand AS latest_brand, lv.subjects AS latest_subjects,
         lv.personas AS latest_personas, lv.as_of_date AS latest_as_of, lv.created_at AS latest_created_at,
         lv.evidence_basis AS latest_evidence_basis, av.evidence_basis AS approved_evidence_basis,
         av.version AS approved_version, av.title AS approved_title, av.brand AS approved_brand, av.subjects AS approved_subjects,
         av.personas AS approved_personas, av.as_of_date AS approved_as_of, av.caveats AS approved_caveats,
         av.approved_at, length(COALESCE(av.content, lv.content)) AS content_length
    FROM knowledge_sources s
    JOIN knowledge_versions lv ON lv.id = s.latest_version_id
    LEFT JOIN knowledge_versions av ON av.id = s.approved_version_id`;

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
    updatedAt: r.updated_at,
    contentLength: r.content_length,
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

// Whether an approved source version may support coaching for a drill. A source fits when its brand
// matches (or either side covers both brands), it covers the drill's subject or sales technique, and it
// is not limited to other buyer personas. Only a source that covers the drill's own subject can make
// coaching available; technique-only material can support it but not stand in for missing product facts.
export function sourceFit(source, { brand, subject, persona = null }) {
  const reasons = [];
  if (!(source.brand === 'both' || brand === 'both' || source.brand === brand)) reasons.push('brand');
  const subjects = source.subjects || [];
  const coversSubject = subjects.includes(subject);
  if (!coversSubject && !subjects.includes('sales_technique')) reasons.push('subject');
  if (persona && (source.personas || []).length && !source.personas.includes(persona)) reasons.push('persona');
  return { usable: reasons.length === 0, primary: reasons.length === 0 && coversSubject, reasons };
}

export const FIT_TEXT = {
  brand: 'covers a different brand',
  subject: 'does not cover this subject or sales technique',
  persona: 'is limited to other buyer personas',
  not_approved: 'is not approved yet',
  archived: 'is archived',
  missing: 'was deleted',
  sections_missing: 'no longer has the sections this drill uses',
};

// Resolve a drill's source references to the currently approved versions and judge whether each fits.
// Titles of sources that are not approved are only returned as latestTitle, for managers.
export async function resolveSourceRefs(q, sourceRefs, drill = null, persona = null) {
  const refs = Array.isArray(sourceRefs) ? sourceRefs : [];
  if (refs.length === 0) return [];
  const ids = refs.map((r) => r.sourceId);
  const rows = await q.many(
    `SELECT s.id, s.slug, s.status, s.approved_version_id, av.version, av.title, av.as_of_date, av.caveats, av.brand, av.subjects,
            av.personas, av.evidence_basis, av.content, lv.title AS latest_title
       FROM knowledge_sources s
       JOIN knowledge_versions lv ON lv.id = s.latest_version_id
       LEFT JOIN knowledge_versions av ON av.id = s.approved_version_id
      WHERE s.id = ANY($1::uuid[])`,
    [ids],
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  return refs.map((ref) => {
    const r = byId.get(ref.sourceId);
    if (!r) {
      return { sourceId: ref.sourceId, available: false, usable: false, primary: false, reason: 'missing', title: null, latestTitle: 'Deleted source', sections: [], requestedSections: ref.sections || [], missingSections: [] };
    }
    const approved = r.status === 'approved' && Boolean(r.approved_version_id);
    const sections = approved ? parseSections(r.content) : [];
    const wanted = (ref.sections || []).filter(Boolean);
    const matched = wanted.length ? sections.filter((s) => wanted.includes(s.key)) : sections;
    const missingSections = approved ? wanted.filter((k) => !sections.some((s) => s.key === k)) : [];
    let reason = approved ? null : r.status === 'archived' ? 'archived' : 'not_approved';
    // If every section the drill relies on is gone from the approved version, the source cannot support it.
    if (approved && wanted.length && matched.length === 0) reason = 'sections_missing';
    const fit = approved && drill ? sourceFit({ brand: r.brand, subjects: r.subjects, personas: r.personas }, { brand: drill.brand, subject: drill.subject, persona }) : null;
    if (!reason && fit && !fit.usable) reason = fit.reasons[0];
    const available = reason === null;
    return {
      sourceId: r.id,
      slug: r.slug,
      title: approved ? r.title : null,
      latestTitle: r.latest_title,
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
      sections: matched.map((s) => ({ key: s.key, title: s.title })),
      missingSections,
    };
  });
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
      parts.push({ key: sec.key, title: sec.title, text });
    }
    out.push({
      ref: `S${i + 1}`,
      sourceId: s.sourceId,
      versionId: s.versionId,
      version: s.version,
      title: s.title,
      asOfDate: s.asOfDate,
      caveats: s.caveats,
      evidenceBasis: s.evidenceBasis || null,
      sections: parts,
    });
  });
  return out;
}
