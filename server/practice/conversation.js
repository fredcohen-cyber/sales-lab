// Practice conversations: the rep's replies to one question and the buyer's pushbacks between them.
// Each reply is an attempt row with its own coaching; these helpers read a conversation as a whole.

// Per conversation, joined to a query over first replies (alias "a" by default): how far it got, its
// score so far, and the state of its latest reply. Columns come out under the given prefix.
export function conversationSummarySql(alias = 'a', name = 'conv') {
  return `
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS replies_done,
           count(*) FILTER (WHERE t.mode = 'coached' AND t.evaluation_id IS NULL)::int AS replies_awaiting,
           count(*) FILTER (WHERE te.id IS NOT NULL AND te.overall_score IS NULL)::int AS replies_pending_review,
           count(*) FILTER (WHERE te.review_status = 'disputed')::int AS replies_disputed,
           round(avg(te.overall_score))::int AS conversation_average,
           -- A conversation counts only when every reply's coaching counts.
           CASE WHEN count(te.id) = 0 THEN NULL
                WHEN bool_or(te.review_status = 'disputed') THEN 'disputed'
                WHEN bool_or(te.review_status = 'provisional') THEN 'provisional'
                WHEN bool_or(te.review_status = 'confirmed') THEN 'confirmed'
                ELSE 'final' END AS conversation_review_status,
           COALESCE(bool_or(te.critical_failures @> '[{"status":"confirmed"}]'::jsonb), false) AS any_confirmed_critical,
           min(te.proficiency_threshold) AS conversation_threshold,
           (array_agg(t.id ORDER BY t.turn_number DESC))[1] AS latest_turn_id,
           (array_agg(t.turn_number ORDER BY t.turn_number DESC))[1] AS latest_turn_number,
           (array_agg(tr.status ORDER BY t.turn_number DESC))[1] AS latest_run_status
      FROM attempts t
      LEFT JOIN evaluations te ON te.id = t.evaluation_id
      LEFT JOIN evaluation_runs tr ON tr.id = t.latest_run_id
     WHERE t.conversation_id = ${alias}.conversation_id
  ) ${name} ON true`;
}
export const CONVERSATION_SUMMARY_SQL = conversationSummarySql();

// The conversation's score is the average of its replies' scores, once every planned reply is in and
// coached. It counts only when every reply's coaching counts: a disputed reply leaves the conversation
// without a score, and a reply waiting for a manager's decision on a possible critical failure leaves
// the score open.
export function conversationScore(turns, repliesPlanned) {
  if (turns.length < repliesPlanned) return { state: 'unfinished', score: null };
  if (turns.some((t) => t.mode !== 'coached')) return { state: 'unscored', score: null };
  if (turns.some((t) => !t.evaluation_id)) return { state: 'awaiting_coaching', score: null };
  if (turns.some((t) => t.review_status === 'disputed')) return { state: 'disputed', score: null };
  if (turns.some((t) => t.overall_score === null || t.overall_score === undefined)) return { state: 'pending_review', score: null };
  return { state: 'scored', score: Math.round(turns.reduce((s, t) => s + t.overall_score, 0) / turns.length) };
}

export async function loadConversationTurns(q, conversationId) {
  return q.many(
    `SELECT a.id, a.turn_number, a.replies_planned, a.mode, a.answer, a.submitted_at, a.scenario->>'buyerLine' AS buyer_line,
            a.evaluation_id, e.overall_score, e.weighted_score, e.review_status, e.feedback->>'buyerReaction' AS buyer_reaction,
            e.critical_failures, r.status AS run_status
       FROM attempts a
       LEFT JOIN evaluations e ON e.id = a.evaluation_id
       LEFT JOIN evaluation_runs r ON r.id = a.latest_run_id
      WHERE a.conversation_id = $1
      ORDER BY a.turn_number`,
    [conversationId],
  );
}

// What happens after the latest reply: the rep answers the buyer's pushback, waits for coaching on the
// last reply (or retries it), or the conversation is over.
function nextStep(latest, repliesPlanned, pushbacks) {
  if (!latest || latest.turn_number >= repliesPlanned) return { state: 'finished' };
  if (latest.mode === 'coached') {
    if (!latest.evaluation_id) return { state: latest.run_status === 'running' ? 'waiting' : 'coaching_stopped', afterAttemptId: latest.id };
    return { state: 'reply', afterAttemptId: latest.id, buyerLine: latest.buyer_reaction || null };
  }
  return { state: 'reply', afterAttemptId: latest.id, buyerLine: (pushbacks || [])[latest.turn_number - 1] || null };
}

export function conversationView(turns, { current, pushbacks }) {
  const repliesPlanned = current.replies_planned;
  const latest = turns[turns.length - 1];
  const scored = conversationScore(turns, repliesPlanned);
  const done = turns.filter((t) => t.mode === 'coached' && t.evaluation_id && t.overall_score !== null && t.review_status !== 'disputed');
  // Replies from strongest to weakest, once there is more than one score to compare.
  const ranked = done.length > 1 ? [...done].sort((x, y) => y.overall_score - x.overall_score || x.turn_number - y.turn_number).map((t) => ({ turn: t.turn_number, attemptId: t.id, score: t.overall_score })) : [];
  return {
    id: current.conversation_id,
    turn: current.turn_number,
    repliesPlanned,
    turns: turns.map((t) => ({
      attemptId: t.id,
      turn: t.turn_number,
      buyerLine: t.buyer_line,
      answer: t.answer,
      submittedAt: t.submitted_at,
      mode: t.mode,
      score: t.evaluation_id ? t.overall_score : null,
      weightedScore: t.evaluation_id ? t.weighted_score : null,
      reviewStatus: t.review_status || null,
      runStatus: t.run_status || null,
    })),
    next: nextStep(latest, repliesPlanned, pushbacks),
    isLatest: latest?.id === current.id,
    latestAttemptId: latest?.id || current.id,
    score: scored.score,
    scoreState: scored.state,
    ranked,
  };
}

// The conversation score for a list row of a first reply joined with CONVERSATION_SUMMARY_SQL.
export function withConversationScore(row) {
  const planned = row.replies_planned || 1;
  let state;
  if ((row.replies_done ?? 1) < planned) state = 'unfinished';
  else if (row.mode !== 'coached') state = 'unscored';
  else if (row.replies_awaiting > 0) state = 'awaiting_coaching';
  else if (row.replies_disputed > 0) state = 'disputed';
  else if (row.replies_pending_review > 0 || row.conversation_average === null || row.conversation_average === undefined) state = 'pending_review';
  else state = 'scored';
  const score = state === 'scored' ? row.conversation_average : null;
  return {
    ...row,
    conversation_score: score,
    conversation_state: state,
    conversation_meets_target: score === null ? null : !row.any_confirmed_critical && score >= (row.conversation_threshold ?? 0),
  };
}
