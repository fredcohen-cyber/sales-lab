import { buildCoachingRequest } from './prompt.js';
import { processEvaluation } from './scoring.js';
import { ProviderError, RUN_ERROR_MESSAGES } from './provider.js';
import { loadSourceText } from '../knowledge/service.js';

export const RUN_GRACE_MS = 10_000;
// Reps may start this many coaching runs per answer in any hour (managers are not limited).
export const RUNS_PER_ATTEMPT_PER_HOUR = 6;
export const MIN_SECONDS_BEFORE_SUPERSEDE = 20;

// Start an evaluation run row for an attempt. Call inside the transaction that owns the attempt row lock.
// The first deadline allows for waiting in the queue; it is reset to the time limit when the AI request starts.
export async function startRun(q, { attemptId, requestedBy, provider, config }) {
  const next = await q.one(`SELECT COALESCE(max(run_number), 0) + 1 AS n FROM evaluation_runs WHERE attempt_id = $1`, [attemptId]);
  const deadlineMs = config.ai.queueWaitMs + config.ai.timeoutMs + RUN_GRACE_MS;
  const run = await q.one(
    `INSERT INTO evaluation_runs (attempt_id, run_number, status, requested_by, provider, model, deadline_at)
     VALUES ($1, $2, 'running', $3, $4, $5, now() + make_interval(secs => $6))
     RETURNING *`,
    [attemptId, next.n, requestedBy, provider?.name || null, provider?.model || null, deadlineMs / 1000],
  );
  await q.query(`UPDATE attempts SET latest_run_id = $2 WHERE id = $1`, [attemptId, run.id]);
  return run;
}

// A small in-process queue so a burst of submissions cannot flood the AI service. Queued runs wait
// their turn (up to AI_QUEUE_WAIT_MS); their time limit starts only when their request is sent.
const slots = { active: 0, waiting: [] };
function acquireSlot(max, waitMs, runId) {
  if (slots.active < max && slots.waiting.length === 0) {
    slots.active += 1;
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const entry = { resolve, runId, timer: null };
    entry.timer = setTimeout(() => {
      const i = slots.waiting.indexOf(entry);
      if (i >= 0) slots.waiting.splice(i, 1);
      resolve(false);
    }, Math.max(0, waitMs));
    slots.waiting.push(entry);
  });
}
function releaseSlot() {
  const next = slots.waiting.shift();
  if (next) {
    clearTimeout(next.timer);
    next.resolve(true);
  } else {
    slots.active = Math.max(0, slots.active - 1);
  }
}

// In-flight AI requests, so a superseded run gives its slot back at once.
const inProgress = new Map();
export function abortRun(runId) {
  const i = slots.waiting.findIndex((e) => e.runId === runId);
  if (i >= 0) {
    const [entry] = slots.waiting.splice(i, 1);
    clearTimeout(entry.timer);
    entry.resolve(false);
  }
  inProgress.get(runId)?.abort();
}

async function failRun(db, runId, err, log) {
  const code = err instanceof ProviderError ? err.code : 'internal';
  const message = RUN_ERROR_MESSAGES[code] || RUN_ERROR_MESSAGES.internal;
  // The technical cause, kept for managers: the provider's status and detail, or the internal error.
  const detail =
    err instanceof ProviderError
      ? [err.status ? `HTTP ${err.status}` : '', err.detail ? String(err.detail) : ''].filter(Boolean).join(': ') || null
      : String(err.message || err).slice(0, 300);
  if (!(err instanceof ProviderError)) log(`[coach] run ${runId} internal error: ${err.stack || err.message}`);
  else log(`[coach] run ${runId} failed: ${code}${detail ? ` - ${detail.slice(0, 300)}` : ''}`);
  await db.query(
    `UPDATE evaluation_runs SET status = $2, error_code = $3, error_message = $4, error_detail = $5, finished_at = now()
      WHERE id = $1 AND status = 'running'`,
    [runId, code === 'timeout' ? 'timed_out' : 'failed', code, message, detail ? detail.slice(0, 500) : null],
  );
}

