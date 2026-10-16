// Test harness: a fresh database, the real app, and the test-only mock AI provider.
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { loadConfig } from '../server/config.js';
import { createDb } from '../server/db.js';
import { migrate } from '../server/migrate.js';
import { ownerSetupLinkIfNeeded, seed } from '../server/seed/index.js';
import { createProvider } from '../server/ai/provider.js';
import { createApp } from '../server/app.js';
import { waitForEvaluations } from '../server/ai/evaluate.js';

const ADMIN_URL = process.env.TEST_ADMIN_DATABASE_URL || 'postgres://postgres@127.0.0.1:5432/postgres';

export async function freshDatabase(name) {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  return ADMIN_URL.replace(/\/[^/]*$/, `/${name}`);
}

export async function startTestApp({ dbName = 'saleslab_test', env = {} } = {}) {
  const url = await freshDatabase(dbName);
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: url,
    AI_PROVIDER: 'mock',
    SALES_LAB_ALLOW_MOCK_AI: 'yes-test-only',
    AI_TIMEOUT_MS: '1500',
    APP_BASE_URL: 'http://127.0.0.1',
    ...env,
  });
  const db = createDb(config.databaseUrl);
  const logs = [];
  const log = (...a) => logs.push(a.join(' '));
  await migrate(db, { log });
  await seed(db, config, { log });
  const ownerLink = await ownerSetupLinkIfNeeded(db, config, log);
  const provider = createProvider(config);
  if (provider) provider.delayMs = 50;
  const app = createApp({ db, config, provider, log });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    db,
    config,
    provider,
    logs,
    base,
    ownerToken: ownerLink ? ownerLink.split('/').pop() : null,
    client: () => new Client(base),
    async close() {
      await waitForEvaluations();
      if (process.env.DEBUG_TEST_LOGS) console.log(logs.filter((l) => /\[(coach|api)\]/.test(l)).join('\n'));
      await new Promise((r) => server.close(r));
      await db.end();
    },
  };
}

export class Client {
  constructor(base) {
    this.base = base;
    this.cookie = null;
  }
  async req(method, path, body, { headers = {}, csrf = true } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['content-type'] = 'application/json';
    if (csrf) h['x-requested-with'] = 'SalesLab';
    if (this.cookie) h.cookie = this.cookie;
    const res = await fetch(this.base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const idx = pair.indexOf('=');
      const name = pair.slice(0, idx);
      const val = pair.slice(idx + 1);
      if (name === 'sl_session') this.cookie = val ? `sl_session=${val}` : null;
    }
    const type = res.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  }
  get(p, o) {
    return this.req('GET', p, undefined, o);
  }
  post(p, b = {}, o) {
    return this.req('POST', p, b, o);
  }
  put(p, b = {}, o) {
    return this.req('PUT', p, b, o);
  }
  patch(p, b = {}, o) {
    return this.req('PATCH', p, b, o);
  }
}

export const PASSWORD = 'correct horse battery';

// Owner sets a password through the bootstrap link and signs in.
export async function ownerClient(h) {
  const c = h.client();
  const set = await c.post(`/api/auth/link/${h.ownerToken}`, { password: PASSWORD });
  if (set.status !== 200) throw new Error(`owner setup failed: ${JSON.stringify(set.data)}`);
  const login = await c.post('/api/auth/login', { email: 'fred.cohen@omnizant.com', password: PASSWORD });
  if (login.status !== 200) throw new Error(`owner login failed: ${JSON.stringify(login.data)}`);
  return c;
}

// Manager creates a user, the user sets a password from the link and signs in.
export async function addUser(h, manager, { name, email, role = 'ae', experience = 'new_hire', password = PASSWORD }) {
  const created = await manager.post('/api/users', { name, email, role, experience });
  if (created.status !== 201) throw new Error(`create user failed: ${JSON.stringify(created.data)}`);
  const token = created.data.link.url.split('/').pop();
  const c = h.client();
  const set = await c.post(`/api/auth/link/${token}`, { password });
  if (set.status !== 200) throw new Error(`set password failed: ${JSON.stringify(set.data)}`);
  const login = await c.post('/api/auth/login', { email, password });
  if (login.status !== 200) throw new Error(`login failed: ${JSON.stringify(login.data)}`);
  return { client: c, user: created.data.user, link: created.data.link };
}

export async function drillBySlug(h, slug) {
  return h.db.one(`SELECT d.id, d.current_version_id AS version_id, v.personas FROM drills d JOIN drill_versions v ON v.id = d.current_version_id WHERE d.slug = $1`, [slug]);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(fn, { timeout = 8000, interval = 50 } = {}) {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error('waitFor timed out');
    await sleep(interval);
  }
}

export async function submit(client, drill, answer, extra = {}) {
  return client.post('/api/practice/attempts', {
    clientRequestId: randomUUID(),
    drillId: drill.id,
    drillVersionId: drill.version_id,
    persona: drill.personas[0],
    mode: 'coached',
    answer,
    ...extra,
  });
}

export async function waitForCoaching(client, attemptId) {
  return waitFor(async () => {
    const r = await client.get(`/api/practice/attempts/${attemptId}`);
    const st = r.data.coaching?.run?.status;
    return st && st !== 'running' ? r.data : null;
  });
}

export const GOOD_ANSWER =
  'I hear you, and that makes sense. Before I suggest anything, what happens today when a website inquiry comes in at 8 p.m.? Who owns the follow-up the next morning?';
