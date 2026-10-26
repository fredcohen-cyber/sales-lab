// The Practice Studio feed: reps choose a stage, never a question. Each stage serves one question at a
// random from the questions written for the rep's role, preferring ones they have not answered yet and
// ones coaching can score. The question waits until it is answered, and a conversation the rep has
// not finished in that stage comes back first, so skipping never leads to an easier question.
import { HttpError } from '../lib/errors.js';
import { aiConfigured } from '../config.js';
import { STAGES } from '../domain.js';
import { availabilityReason, DRILL_SQL } from '../drills/service.js';
import { buildSourceIndex, resolveRef } from '../knowledge/service.js';
import { RUNS_PER_ATTEMPT_PER_HOUR } from '../ai/evaluate.js';

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

// Conversations the person started outside assignments and has not finished: the latest reply of each,
// newest first. A coached conversation cannot go on while coaching is switched off, so it does not hold
// up the stage. retry_blocked marks one whose last reply's coaching stopped and was retried as often as
// a rep may in an hour.
const UNFINISHED_SQL = `
  SELECT a.id, a.stage, a.conversation_id, a.drill_id, a.persona, a.submitted_at,
         (a.mode = 'coached' AND a.evaluation_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM evaluation_runs r WHERE r.id = a.latest_run_id AND r.status = 'running')
          AND (SELECT count(*) FROM evaluation_runs r WHERE r.attempt_id = a.id AND r.started_at > now() - interval '1 hour') >= ${RUNS_PER_ATTEMPT_PER_HOUR}
         ) AS retry_blocked
    FROM attempts a
   WHERE a.learner_id = $1 AND a.assignment_item_id IS NULL AND a.turn_number < a.replies_planned
     AND ($2 OR a.mode <> 'coached')
     AND NOT EXISTS (SELECT 1 FROM attempts n WHERE n.conversation_id = a.conversation_id AND n.turn_number = a.turn_number + 1)`;

async function unfinishedConversations(q, config, user, stageKey = null) {
  const rows = await q.many(`${UNFINISHED_SQL}${stageKey ? ' AND a.stage = $3' : ''} ORDER BY a.submitted_at DESC`, [
    user.id,
    aiConfigured(config),
    ...(stageKey ? [stageKey] : []),
  ]);
  // A rep cannot go on with a conversation whose coaching cannot be retried for now, so it is set aside
  // (managers can always restart coaching).
  return rows.map((r) => ({ ...r, onHold: Boolean(r.retry_blocked) && !user.isManager }));
}

export async function stageOverview(q, config, user) {
  const drills = await activeDrills(q);
  const index = await buildSourceIndex(q, drills);
  const practiced = await q.many(
    `SELECT stage, drill_id, count(*)::int AS conversations FROM attempts WHERE learner_id = $1 AND turn_number = 1 GROUP BY stage, drill_id`,
    [user.id],
  );
  const open = (await unfinishedConversations(q, config, user)).filter((u) => !u.onHold);
  const pending = new Set((await q.many(`SELECT stage FROM practice_draws WHERE learner_id = $1`, [user.id])).map((r) => r.stage));
  const stages = STAGES.map((stage) => {
    const role = feedRole(user, stage);
    const mine = drills.filter((d) => d.stage === stage.key && d.roles.includes(role));
    const done = practiced.filter((x) => x.stage === stage.key);
    return {
      key: stage.key,
      label: stage.label,
      description: stage.description,
      track: stage.track,
      role,
      questions: mine.length,
      coachable: mine.filter((d) => coachablePersonas(config, d, index).length > 0).length,
      // Of this stage's questions for the role, how many the person has answered.
      answered: mine.filter((d) => done.some((x) => x.drill_id === d.id)).length,
      conversations: done.reduce((n, x) => n + x.conversations, 0),
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

  const unfinished = await unfinishedConversations(q, config, user, stage.key);
  const open = unfinished.find((u) => !u.onHold);
  if (open) return { resumeAttemptId: open.id };
  // A question held up by a conversation set aside is not served again until that conversation can go on.
  const held = unfinished.filter((u) => u.onHold);
  const free = (drillId, personas) => personas.filter((p) => !held.some((u) => u.drill_id === drillId && u.persona === p));

  const drills = (await activeDrills(q)).filter((d) => d.stage === stage.key && d.roles.includes(role));
  // The other role's stages are open to reps only when the Practice Studio offers them (see stageOverview).
  if (!user.isManager && ['ae', 'am'].includes(user.role) && stage.track !== user.role && drills.length < MIN_QUESTIONS_FROM_OTHER_TRACK) {
    throw new HttpError(404, 'not_found', 'That stage was not found.');
  }
  const waiting = await q.one(`SELECT * FROM practice_draws WHERE learner_id = $1 AND stage = $2`, [user.id, stage.key]);
  if (waiting) {
    const d = drills.find((x) => x.id === waiting.drill_id);
    if (d && free(d.id, d.personas).includes(waiting.persona)) return { drillId: d.id, persona: waiting.persona };
    await q.query(`DELETE FROM practice_draws WHERE learner_id = $1 AND stage = $2`, [user.id, stage.key]);
  }
  if (!drills.length) throw new HttpError(404, 'no_questions', `There are no ${stage.label.toLowerCase()} questions for your role yet.`);

  // Prefer questions coaching can score; if none can be scored, practice runs unscored.
  const index = await buildSourceIndex(q, drills);
  let pool = drills.map((d) => ({ drill: d, personas: free(d.id, coachablePersonas(config, d, index)) })).filter((x) => x.personas.length);
  if (!pool.length) pool = drills.map((d) => ({ drill: d, personas: free(d.id, d.personas) })).filter((x) => x.personas.length);
  // Every question here is held up: show the conversation, which says when coaching can be retried.
  if (!pool.length) return { resumeAttemptId: held[0].id };

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
