import { conflict, forbidden, HttpError, notFound } from '../lib/errors.js';
import { aiConfigured } from '../config.js';
import { availabilityReason, DRILL_VERSION_SQL, UNAVAILABLE_TEXT } from '../drills/service.js';
import { resolveSourceRefs } from '../knowledge/service.js';
import { buildScenario } from './scenario.js';
import { MIN_SECONDS_BEFORE_SUPERSEDE, RUNS_PER_ATTEMPT_PER_HOUR, startRun } from '../ai/evaluate.js';
import { audit } from '../lib/audit.js';
import { RUN_ERROR_MESSAGES } from '../ai/provider.js';
import { nyDate } from '../lib/time.js';

export const MIN_ANSWER_CHARS = 15;
export const MAX_ANSWER_CHARS = 6000;

async function currentRubric(q) {
  return q.one(
    `SELECT r.* FROM workspace_settings w JOIN rubric_versions r ON r.id = w.current_rubric_id WHERE w.id = 1`,
  );
}

// Load an assignment item for a learner and check the prescribed order.
export async function loadAssignedItem(q, itemId, learnerId, { lock = false } = {}) {
  const item = await q.one(
    `SELECT i.*, a.learner_id, a.status AS assignment_status, a.title AS assignment_title, a.due_date
       FROM assignment_items i JOIN assignments a ON a.id = i.assignment_id
      WHERE i.id = $1 ${lock ? 'FOR UPDATE OF i' : ''}`,
    [itemId],
  );
  if (!item || item.learner_id !== learnerId) throw notFound('That assignment was not found.');
  if (item.assignment_status === 'cancelled') throw new HttpError(409, 'assignment_cancelled', 'This assignment was cancelled by your manager.');
  const blocking = await q.one(
    `SELECT count(*) AS n FROM assignment_items WHERE assignment_id = $1 AND position < $2 AND completed_at IS NULL`,
    [item.assignment_id, item.position],
  );
  return { item, locked: blocking.n > 0 };
}

async function loadPersona(q, key) {
  const p = await q.one(`SELECT * FROM personas WHERE key = $1`, [key]);
  if (!p) throw new HttpError(400, 'validation_failed', 'Choose a buyer persona from the list.');
  return p;
}

// Resolve what a learner will practice: drill version, persona, settings, and sources.
export async function resolvePractice(q, config, user, input) {
  let drill;
  let settings;
  let personaKey;
  let assigned = null;
  if (input.assignmentItemId) {
    const { item, locked } = await loadAssignedItem(q, input.assignmentItemId, user.id);
    if (locked) throw new HttpError(409, 'out_of_order', 'Finish the earlier exercises in this assignment first.');
    drill = await q.one(`${DRILL_VERSION_SQL} WHERE v.id = $1`, [item.drill_version_id]);
    settings = { difficulty: item.difficulty, skepticism: item.skepticism, depth: item.depth };
    personaKey = item.persona;
    assigned = item;
  } else {
    if (input.drillVersionId) {
      drill = await q.one(`${DRILL_VERSION_SQL} WHERE v.id = $1 AND d.id = $2`, [input.drillVersionId, input.drillId]).catch(() => null);
    }
    if (!drill) {
      drill = await q
        .one(`${DRILL_VERSION_SQL} JOIN drills cd ON cd.current_version_id = v.id WHERE d.id = $1`, [input.drillId])
        .catch(() => null);
    }
    if (!drill) throw notFound('That drill was not found.');
    if (drill.status !== 'active' && !user.isManager) throw notFound('That drill is not available.');
    personaKey = input.persona || drill.personas[0];
    if (!drill.personas.includes(personaKey)) throw new HttpError(400, 'validation_failed', 'That persona is not part of this drill.');
    const pick = (v, d) => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : d);
    settings = {
      difficulty: pick(input.difficulty, drill.default_difficulty),
      skepticism: pick(input.skepticism, drill.default_skepticism),
      depth: pick(input.depth, drill.default_depth),
    };
  }
  const persona = await loadPersona(q, personaKey);
  const rubric = await currentRubric(q);
  const sources = await resolveSourceRefs(q, drill.source_refs, drill, personaKey);
  const available = sources.filter((s) => s.available);
  const unavailableReason = availabilityReason(config, sources);
  const scenario = buildScenario({ drill, persona, settings, rubricDimensions: rubric.dimensions, sources });
  return { drill, persona, settings, rubric, sources, available, scenario, assigned, coachingAvailable: !unavailableReason, unavailableReason };
}

