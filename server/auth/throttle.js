// Login throttling backed by the database so it survives restarts and deploys.
export const EMAIL_FAILURE_LIMIT = 5;
export const IP_FAILURE_LIMIT = 25;
export const WINDOW_MINUTES = 15;

export async function loginBlocked(q, { email, ip }) {
  const row = await q.one(
    `SELECT
       (SELECT count(*) FROM login_attempts
         WHERE email = $1 AND success = false AND created_at > now() - make_interval(mins => $3)
           AND created_at > COALESCE((SELECT max(created_at) FROM login_attempts WHERE email = $1 AND success), '-infinity')) AS email_failures,
       (SELECT count(*) FROM login_attempts
         WHERE ip = $2 AND success = false AND created_at > now() - make_interval(mins => $3)) AS ip_failures,
       (SELECT min(created_at) FROM (
          SELECT created_at FROM login_attempts
           WHERE email = $1 AND success = false AND created_at > now() - make_interval(mins => $3)
           ORDER BY created_at DESC LIMIT $4) recent) AS oldest_counted`,
    [email, ip, WINDOW_MINUTES, EMAIL_FAILURE_LIMIT],
  );
  const blocked = row.email_failures >= EMAIL_FAILURE_LIMIT || row.ip_failures >= IP_FAILURE_LIMIT;
  let retryMinutes = WINDOW_MINUTES;
  if (blocked && row.oldest_counted && row.email_failures >= EMAIL_FAILURE_LIMIT) {
    const unblockAt = new Date(row.oldest_counted).getTime() + WINDOW_MINUTES * 60_000;
    retryMinutes = Math.max(1, Math.ceil((unblockAt - Date.now()) / 60_000));
  }
  return { blocked, retryMinutes };
}

export async function recordLoginAttempt(q, { email, ip, success, reason }) {
  await q.query(`INSERT INTO login_attempts (email, ip, success, reason) VALUES ($1, $2, $3, $4)`, [
    email || null,
    ip || null,
    success,
    reason || null,
  ]);
}