// Complete the assignment item linked to an attempt when the conversation's last reply is coached for
// the first time. The item records the conversation (its first reply).
async function completeAssignmentItem(q, attempt) {
  if (!attempt.assignment_item_id) return;
  if (attempt.turn_number < attempt.replies_planned) return;
  const item = await q.one(`SELECT * FROM assignment_items WHERE id = $1 FOR UPDATE`, [attempt.assignment_item_id]);
  if (!item || item.completed_at) return;
  await q.query(`UPDATE assignment_items SET completed_at = now(), completed_attempt_id = $2 WHERE id = $1`, [item.id, attempt.conversation_id]);
  const remaining = await q.one(
    `SELECT count(*) AS n FROM assignment_items WHERE assignment_id = $1 AND completed_at IS NULL`,
    [item.assignment_id],
  );
  if (remaining.n === 0) {
    await q.query(`UPDATE assignments SET status = 'completed', completed_at = now() WHERE id = $1 AND status = 'active'`, [item.assignment_id]);
  }
}

// Persist a verified evaluation only if this run is still the attempt's current run.
async function persistEvaluation(db, { runId, processed, rawOutput, model, threshold, log }) {
  return db.tx(async (q) => {
    const run = await q.one(`SELECT * FROM evaluation_runs WHERE id = $1 FOR UPDATE`, [runId]);
    if (!run || run.status !== 'running') {
      log(`[coach] run ${runId} finished after it was ${run?.status || 'removed'}; result discarded.`);
      return false;
    }
    const attempt = await q.one(`SELECT * FROM attempts WHERE id = $1 FOR UPDATE`, [run.attempt_id]);
    if (attempt.latest_run_id !== run.id || attempt.evaluation_id) {
      await q.query(`UPDATE evaluation_runs SET status = 'superseded', finished_at = now() WHERE id = $1`, [run.id]);
      log(`[coach] run ${runId} superseded by a newer run; result discarded.`);
      return false;
    }
    const ev = await q.one(
      `INSERT INTO evaluations (attempt_id, run_id, rubric_version_id, weighted_score, overall_score, dimension_scores, critical_failures,
         review_flags, feedback, verification_notes, review_status, meets_target, proficiency_threshold, raw_output)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [
        attempt.id,
        run.id,
        attempt.rubric_version_id,
        processed.weightedScore,
        processed.overallScore,
        JSON.stringify(processed.dimensionScores),
        JSON.stringify(processed.criticalFailures),
        JSON.stringify(processed.reviewFlags),
        JSON.stringify(processed.feedback),
        JSON.stringify(processed.notes),
        processed.reviewStatus,
        processed.meetsTarget,
        threshold,
        JSON.stringify(rawOutput ?? null),
      ],
    );
    await q.query(`UPDATE attempts SET evaluation_id = $2 WHERE id = $1`, [attempt.id, ev.id]);
    await q.query(`UPDATE evaluation_runs SET status = 'succeeded', finished_at = now(), model = COALESCE($2, model) WHERE id = $1`, [run.id, model]);
    await completeAssignmentItem(q, attempt);
    return true;
  });
}

// A response that comes back incomplete (cut off, no tool call, or a field missing or malformed) is asked
// for once more before the run fails: model output varies, and a second request usually completes.
export const REQUESTS_PER_RUN = 2;

// One request to the model: wait for a free slot while the run's deadline allows, then send it with the
// time limit. Returns null when the run was superseded or swept while it waited.
async function requestEvaluation({ db, config, provider, runId, request, deadlineMs }) {
  const gotSlot = await acquireSlot(config.ai.maxConcurrent, deadlineMs - Date.now() - config.ai.timeoutMs - RUN_GRACE_MS, runId);
  if (!gotSlot) throw new ProviderError('busy', RUN_ERROR_MESSAGES.busy);
  const controller = new AbortController();
  try {
    // The time limit starts now that the request can actually be sent.
    const started = await db.one(
      `UPDATE evaluation_runs SET call_started_at = now(), deadline_at = now() + make_interval(secs => $2)
        WHERE id = $1 AND status = 'running' RETURNING id`,
      [runId, (config.ai.timeoutMs + RUN_GRACE_MS) / 1000],
    );
    if (!started) return null;
    inProgress.set(runId, controller);
    return await provider.evaluate(request, { timeoutMs: config.ai.timeoutMs, signal: controller.signal });
  } finally {
    inProgress.delete(runId);
    releaseSlot();
  }
}

export async function runEvaluation({ db, config, provider, runId, log = console.log }) {
  try {
    const run = await db.one(`SELECT * FROM evaluation_runs WHERE id = $1`, [runId]);
    if (!run || run.status !== 'running') return;
    if (!provider) throw new ProviderError('ai_not_configured', RUN_ERROR_MESSAGES.ai_not_configured);
    const attempt = await db.one(`SELECT * FROM attempts WHERE id = $1`, [run.attempt_id]);
    const rubric = await db.one(`SELECT * FROM rubric_versions WHERE id = $1`, [attempt.rubric_version_id]);
    const settings = await db.one(`SELECT proficiency_threshold FROM workspace_settings WHERE id = 1`);
    const sources = await loadSourceText(db, attempt.source_versions);
    const request = buildCoachingRequest({ scenario: attempt.scenario, answer: attempt.answer, sources });
    await db.query(`UPDATE evaluation_runs SET prompt_version = $2 WHERE id = $1`, [runId, request.promptVersion]);
    let deadlineMs = new Date(run.deadline_at).getTime();
    let result;
    let processed;
    for (let n = 1; ; n += 1) {
      try {
        result = await requestEvaluation({ db, config, provider, runId, request, deadlineMs });
        if (!result) return; // superseded or swept while it waited
        processed = processEvaluation({
          output: result.output,
          scenario: attempt.scenario,
          answer: attempt.answer,
          sources,
          rubricDimensions: rubric.dimensions,
          threshold: settings.proficiency_threshold,
        });
        break;
      } catch (err) {
        if (!(err instanceof ProviderError) || err.code !== 'invalid_response' || n >= REQUESTS_PER_RUN) throw err;
        log(`[coach] run ${runId}: incomplete response (${String(err.detail || '').slice(0, 200)}); asking again`);
        // The second request may wait for a slot like the first, so its deadline makes room for that.
        const waitMs = config.ai.queueWaitMs + config.ai.timeoutMs + RUN_GRACE_MS;
        const extended = await db.one(
          `UPDATE evaluation_runs SET deadline_at = now() + make_interval(secs => $2) WHERE id = $1 AND status = 'running' RETURNING deadline_at`,
          [runId, waitMs / 1000],
        );
        if (!extended) return; // superseded or swept meanwhile
        deadlineMs = new Date(extended.deadline_at).getTime();
      }
    }
    await persistEvaluation(db, {
      runId,
      processed,
      rawOutput: { output: result.output, usage: result.usage, model: result.model },
      model: result.model,
      threshold: settings.proficiency_threshold,
      log,
    });
  } catch (err) {
    try {
      await failRun(db, runId, err, log);
    } catch (inner) {
      log(`[coach] could not record failure for run ${runId}: ${inner.message}`);
    }
  }
}

// Background work is tracked so tests and shutdown can wait for in-flight runs.
const inFlight = new Set();
export function scheduleEvaluation(ctx, runId) {
  const p = new Promise((resolve) => setImmediate(resolve))
    .then(() => runEvaluation({ ...ctx, runId }))
    .finally(() => inFlight.delete(p));
  inFlight.add(p);
  return p;
}
// Other coaching that runs after a request returns (a practice call's transcript) is tracked the same way.
export function runInBackground(fn) {
  const p = new Promise((resolve) => setImmediate(resolve))
    .then(fn)
    .catch(() => {})
    .finally(() => inFlight.delete(p));
  inFlight.add(p);
  return p;
}
export function waitForEvaluations() {
  return Promise.allSettled([...inFlight]);
}

// Marks runs that outlived their deadline (server restart, lost request) so nothing waits forever.
export async function sweepStaleRuns(db) {
  const { rowCount } = await db.query(
    `UPDATE evaluation_runs
        SET status = 'timed_out', error_code = 'interrupted', error_message = $1, finished_at = now()
      WHERE status = 'running' AND deadline_at < now()`,
    [RUN_ERROR_MESSAGES.interrupted],
  );
  return rowCount;
}
