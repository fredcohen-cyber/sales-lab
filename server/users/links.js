import { hashToken, looksLikeToken, newToken } from '../lib/tokens.js';
import { hashPassword, passwordProblem } from '../lib/passwords.js';
import { audit } from '../lib/audit.js';
import { revokeAllSessions } from '../auth/sessions.js';
import { HttpError } from '../lib/errors.js';
import { LINK_TTL_HOURS } from '../domain.js';

export function linkUrl(origin, token) {
  return `${origin.replace(/\/+$/, '')}/set-password/${token}`;
}

// Creates a single-use password link and invalidates any earlier unused link for the user.
export async function createPasswordLink(q, { userId, purpose, createdBy, ip }) {
  await q.query(
    `UPDATE password_links SET revoked_at = now(), revoked_reason = 'replaced'
      WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [userId],
  );
  const token = newToken(32);
  const row = await q.one(
    `INSERT INTO password_links (user_id, purpose, token_hash, created_by, expires_at)
     VALUES ($1, $2, $3, $4, now() + make_interval(hours => $5))
     RETURNING id, purpose, created_at, expires_at`,
    [userId, purpose, hashToken(token), createdBy, LINK_TTL_HOURS],
  );
  await audit(q, {
    actorId: createdBy,
    action: 'link.created',
    targetUserId: userId,
    entityType: 'password_link',
    entityId: row.id,
    details: { purpose, expiresAt: row.expires_at },
    ip,
  });
  return { token, id: row.id, purpose: row.purpose, createdAt: row.created_at, expiresAt: row.expires_at };
}

export async function revokeUnusedLinks(q, { userId, actorId, reason, ip }) {
  const { rowCount } = await q.query(
    `UPDATE password_links SET revoked_at = now(), revoked_reason = $2
      WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [userId, reason],
  );
  if (rowCount > 0) {
    await audit(q, {
      actorId,
      action: 'link.revoked',
      targetUserId: userId,
      entityType: 'user',
      entityId: userId,
      details: { count: rowCount, reason },
      ip,
    });
  }
  return rowCount;
}

function linkState(row) {
  if (!row) return 'invalid';
  if (row.used_at) return 'used';
  if (row.revoked_at) return 'revoked';
  if (new Date(row.expires_at).getTime() <= Date.now()) return 'expired';
  if (row.user_status !== 'active') return 'revoked';
  return 'valid';
}

const LINK_MESSAGES = {
  invalid: 'This link is not valid. Ask your manager for a new one.',
  used: 'This link has already been used. Sign in, or ask your manager for a new link.',
  revoked: 'This link is no longer active. Ask your manager for a new one.',
  expired: 'This link has expired. Links work for 48 hours; ask your manager for a new one.',
};

async function loadLink(q, token, { lock = false } = {}) {
  if (!looksLikeToken(token)) return null;
  return q.one(
    `SELECT l.*, u.email, u.name, u.status AS user_status, u.password_hash IS NOT NULL AS has_password
       FROM password_links l JOIN users u ON u.id = l.user_id
      WHERE l.token_hash = $1 ${lock ? 'FOR UPDATE OF l' : ''}`,
    [hashToken(token)],
  );
}

export async function describeLink(q, token) {
  const row = await loadLink(q, token);
  const state = linkState(row);
  if (state !== 'valid') throw new HttpError(410, `link_${state}`, LINK_MESSAGES[state]);
  return { email: row.email, name: row.name, purpose: row.purpose, expiresAt: row.expires_at };
}

// Sets the password, burns the link, and signs the user out everywhere.
export async function consumeLink(db, token, password, { ip }) {
  return db.tx(async (q) => {
    const row = await loadLink(q, token, { lock: true });
    const state = linkState(row);
    if (state !== 'valid') throw new HttpError(410, `link_${state}`, LINK_MESSAGES[state]);
    const problem = passwordProblem(password, row.email);
    if (problem) throw new HttpError(400, 'weak_password', problem);
    const hash = await hashPassword(password);
    await q.query(`UPDATE users SET password_hash = $2, password_set_at = now(), updated_at = now() WHERE id = $1`, [
      row.user_id,
      hash,
    ]);
    await q.query(`UPDATE password_links SET used_at = now() WHERE id = $1`, [row.id]);
    await q.query(
      `UPDATE password_links SET revoked_at = now(), revoked_reason = 'superseded by completed link'
        WHERE user_id = $1 AND id <> $2 AND used_at IS NULL AND revoked_at IS NULL`,
      [row.user_id, row.id],
    );
    const revoked = await revokeAllSessions(q, row.user_id, 'password changed');
    await audit(q, {
      actorId: row.user_id,
      action: 'link.used',
      targetUserId: row.user_id,
      entityType: 'password_link',
      entityId: row.id,
      details: { purpose: row.purpose, sessionsRevoked: revoked },
      ip,
    });
    return { email: row.email, purpose: row.purpose };
  });
}
