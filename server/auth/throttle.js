// Sign-in throttling backed by the database so it survives restarts and deploys.
//
// Each attempt is decided one at a time per email and per network address: the decision (count, then
// record) runs under short advisory locks, and the attempt is recorded as "pending" before the password
// is checked. Parallel guesses therefore see each other, and only attempts that pass the check are ever
// pending. Requests that cannot get the locks right away (a flood) are turned away without being
// recorded, and requests the throttle blocks are recorded as "blocked", which never counts. So nobody
// can extend a lockout on someone else's account by sending more requests.
//
// Limits (rolling 15 minutes):
// - 5 failures for one email from one network address (the usual "wrong password" case);
// - 100 failures for one email from all addresses (caps a distributed attack; a single address cannot
//   lock someone out);
// - 50 failures from one network address across all emails (generous for an office sharing one address).
// A successful sign-in, a password set from a link, or a manager's "allow sign-in" clears the count.
export const PAIR_FAILURE_LIMIT = 5;
export const EMAIL_FAILURE_LIMIT = 100;
export const IP_FAILURE_LIMIT = 50;
export const WINDOW_MINUTES = 15;

const COUNTED = `outcome IN ('pending', 'failure') AND cleared_at IS NULL AND created_at > now() - make_interval(mins => $3)`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tryLocks(client, email, ip) {
  const { rows } = await client.query(
    `SELECT pg_try_advisory_xact_lock(hashtext($1)) AS e, pg_try_advisory_xact_lock(hashtext($2)) AS i`,
    [`login-email:${email || ''}`, `login-ip:${ip || ''}`],
  );
  return rows[0].e && rows[0].i;
}

// Count and record one attempt. Runs while holding the per-email and per-address locks.
async function decide(client, { email, ip, kind }) {
  const counts = (
    await client.query(
      `WITH since AS (
         SELECT COALESCE(max(created_at), '-infinity'::timestamptz) AS t
           FROM login_attempts WHERE email = $1 AND outcome = 'success')
       SELECT
         (SELECT count(*) FROM login_attempts, since
           WHERE email = $1 AND ip IS NOT DISTINCT FROM $2 AND created_at > since.t AND ${COUNTED}) AS pair_failures,
         (SELECT count(*) FROM login_attempts, since
           WHERE email = $1 AND created_at > since.t AND ${COUNTED}) AS email_failures,
         (SELECT count(*) FROM login_attempts
           WHERE ip IS NOT DISTINCT FROM $2 AND $2::text IS NOT NULL AND ${COUNTED}) AS ip_failures,
         (SELECT min(created_at) FROM (
            SELECT created_at FROM login_attempts, since
             WHERE email = $1 AND ip IS NOT DISTINCT FROM $2 AND created_at > since.t AND ${COUNTED}
             ORDER BY created_at DESC LIMIT $4) recent) AS oldest_pair`,
      [email || null, ip || null, WINDOW_MINUTES, PAIR_FAILURE_LIMIT],
    )
  ).rows[0];
  const n = (x) => Number(x) || 0;
  const blocked =
    n(counts.pair_failures) >= PAIR_FAILURE_LIMIT || n(counts.email_failures) >= EMAIL_FAILURE_LIMIT || n(counts.ip_failures) >= IP_FAILURE_LIMIT;
  let retryMinutes = WINDOW_MINUTES;
  if (blocked && n(counts.pair_failures) >= PAIR_FAILURE_LIMIT && counts.oldest_pair) {
    const unblockAt = new Date(counts.oldest_pair).getTime() + WINDOW_MINUTES * 60_000;
    retryMinutes = Math.max(1, Math.ceil((unblockAt - Date.now()) / 60_000));
  }
  const row = (
    await client.query(
      `INSERT INTO login_attempts (email, ip, outcome, kind, reason) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [email || null, ip || null, blocked ? 'blocked' : 'pending', kind, blocked ? 'throttled' : null],
    )
  ).rows[0];
  return { attemptId: row.id, blocked, busy: false, retryMinutes };
}

// Decides whether an attempt may check a password. Returns { attemptId, blocked, busy, retryMinutes }.
// Must be called with the pool (db), never inside another transaction.
export async function beginAttempt(db, { email, ip, kind = 'login' }) {
  for (let tryNo = 0; tryNo < 6; tryNo += 1) {
    const client = await db.pool.connect();
    let decision = null;
    try {
      await client.query('BEGIN');
      if (await tryLocks(client, email, ip)) decision = await decide(client, { email, ip, kind });
      await client.query(decision ? 'COMMIT' : 'ROLLBACK');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
    if (decision) return decision;
    await sleep(15 + Math.floor(Math.random() * 20));
  }
  // Still contended after a short wait: a burst of simultaneous attempts. Nothing is recorded.
  return { attemptId: null, blocked: true, busy: true, retryMinutes: 1 };
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
