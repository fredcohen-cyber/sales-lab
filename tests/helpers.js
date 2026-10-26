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

// The app the current test file started, so helpers can act for the stage feed (see serve).
let currentApp = null;

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
  const h = {
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
  currentApp = h;
  return h;
}

// Reps only practice what a stage served them (or a question they answered before). Tests that practice
// a particular question first have its stage serve it, as the Practice Studio would.
export async function serve(client, drillId, persona) {
  if (!currentApp) throw new Error('serve() needs startTestApp() first');
  const me = (await client.get('/api/auth/me')).data?.user;
  if (!me || me.isManager) return;
  const row = await currentApp.db.one(
    `SELECT v.stage, v.personas FROM drills d JOIN drill_versions v ON v.id = d.current_version_id WHERE d.id = $1`,
    [drillId],
  );
  if (!row) return;
  await currentApp.db.query(
    `INSERT INTO practice_draws (learner_id, stage, drill_id, persona) VALUES ($1, $2, $3, $4)
     ON CONFLICT (learner_id, stage) DO UPDATE SET drill_id = EXCLUDED.drill_id, persona = EXCLUDED.persona, drawn_at = now()`,
    [me.id, row.stage, drillId, persona || row.personas[0]],
  );
}

// Gets a rep ready to start a conversation on a question: the stage serves it, and an unfinished
// conversation on the same question and buyer is finished first.
export async function prepare(client, drillId, persona) {
  await serve(client, drillId, persona);
  const me = (await client.get('/api/auth/me')).data?.user;
  const open = await currentApp.db.one(
    `SELECT a.id FROM attempts a
      WHERE a.learner_id = $1 AND a.drill_id = $2 AND a.persona = COALESCE($3, a.persona) AND a.assignment_item_id IS NULL
        AND a.turn_number < a.replies_planned
        AND NOT EXISTS (SELECT 1 FROM attempts n WHERE n.conversation_id = a.conversation_id AND n.turn_number = a.turn_number + 1)
      ORDER BY a.submitted_at DESC LIMIT 1`,
    [me.id, drillId, persona || null],
  );
  if (open) await finishConversation(client, open.id);
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

// A section of a knowledge collection, found by the start of its title (e.g. "6. Objections").
export async function sectionBy(h, collectionSlug, titleStart) {
  const row = await h.db.one(
    `SELECT s.id, s.approved_version_id, s.latest_version_id FROM knowledge_sources s
       JOIN knowledge_collections c ON c.id = s.collection_id
       JOIN knowledge_versions v ON v.id = s.latest_version_id
      WHERE c.slug = $1 AND v.title LIKE $2`,
    [collectionSlug, `${titleStart}%`],
  );
  if (!row) throw new Error(`No section “${titleStart}” in ${collectionSlug}`);
  return row;
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

// Submits a first reply to a question. A rep finishes an unfinished conversation on the same question
// before starting another, so when one is in the way this answers its pushbacks first.
export async function submit(client, drill, answer, extra = {}) {
  if (!extra.assignmentItemId && !extra.continueFrom) await serve(client, drill.id, extra.persona || drill.personas[0]);
  const body = {
    clientRequestId: randomUUID(),
    drillId: drill.id,
    drillVersionId: drill.version_id,
    persona: drill.personas[0],
    mode: 'coached',
    answer,
    ...extra,
  };
  let r = await client.post('/api/practice/attempts', body);
  if (r.status === 409 && r.data?.error?.code === 'conversation_unfinished' && !extra.keepUnfinished) {
    await finishConversation(client, r.data.error.details.attemptId);
    r = await client.post('/api/practice/attempts', body);
  }
  return r;
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

export const FOLLOW_UP_ANSWER = 'That is a fair question. What would it be worth to you to know every inquiry gets a reply within minutes? Could we look at it together on Thursday?';

// Replies to each of the buyer's pushbacks until the conversation is over, waiting for coaching after
// each coached reply. Returns the view of the last reply.
export async function finishConversation(client, attemptId, { answer = FOLLOW_UP_ANSWER } = {}) {
  let view = (await client.get(`/api/practice/attempts/${attemptId}`)).data;
  for (let i = 0; i < 8; i += 1) {
    if (view.attempt.mode === 'coached') view = await waitForCoaching(client, view.attempt.id);
    // Coaching that stopped is retried, as the rep would from the answer page.
    if (view.conversation.next.state === 'coaching_stopped') {
      await client.post(`/api/practice/attempts/${view.attempt.id}/evaluate`, {});
      view = await waitForCoaching(client, view.attempt.id);
    }
    const next = view.conversation.next;
    if (next.state !== 'reply') return view;
    const r = await client.post('/api/practice/attempts', { clientRequestId: randomUUID(), continueFrom: next.afterAttemptId, mode: view.attempt.mode, answer });
    if (r.status !== 201) throw new Error(`reply failed: ${JSON.stringify(r.data)}`);
    view = r.data;
  }
  throw new Error('conversation did not finish');
}

// Submits a first reply and finishes its conversation. Returns { first, last } attempt views.
export async function submitConversation(client, drill, answer, extra = {}) {
  const created = await submit(client, drill, answer, extra);
  if (created.status !== 201) throw new Error(`submit failed: ${JSON.stringify(created.data)}`);
  const last = await finishConversation(client, created.data.attempt.id);
  const first = (await client.get(`/api/practice/attempts/${created.data.attempt.id}`)).data;
  return { first, last, created };
}
