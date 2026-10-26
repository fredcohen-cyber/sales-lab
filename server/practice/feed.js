// The Practice Studio feed: reps choose a stage, never a question. Each stage serves one question at a
// random from the questions written for the rep's role, preferring ones they have not answered yet and
// ones coaching can score. The question waits until it is answered, and a conversation the rep has
// not finished in that stage comes back first, so skipping never leads to an easier question.
import { HttpError } from '../lib/errors.js';
import { aiConfigured } from '../config.js';
import { STAGES } from '../domain.js';
import { availabilityReason, DRILL_SQL } from '../drills/service.js';
import { buildSourceIndex, resolveRef } from '../knowledge/service.js';

// The role a person practices a stage as: reps their own role, managers the role the stage trains.
export function feedRole(user, stage) {
  return ['ae', 'am'].includes(user.role) ? user.role : stage.track;
}

// The other role's stages are offered to reps only when enough questions there are written for them.
const MIN_QUESTIONS_FROM_OTHER_TRACK = 3;

async function activeDrills(q) {
  return q.many(`${DRILL_SQL} WHERE d.status = 'active'`);
}

// Personas of a drill that coaching can score (or all of them when coaching is off).
function coachablePersonas(config, drill, index) {
  if (!aiConfigured(config)) return drill.personas;
  return drill.personas.filter((persona) => {
    const sources = (drill.source_refs || []).map((ref) => resolveRef(ref, index, drill, persona));
    return availabilityReason(config, sources, drill) === null;
  });
}

// Conversations the person started outside assignments and has not finished: the latest reply of each.
// A coached conversation cannot go on while coaching is switched off, so it does not hold up the stage.
const UNFINISHED_SQL = `
  SELECT a.id, a.stage, a.conversation_id, a.submitted_at FROM attempts a
   WHERE a.learner_id = $1 AND a.assignment_item_id IS NULL AND a.turn_number < a.replies_planned
     AND ($2 OR a.mode <> 'coached')
     AND NOT EXISTS (SELECT 1 FROM attempts n WHERE n.conversation_id = a.conversation_id AND n.turn_number = a.turn_number + 1)`;

async function unfinishedConversation(q, config, userId, stage) {
  return q.one(`${UNFINISHED_SQL} AND a.stage = $3 ORDER BY a.submitted_at DESC LIMIT 1`, [userId, aiConfigured(config), stage]);
}

export async function stageOverview(q, config, user) {
  const drills = await activeDrills(q);
  const index = await buildSourceIndex(q, drills);
  const practiced = await q.many(
    `SELECT stage, count(DISTINCT drill_id)::int AS questions, count(*)::int AS conversations
       FROM attempts WHERE learner_id = $1 AND turn_number = 1 GROUP BY stage`,
    [user.id],
  );
  const open = await q.many(`SELECT DISTINCT ON (u.stage) u.stage, u.id FROM (${UNFINISHED_SQL}) u ORDER BY u.stage, u.submitted_at DESC`, [
    user.id,
    aiConfigured(config),
  ]);
  const pending = new Set((await q.many(`SELECT stage FROM practice_draws WHERE learner_id = $1`, [user.id])).map((r) => r.stage));
  const stages = STAGES.map((stage) => {
    const role = feedRole(user, stage);
    const mine = drills.filter((d) => d.stage === stage.key && d.roles.includes(role));
    const p = practiced.find((x) => x.stage === stage.key);
    return {
      key: stage.key,
      label: stage.label,
      description: stage.description,
      track: stage.track,
      role,
      questions: mine.length,
      coachable: mine.filter((d) => coachablePersonas(config, d, index).length > 0).length,
      answered: p?.questions || 0,
      conversations: p?.conversations || 0,
      openAttemptId: open.find((o) => o.stage === stage.key)?.id || null,
      waiting: pending.has(stage.key),
    };
  });
  // Reps see their own role's stages, and the other role's stages that have enough questions for them.
  return user.isManager || !['ae', 'am'].includes(user.role)
    ? stages
    : stages.filter((s) => s.track === user.role || s.questions >= MIN_QUESTIONS_FROM_OTHER_TRACK);
}

const shuffle = (xs) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Serve this stage's question: an unfinished conversation first, then the question already waiting,
// then a new one. Returns { resumeAttemptId } or { drillId, persona }.
export async function drawQuestion(q, config, user, stageKey) {
  const stage = STAGES.find((s) => s.key === stageKey);
  if (!stage) throw new HttpError(404, 'not_found', 'That stage was not found.');
  const role = feedRole(user, stage);
  await q.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`draw:${user.id}:${stage.key}`]);

  const open = await unfinishedConversation(q, config, user.id, stage.key);
  if (open) return { resumeAttemptId: open.id };

  const drills = (await activeDrills(q)).filter((d) => d.stage === stage.key && d.roles.includes(role));
  const waiting = await q.one(`SELECT * FROM practice_draws WHERE learner_id = $1 AND stage = $2`, [user.id, stage.key]);
  if (waiting) {
    const d = drills.find((x) => x.id === waiting.drill_id);
    if (d && d.personas.includes(waiting.persona)) return { drillId: d.id, persona: waiting.persona };
    await q.query(`DELETE FROM practice_draws WHERE learner_id = $1 AND stage = $2`, [user.id, stage.key]);
  }
  if (!drills.length) throw new HttpError(404, 'no_questions', `There are no ${stage.label.toLowerCase()} questions for your role yet.`);

  // Prefer questions coaching can score; if none can be scored, practice runs unscored.
  const index = await buildSourceIndex(q, drills);
  let pool = drills.map((d) => ({ drill: d, personas: coachablePersonas(config, d, index) })).filter((x) => x.personas.length);
  if (!pool.length) pool = drills.map((d) => ({ drill: d, personas: d.personas }));

  // Least-answered questions first, then the persona the person has met least on that question.
  const history = await q.many(
    `SELECT drill_id, persona, count(*)::int AS n, max(submitted_at) AS last FROM attempts
      WHERE learner_id = $1 AND stage = $2 AND turn_number = 1 GROUP BY drill_id, persona`,
    [user.id, stage.key],
  );
  const times = (drillId, persona = null) => history.filter((h) => h.drill_id === drillId && (!persona || h.persona === persona)).reduce((n, h) => n + h.n, 0);
  const fewest = Math.min(...pool.map((x) => times(x.drill.id)));
  const pick = shuffle(pool.filter((x) => times(x.drill.id) === fewest))[0];
  const leastMet = Math.min(...pick.personas.map((p) => times(pick.drill.id, p)));
  const persona = shuffle(pick.personas.filter((p) => times(pick.drill.id, p) === leastMet))[0];

  await q.query(
    `INSERT INTO practice_draws (learner_id, stage, drill_id, persona) VALUES ($1, $2, $3, $4)
     ON CONFLICT (learner_id, stage) DO UPDATE SET drill_id = EXCLUDED.drill_id, persona = EXCLUDED.persona, drawn_at = now()`,
    [user.id, stage.key, pick.drill.id, persona],
  );
  return { drillId: pick.drill.id, persona };
}
