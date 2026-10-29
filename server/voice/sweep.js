// Keeps practice calls from running on: calls never dialed are set aside, calls past the time limit are
// hung up at OpenAI (so billing stops even if the browser vanished) and coached from the transcript saved
// so far, and coaching that never finished is marked as stopped.
import { aiConfigured } from '../config.js';
import { hangUpRealtimeCall } from './realtime.js';
import { CALL_COACHING_ERRORS, repText, scheduleCallCoaching } from './coach.js';

const MIN_REP_WORDS = 8;
const wordCount = (s) => String(s || '').split(/\s+/).filter(Boolean).length;

export async function sweepVoiceCalls({ db, config, provider, log = () => {} }) {
  const abandoned = await db.query(`UPDATE voice_calls SET status = 'abandoned' WHERE status = 'ready' AND created_at < now() - interval '30 minutes'`);

  const limitSecs = config.voice.maxCallMinutes * 60;
  const overdue = await db.many(
    `UPDATE voice_calls
        SET status = 'ended', ended_at = now(), end_reason = 'time_limit',
            duration_ms = LEAST(GREATEST(EXTRACT(EPOCH FROM now() - connected_at) * 1000, 0), $1::int * 1000)::int
      WHERE status = 'live' AND connected_at < now() - make_interval(secs => $1::int + 120)
      RETURNING id, openai_call_id, transcript`,
    [limitSecs],
  );
  for (const call of overdue) {
    await hangUpRealtimeCall(config, call.openai_call_id, log);
    const enough = wordCount(repText(call.transcript)) >= MIN_REP_WORDS;
    const coach = enough && aiConfigured(config);
    await db.query(
      `UPDATE voice_calls SET coaching_status = $2, coaching_started_at = CASE WHEN $2 = 'running' THEN now() ELSE NULL END, coaching_error = $3 WHERE id = $1`,
      [call.id, coach ? 'running' : 'skipped', coach ? null : enough ? CALL_COACHING_ERRORS.ai_not_configured : 'The call ended before you said enough to coach.'],
    );
    if (coach) scheduleCallCoaching({ db, config, provider, log }, call.id);
  }

  // Coaching gets two full attempts at the time limit, plus a minute; past that it was lost (a restart).
  const staleSecs = Math.ceil((config.ai.timeoutMs * 2) / 1000) + 60;
  const stale = await db.query(
    `UPDATE voice_calls SET coaching_status = 'failed', coaching_error = $2
      WHERE coaching_status = 'running' AND coaching_started_at < now() - make_interval(secs => $1::int)`,
    [staleSecs, CALL_COACHING_ERRORS.interrupted],
  );
  return { abandoned: abandoned.rowCount, overdue: overdue.length, stale: stale.rowCount };
}
