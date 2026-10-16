import { Router } from 'express';
import { z } from 'zod';
import { conflict, forbidden, HttpError, notFound, parseBody, route } from '../lib/errors.js';
import { audit, AUDIT_LABELS } from '../lib/audit.js';
import { clientIp, requireManager } from '../auth/middleware.js';
import { revokeAllSessions } from '../auth/sessions.js';
import { clearFailures, lockoutState } from '../auth/throttle.js';
import { createPasswordLink, linkUrl, revokeUnusedLinks } from './links.js';
import { ALLOWED_EMAIL_DOMAINS, EXPERIENCE, ROLES } from '../domain.js';

export function emailDomainOk(email) {
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  return ALLOWED_EMAIL_DOMAINS.includes(email.slice(at + 1).toLowerCase());
}

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254)
  .refine(emailDomainOk, { message: 'Use an omnizant.com or ravenly.com email address.' });
const nameField = z.string().trim().min(1, 'Enter a name.').max(100);
const roleField = z.enum(Object.keys(ROLES));
const experienceField = z.enum(Object.keys(EXPERIENCE));

export function requestOrigin(req, config) {
  const host = req.get('x-forwarded-host') || req.get('host');
  return host ? `${req.protocol}://${host}` : config.publicUrl;
}

const ROSTER_SQL = `
  SELECT u.id, u.email, u.name, u.role, u.experience, u.is_owner, u.status, u.created_at, u.updated_at,
         u.last_login_at, u.password_set_at, u.deactivated_at, (u.password_hash IS NOT NULL) AS has_password,
         (SELECT count(*) FROM sessions s WHERE s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > now()) AS active_sessions,
         (SELECT json_build_object('purpose', l.purpose, 'createdAt', l.created_at, 'expiresAt', l.expires_at)
            FROM password_links l
           WHERE l.user_id = u.id AND l.used_at IS NULL AND l.revoked_at IS NULL AND l.expires_at > now()
           ORDER BY l.created_at DESC LIMIT 1) AS pending_link,
         (SELECT max(l.expires_at) FROM password_links l
           WHERE l.user_id = u.id AND l.used_at IS NULL AND l.revoked_at IS NULL AND l.expires_at <= now()) AS expired_link_at,
         (SELECT max(a.submitted_at) FROM attempts a WHERE a.learner_id = u.id) AS last_practice_at
    FROM users u`;

export function setupStatus(u) {
  if (u.status === 'deactivated') return 'deactivated';
  if (!u.has_password) {
    if (u.pending_link) return 'invited';
    if (u.expired_link_at) return 'link_expired';
    return 'not_invited';
  }
  if (u.pending_link?.purpose === 'reset') return 'reset_pending';
  return 'active';
}

function rosterRow(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    experience: u.experience,
    isOwner: u.is_owner,
    status: u.status,
    setupStatus: setupStatus(u),
    hasPassword: u.has_password,
    pendingLink: u.pending_link,
    lastLoginAt: u.last_login_at,
    lastPracticeAt: u.last_practice_at,
    activeSessions: u.active_sessions,
    createdAt: u.created_at,
    deactivatedAt: u.deactivated_at,
  };
}

async function loadRosterUser(q, id) {
  const u = await q.one(`${ROSTER_SQL} WHERE u.id = $1`, [id]);
  return u ? rosterRow(u) : null;
}

