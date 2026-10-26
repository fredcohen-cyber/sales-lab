import { DEPTH_TEXT, DIFFICULTY_TEXT, pushbacksFor, REP_ROLE_CONTEXT, ROLES, SKEPTICISM_TEXT, STAGES, stageLabel } from '../domain.js';

// The rep role an answer is judged for: the rep's own role when the drill is written for it, otherwise
// (managers practicing, or a drill for the other role) the role the drill's stage trains.
export function practiceRole(user, drill) {
  const roles = drill.roles || [];
  if (roles.includes(user.role)) return user.role;
  const track = STAGES.find((s) => s.key === drill.stage)?.track;
  if (track && roles.includes(track)) return track;
  return roles[0] || track || 'ae';
}

// What a good answer does: the shared criteria plus what the drill adds for the rep's role.
export function expectationsFor(drill, role) {
  const extra = String((drill.role_guidance || {})[role] || '').trim();
  return extra ? `${drill.good_looks_like}\n\nFor an ${ROLES[role].toLowerCase()}:\n${extra}` : drill.good_looks_like;
}

// How many replies a conversation has: the opening reply plus one per pushback. Coaching writes each
// pushback from what the rep said; unscored practice can only use the drill's written pushbacks.
export function repliesPlanned({ difficulty, coached, pushbacks }) {
  const wanted = pushbacksFor(difficulty);
  return 1 + (coached ? wanted : Math.min(wanted, (pushbacks || []).length));
}

// Everything the learner sees, frozen into the attempt so later edits never rewrite history.
export function buildScenario({ drill, persona, settings, rubricDimensions, sources, role, replies = 1 }) {
  const assessed = rubricDimensions.filter((d) => drill.assessed_dimensions.includes(d.key));
  const personaLines = drill.persona_lines || {};
  const repRole = role || (drill.roles || [])[0] || 'ae';
  return {
    drillId: drill.id,
    drillVersionId: drill.version_id,
    drillVersion: drill.version,
    title: drill.title,
    stage: drill.stage,
    stageLabel: stageLabel(drill.stage),
    brand: drill.brand,
    subject: drill.subject,
    repRole,
    repRoleLabel: ROLES[repRole],
    repRoleContext: REP_ROLE_CONTEXT[repRole],
    persona: {
      key: persona.key,
      label: persona.label,
      responsibilities: persona.responsibilities,
      concerns: persona.concerns,
    },
    situation: drill.situation,
    buyerLine: personaLines[persona.key] || drill.buyer_line,
    objective: drill.objective,
    goodLooksLike: expectationsFor(drill, repRole),
    // The buyer's likely follow-up objections, in order. Never shown to the rep before they happen.
    pushbacks: Array.isArray(drill.pushbacks) ? drill.pushbacks : [],
    conversation: { turn: 1, replies, history: [] },
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
      collectionName: s.title ? s.collectionName || null : null,
      available: s.available,
      reason: s.reason || null,
      version: s.version,
      asOfDate: s.asOfDate,
      evidenceBasis: s.evidenceBasis || null,
      sections: s.sections,
    })),
  };
}

// The scenario for the next reply in a conversation: the buyer's new line, with the earlier turns.
export function continueScenario(scenario, { buyerLine, previousAnswer }) {
  const conv = scenario.conversation || { turn: 1, replies: 1, history: [] };
  return {
    ...scenario,
    buyerLine,
    conversation: {
      ...conv,
      turn: conv.turn + 1,
      history: [...(conv.history || []), { turn: conv.turn, buyerLine: scenario.buyerLine, answer: previousAnswer }],
    },
  };
}

// The pushbacks are part of the answer key: managers see them, reps only meet them in the conversation.
export function scenarioFor(viewer, scenario) {
  if (viewer?.isManager || !scenario) return scenario;
  const { pushbacks, ...rest } = scenario;
  return rest;
}

// Before an answer is submitted the learner does not see the manager's "what good looks like" criteria.
export function previewOf(scenario) {
  const { goodLooksLike, pushbacks, ...rest } = scenario;
  return rest;
}
