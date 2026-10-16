import { Router } from 'express';
import { z } from 'zod';
import { HttpError, parseBody, route, unauthorized } from '../lib/errors.js';
import { burnPasswordCheck, hashPassword, passwordProblem, verifyPassword } from '../lib/passwords.js';
import { audit } from '../lib/audit.js';
import { clientIp, requireAuth } from './middleware.js';
import { cookieOptions, createSession, revokeAllSessions, revokeSession, SESSION_COOKIE } from './sessions.js';
import { loginBlocked, recordLoginAttempt } from './throttle.js';
import { consumeLink, describeLink } from '../users/links.js';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter your company email address.').max(254),
  password: z.string().min(1, 'Enter your password.').max(200),
});

export function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    experience: u.experience,
    isOwner: Boolean(u.isOwner ?? u.is_owner),
    isManager: u.role === 'manager',
  };
}

export function authRoutes({ db, config }) {
  const r = Router();
  const GENERIC_FAIL = 'That email and password do not match an active account.';

  r.post(
    '/login',
    route(async (req, res) => {
      const { email, password } = parseBody(loginSchema, req.body);
      const ip = clientIp(req);
      const gate = await loginBlocked(db, { email, ip });
      if (gate.blocked) {
        await recordLoginAttempt(db, { email, ip, success: false, reason: 'throttled' });
        throw new HttpError(
          429,
          'too_many_attempts',
          `Too many sign-in attempts. Try again in ${gate.retryMinutes} minute${gate.retryMinutes === 1 ? '' : 's'}, or ask your manager for a password reset link.`,
        );
      }
      const user = await db.one(`SELECT * FROM users WHERE email = $1`, [email]);
      let ok = false;
      let reason = 'unknown_email';
      if (!user) {
        await burnPasswordCheck(password);
      } else if (!user.password_hash) {
        await burnPasswordCheck(password);
        reason = 'no_password';
      } else {
        ok = await verifyPassword(password, user.password_hash);
        reason = ok ? null : 'bad_password';
        if (ok && user.status !== 'active') {
          ok = false;
          reason = 'deactivated';
        }
      }
      if (!ok) {
        await recordLoginAttempt(db, { email, ip, success: false, reason });
        if (user) {
          await audit(db, { actorId: null, action: 'auth.login_failed', targetUserId: user.id, details: { reason }, ip });
        }
        throw new HttpError(401, 'invalid_credentials', GENERIC_FAIL);
      }
      const session = await db.tx(async (q) => {
        const s = await createSession(q, { userId: user.id, ip, userAgent: req.get('user-agent') });
        await q.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
        await recordLoginAttempt(q, { email, ip, success: true });
        await audit(q, { actorId: user.id, action: 'auth.login', targetUserId: user.id, entityType: 'session', entityId: s.id, ip });
        return s;
      });
      res.cookie(SESSION_COOKIE, session.token, cookieOptions(config));
      res.json({ user: publicUser(user) });
    }),
  );

  // Always succeeds: revokes the current session if there is one and clears the cookie.
  r.post(
    '/logout',
    route(async (req, res) => {
      if (req.session?.id) {
        await revokeSession(db, req.session.id, 'signed out');
        await audit(db, { actorId: req.user.id, action: 'auth.logout', targetUserId: req.user.id, entityType: 'session', entityId: req.session.id, ip: clientIp(req) });
      }
      const { maxAge, ...clearOpts } = cookieOptions(config);
      res.clearCookie(SESSION_COOKIE, clearOpts);
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true });
    }),
  );

  r.get(
    '/me',
    route(async (req, res) => {
      if (!req.user) throw unauthorized();
      res.set('Cache-Control', 'no-store');
      res.json({ user: publicUser(req.user) });
    }),
  );

  r.get(
    '/link/:token',
    route(async (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.json({ link: await describeLink(db, req.params.token) });
    }),
  );

  const setPasswordSchema = z.object({ password: z.string().max(200) });
  r.post(
    '/link/:token',
    route(async (req, res) => {
      const { password } = parseBody(setPasswordSchema, req.body);
      const result = await consumeLink(db, req.params.token, password, { ip: clientIp(req) });
      // The person setting a password is signed out everywhere, including this browser.
      const { maxAge, ...clearOpts } = cookieOptions(config);
      res.clearCookie(SESSION_COOKIE, clearOpts);
      res.json({ ok: true, email: result.email });
    }),
  );

  const changeSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().max(200) });
  r.post(
    '/password',
    requireAuth,
    route(async (req, res) => {
      const { currentPassword, newPassword } = parseBody(changeSchema, req.body);
      const user = await db.one(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
      if (!(await verifyPassword(currentPassword, user.password_hash))) {
        throw new HttpError(400, 'wrong_password', 'Your current password is not correct.');
      }
      const problem = passwordProblem(newPassword, user.email);
      if (problem) throw new HttpError(400, 'weak_password', problem);
      const hash = await hashPassword(newPassword);
      await db.tx(async (q) => {
        await q.query(`UPDATE users SET password_hash = $2, password_set_at = now(), updated_at = now() WHERE id = $1`, [user.id, hash]);
        await q.query(
          `UPDATE password_links SET revoked_at = now(), revoked_reason = 'password changed'
            WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
          [user.id],
        );
        const revoked = await revokeAllSessions(q, user.id, 'password changed', { exceptSessionId: req.session.id });
        await audit(q, { actorId: user.id, action: 'user.updated', targetUserId: user.id, details: { passwordChanged: true, otherSessionsRevoked: revoked }, ip: clientIp(req) });
      });
      res.json({ ok: true });
    }),
  );

  return r;
}