export function userRoutes({ db, config }) {
  const r = Router();
  r.use(requireManager);

  r.get(
    '/',
    route(async (req, res) => {
      const qtext = String(req.query.q || '').trim().toLowerCase();
      const role = String(req.query.role || '');
      const status = String(req.query.status || '');
      const setup = String(req.query.setup || '');
      const rows = (await db.many(`${ROSTER_SQL} ORDER BY u.status, u.name`)).map(rosterRow);
      const users = rows.filter(
        (u) =>
          (!qtext || u.name.toLowerCase().includes(qtext) || u.email.toLowerCase().includes(qtext)) &&
          (!role || u.role === role) &&
          (!status || u.status === status) &&
          (!setup || u.setupStatus === setup),
      );
      res.json({ users, total: rows.length });
    }),
  );

  const createSchema = z.object({ name: nameField, email: emailField, role: roleField, experience: experienceField.default('new_hire') });
  r.post(
    '/',
    route(async (req, res) => {
      const body = parseBody(createSchema, req.body);
      const ip = clientIp(req);
      const result = await db.tx(async (q) => {
        const existing = await q.one(`SELECT id, status FROM users WHERE email = $1`, [body.email]);
        if (existing) {
          throw conflict(
            'email_taken',
            existing.status === 'deactivated'
              ? 'A deactivated account already uses this email. Reactivate it instead of creating a new one.'
              : 'An account already uses this email.',
            { userId: existing.id },
          );
        }
        const user = await q.one(
          `INSERT INTO users (email, name, role, experience, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [body.email, body.name, body.role, body.experience, req.user.id],
        );
        await audit(q, {
          actorId: req.user.id,
          action: 'user.created',
          targetUserId: user.id,
          entityType: 'user',
          entityId: user.id,
          details: { email: body.email, name: body.name, role: body.role, experience: body.experience },
          ip,
        });
        const link = await createPasswordLink(q, { userId: user.id, purpose: 'setup', createdBy: req.user.id, ip });
        return { userId: user.id, link };
      });
      const user = await loadRosterUser(db, result.userId);
      res.status(201).json({
        user,
        link: { url: linkUrl(requestOrigin(req, config), result.link.token), purpose: 'setup', expiresAt: result.link.expiresAt },
      });
    }),
  );

  r.get(
    '/:id',
    route(async (req, res) => {
      const user = await loadRosterUser(db, req.params.id).catch(() => null);
      if (!user) throw notFound('That person was not found.');
      const sessions = await db.many(
        `SELECT id, created_at, last_seen_at, expires_at, ip, user_agent FROM sessions
          WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now() ORDER BY last_seen_at DESC`,
        [user.id],
      );
      const links = await db.many(
        `SELECT l.id, l.purpose, l.created_at, l.expires_at, l.used_at, l.revoked_at, l.revoked_reason, c.name AS created_by_name
           FROM password_links l LEFT JOIN users c ON c.id = l.created_by
          WHERE l.user_id = $1 ORDER BY l.created_at DESC LIMIT 20`,
        [user.id],
      );
      const activity = await db.many(
        `SELECT e.id, e.action, e.details, e.created_at, e.ip, a.name AS actor_name, a.id AS actor_id
           FROM audit_events e LEFT JOIN users a ON a.id = e.actor_id
          WHERE e.target_user_id = $1 ORDER BY e.created_at DESC LIMIT 40`,
        [user.id],
      );
      res.json({
        user,
        signIn: await lockoutState(db, user.email),
        sessions,
        links: links.map((l) => ({
          ...l,
          state: l.used_at ? 'used' : l.revoked_at ? 'revoked' : new Date(l.expires_at) <= new Date() ? 'expired' : 'pending',
        })),
        activity: activity.map((e) => ({ ...e, label: AUDIT_LABELS[e.action] || e.action })),
      });
    }),
  );

  const updateSchema = z
    .object({ name: nameField.optional(), email: emailField.optional(), role: roleField.optional(), experience: experienceField.optional() })
    .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to change.' });
  r.patch(
    '/:id',
    route(async (req, res) => {
      const body = parseBody(updateSchema, req.body);
      const ip = clientIp(req);
      await db.tx(async (q) => {
        const target = await q.one(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!target) throw notFound('That person was not found.');
        const isSelf = target.id === req.user.id;
        if (target.is_owner && !isSelf && (body.email || body.name || body.role || body.experience)) {
          throw forbidden('Only the owner can change the owner account.');
        }
        if (body.role && body.role !== target.role) {
          if (target.is_owner) throw forbidden('The owner account always keeps the manager role.');
          if (isSelf) throw forbidden('You cannot change your own role. Ask another manager.');
        }
        if (body.email && body.email !== target.email) {
          const clash = await q.one(`SELECT id FROM users WHERE email = $1 AND id <> $2`, [body.email, target.id]);
          if (clash) throw conflict('email_taken', 'Another account already uses this email.');
        }
        const changes = {};
        for (const key of ['name', 'email', 'role', 'experience']) {
          if (body[key] !== undefined && body[key] !== target[key]) changes[key] = { from: target[key], to: body[key] };
        }
        if (Object.keys(changes).length === 0) return;
        await q.query(
          `UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email), role = COALESCE($4, role),
                  experience = COALESCE($5, experience), updated_at = now() WHERE id = $1`,
          [target.id, body.name ?? null, body.email ?? null, body.role ?? null, body.experience ?? null],
        );
        const action = changes.role ? 'user.role_changed' : changes.email ? 'user.email_changed' : 'user.updated';
        await audit(q, { actorId: req.user.id, action, targetUserId: target.id, entityType: 'user', entityId: target.id, details: { changes }, ip });
      });
      res.json({ user: await loadRosterUser(db, req.params.id) });
    }),
  );

  r.post(
    '/:id/deactivate',
    route(async (req, res) => {
      const ip = clientIp(req);
      await db.tx(async (q) => {
        const target = await q.one(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!target) throw notFound('That person was not found.');
        if (target.is_owner) throw forbidden('The owner account cannot be deactivated.');
        if (target.id === req.user.id) throw forbidden('You cannot deactivate your own account.');
        if (target.status === 'deactivated') return;
        await q.query(
          `UPDATE users SET status = 'deactivated', deactivated_at = now(), deactivated_by = $2, updated_at = now() WHERE id = $1`,
          [target.id, req.user.id],
        );
        const sessions = await revokeAllSessions(q, target.id, 'account deactivated');
        const links = await revokeUnusedLinks(q, { userId: target.id, actorId: req.user.id, reason: 'account deactivated', ip });
        await audit(q, {
          actorId: req.user.id,
          action: 'user.deactivated',
          targetUserId: target.id,
          entityType: 'user',
          entityId: target.id,
          details: { sessionsRevoked: sessions, linksRevoked: links },
          ip,
        });
      });
      res.json({ user: await loadRosterUser(db, req.params.id) });
    }),
  );

  r.post(
    '/:id/reactivate',
    route(async (req, res) => {
      const ip = clientIp(req);
      await db.tx(async (q) => {
        const target = await q.one(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!target) throw notFound('That person was not found.');
        if (target.status === 'active') return;
        await q.query(
          `UPDATE users SET status = 'active', deactivated_at = NULL, deactivated_by = NULL, updated_at = now() WHERE id = $1`,
          [target.id],
        );
        await audit(q, { actorId: req.user.id, action: 'user.reactivated', targetUserId: target.id, entityType: 'user', entityId: target.id, ip });
      });
      res.json({ user: await loadRosterUser(db, req.params.id) });
    }),
  );

  const linkSchema = z.object({ purpose: z.enum(['setup', 'reset']).optional() });
  r.post(
    '/:id/links',
    route(async (req, res) => {
      const body = parseBody(linkSchema, req.body);
      const ip = clientIp(req);
      const out = await db.tx(async (q) => {
        const target = await q.one(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (!target) throw notFound('That person was not found.');
        if (target.status !== 'active') throw new HttpError(409, 'deactivated', 'Reactivate this account before creating a link.');
        if (target.is_owner && target.id !== req.user.id && target.password_hash) {
          throw forbidden('Only the owner can create a password reset link for the owner account.');
        }
        const purpose = body.purpose || (target.password_hash ? 'reset' : 'setup');
        return createPasswordLink(q, { userId: target.id, purpose, createdBy: req.user.id, ip });
      });
      res.status(201).json({
        link: { url: linkUrl(requestOrigin(req, config), out.token), purpose: out.purpose, expiresAt: out.expiresAt },
        user: await loadRosterUser(db, req.params.id),
      });
    }),
  );

  r.post(
    '/:id/links/revoke',
    route(async (req, res) => {
      const ip = clientIp(req);
      const count = await db.tx(async (q) => {
        const target = await q.one(`SELECT id, is_owner FROM users WHERE id = $1`, [req.params.id]);
        if (!target) throw notFound('That person was not found.');
        if (target.is_owner && target.id !== req.user.id) throw forbidden('Only the owner can revoke links for the owner account.');
        return revokeUnusedLinks(q, { userId: target.id, actorId: req.user.id, reason: 'revoked by manager', ip });
      });
      res.json({ revoked: count, user: await loadRosterUser(db, req.params.id) });
    }),
  );

  // Lifts a sign-in pause caused by failed attempts (for example after someone else guessed at the account).
  r.post(
    '/:id/sign-in/clear',
    route(async (req, res) => {
      const ip = clientIp(req);
      const target = await db.one(`SELECT id, email FROM users WHERE id = $1`, [req.params.id]).catch(() => null);
      if (!target) throw notFound('That person was not found.');
      const cleared = await clearFailures(db, target.email);
      await audit(db, { actorId: req.user.id, action: 'auth.sign_in_cleared', targetUserId: target.id, entityType: 'user', entityId: target.id, details: { count: cleared }, ip });
      res.json({ cleared, signIn: await lockoutState(db, target.email) });
    }),
  );

  r.post(
    '/:id/sessions/revoke',
    route(async (req, res) => {
      const ip = clientIp(req);
      const count = await db.tx(async (q) => {
        const target = await q.one(`SELECT id, is_owner FROM users WHERE id = $1`, [req.params.id]);
        if (!target) throw notFound('That person was not found.');
        if (target.is_owner && target.id !== req.user.id) throw forbidden('Only the owner can sign the owner account out.');
        const n = await revokeAllSessions(q, target.id, `signed out by ${req.user.name}`, {
          exceptSessionId: target.id === req.user.id ? req.session.id : null,
        });
        await audit(q, { actorId: req.user.id, action: 'user.sessions_revoked', targetUserId: target.id, entityType: 'user', entityId: target.id, details: { count: n }, ip });
        return n;
      });
      res.json({ revoked: count, user: await loadRosterUser(db, req.params.id) });
    }),
  );

  return r;
}
