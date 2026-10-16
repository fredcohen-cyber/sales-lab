import { Router } from 'express';
import { z } from 'zod';
import { HttpError, parseBody, route, unauthorized } from '../lib/errors.js';
import { burnPasswordCheck, hashPassword, passwordProblem, verifyPassword } from '../lib/passwords.js';
import { audit } from '../lib/audit.js';
import { clientIp, requireAuth } from './middleware.js';
import { cookieOptions, createSession, revokeAllSessions, revokeSession, SESSION_COOKIE } from './sessions.js';
import { beginAttempt, finishAttempt } from './throttle.js';
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
      // Written before the password check (outside any transaction) so parallel guesses count each other.
      const gate = await beginAttempt(db, { email, ip });
      if (gate.blocked) {
        throw new HttpError(
          429,
          'too_many_attempts',
          `Too many sign-in attempts. Try again in ${gate.retryMinutes} minute${gate.retryMinutes === 1 ? '' : 's'}, or ask your manager for a password reset link.`,
        );
      }
      let user;
      let ok = false;
      let reason = 'unknown_email';
      try {
        user = await db.one(`SELECT * FROM users WHERE email = $1`, [email]);
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
      } catch (err) {
        await finishAttempt(db, gate.attemptId, { outcome: 'failure', reason: 'error' }).catch(() => {});
        throw err;
      }
      if (!ok) {
        await finishAttempt(db, gate.attemptId, { outcome: 'failure', reason });
        if (user) {
          await audit(db, { actorId: null, action: 'auth.login_failed', targetUserId: user.id, details: { reason }, ip });
        }
        throw new HttpError(401, 'invalid_credentials', GENERIC_FAIL);
      }
      // The account may have been deactivated, or its password replaced, while the password was being checked.
      // Lock the row and confirm nothing changed before creating the session.
      const session = await db.tx(async (q) => {
        const current = await q.one(`SELECT status, password_hash FROM users WHERE id = $1 FOR UPDATE`, [user.id]);
        if (!current || current.status !== 'active' || current.password_hash !== user.password_hash) return null;
        const s = await createSession(q, { userId: user.id, ip, userAgent: req.get('user-agent') });
        await q.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
        await finishAttempt(q, gate.attemptId, { outcome: 'success' });
        await audit(q, { actorId: user.id, action: 'auth.login', targetUserId: user.id, entityType: 'session', entityId: s.id, ip });
        return s;
      });
      if (!session) {
        await finishAttempt(db, gate.attemptId, { outcome: 'failure', reason: 'changed_during_sign_in' });
        throw new HttpError(401, 'invalid_credentials', GENERIC_FAIL);
      }
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
      const ip = clientIp(req);
      const user = await db.one(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
      // The current-password check is throttled like sign-in, so a borrowed session cannot guess the password.
      const gate = await beginAttempt(db, { email: user.email, ip, kind: 'password_change' });
      if (gate.blocked) {
        throw new HttpError(429, 'too_many_attempts', `Too many attempts. Try again in ${gate.retryMinutes} minute${gate.retryMinutes === 1 ? '' : 's'}.`);
      }
      const ok = user.password_hash ? await verifyPassword(currentPassword, user.password_hash) : false;
      if (!ok) {
        await finishAttempt(db, gate.attemptId, { outcome: 'failure', reason: 'bad_password' });
        await audit(db, { actorId: user.id, action: 'auth.password_change_failed', targetUserId: user.id, ip });
        throw new HttpError(400, 'wrong_password', 'Your current password is not correct.');
      }
      const problem = passwordProblem(newPassword, user.email);
      if (problem) {
        await finishAttempt(db, gate.attemptId, { outcome: 'success', reason: 'weak_new_password' });
        throw new HttpError(400, 'weak_password', problem);
      }
      const hash = await hashPassword(newPassword);
      await db.tx(async (q) => {
        await q.query(`UPDATE users SET password_hash = $2, password_set_at = now(), updated_at = now() WHERE id = $1`, [user.id, hash]);
        await q.query(
          `UPDATE password_links SET revoked_at = now(), revoked_reason = 'password changed'
            WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
          [user.id],
        );
        const revoked = await revokeAllSessions(q, user.id, 'password changed', { exceptSessionId: req.session.id });
        await finishAttempt(q, gate.attemptId, { outcome: 'success' });
        await audit(q, { actorId: user.id, action: 'user.updated', targetUserId: user.id, details: { passwordChanged: true, otherSessionsRevoked: revoked }, ip });
      });
      res.json({ ok: true });
    }),
  );

  return r;
}
