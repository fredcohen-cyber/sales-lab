import { Router } from 'express';
import { notFound, route } from '../lib/errors.js';
import { requireManager } from '../auth/middleware.js';
import { isUuid } from '../practice/routes.js';
import { addDays, daysBetween, nyDate } from '../lib/time.js';
import { toCsv } from '../lib/csv.js';
import { BRANDS, ROLES, stageLabel } from '../domain.js';
import { dimensionStats, engagementFor, followUpReasons, isCounted, isFirstScored, performanceFor, retryImprovement, trendByWeek } from './metrics.js';

const PERIODS = [7, 30, 90];

export function parseFilters(query) {
  const period = PERIODS.includes(Number(query.period)) ? Number(query.period) : 30;
  return {
    period,
    role: ['ae', 'am'].includes(query.role) ? query.role : null,
    learnerId: isUuid(query.learnerId) ? query.learnerId : null,
    brand: Object.keys(BRANDS).includes(query.brand) ? query.brand : null,
    persona: typeof query.persona === 'string' && /^[a-z_]{2,60}$/.test(query.persona) ? query.persona : null,
    difficulty: [1, 2, 3, 4, 5].includes(Number(query.difficulty)) ? Number(query.difficulty) : null,
  };
}

const ATTEMPT_ROW_SQL = `
  SELECT a.id, a.learner_id, a.learner_role, a.drill_id, a.persona, a.difficulty, a.skepticism, a.depth, a.brand, a.stage, a.mode,
         a.scenario->>'subject' AS subject, a.attempt_number, a.coached_number, a.submitted_at,
         to_char((a.submitted_at AT TIME ZONE 'America/New_York')::date, 'YYYY-MM-DD') AS day,
         a.scenario->>'title' AS drill_title, a.scenario->'persona'->>'label' AS persona_label, a.assignment_item_id,
         e.id AS evaluation_id, e.overall_score, e.review_status, e.dimension_scores, e.critical_failures, e.meets_target,
         r.status AS run_status
    FROM attempts a
    LEFT JOIN evaluations e ON e.id = a.evaluation_id
    LEFT JOIN evaluation_runs r ON r.id = a.latest_run_id`;

const REP_ROLES = ['ae', 'am'];

