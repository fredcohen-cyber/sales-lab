import { DEPTH_TEXT, DIFFICULTY_TEXT, SKEPTICISM_TEXT, stageLabel } from '../domain.js';

// Everything the learner sees, frozen into the attempt so later edits never rewrite history.
export function buildScenario({ drill, persona, settings, rubricDimensions, sources }) {
  const assessed = rubricDimensions.filter((d) => drill.assessed_dimensions.includes(d.key));
  const personaLines = drill.persona_lines || {};
  return {
    drillId: drill.id,
    drillVersionId: drill.version_id,
    drillVersion: drill.version,
    title: drill.title,
    stage: drill.stage,
    stageLabel: stageLabel(drill.stage),
    brand: drill.brand,
    subject: drill.subject,
    persona: {
      key: persona.key,
      label: persona.label,
      responsibilities: persona.responsibilities,
      concerns: persona.concerns,
    },
    situation: drill.situation,
    buyerLine: personaLines[persona.key] || drill.buyer_line,
    objective: drill.objective,
    goodLooksLike: drill.good_looks_like,
    settings: { difficulty: settings.difficulty, skepticism: settings.skepticism, depth: settings.depth },
    settingsText: {
      difficulty: DIFFICULTY_TEXT[settings.difficulty],
      skepticism: SKEPTICISM_TEXT[settings.skepticism],
      depth: DEPTH_TEXT[settings.depth],
    },
    assessedDimensions: assessed.map((d) => ({ key: d.key, label: d.label, weight: d.weight, description: d.description })),
    // Titles of sources that are not approved are never frozen into what learners can see.
    sources: sources.map((s) => ({
      sourceId: s.sourceId,
      title: s.title,
      available: s.available,
      reason: s.reason || null,
      version: s.version,
      asOfDate: s.asOfDate,
      evidenceBasis: s.evidenceBasis || null,
      sections: s.sections,
    })),
  };
}

// Before an answer is submitted the learner does not see the manager's "what good looks like" criteria.
export function previewOf(scenario) {
  const { goodLooksLike, ...rest } = scenario;
  return rest;
}