// Bounds paid AI calls per person: new coached answers plus retries, across all their answers.
async function checkCoachingRate(q, config, user) {
  const row = await q.one(
    `SELECT count(*) AS n FROM evaluation_runs WHERE requested_by = $1 AND started_at > now() - interval '1 hour'`,
    [user.id],
  );
  if (row.n >= config.ai.runsPerUserPerHour) {
    throw new HttpError(
      429,
      'coaching_rate_limited',
      'You have requested coaching many times in the last hour. Your work is saved; try again in a few minutes.',
    );
  }
}

export async function createAttempt(db, config, user, body, { provider }) {
  const existing = await db.one(`SELECT id FROM attempts WHERE learner_id = $1 AND client_request_id = $2`, [user.id, body.clientRequestId]);
  if (existing) return { attemptId: existing.id, runId: null, duplicate: true };

  const answer = body.answer.replace(/\r\n?/g, '\n').trim();
  if (answer.length < MIN_ANSWER_CHARS) throw new HttpError(400, 'answer_too_short', 'Write a fuller answer before submitting.');
  if (answer.length > MAX_ANSWER_CHARS) throw new HttpError(400, 'answer_too_long', `Keep your answer under ${MAX_ANSWER_CHARS.toLocaleString()} characters.`);

  return db.tx(async (q) => {
    const ctx = await resolvePractice(q, config, user, body);
    if (ctx.assigned) {
      // Re-check order under lock so two tabs cannot skip ahead.
      const { locked } = await loadAssignedItem(q, ctx.assigned.id, user.id, { lock: true });
      if (locked) throw new HttpError(409, 'out_of_order', 'Finish the earlier exercises in this assignment first.');
    }
    if (body.mode === 'coached' && !ctx.coachingAvailable) {
      throw conflict('coaching_unavailable', ctx.unavailableReason === 'ai_not_configured' ? RUN_ERROR_MESSAGES.ai_not_configured : UNAVAILABLE_TEXT[ctx.unavailableReason], {
        reason: ctx.unavailableReason,
      });
    }
    if (body.mode === 'coached') await checkCoachingRate(q, config, user);
    if (body.mode === 'unscored' && ctx.coachingAvailable) {
      throw conflict('coaching_available', 'Coaching is available for this drill, so submit it for coaching.');
    }
    if (body.mode === 'unscored' && ctx.assigned) {
      throw conflict('unscored_assignment', 'Unscored practice cannot complete an assigned exercise. Practice it from the drill library instead.');
    }

    // Serialize attempt numbering per learner + drill + persona.
    await q.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${user.id}:${ctx.drill.id}:${ctx.persona.key}`]);
    const dup = await q.one(`SELECT id FROM attempts WHERE learner_id = $1 AND client_request_id = $2`, [user.id, body.clientRequestId]);
    if (dup) return { attemptId: dup.id, runId: null, duplicate: true };
    const num = await q.one(
      `SELECT COALESCE(max(attempt_number), 0) + 1 AS n,
              COALESCE(max(coached_number), 0) + 1 AS coached
         FROM attempts WHERE learner_id = $1 AND drill_id = $2 AND persona = $3`,
      [user.id, ctx.drill.id, ctx.persona.key],
    );
    const sourceVersions = ctx.available.map((s) => ({
      sourceId: s.sourceId,
      versionId: s.versionId,
      version: s.version,
      title: s.title,
      asOfDate: s.asOfDate,
      caveats: s.caveats,
      evidenceBasis: s.evidenceBasis,
      sections: s.sections,
    }));
    const attempt = await q.one(
      `INSERT INTO attempts (learner_id, learner_role, drill_id, drill_version_id, persona, difficulty, skepticism, depth, brand, stage,
         assignment_item_id, mode, unscored_reason, attempt_number, scenario, rubric_version_id, source_versions, answer, client_request_id,
         coached_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
      [
        user.id,
        user.role,
        ctx.drill.id,
        ctx.drill.version_id,
        ctx.persona.key,
        ctx.settings.difficulty,
        ctx.settings.skepticism,
        ctx.settings.depth,
        ctx.drill.brand,
        ctx.drill.stage,
        ctx.assigned?.id || null,
        body.mode,
        body.mode === 'unscored' ? ctx.unavailableReason : null,
        num.n,
        JSON.stringify(ctx.scenario),
        ctx.rubric.id,
        JSON.stringify(sourceVersions),
        answer,
        body.clientRequestId,
        body.mode === 'coached' ? num.coached : null,
      ],
    );
    let runId = null;
    if (body.mode === 'coached') {
      const run = await startRun(q, { attemptId: attempt.id, requestedBy: user.id, provider, config });
      runId = run.id;
    }
    return { attemptId: attempt.id, runId, duplicate: false };
  });
}

