import { aiConfigured } from '../config.js';
import { stageLabel } from '../domain.js';
import { buildSourceIndex, FIT_TEXT, mapSections, resolveRef } from '../knowledge/service.js';

export const DRILL_SQL = `
  SELECT d.id, d.slug, d.status, d.created_at, d.updated_at, v.id AS version_id, v.version, v.title, v.brand, v.subject, v.stage,
         v.roles, v.personas, v.situation, v.buyer_line, v.persona_lines, v.objective, v.good_looks_like,
         v.assessed_dimensions, v.default_difficulty, v.default_skepticism, v.default_depth, v.source_refs,
         v.role_guidance, v.pushbacks, v.change_note, v.created_at AS version_created_at
    FROM drills d JOIN drill_versions v ON v.id = d.current_version_id`;

export const DRILL_VERSION_SQL = `
  SELECT d.id, d.slug, d.status, v.id AS version_id, v.version, v.title, v.brand, v.subject, v.stage, v.roles, v.personas,
         v.situation, v.buyer_line, v.persona_lines, v.objective, v.good_looks_like, v.assessed_dimensions,
         v.default_difficulty, v.default_skepticism, v.default_depth, v.source_refs, v.role_guidance, v.pushbacks
    FROM drill_versions v JOIN drills d ON d.id = v.drill_id`;

// Source lookup for many drills at once (see buildSourceIndex).
export const sourceIndexFor = (q, drills) => buildSourceIndex(q, drills);

// Why coaching is unavailable for a drill's resolved sources, or null when it is available.
export function availabilityReason(config, sources, drill) {
  if (!aiConfigured(config)) return 'ai_not_configured';
  const approved = sources.filter((s) => !['missing', 'not_approved', 'archived'].includes(s.reason));
  if (approved.length === 0) return 'no_approved_sources';
  const primary = sources.filter((s) => s.available && s.primary);
  if (primary.length === 0) return sources.some((s) => s.reason === 'sections_missing') ? 'sections_missing' : 'no_relevant_sources';
  // A drill about both brands' products needs material for both: one shared source, or one per brand.
  if (drill?.brand === 'both' && drill.subject !== 'sales_technique') {
    const brands = new Set(primary.map((s) => s.brand));
    if (!brands.has('both') && !(brands.has('omnizant') && brands.has('ravenly'))) return 'no_relevant_sources';
  }
  return null;
}

// Drill-list availability. Persona limits are checked when a persona is chosen (see resolvePractice).
export function coachingAvailability(config, drill, index) {
  const refs = Array.isArray(drill.source_refs) ? drill.source_refs : [];
  const sources = refs.map((ref) => resolveRef(ref, index, drill));
  const reason = availabilityReason(config, sources, drill);
  return { available: reason === null, reason, sources };
}

export const UNAVAILABLE_TEXT = {
  ai_not_configured: 'AI coaching is not set up yet, so this question runs as unscored practice.',
  no_approved_sources: 'This question has no approved source material yet, so it runs as unscored practice.',
  no_relevant_sources:
    'None of the approved sources for this question cover its brand and subject (for a question about both brands, material for each), so it runs as unscored practice rather than being scored against unrelated material.',
  sections_missing:
    'The source sections this question uses are no longer in the approved material, so it runs as unscored practice until a manager updates the question.',
};

// For the editor: each reference's sections expressed as keys of the source's latest version, which is
// the version whose sections the editor lists (sections are followed by title across versions).
// Sections that cannot be found are listed as `unmatched` so the editor can show them instead of
// silently dropping them.
export function editorRefs(refs, index) {
  return (refs || []).map((ref) => {
    const src = index.byId.get(ref.sourceId);
    const wholeSource = !ref.sections?.length;
    // Archived material is never used for coaching; its references are kept as they are, so the editor
    // can list them as no longer available until a manager removes them.
    if (!src || wholeSource || ref.versionId === src.latest_version_id || src.status === 'archived') {
      return { sourceId: ref.sourceId, sections: ref.sections || [], versionId: src?.latest_version_id || ref.versionId, wholeSource, unmatched: [] };
    }
    const authored = index.sections.get(ref.versionId) || null;
    const latest = index.sections.get(src.latest_version_id) || [];
    const { matched, missing } = mapSections(ref.sections, authored, latest);
    return { sourceId: ref.sourceId, sections: matched.map((s) => s.key), versionId: src.latest_version_id, wholeSource: false, unmatched: missing };
  });
}

export function shapeDrill(row, availability, { forManager, index = null }) {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    versionId: row.version_id,
    version: row.version,
    title: row.title,
    brand: row.brand,
    subject: row.subject,
    stage: row.stage,
    stageLabel: stageLabel(row.stage),
    roles: row.roles,
    personas: row.personas,
    situation: row.situation,
    buyerLine: row.buyer_line,
    personaLines: row.persona_lines,
    objective: row.objective,
    goodLooksLike: forManager ? row.good_looks_like : undefined,
    // What a good answer adds for each rep role, and the buyer's likely follow-up objections: both are
    // part of the answer key, so only managers see them before answering.
    roleGuidance: forManager ? row.role_guidance || {} : undefined,
    pushbacks: forManager ? row.pushbacks || [] : undefined,
    assessedDimensions: row.assessed_dimensions,
    defaults: { difficulty: row.default_difficulty, skepticism: row.default_skepticism, depth: row.default_depth },
    sourceRefs: forManager ? (index ? editorRefs(row.source_refs, index) : row.source_refs) : undefined,
    coaching: {
      available: availability.available,
      reason: availability.reason,
      message: availability.reason ? UNAVAILABLE_TEXT[availability.reason] : null,
    },
    // Learners never see the titles of sources that are not approved.
    sources: availability.sources.map((s) => ({
      sourceId: s.sourceId,
      title: forManager ? s.title || s.latestTitle : s.title,
      // Learners learn a collection's name only from material they may read.
      collectionName: forManager || s.title ? s.collectionName || null : null,
      available: s.available,
      reason: s.reason,
      reasonText: s.reason ? FIT_TEXT[s.reason] : null,
    })),
    changeNote: forManager ? row.change_note : undefined,
    updatedAt: row.updated_at,
  };
}