// Reports group answers by the role the person had when they wrote them, so a role change never moves
// history between the AE and AM views, and a rep promoted to manager keeps their practice history.
export async function buildReport(db, filters, { selfUser = null } = {}) {
  const settings = await db.one(
    `SELECT w.*, r.dimensions, r.version AS rubric_version FROM workspace_settings w JOIN rubric_versions r ON r.id = w.current_rubric_id WHERE w.id = 1`,
  );
  const today = nyDate();
  const startDay = addDays(today, -(filters.period - 1));

  const params = [startDay];
  const where = [`a.submitted_at >= ($1::date)::timestamp AT TIME ZONE 'America/New_York'`];
  if (selfUser) {
    params.push(selfUser.id);
    where.push(`a.learner_id = $${params.length}`);
  } else {
    // Practice by people while they were managers is not rep performance.
    where.push(`a.learner_role IN ('ae', 'am')`);
  }
  if (filters.brand) {
    params.push(filters.brand);
    where.push(`a.brand = $${params.length}`);
  }
  if (filters.persona) {
    params.push(filters.persona);
    where.push(`a.persona = $${params.length}`);
  }
  if (filters.difficulty) {
    params.push(filters.difficulty);
    where.push(`a.difficulty = $${params.length}`);
  }
  const rows = await db.many(`${ATTEMPT_ROW_SQL} WHERE ${where.join(' AND ')} ORDER BY a.submitted_at`, params);

  // People in the report: current AEs and AMs, plus anyone with rep practice in the window (for example
  // someone who has since become a manager or been deactivated).
  const practicedIds = [...new Set(rows.map((r) => r.learner_id))];
  const reps = selfUser
    ? await db.many(`SELECT id, name, email, role, experience, status FROM users WHERE id = $1`, [selfUser.id])
    : await db.many(`SELECT id, name, email, role, experience, status FROM users WHERE role IN ('ae','am') OR id = ANY($1::uuid[]) ORDER BY name`, [
        practicedIds,
      ]);
  const repIds = reps.map((r) => r.id);

  // All attempts on the exercises practiced in this window, for like-for-like retry gains.
  const allForReps = repIds.length
    ? await db.many(`${ATTEMPT_ROW_SQL} WHERE a.learner_id = ANY($1::uuid[])${selfUser ? '' : ` AND a.learner_role IN ('ae', 'am')`}`, [repIds])
    : [];
  const retryFor = (subset) => {
    const keys = new Set(subset.map((r) => `${r.learner_id}|${r.drill_id}|${r.persona}`));
    return retryImprovement(allForReps.filter((r) => keys.has(`${r.learner_id}|${r.drill_id}|${r.persona}`)));
  };

  const last = repIds.length
    ? await db.many(`SELECT learner_id, max(submitted_at) AS last FROM attempts WHERE learner_id = ANY($1::uuid[]) GROUP BY 1`, [repIds])
    : [];
  const lastBy = new Map(last.map((l) => [l.learner_id, l.last]));

  const assignmentRows = repIds.length
    ? await db.many(
        `SELECT a.learner_id,
                count(i.*) FILTER (WHERE a.status <> 'cancelled') AS items,
                count(i.*) FILTER (WHERE a.status <> 'cancelled' AND i.completed_at IS NOT NULL) AS completed,
                count(i.*) FILTER (WHERE a.status = 'active' AND i.completed_at IS NULL AND a.due_date < $2::date) AS overdue_items,
                count(DISTINCT a.id) FILTER (WHERE a.status = 'active' AND a.due_date < $2::date) AS overdue_assignments
           FROM assignments a JOIN assignment_items i ON i.assignment_id = a.id
          WHERE a.learner_id = ANY($1::uuid[]) GROUP BY 1`,
        [repIds, today],
      )
    : [];
  const asgBy = new Map(assignmentRows.map((a) => [a.learner_id, a]));

  const history = await db.one(
    selfUser
      ? `SELECT to_char(min((submitted_at AT TIME ZONE 'America/New_York')::date), 'YYYY-MM-DD') AS first_day FROM attempts WHERE learner_id = $1`
      : `SELECT to_char(min((submitted_at AT TIME ZONE 'America/New_York')::date), 'YYYY-MM-DD') AS first_day FROM attempts WHERE learner_role IN ('ae','am')`,
    selfUser ? [selfUser.id] : [],
  );

  const dims = settings.dimensions;
  const repRow = (rep, mine) => {
    const a = asgBy.get(rep.id) || { items: 0, completed: 0, overdue_items: 0, overdue_assignments: 0 };
    const dstats = dimensionStats(mine, dims, settings);
    const assignmentStats = {
      items: a.items,
      completed: a.completed,
      completionRate: a.items ? Math.round((a.completed / a.items) * 100) : null,
      overdueItems: a.overdue_items,
      overdueAssignments: a.overdue_assignments,
    };
    const rolesPracticed = [...new Set(mine.map((r) => r.learner_role))].filter((x) => REP_ROLES.includes(x));
    return {
      id: rep.id,
      name: rep.name,
      role: rep.role,
      roleLabel: ROLES[rep.role],
      rolesPracticed,
      experience: rep.experience,
      status: rep.status,
      lastPracticeAt: lastBy.get(rep.id) || null,
      engagement: engagementFor(mine),
      performance: performanceFor(mine),
      dimensions: dstats,
      strengths: dstats.filter((d) => d.verdict === 'strength').map((d) => ({ key: d.key, label: d.label, average: d.average, n: d.n })),
      weaknesses: dstats.filter((d) => d.verdict === 'weakness').map((d) => ({ key: d.key, label: d.label, average: d.average, n: d.n })),
      assignments: assignmentStats,
      followUp: followUpReasons({ rep, rows: mine, lastPracticeAt: lastBy.get(rep.id), assignmentStats, dims: dstats }),
      retry: retryFor(mine),
    };
  };
  // Deactivated people and former reps stay in history but only appear when they practiced in this window.
  const visible = (rep, mine) =>
    selfUser || rep.id === filters.learnerId || (rep.status === 'active' && REP_ROLES.includes(rep.role)) || mine.length > 0;

  const rowsOf = (subset, id) => subset.filter((r) => r.learner_id === id);
  const allRepRows = reps.filter((rep) => visible(rep, rowsOf(rows, rep.id))).map((rep) => repRow(rep, rowsOf(rows, rep.id)));

  const group = (role) => {
    const gRows = rows.filter((r) => !role || r.learner_role === role);
    // Membership for participation, curriculum, and follow-up is the person's current role.
    const members = allRepRows.filter((r) => (role ? r.role === role : REP_ROLES.includes(r.role)));
    const active = members.filter((r) => r.status === 'active');
    const participants = new Set(gRows.map((r) => r.learner_id));
    const items = members.reduce((n, r) => n + r.assignments.items, 0);
    const completed = members.reduce((n, r) => n + r.assignments.completed, 0);
    return {
      reps: members.length,
      activeReps: active.length,
      participants: participants.size,
      participationRate: active.length ? Math.round((active.filter((r) => participants.has(r.id)).length / active.length) * 100) : null,
      engagement: engagementFor(gRows),
      performance: performanceFor(gRows),
      curriculum: { items, completed, completionRate: items ? Math.round((completed / items) * 100) : null },
      overdueItems: members.reduce((n, r) => n + r.assignments.overdueItems, 0),
      needFollowUp: members.filter((r) => r.followUp.length > 0).length,
    };
  };

  // The role and rep filters scope everything below the AE/AM comparison, by role at the time of each answer.
  const scopedRows = rows.filter((r) => (!filters.role || r.learner_role === filters.role) && (!filters.learnerId || r.learner_id === filters.learnerId));
  const repRows = reps
    .filter((rep) => !filters.learnerId || rep.id === filters.learnerId)
    .filter((rep) => !filters.role || rep.role === filters.role || rowsOf(scopedRows, rep.id).length > 0)
    .filter((rep) => visible(rep, rowsOf(scopedRows, rep.id)))
    .map((rep) => repRow(rep, rowsOf(scopedRows, rep.id)));

  const coverageDays = history.first_day ? Math.min(filters.period, daysBetween(history.first_day > startDay ? history.first_day : startDay, today) + 1) : 0;
  const disclosures = [];
  if (!history.first_day) disclosures.push('No practice has been submitted yet, so there is nothing to report.');
  else if (history.first_day > startDay) {
    disclosures.push(`Reporting history begins on ${history.first_day}. This ${filters.period}-day view covers only ${coverageDays} day${coverageDays === 1 ? '' : 's'} of data.`);
  }
  const perf = performanceFor(scopedRows);
  const ex = perf.excluded;
  const excludedTotal = ex.retries + ex.unscored + ex.pendingReview + ex.disputed + ex.awaitingCoaching;
  if (excludedTotal > 0) {
    const parts = [];
    if (ex.retries) parts.push(`${ex.retries} retr${ex.retries === 1 ? 'y' : 'ies'}`);
    if (ex.unscored) parts.push(`${ex.unscored} unscored answer${ex.unscored === 1 ? '' : 's'}`);
    if (ex.pendingReview) parts.push(`${ex.pendingReview} pending review`);
    if (ex.disputed) parts.push(`${ex.disputed} disputed`);
    if (ex.awaitingCoaching) parts.push(`${ex.awaitingCoaching} still waiting for coaching`);
    disclosures.push(`First-attempt averages exclude ${parts.join(', ')}.`);
  }
  if (!selfUser && rows.some((r) => {
    const rep = reps.find((x) => x.id === r.learner_id);
    return rep && rep.role !== r.learner_role;
  })) {
    disclosures.push('Some people changed role during this period. Their answers count under the role they had when they wrote them.');
  }
  const team = {
    performance: perf,
    dimensions: dimensionStats(scopedRows, dims, settings),
    trend: trendByWeek(scopedRows),
    retry: retryFor(scopedRows),
    engagement: engagementFor(scopedRows),
  };
  if (team.retry.easierRetriesExcluded > 0) {
    disclosures.push(
      `Retry gains leave out ${team.retry.easierRetriesExcluded} retr${team.retry.easierRetriesExcluded === 1 ? 'y' : 'ies'} done at easier settings than the first attempt.`,
    );
  }

  return {
    filters,
    period: { days: filters.period, startDay, endDay: today, timezone: 'America/New_York', coverageDays },
    history: { firstDay: history.first_day },
    thresholds: {
      proficiency: settings.proficiency_threshold,
      strength: settings.strength_threshold,
      weakness: settings.weakness_threshold,
      minEvidence: settings.min_evidence,
    },
    groups: selfUser ? undefined : { all: group(null), ae: group('ae'), am: group('am') },
    team,
    reps: repRows,
    rows: scopedRows,
    disclosures,
  };
}

