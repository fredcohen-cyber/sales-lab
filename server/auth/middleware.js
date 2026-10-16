import { findSession, touchSession, SESSION_COOKIE } from './sessions.js';
import { forbidden, unauthorized, HttpError } from '../lib/errors.js';

export function clientIp(req) {
  return (req.ip || req.socket?.remoteAddress || '').slice(0, 64) || null;
}

// Attach req.user when the session cookie is valid. Runs on every API request.
export function loadSession(db) {
  return async (req, _res, next) => {
    try {
      const token = req.cookies?.[SESSION_COOKIE];
      if (token) {
        const s = await findSession(db, token);
        if (s) {
          req.session = { id: s.session_id };
          req.user = {
            id: s.id,
            email: s.email,
            name: s.name,
            role: s.role,
            experience: s.experience,
            isOwner: s.is_owner,
            isManager: s.role === 'manager',
          };
          touchSession(db, s.session_id).catch(() => {});
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireManager(req, _res, next) {
  if (!req.user) return next(unauthorized());
  if (!req.user.isManager) return next(forbidden('Only managers can do this.'));
  next();
}

// Blocks cross-site state changes: requires our custom header and a same-origin Origin when one is sent.
export function sameOriginGuard(config) {
  const allowed = new Set([config.publicUrl]);
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('x-requested-with') !== 'SalesLab') {
      return next(new HttpError(403, 'csrf', 'This request was blocked. Reload the page and try again.'));
    }
    const origin = req.get('origin');
    if (origin) {
      const host = req.get('x-forwarded-host') || req.get('host');
      const proto = req.protocol;
      const self = `${proto}://${host}`;
      if (origin !== self && !allowed.has(origin)) {
        return next(new HttpError(403, 'csrf', 'This request was blocked because it came from another site.'));
      }
    }
    next();
  };
}