// Reps can retry coaching a few times an hour per answer; managers can always restart it.
function retryState(attempt, latestRun, recentRuns, config, viewer) {
  if (attempt.mode !== 'coached') return { canRetry: false, reason: 'unscored' };
  if (attempt.evaluation_id) return { canRetry: false, reason: 'already_coached' };
  if (!aiConfigured(config)) return { canRetry: false, reason: 'ai_not_configured' };
  if (latestRun?.status === 'running') {
    const ageSec = (Date.now() - new Date(latestRun.started_at).getTime()) / 1000;
    if (ageSec < MIN_SECONDS_BEFORE_SUPERSEDE) return { canRetry: false, reason: 'in_progress', retryInSeconds: Math.ceil(MIN_SECONDS_BEFORE_SUPERSEDE - ageSec) };
  }
  if (!viewer.isManager && recentRuns >= RUNS_PER_ATTEMPT_PER_HOUR) return { canRetry: false, reason: 'too_many_runs' };
  return { canRetry: true, reason: null };
}

const RECENT_RUNS_SQL = `SELECT count(*) AS n FROM evaluation_runs WHERE attempt_id = $1 AND started_at > now() - interval '1 hour'`;

export async function retryCoaching(db, config, user, attemptId, { provider }) {
  return db.tx(async (q) => {
    const attempt = await q.one(`SELECT * FROM attempts WHERE id = $1 FOR UPDATE`, [attemptId]).catch(() => null);
    if (!attempt) throw notFound('That answer was not found.');
    if (attempt.learner_id !== user.id && !user.isManager) throw notFound('That answer was not found.');
    const latest = attempt.latest_run_id ? await q.one(`SELECT * FROM evaluation_runs WHERE id = $1`, [attempt.latest_run_id]) : null;
    const recent = await q.one(RECENT_RUNS_SQL, [attempt.id]);
    const state = retryState(attempt, latest, recent.n, config, user);
    if (!state.canRetry) {
      const messages = {
        unscored: 'This was unscored practice, so there is no coaching to retry.',
        already_coached: 'This answer already has coaching.',
        ai_not_configured: RUN_ERROR_MESSAGES.ai_not_configured,
        too_many_runs: 'Coaching was retried several times in the last hour. Try again later, or ask your manager to restart it.',
        in_progress: `Coaching is still running. You can retry in ${state.retryInSeconds} seconds if it has not finished.`,
      };
      throw conflict(`retry_${state.reason}`, messages[state.reason], { retryInSeconds: state.retryInSeconds });
    }
    await checkCoachingRate(q, config, user);
    if (latest?.status === 'running') {
      await q.query(`UPDATE evaluation_runs SET status = 'superseded', finished_at = now(), error_code = 'superseded' WHERE id = $1 AND status = 'running'`, [latest.id]);
    }
    const run = await startRun(q, { attemptId: attempt.id, requestedBy: user.id, provider, config });
    if (attempt.learner_id !== user.id) {
      await audit(q, { actorId: user.id, action: 'coaching.restarted', targetUserId: attempt.learner_id, entityType: 'attempt', entityId: attempt.id });
    }
    return { attemptId: attempt.id, runId: run.id };
  });
}

