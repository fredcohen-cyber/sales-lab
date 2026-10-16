import { aiConfigured } from '../config.js';
import { stageLabel } from '../domain.js';

export const DRILL_SQL = `
  SELECT d.id, d.slug, d.status, d.created_at, d.updated_at, v.id AS version_id, v.version, v.title, v.brand, v.subject, v.stage,
         v.roles, v.personas, v.situation, v.buyer_line, v.persona_lines, v.objective, v.good_looks_like,
         v.assessed_dimensions, v.default_difficulty, v.default_skepticism, v.default_depth, v.source_refs,
         v.change_note, v.created_at AS version_created_at
    FROM drills d JOIN drill_versions v ON v.id = d.current_version_id`;

export const DRILL_VERSION_SQL = `
  SELECT d.id, d.slug, d.status, v.id AS version_id, v.version, v.title, v.brand, v.subject, v.stage, v.roles, v.personas,
         v.situation, v.buyer_line, v.persona_lines, v.objective, v.good_looks_like, v.assessed_dimensions,
         v.default_difficulty, v.default_skepticism, v.default_depth, v.source_refs
    FROM drill_versions v JOIN drills d ON d.id = v.drill_id`;

// Approved-source lookup for many drills at once.
export async function sourceStatusMap(q) {
  const rows = await q.many(
    `SELECT s.id, s.status, s.approved_version_id, COALESCE(av.title, lv.title) AS title
       FROM knowledge_sources s
       JOIN knowledge_versions lv ON lv.id = s.latest_version_id
       LEFT JOIN knowledge_versions av ON av.id = s.approved_version_id`,
  );
  return new Map(rows.map((r) => [r.id, { title: r.title, available: r.status === 'approved' && Boolean(r.approved_version_id), status: r.status }]));
}

export function coachingAvailability(config, drill, sourceMap) {
  const refs = Array.isArray(drill.source_refs) ? drill.source_refs : [];
  const sources = refs.map((ref) => {
    const s = sourceMap.get(ref.sourceId);
    return { sourceId: ref.sourceId, title: s?.title || 'Missing source', available: Boolean(s?.available), sections: ref.sections || [] };
  });
  let reason = null;
  if (!aiConfigured(config)) reason = 'ai_not_configured';
  else if (!sources.some((s) => s.available)) reason = 'no_approved_sources';
  return { available: reason === null, reason, sources };
}

export const UNAVAILABLE_TEXT = {
  ai_not_configured: 'AI coaching is not set up yet, so this drill runs as unscored practice.',
  no_approved_sources: 'This drill has no approved source material yet, so it runs as unscored practice.',
};

export function shapeDrill(row, availability, { forManager }) {
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
    assessedDimensions: row.assessed_dimensions,
    defaults: { difficulty: row.default_difficulty, skepticism: row.default_skepticism, depth: row.default_depth },
    sourceRefs: forManager ? row.source_refs : undefined,
    coaching: {
      available: availability.available,
      reason: availability.reason,
      message: availability.reason ? UNAVAILABLE_TEXT[availability.reason] : null,
    },
    sources: availability.sources.map((s) => ({ sourceId: s.sourceId, title: s.title, available: s.available })),
    changeNote: forManager ? row.change_note : undefined,
    updatedAt: row.updated_at,
  };
}