export function attemptLabel(r) {
  if (r.mode === 'unscored') return 'Unscored practice';
  return r.coached_number === 1 ? 'First attempt' : `Retry ${r.coached_number - 1}`;
}

function attemptRowOut(r, repsById) {
  const rep = repsById.get(r.learner_id);
  return {
    id: r.id,
    learnerId: r.learner_id,
    learnerName: rep?.name,
    role: r.learner_role,
    day: r.day,
    submittedAt: r.submitted_at,
    drillTitle: r.drill_title,
    stage: r.stage,
    stageLabel: stageLabel(r.stage),
    brand: r.brand,
    persona: r.persona,
    personaLabel: r.persona_label,
    difficulty: r.difficulty,
    skepticism: r.skepticism,
    depth: r.depth,
    mode: r.mode,
    attemptNumber: r.attempt_number,
    coachedNumber: r.coached_number,
    attemptLabel: attemptLabel(r),
    runStatus: r.run_status,
    overallScore: r.overall_score,
    reviewStatus: r.review_status,
    counted: Boolean(isCounted(r)),
    firstAttemptScored: Boolean(isFirstScored(r)),
    meetsTarget: r.meets_target,
    criticalFailures: (r.critical_failures || []).filter((c) => c.status === 'confirmed').length,
    pendingCriticalFailures: (r.critical_failures || []).filter((c) => c.status === 'pending').length,
    dimensionScores: r.dimension_scores,
    assignmentItemId: r.assignment_item_id,
  };
}