export async function canViewAttempt(q, viewer, attemptId) {
  const a = await q.one(`SELECT learner_id FROM attempts WHERE id = $1`, [attemptId]).catch(() => null);
  if (!a) return false;
  return viewer.isManager || a.learner_id === viewer.id;
}

function shapeRun(run) {
  if (!run) return null;
  return {
    id: run.id,
    runNumber: run.run_number,
    status: run.status,
    startedAt: run.started_at,
    deadlineAt: run.deadline_at,
    finishedAt: run.finished_at,
    errorCode: run.error_code,
    errorMessage: run.error_message,
  };
}

export function shapeEvaluation(ev, { forManager }) {
  if (!ev) return null;
  return {
    id: ev.id,
    overallScore: ev.overall_score,
    weightedScore: ev.weighted_score,
    dimensionScores: ev.dimension_scores,
    criticalFailures: ev.critical_failures,
    reviewFlags: ev.review_flags,
    feedback: ev.feedback,
    verificationNotes: ev.verification_notes,
    reviewStatus: ev.review_status,
    meetsTarget: ev.meets_target,
    proficiencyThreshold: ev.proficiency_threshold,
    createdAt: ev.created_at,
    reviewedAt: ev.reviewed_at,
    reviewedByName: ev.reviewed_by_name || null,
    reviewNote: ev.review_note,
    rawOutput: forManager ? ev.raw_output : undefined,
  };
}

// Suggest the next drill: one that scores the weakest dimension in this evaluation.
async function suggestNext(q, attempt, evaluation, user) {
  if (!evaluation) return null;
  const scored = (evaluation.dimension_scores || []).filter((d) => d.assessed);
  if (!scored.length) return null;
  const focusKey = evaluation.feedback?.nextFocus?.dimension || scored.reduce((a, b) => (b.score < a.score ? b : a)).key;
  const row = await q.one(
    `SELECT d.id, v.title, v.stage FROM drills d JOIN drill_versions v ON v.id = d.current_version_id
      WHERE d.status = 'active' AND d.id <> $1 AND $2 = ANY(v.assessed_dimensions) AND $3 = ANY(v.roles)
      ORDER BY (v.brand = $4) DESC, (SELECT count(*) FROM attempts x WHERE x.drill_id = d.id AND x.learner_id = $5), v.title
      LIMIT 1`,
    [attempt.drill_id, focusKey, user.role === 'manager' ? attempt.learner_role : user.role, attempt.brand, attempt.learner_id],
  );
  const label = scored.find((d) => d.key === focusKey)?.label || focusKey;
  return row ? { dimension: focusKey, dimensionLabel: label, drillId: row.id, drillTitle: row.title } : { dimension: focusKey, dimensionLabel: label };
}

