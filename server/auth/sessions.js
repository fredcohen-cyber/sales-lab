import { hashToken, newToken } from '../lib/tokens.js';
import { SESSION_TTL_DAYS } from '../domain.js';

export const SESSION_COOKIE = 'sl_session';

export function cookieOptions(config) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secureCookies,
    path: '/',
    maxAge: SESSION_TTL_DAYS * 86_400_000,
  };
}

export async function createSession(q, { userId, ip, userAgent }) {
  const token = newToken(32);
  const row = await q.one(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip, user_agent)
     VALUES ($1, $2, now() + make_interval(days => $3), $4, $5)
     RETURNING id, expires_at`,
    [userId, hashToken(token), SESSION_TTL_DAYS, ip || null, (userAgent || '').slice(0, 300) || null],
  );
  return { token, id: row.id, expiresAt: row.expires_at };
}

// Resolve a cookie token to an active session for an active user. Every protected request goes through here.
export async function findSession(q, token) {
  if (!token || typeof token !== 'string' || token.length > 100) return null;
  return q.one(
    `SELECT s.id AS session_id, s.last_seen_at, u.id, u.email, u.name, u.role, u.experience, u.is_owner, u.status,
            u.password_set_at, u.last_login_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND u.status = 'active'`,
    [hashToken(token)],
  );
}

export async function touchSession(q, sessionId) {
  await q.query(
    `UPDATE sessions SET last_seen_at = now()
      WHERE id = $1 AND last_seen_at < now() - interval '5 minutes'`,
    [sessionId],
  );
}

export async function revokeSession(q, sessionId, reason) {
  await q.query(`UPDATE sessions SET revoked_at = now(), revoked_reason = $2 WHERE id = $1 AND revoked_at IS NULL`, [
    sessionId,
    reason,
  ]);
}

export async function revokeAllSessions(q, userId, reason, { exceptSessionId = null } = {}) {
  const { rowCount } = await q.query(
    `UPDATE sessions SET revoked_at = now(), revoked_reason = $2
      WHERE user_id = $1 AND revoked_at IS NULL AND ($3::uuid IS NULL OR id <> $3::uuid)`,
    [userId, reason, exceptSessionId],
  );
  return rowCount;
}
