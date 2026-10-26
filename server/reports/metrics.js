// Pure report calculations. Inputs are plain rows so the rules are easy to test.
import { COUNTED_REVIEW_STATUSES } from '../domain.js';
import { weekStart } from '../lib/time.js';

export const isCounted = (r) => r.mode === 'coached' && r.evaluation_id && COUNTED_REVIEW_STATUSES.includes(r.review_status);
// The first coached answer for a drill and persona. Unscored practice never uses it up.
export const isFirstScored = (r) => isCounted(r) && r.coached_number === 1;
export const isRetry = (r) => r.mode === 'coached' && r.coached_number > 1;
const liveCritical = (r) => (r.critical_failures || []).filter((c) => c.status === 'confirmed' || c.status === 'pending');
const hasConfirmedCritical = (r) => (r.critical_failures || []).some((c) => c.status === 'confirmed');
const hasPendingCritical = (r) => (r.critical_failures || []).some((c) => c.status === 'pending');

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (x) => (x === null ? null : Math.round(x * 10) / 10);

// Reports count conversations: a rep's replies to one question, with the buyer's pushbacks between
// them. A conversation counts once every planned reply is in and coached and every reply's coaching
// counts. Its score is the average of its replies (a reply with a confirmed critical failure scores 0),
// its dimension scores are averaged the same way, it waits for review while any reply does, and one
// disputed reply makes it disputed. Input rows are replies; a conversation whose first reply is not
// among them is left out.
export function toConversationRows(replyRows) {
  const groups = new Map();
  for (const r of replyRows) {
    const k = r.conversation_id || r.id;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const out = [];
  for (const turns of groups.values()) {
    turns.sort((a, b) => (a.turn_number || 1) - (b.turn_number || 1));
    const first = turns[0];
    if ((first.turn_number || 1) !== 1) continue;
    const planned = first.replies_planned || 1;
    const unfinished = turns.length < planned;
    const coached = first.mode === 'coached';
    const evaluated = coached && !unfinished && turns.every((t) => t.evaluation_id);
    const statuses = turns.map((t) => t.review_status);
    const reviewStatus = !evaluated
      ? null
      : statuses.includes('disputed')
        ? 'disputed'
        : statuses.includes('provisional')
          ? 'provisional'
          : statuses.includes('confirmed')
            ? 'confirmed'
            : 'final';
    const scores = turns.map((t) => t.overall_score);
    const overall = evaluated && scores.every((s) => typeof s === 'number') ? Math.round(mean(scores)) : null;
    const dimensionScores = (first.dimension_scores || []).map((d) => {
      if (!d.assessed || !evaluated) return d;
      const xs = turns.map((t) => (t.dimension_scores || []).find((x) => x.key === d.key && x.assessed)?.score).filter((x) => typeof x === 'number');
      return xs.length ? { ...d, score: Math.round(mean(xs)) } : d;
    });
    const criticalFailures = turns.flatMap((t) => t.critical_failures || []);
    const threshold = first.proficiency_threshold ?? null;
    out.push({
      ...first,
      replies: turns.length,
      unfinished,
      evaluation_id: evaluated ? first.evaluation_id : null,
      review_status: reviewStatus,
      overall_score: overall,
      dimension_scores: dimensionScores,
      critical_failures: criticalFailures,
      meets_target: overall !== null && threshold !== null && overall >= threshold && !criticalFailures.some((c) => c.status === 'confirmed'),
      // The state of the first reply still waiting for coaching, if any.
      run_status: (turns.find((t) => coached && !t.evaluation_id) || turns[turns.length - 1]).run_status,
    });
  }
  return out;
}

export function dimensionStats(rows, rubricDims, settings) {
  const first = rows.filter(isFirstScored);
  return rubricDims.map((d) => {
    const samples = [];
    for (const r of first) {
      const ds = (r.dimension_scores || []).find((x) => x.key === d.key && x.assessed);
      if (ds) samples.push({ score: ds.score, attemptId: r.id, drillTitle: r.drill_title, day: r.day });
    }
    const avg = mean(samples.map((s) => s.score));
    const enough = samples.length >= settings.min_evidence;
    let verdict = 'insufficient';
    if (enough) verdict = avg >= settings.strength_threshold ? 'strength' : avg < settings.weakness_threshold ? 'weakness' : 'developing';
    return { key: d.key, label: d.label, weight: d.weight, n: samples.length, average: round1(avg), verdict, samples: samples.slice(0, 12) };
  });
}

const challengeOf = (r) => (r.difficulty + r.skepticism + r.depth) / 3;
const SUBJECT_WORDS = { product: 'product knowledge', competitive: 'competitive knowledge', sales_technique: 'sales technique' };

function shares(rows, key) {
  const out = {};
  for (const r of rows) out[r[key]] = (out[r[key]] || 0) + 1;
  for (const k of Object.keys(out)) out[k] = Math.round((out[k] / rows.length) * 100);
  return out;
}

export function trendByWeek(rows) {
  const first = rows.filter(isFirstScored);
  const weeks = new Map();
  for (const r of first) {
    const wk = weekStart(r.day);
    if (!weeks.has(wk)) weeks.set(wk, []);
    weeks.get(wk).push(r);
  }
  const series = [...weeks.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, rs]) => ({
      week,
      n: rs.length,
      average: round1(mean(rs.map((r) => r.overall_score))),
      averageDifficulty: round1(mean(rs.map((r) => r.difficulty))),
      averageChallenge: round1(mean(rs.map(challengeOf))),
      subjects: shares(rs, 'subject'),
      rows: rs,
    }));
  const solid = series.filter((w) => w.n >= 3);
  let statement;
  if (solid.length < 2) {
    statement = {
      kind: 'insufficient',
      text: 'Not enough scored first attempts to describe a trend yet. A trend needs at least 3 in each of two weeks.',
    };
  } else {
    const a = solid[0];
    const b = solid[solid.length - 1];
    const delta = round1(b.average - a.average);
    const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    // Like-for-like: compare only answers on the same subject, stage, and difficulty in both weeks.
    const key = (r) => `${r.subject}|${r.stage}|${r.difficulty}`;
    const groupsA = new Map();
    for (const r of a.rows) groupsA.set(key(r), [...(groupsA.get(key(r)) || []), r]);
    let weighted = 0;
    let weight = 0;
    const seen = new Set();
    for (const r of b.rows) {
      const k = key(r);
      if (seen.has(k) || !groupsA.has(k)) continue;
      seen.add(k);
      const inA = groupsA.get(k);
      const inB = b.rows.filter((x) => key(x) === k);
      const w = Math.min(inA.length, inB.length);
      weighted += w * (mean(inB.map((x) => x.overall_score)) - mean(inA.map((x) => x.overall_score)));
      weight += w;
    }
    const comparableDelta = weight ? round1(weighted / weight) : null;
    const challengeDelta = round1(b.averageChallenge - a.averageChallenge);
    const subjectKeys = new Set([...Object.keys(a.subjects), ...Object.keys(b.subjects)]);
    const mixChanged = [...subjectKeys].some((k) => Math.abs((a.subjects[k] || 0) - (b.subjects[k] || 0)) >= 25);
    const signed = (x) => (x > 0 ? `+${x}` : `${x}`);
    let text = `First-attempt average moved from ${a.average} (week of ${a.week}, ${a.n} answers) to ${b.average} (week of ${b.week}, ${b.n} answers), ${signed(delta)} points.`;
    if (comparableDelta !== null) {
      text += ` On comparable drills (same subject, stage, and difficulty in both weeks, ${weight} answer${weight === 1 ? '' : 's'} each), the change was ${signed(comparableDelta)}.`;
    } else {
      text += ' No drills in these two weeks share the same subject, stage, and difficulty, so the change may reflect different practice material rather than skill.';
    }
    if (Math.abs(challengeDelta) >= 0.5) {
      text += ` The average challenge level moved from ${a.averageChallenge} to ${b.averageChallenge}, so part of the change may come from ${challengeDelta > 0 ? 'harder' : 'easier'} settings.`;
    }
    if (mixChanged) {
      const describe = (w) =>
        Object.entries(w.subjects)
          .sort((x, y) => y[1] - x[1])
          .map(([k, v]) => `${v}% ${SUBJECT_WORDS[k] || k}`)
          .join(', ');
      text += ` The subject mix also changed (${describe(a)} to ${describe(b)}).`;
    }
    statement = { kind: dir, delta, comparableDelta, comparableAnswers: weight, challengeDelta, mixChanged, text };
  }
  return { series: series.map(({ rows: _rows, ...w }) => w), statement };
}