export async function attemptView(db, config, viewer, attemptId) {
  // One statement, one snapshot: the run status and the evaluation it produced are always read together.
  const a = await db
    .one(
      `SELECT a.*, u.name AS learner_name, u.role AS learner_current_role, u.email AS learner_email,
              to_jsonb(r) AS latest_run_json,
              CASE WHEN e.id IS NULL THEN NULL ELSE to_jsonb(e) || jsonb_build_object('reviewed_by_name', rv.name) END AS evaluation_json,
              (SELECT count(*) FROM evaluation_runs x WHERE x.attempt_id = a.id) AS run_count,
              (SELECT count(*) FROM evaluation_runs x WHERE x.attempt_id = a.id AND x.started_at > now() - interval '1 hour') AS recent_run_count
         FROM attempts a
         JOIN users u ON u.id = a.learner_id
         LEFT JOIN evaluation_runs r ON r.id = a.latest_run_id
         LEFT JOIN evaluations e ON e.id = a.evaluation_id
         LEFT JOIN users rv ON rv.id = e.reviewed_by
        WHERE a.id = $1`,
      [attemptId],
    )
    .catch(() => null);
  if (!a || (!viewer.isManager && a.learner_id !== viewer.id)) throw notFound('That answer was not found.');
  const latestRun = a.latest_run_json;
  const runCount = a.run_count;
  const evaluation = a.evaluation_json;
  const notes = await db.many(
    `SELECT n.id, n.body, n.created_at, u.name AS author_name FROM coaching_notes n JOIN users u ON u.id = n.author_id
      WHERE n.attempt_id = $1 ORDER BY n.created_at`,
    [a.id],
  );
  const siblings = await db.many(
    `SELECT a.id, a.attempt_number, a.coached_number, a.submitted_at, a.mode, e.overall_score, e.review_status
       FROM attempts a LEFT JOIN evaluations e ON e.id = a.evaluation_id
      WHERE a.learner_id = $1 AND a.drill_id = $2 AND a.persona = $3 ORDER BY a.attempt_number`,
    [a.learner_id, a.drill_id, a.persona],
  );
  let assignment = null;
  if (a.assignment_item_id) {
    assignment = await db.one(
      `SELECT i.id AS item_id, i.position, i.assignment_id, s.title, s.status,
              (SELECT count(*) FROM assignment_items x WHERE x.assignment_id = s.id) AS total
         FROM assignment_items i JOIN assignments s ON s.id = i.assignment_id WHERE i.id = $1`,
      [a.assignment_item_id],
    );
  }
  const retry = retryState(a, latestRun, a.recent_run_count, config, viewer);
  return {
    attempt: {
      id: a.id,
      learner: { id: a.learner_id, name: a.learner_name, role: a.learner_current_role, roleAtAttempt: a.learner_role },
      drillId: a.drill_id,
      drillVersionId: a.drill_version_id,
      persona: a.persona,
      settings: { difficulty: a.difficulty, skepticism: a.skepticism, depth: a.depth },
      mode: a.mode,
      unscoredReason: a.unscored_reason,
      attemptNumber: a.attempt_number,
      coachedNumber: a.coached_number,
      // The first coached answer is the first attempt; unscored practice never uses it up.
      isFirstAttempt: a.coached_number === 1,
      scenario: a.scenario,
      sourceVersions: (a.source_versions || []).map(({ caveats, ...s }) => ({ ...s, caveats })),
      answer: a.answer,
      submittedAt: a.submitted_at,
      submittedDay: nyDate(a.submitted_at),
      assignment: assignment && {
        assignmentId: assignment.assignment_id,
        itemId: assignment.item_id,
        title: assignment.title,
        position: assignment.position,
        total: assignment.total,
        status: assignment.status,
      },
    },
    coaching: {
      run: shapeRun(latestRun),
      runCount,
      canRetry: retry.canRetry,
      retryBlockedReason: retry.reason,
      retryInSeconds: retry.retryInSeconds || null,
      serverNow: new Date().toISOString(),
    },
    evaluation: shapeEvaluation(evaluation, { forManager: viewer.isManager }),
    notes,
    siblings,
    next: await suggestNext(db, a, evaluation, viewer),
  };
}

export function assertLearnerScope(viewer, learnerId) {
  if (!viewer.isManager && learnerId && learnerId !== viewer.id) throw forbidden();
}
