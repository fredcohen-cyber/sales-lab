// Pure report calculations. Inputs are plain rows so the rules are easy to test.
import { COUNTED_REVIEW_STATUSES } from '../domain.js';
import { weekStart } from '../lib/time.js';

export const isCounted = (r) => r.mode === 'coached' && r.evaluation_id && COUNTED_REVIEW_STATUSES.includes(r.review_status);
export const isFirstScored = (r) => isCounted(r) && r.attempt_number === 1;

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (x) => (x === null ? null : Math.round(x * 10) / 10);

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
    .map(([week, rs]) => {
      const stages = {};
      for (const r of rs) stages[r.stage] = (stages[r.stage] || 0) + 1;
      return {
        week,
        n: rs.length,
        average: round1(mean(rs.map((r) => r.overall_score))),
        averageDifficulty: round1(mean(rs.map((r) => r.difficulty))),
        stages,
      };
    });
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
    const dDiff = round1(b.averageDifficulty - a.averageDifficulty);
    const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    let text = `First-attempt average moved from ${a.average} (week of ${a.week}, ${a.n} answers) to ${b.average} (week of ${b.week}, ${b.n} answers).`;
    if (Math.abs(dDiff) >= 0.5) {
      text += ` Average challenge level also changed from ${a.averageDifficulty} to ${b.averageDifficulty}, so part of this change may reflect harder or easier drills rather than skill.`;
    }
    const stageShift = Object.keys({ ...a.stages, ...b.stages }).some((k) => Boolean(a.stages[k]) !== Boolean(b.stages[k]));
    if (stageShift) text += ' The mix of sales stages practiced also changed between these weeks.';
    statement = { kind: dir, delta, difficultyDelta: dDiff, text };
  }
  return { series, statement };
}

// Gains from retrying the same drill with the same persona: a like-for-like measure of learning.
export function retryImprovement(exerciseAttempts) {
  const groups = new Map();
  for (const r of exerciseAttempts.filter(isCounted)) {
    const k = `${r.learner_id}|${r.drill_id}|${r.persona}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const gains = [];
  for (const rs of groups.values()) {
    const first = rs.find((r) => r.attempt_number === 1);
    const later = rs.filter((r) => r.attempt_number > 1);
    if (!first || later.length === 0) continue;
    gains.push(Math.max(...later.map((r) => r.overall_score)) - first.overall_score);
  }
  return { exercises: gains.length, averageGain: round1(mean(gains)) };
}

export function engagementFor(rows) {
  const days = new Set(rows.map((r) => r.day));
  return {
    submitted: rows.length,
    coached: rows.filter((r) => r.mode === 'coached').length,
    retries: rows.filter((r) => r.attempt_number > 1).length,
    unscored: rows.filter((r) => r.mode === 'unscored').length,
    practiceDays: days.size,
  };
}

export function performanceFor(rows) {
  const first = rows.filter(isFirstScored);
  const coached = rows.filter((r) => r.mode === 'coached');
  const withEval = coached.filter((r) => r.evaluation_id);
  const cfRows = withEval.filter((r) => (r.critical_failures || []).length > 0);
  return {
    firstAttemptAverage: round1(mean(first.map((r) => r.overall_score))),
    scoredFirstAttempts: first.length,
    metTarget: first.filter((r) => r.meets_target).length,
    criticalFailures: {
      confirmed: cfRows.filter((r) => r.review_status === 'confirmed').length,
      pending: cfRows.filter((r) => r.review_status === 'provisional').length,
      disputed: cfRows.filter((r) => r.review_status === 'disputed').length,
    },
    pendingReviews: withEval.filter((r) => r.review_status === 'provisional').length,
    excluded: {
      retries: rows.filter((r) => r.attempt_number > 1).length,
      unscored: rows.filter((r) => r.mode === 'unscored').length,
      pendingReview: withEval.filter((r) => r.review_status === 'provisional').length,
      disputed: withEval.filter((r) => r.review_status === 'disputed').length,
      awaitingCoaching: coached.filter((r) => !r.evaluation_id).length,
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
  const confirmedCf = rows.filter((r) => r.review_status === 'confirmed' && (r.critical_failures || []).length > 0).length;
  if (confirmedCf > 0) reasons.push({ kind: 'critical', text: `${confirmedCf} confirmed critical failure${confirmedCf === 1 ? '' : 's'}` });
  const stuck = rows.filter((r) => r.mode === 'coached' && !r.evaluation_id && ['failed', 'timed_out', 'superseded'].includes(r.run_status)).length;
  if (stuck > 0) reasons.push({ kind: 'coaching_failed', text: `${stuck} answer${stuck === 1 ? '' : 's'} still waiting for coaching to be retried` });
  return reasons;
}