export function reportRoutes({ db }) {
  const r = Router();

  r.get(
    '/reports/summary',
    requireManager,
    route(async (req, res) => {
      const report = await buildReport(db, parseFilters(req.query));
      const { rows, ...rest } = report;
      res.set('Cache-Control', 'no-store');
      res.json(rest);
    }),
  );

  r.get(
    '/reports/rep/:id',
    requireManager,
    route(async (req, res) => {
      if (!isUuid(req.params.id)) throw notFound('That person was not found.');
      const user = await db.one(`SELECT id, name, email, role, experience, status FROM users WHERE id = $1`, [req.params.id]);
      if (!user) throw notFound('That person was not found.');
      const filters = { ...parseFilters(req.query), learnerId: user.id, role: null };
      const report = await buildReport(db, filters, { selfUser: user });
      const repsById = new Map([[user.id, user]]);
      res.set('Cache-Control', 'no-store');
      res.json({ user, ...report, rows: undefined, attempts: report.rows.slice().reverse().map((x) => attemptRowOut(x, repsById)) });
    }),
  );

  r.get(
    '/progress/me',
    route(async (req, res) => {
      const filters = { ...parseFilters(req.query), learnerId: req.user.id, role: null };
      const report = await buildReport(db, filters, { selfUser: req.user });
      const repsById = new Map([[req.user.id, req.user]]);
      res.set('Cache-Control', 'no-store');
      res.json({ ...report, rows: undefined, attempts: report.rows.slice().reverse().map((x) => attemptRowOut(x, repsById)) });
    }),
  );

  r.get(
    '/reports/export.csv',
    requireManager,
    route(async (req, res) => {
      const filters = parseFilters(req.query);
      const type = req.query.type === 'attempts' ? 'attempts' : 'reps';
      const report = await buildReport(db, filters);
      const repsById = new Map(report.reps.map((x) => [x.id, x]));
      // Notes about the data go above the table so they travel with the file.
      const preamble = [
        ['Sales Lab export', type === 'reps' ? 'Reps' : 'Answers'],
        ['Period (America/New_York)', `${report.period.startDay} to ${report.period.endDay}`],
        ...report.disclosures.map((d) => ['Note', d]),
        ['Note', 'Scores are for coaching and development only, not employment decisions or rankings.'],
      ];
      let csv;
      if (type === 'reps') {
        csv = toCsv(
          [
            { label: 'Period start (America/New_York)', value: () => report.period.startDay },
            { label: 'Period end', value: () => report.period.endDay },
            { label: 'Rep', key: 'name' },
            { label: 'Current role', key: 'roleLabel' },
            { label: 'Practiced as', value: (x) => x.rolesPracticed.map((r) => ROLES[r] || r).join('; ') },
            { label: 'Account status', key: 'status' },
            { label: 'Submitted answers', value: (x) => x.engagement.submitted },
            { label: 'Retries', value: (x) => x.engagement.retries },
            { label: 'Unscored practice', value: (x) => x.engagement.unscored },
            { label: 'Practice days', value: (x) => x.engagement.practiceDays },
            { label: 'Last practice', value: (x) => x.lastPracticeAt },
            { label: 'First-attempt coaching average', value: (x) => x.performance.firstAttemptAverage },
            { label: 'Scored first attempts', value: (x) => x.performance.scoredFirstAttempts },
            { label: 'Met target (first attempts)', value: (x) => x.performance.metTarget },
            { label: 'Critical failures confirmed', value: (x) => x.performance.criticalFailures.confirmed },
            { label: 'Critical failures pending review', value: (x) => x.performance.criticalFailures.pending },
            { label: 'Pending reviews', value: (x) => x.performance.pendingReviews },
            { label: 'Average gain on retries', value: (x) => x.retry.averageGain },
            { label: 'Exercises retried', value: (x) => x.retry.exercises },
            { label: 'Curriculum items', value: (x) => x.assignments.items },
            { label: 'Curriculum completed', value: (x) => x.assignments.completed },
            { label: 'Overdue items', value: (x) => x.assignments.overdueItems },
            { label: 'Strengths (3+ samples)', value: (x) => x.strengths.map((s) => `${s.label} ${s.average} (n=${s.n})`).join('; ') },
            { label: 'Weaknesses (3+ samples)', value: (x) => x.weaknesses.map((s) => `${s.label} ${s.average} (n=${s.n})`).join('; ') },
            { label: 'Needs follow-up', value: (x) => x.followUp.map((f) => f.text).join('; ') },
          ],
          report.reps,
          { preamble },
        );
      } else {
        const dims = (await db.one(`SELECT r.dimensions FROM workspace_settings w JOIN rubric_versions r ON r.id = w.current_rubric_id`)).dimensions;
        const rows = report.rows.map((x) => attemptRowOut(x, repsById));
        csv = toCsv(
          [
            { label: 'Day (America/New_York)', key: 'day' },
            { label: 'Submitted at (UTC)', value: (x) => new Date(x.submittedAt).toISOString() },
            { label: 'Rep', key: 'learnerName' },
            { label: 'Role at the time', value: (x) => ROLES[x.role] || x.role },
            { label: 'Drill', key: 'drillTitle' },
            { label: 'Stage', key: 'stageLabel' },
            { label: 'Brand', value: (x) => BRANDS[x.brand] || x.brand },
            { label: 'Buyer persona', key: 'personaLabel' },
            { label: 'Difficulty', key: 'difficulty' },
            { label: 'Skepticism', key: 'skepticism' },
            { label: 'Product depth', key: 'depth' },
            { label: 'Attempt', key: 'attemptLabel' },
            { label: 'Mode', key: 'mode' },
            { label: 'Coaching status', value: (x) => (x.mode === 'unscored' ? 'unscored' : x.overallScore !== null && x.overallScore !== undefined ? 'coached' : x.runStatus || 'pending') },
            { label: 'Review status', key: 'reviewStatus' },
            { label: 'Counts toward averages', value: (x) => (x.firstAttemptScored ? 'yes' : 'no') },
            { label: 'Overall score', key: 'overallScore' },
            { label: 'Met target', value: (x) => (x.meetsTarget === null || x.meetsTarget === undefined ? '' : x.meetsTarget ? 'yes' : 'no') },
            { label: 'Confirmed critical failures', key: 'criticalFailures' },
            { label: 'Critical failures pending review', key: 'pendingCriticalFailures' },
            ...dims.map((d) => ({
              label: d.label,
              value: (x) => {
                const s = (x.dimensionScores || []).find((y) => y.key === d.key);
                return s ? (s.assessed ? s.score : 'not assessed') : '';
              },
            })),
          ],
          rows,
          { preamble },
        );
      }
      const name = `sales-lab-${type}-${report.period.startDay}-to-${report.period.endDay}.csv`;
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="${name}"`);
      res.set('Cache-Control', 'no-store');
      res.send(csv);
    }),
  );

  return r;
}
