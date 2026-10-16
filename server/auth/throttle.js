// Sign-in throttling backed by the database so it survives restarts and deploys.
//
// Every attempt is written as "pending" BEFORE the password is checked, and the limits count pending
// rows as well as failures. Parallel guesses therefore see each other: in a burst, only the first few
// reach the password check. Requests the throttle turns away are recorded as "blocked" and never count,
// so someone who is already blocked cannot extend a lockout on another person's account.
//
// Limits (rolling 15 minutes):
// - 5 failures for one email from one network address (the usual "wrong password" case);
// - 40 failures for one email from all addresses (spreads a distributed attack thin without letting a
//   single address lock someone out);
// - 20 failures from one network address across all emails.
// A successful sign-in, a password set from a link, or a manager's "allow sign-in" clears the count.
export const PAIR_FAILURE_LIMIT = 5;
export const EMAIL_FAILURE_LIMIT = 40;
export const IP_FAILURE_LIMIT = 20;
export const WINDOW_MINUTES = 15;

const COUNTED = `outcome IN ('pending', 'failure') AND cleared_at IS NULL AND created_at > now() - make_interval(mins => $3)`;

// Records the attempt as pending, then decides whether it may proceed. Returns { attemptId, blocked, retryMinutes }.
export async function beginAttempt(q, { email, ip, kind = 'login' }) {
  const row = await q.one(
    `INSERT INTO login_attempts (email, ip, outcome, kind) VALUES ($1, $2, 'pending', $3) RETURNING id`,
    [email || null, ip || null, kind],
  );
  const counts = await q.one(
    `WITH since AS (
       SELECT COALESCE(max(created_at), '-infinity'::timestamptz) AS t
         FROM login_attempts WHERE email = $1 AND outcome = 'success' AND id <> $4)
     SELECT
       (SELECT count(*) FROM login_attempts, since
         WHERE email = $1 AND ip IS NOT DISTINCT FROM $2 AND id <> $4 AND created_at > since.t AND ${COUNTED}) AS pair_failures,
       (SELECT count(*) FROM login_attempts, since
         WHERE email = $1 AND id <> $4 AND created_at > since.t AND ${COUNTED}) AS email_failures,
       (SELECT count(*) FROM login_attempts
         WHERE ip IS NOT DISTINCT FROM $2 AND $2::text IS NOT NULL AND id <> $4 AND ${COUNTED}) AS ip_failures,
       (SELECT min(created_at) FROM (
          SELECT created_at FROM login_attempts, since
           WHERE email = $1 AND ip IS NOT DISTINCT FROM $2 AND id <> $4 AND created_at > since.t AND ${COUNTED}
           ORDER BY created_at DESC LIMIT $5) recent) AS oldest_pair`,
    [email || null, ip || null, WINDOW_MINUTES, row.id, PAIR_FAILURE_LIMIT],
  );
  const blocked =
    counts.pair_failures >= PAIR_FAILURE_LIMIT || counts.email_failures >= EMAIL_FAILURE_LIMIT || counts.ip_failures >= IP_FAILURE_LIMIT;
  let retryMinutes = WINDOW_MINUTES;
  if (blocked && counts.pair_failures >= PAIR_FAILURE_LIMIT && counts.oldest_pair) {
    const unblockAt = new Date(counts.oldest_pair).getTime() + WINDOW_MINUTES * 60_000;
    retryMinutes = Math.max(1, Math.ceil((unblockAt - Date.now()) / 60_000));
  }
  if (blocked) await finishAttempt(q, row.id, { outcome: 'blocked', reason: 'throttled' });
  return { attemptId: row.id, blocked, retryMinutes };
}

export async function finishAttempt(q, attemptId, { outcome, reason = null }) {
  await q.query(`UPDATE login_attempts SET outcome = $2, reason = $3 WHERE id = $1`, [attemptId, outcome, reason]);
}

// Clears counted failures for an email (manager "allow sign-in", or a new password from a link).
export async function clearFailures(q, email) {
  const { rowCount } = await q.query(
    `UPDATE login_attempts SET cleared_at = now()
      WHERE email = $1 AND cleared_at IS NULL AND outcome IN ('pending', 'failure')
        AND created_at > now() - make_interval(mins => $2)`,
    [email, WINDOW_MINUTES],
  );
  return rowCount;
}

// Whether sign-in is currently paused for an email from any address, for User Management.
export async function lockoutState(q, email) {
  const row = await q.one(
    `WITH since AS (
       SELECT COALESCE(max(created_at), '-infinity'::timestamptz) AS t FROM login_attempts WHERE email = $1 AND outcome = 'success')
     SELECT
       (SELECT count(*) FROM login_attempts, since
         WHERE email = $1 AND created_at > since.t AND outcome IN ('pending', 'failure') AND cleared_at IS NULL
           AND created_at > now() - make_interval(mins => $2)) AS failures,
       (SELECT max(n) FROM (
          SELECT count(*) AS n FROM login_attempts, since
           WHERE email = $1 AND created_at > since.t AND outcome IN ('pending', 'failure') AND cleared_at IS NULL
             AND created_at > now() - make_interval(mins => $2)
           GROUP BY ip) per_ip) AS worst_address,
       (SELECT max(created_at) FROM login_attempts WHERE email = $1 AND outcome = 'blocked'
           AND created_at > now() - make_interval(mins => $2)) AS last_blocked`,
    [email, WINDOW_MINUTES],
  );
  const paused = (row.worst_address || 0) >= PAIR_FAILURE_LIMIT || row.failures >= EMAIL_FAILURE_LIMIT;
  return { paused, recentFailures: row.failures, lastBlockedAt: row.last_blocked };
}