// Gains from retrying the same drill with the same persona, counting only retries at the same or harder
// settings, so an easier retry is never reported as improvement.
export function retryImprovement(exerciseAttempts) {
  const groups = new Map();
  for (const r of exerciseAttempts.filter(isCounted)) {
    const k = `${r.learner_id}|${r.drill_id}|${r.persona}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const gains = [];
  let easierExcluded = 0;
  for (const rs of groups.values()) {
    const first = rs.find((r) => r.coached_number === 1);
    if (!first) continue;
    const retries = rs.filter((r) => r.coached_number > 1);
    const comparable = retries.filter((r) => r.difficulty >= first.difficulty && r.skepticism >= first.skepticism && r.depth >= first.depth);
    easierExcluded += retries.length - comparable.length;
    if (comparable.length === 0) continue;
    gains.push(Math.max(...comparable.map((r) => r.overall_score)) - first.overall_score);
  }
  return { exercises: gains.length, averageGain: round1(mean(gains)), easierRetriesExcluded: easierExcluded };
}

export function engagementFor(rows) {
  const days = new Set(rows.map((r) => r.day));
  return {
    submitted: rows.length,
    replies: rows.reduce((n, r) => n + (r.replies || 1), 0),
    coached: rows.filter((r) => r.mode === 'coached').length,
    retries: rows.filter(isRetry).length,
    unscored: rows.filter((r) => r.mode === 'unscored').length,
    practiceDays: days.size,
  };
}

export function performanceFor(rows) {
  const first = rows.filter(isFirstScored);
  const coached = rows.filter((r) => r.mode === 'coached');
  const withEval = coached.filter((r) => r.evaluation_id);
  const cfRows = withEval.filter((r) => liveCritical(r).length > 0);
  return {
    firstAttemptAverage: round1(mean(first.map((r) => r.overall_score))),
    scoredFirstAttempts: first.length,
    metTarget: first.filter((r) => r.meets_target).length,
    criticalFailures: {
      confirmed: cfRows.filter((r) => r.review_status === 'confirmed' && hasConfirmedCritical(r)).length,
      pending: cfRows.filter((r) => r.review_status === 'provisional' && hasPendingCritical(r)).length,
      disputed: cfRows.filter((r) => r.review_status === 'disputed').length,
    },
    pendingReviews: withEval.filter((r) => r.review_status === 'provisional').length,
    excluded: {
      retries: rows.filter(isRetry).length,
      unscored: rows.filter((r) => r.mode === 'unscored').length,
      pendingReview: withEval.filter((r) => r.review_status === 'provisional').length,
      disputed: withEval.filter((r) => r.review_status === 'disputed').length,
      unfinished: coached.filter((r) => r.unfinished).length,
      awaitingCoaching: coached.filter((r) => !r.evaluation_id && !r.unfinished).length,
    },
  };
}

export function followUpReasons({ rep, rows, lastPracticeAt, assignmentStats, dims, now = new Date() }) {
  const reasons = [];
  const daysSince = lastPracticeAt ? (now.getTime() - new Date(lastPracticeAt).getTime()) / 86_400_000 : null;
  if (rep.status === 'active') {
    if (daysSince === null) reasons.push({ kind: 'no_practice', text: 'Has not practiced yet' });
    else if (daysSince >= 7) reasons.push({ kind: 'no_practice', text: `No practice in ${Math.floor(daysSince)} days` });
  }
  if (assignmentStats.overdueItems > 0) {
    reasons.push({ kind: 'overdue', text: `${assignmentStats.overdueItems} overdue exercise${assignmentStats.overdueItems === 1 ? '' : 's'}` });
  }
  for (const d of dims.filter((x) => x.verdict === 'weakness')) {
    reasons.push({ kind: 'weakness', dimension: d.key, text: `Weak in ${d.label.toLowerCase()} (${d.average} across ${d.n} first attempts)` });
  }
  const confirmedCf = rows.filter((r) => r.review_status === 'confirmed' && hasConfirmedCritical(r)).length;
  if (confirmedCf > 0) reasons.push({ kind: 'critical', text: `${confirmedCf} confirmed critical failure${confirmedCf === 1 ? '' : 's'}` });
  const stuck = rows.filter((r) => r.mode === 'coached' && !r.evaluation_id && ['failed', 'timed_out', 'superseded'].includes(r.run_status)).length;
  if (stuck > 0) reasons.push({ kind: 'coaching_failed', text: `${stuck} conversation${stuck === 1 ? '' : 's'} with a reply still waiting for coaching to be retried` });
  return reasons;
}
