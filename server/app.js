import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HttpError } from './lib/errors.js';
import { loadSession, requireAuth, sameOriginGuard } from './auth/middleware.js';
import { authRoutes } from './auth/routes.js';
import { userRoutes } from './users/routes.js';
import { knowledgeRoutes } from './knowledge/routes.js';
import { drillRoutes } from './drills/routes.js';
import { practiceRoutes } from './practice/routes.js';
import { curriculumRoutes } from './curriculum/routes.js';
import { reviewRoutes } from './reviews/routes.js';
import { reportRoutes } from './reports/routes.js';
import { settingsRoutes } from './settings/routes.js';
import { homeRoutes } from './home/routes.js';
import { voiceRoutes } from './voice/routes.js';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');

export function createApp({ db, config, provider, log = console.log }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'upgrade-insecure-requests': config.isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'same-origin' },
    }),
  );

  app.get('/healthz', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  const ctx = { db, config, provider, log };
  const api = express.Router();
  api.use(express.json({ limit: '2mb' }));
  api.use(cookieParser());
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(sameOriginGuard(config));
  api.use(loadSession(db));
  api.use('/auth', authRoutes(ctx));
  api.use(requireAuth);
  api.use('/users', userRoutes(ctx));
  api.use('/knowledge', knowledgeRoutes(ctx));
  api.use('/drills', drillRoutes(ctx));
  api.use('/practice', practiceRoutes(ctx));
  api.use('/voice', voiceRoutes(ctx));
  api.use(curriculumRoutes(ctx));
  api.use(reviewRoutes(ctx));
  api.use(reportRoutes(ctx));
  api.use(settingsRoutes(ctx));
  api.use(homeRoutes(ctx));
  api.use((_req, res) => res.status(404).json({ error: { code: 'not_found', message: 'Not found.' } }));
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details ?? undefined } });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'too_large', message: 'That upload is too large.' } });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'bad_json', message: 'The request could not be read.' } });
    }
    log(`[api] ${req.method} ${req.originalUrl} failed: ${err?.stack || err}`);
    res.status(500).json({ error: { code: 'internal', message: 'Something went wrong on the server. Try again.' } });
  });
  app.use('/api', api);

  // The single-page app. Built assets are fingerprinted; index.html is never cached.
  if (existsSync(DIST)) {
    app.use('/assets', express.static(path.join(DIST, 'assets'), { immutable: true, maxAge: '1y', index: false, fallthrough: false }));
    app.use(express.static(DIST, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      // A missing file (an old asset, an optional logo) is a 404, not the app shell.
      if (path.extname(req.path)) return res.status(404).type('text').send('Not found');
      res.set('Cache-Control', 'no-store');
      res.sendFile(path.join(DIST, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => res.type('text').send('Sales Lab API is running. Build the client with "npm run build".'));
  }
  return app;
}
