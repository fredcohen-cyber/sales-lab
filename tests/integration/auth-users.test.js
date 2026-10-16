import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { addUser, ownerClient, PASSWORD, startTestApp } from '../helpers.js';

let h;
let owner;
before(async () => {
  h = await startTestApp({ dbName: 'saleslab_test_auth' });
  owner = await ownerClient(h);
});
after(() => h.close());

test('protected API requires a session; login page data is public', async () => {
  const anon = h.client();
  assert.equal((await anon.get('/api/drills')).status, 401);
  assert.equal((await anon.get('/api/auth/me')).status, 401);
  assert.equal((await anon.get('/healthz')).status, 200);
});

test('state-changing requests without the Sales Lab header are blocked', async () => {
  const r = await owner.post('/api/users', { name: 'X', email: 'x@omnizant.com', role: 'ae' }, { csrf: false });
  assert.equal(r.status, 403);
  assert.equal(r.data.error.code, 'csrf');
});

test('owner bootstrap link is single use', async () => {
  const c = h.client();
  const again = await c.post(`/api/auth/link/${h.ownerToken}`, { password: 'another password here' });
  assert.equal(again.status, 410);
  assert.equal(again.data.error.code, 'link_used');
});

test('only omnizant.com and ravenly.com addresses, exactly', async () => {
  for (const email of ['vic@gmail.com', 'vic@sub.omnizant.com', 'vic@omnizant.com.evil.io', 'vic@ravenly.co']) {
    const r = await owner.post('/api/users', { name: 'Vic', email, role: 'ae' });
    assert.equal(r.status, 400, email);
  }
  const ok = await owner.post('/api/users', { name: 'Vic Rep', email: 'Vic.Rep@Ravenly.com', role: 'ae' });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.user.email, 'vic.rep@ravenly.com');
  assert.equal(ok.data.user.setupStatus, 'invited');
  assert.match(ok.data.link.url, /\/set-password\/[A-Za-z0-9_-]{40,}$/);
  const dup = await owner.post('/api/users', { name: 'Vic Again', email: 'vic.rep@ravenly.com', role: 'am' });
  assert.equal(dup.status, 409);
});

test('there is no self-registration endpoint', async () => {
  const anon = h.client();
  for (const p of ['/api/auth/register', '/api/auth/signup', '/api/users']) {
    const r = await anon.post(p, { name: 'Eve', email: 'eve@omnizant.com', password: PASSWORD, role: 'manager' });
    assert.ok([401, 404].includes(r.status), `${p} -> ${r.status}`);
  }
});

test('setup link: replacing invalidates the old one; expiry; single use; password rules', async () => {
  const created = await owner.post('/api/users', { name: 'Link Test', email: 'linktest@omnizant.com', role: 'am' });
  const first = created.data.link.url.split('/').pop();
  const anon = h.client();
  assert.equal((await anon.get(`/api/auth/link/${first}`)).status, 200);
  const replaced = await owner.post(`/api/users/${created.data.user.id}/links`, {});
  assert.equal(replaced.status, 201);
  const second = replaced.data.link.url.split('/').pop();
  const old = await anon.get(`/api/auth/link/${first}`);
  assert.equal(old.status, 410);
  assert.equal(old.data.error.code, 'link_revoked');
  const weak = await anon.post(`/api/auth/link/${second}`, { password: 'short' });
  assert.equal(weak.status, 400);
  // Expire the second link and confirm it no longer works.
  await h.db.query(`UPDATE password_links SET expires_at = now() - interval '1 minute' WHERE token_hash = encode(sha256($1::bytea), 'hex')`, [second]);
  const expired = await anon.post(`/api/auth/link/${second}`, { password: 'a perfectly fine password' });
  assert.equal(expired.status, 410);
  assert.equal(expired.data.error.code, 'link_expired');
  const detail = await owner.get(`/api/users/${created.data.user.id}`);
  assert.equal(detail.data.user.setupStatus, 'link_expired');
  // A third link works exactly once.
  const third = (await owner.post(`/api/users/${created.data.user.id}/links`, {})).data.link.url.split('/').pop();
  assert.equal((await anon.post(`/api/auth/link/${third}`, { password: 'a perfectly fine password' })).status, 200);
  assert.equal((await anon.post(`/api/auth/link/${third}`, { password: 'a perfectly fine password' })).status, 410);
});

test('links set expiry at 48 hours', async () => {
  const created = await owner.post('/api/users', { name: 'Ttl Check', email: 'ttl@ravenly.com', role: 'ae' });
  const hours = (new Date(created.data.link.expiresAt) - Date.now()) / 3_600_000;
  assert.ok(hours > 47.9 && hours <= 48.01, String(hours));
});

test('revoking unused links', async () => {
  const created = await owner.post('/api/users', { name: 'Revoke Me', email: 'revoke@omnizant.com', role: 'ae' });
  const token = created.data.link.url.split('/').pop();
  const r = await owner.post(`/api/users/${created.data.user.id}/links/revoke`, {});
  assert.equal(r.data.revoked, 1);
  assert.equal((await h.client().get(`/api/auth/link/${token}`)).status, 410);
});

test('saving a new password from a reset link signs the user out everywhere', async () => {
  const { client: rep, user } = await addUser(h, owner, { name: 'Reset Rep', email: 'reset.rep@omnizant.com' });
  const second = h.client();
  await second.post('/api/auth/login', { email: 'reset.rep@omnizant.com', password: PASSWORD });
  assert.equal((await second.get('/api/auth/me')).status, 200);
  const link = await owner.post(`/api/users/${user.id}/links`, { purpose: 'reset' });
  assert.equal(link.data.link.purpose, 'reset');
  const token = link.data.link.url.split('/').pop();
  assert.equal((await h.client().post(`/api/auth/link/${token}`, { password: 'brand new password 2' })).status, 200);
  assert.equal((await rep.get('/api/auth/me')).status, 401);
  assert.equal((await second.get('/api/auth/me')).status, 401);
  const oldPw = await h.client().post('/api/auth/login', { email: 'reset.rep@omnizant.com', password: PASSWORD });
  assert.equal(oldPw.status, 401);
  const newPw = await h.client().post('/api/auth/login', { email: 'reset.rep@omnizant.com', password: 'brand new password 2' });
  assert.equal(newPw.status, 200);
});

test('logout revokes the session server-side and clears the cookie', async () => {
  const { client: rep } = await addUser(h, owner, { name: 'Logout Rep', email: 'logout@ravenly.com' });
  const stolenCookie = rep.cookie;
  const out = await rep.post('/api/auth/logout', {});
  assert.equal(out.status, 200);
  assert.equal(rep.cookie, null);
  const replay = h.client();
  replay.cookie = stolenCookie;
  assert.equal((await replay.get('/api/auth/me')).status, 401);
  // Logging out twice, or without a session, still succeeds.
  assert.equal((await rep.post('/api/auth/logout', {})).status, 200);
});

test('deactivation blocks access immediately and reactivation restores nothing', async () => {
  const { client: rep, user } = await addUser(h, owner, { name: 'Deact Rep', email: 'deact@omnizant.com' });
  const pending = await owner.post(`/api/users/${user.id}/links`, { purpose: 'reset' });
  const pendingToken = pending.data.link.url.split('/').pop();
  const d = await owner.post(`/api/users/${user.id}/deactivate`, {});
  assert.equal(d.data.user.status, 'deactivated');
  assert.equal(d.data.user.activeSessions, 0);
  assert.equal((await rep.get('/api/drills')).status, 401);
  assert.equal((await h.client().get(`/api/auth/link/${pendingToken}`)).status, 410);
  const login = await h.client().post('/api/auth/login', { email: 'deact@omnizant.com', password: PASSWORD });
  assert.equal(login.status, 401);
  assert.equal((await owner.post(`/api/users/${user.id}/links`, {})).status, 409);
  const re = await owner.post(`/api/users/${user.id}/reactivate`, {});
  assert.equal(re.data.user.status, 'active');
  assert.equal(re.data.user.activeSessions, 0);
  assert.equal((await rep.get('/api/drills')).status, 401, 'old session stays dead');
  assert.equal((await h.client().get(`/api/auth/link/${pendingToken}`)).status, 410, 'old link stays dead');
  const back = await h.client().post('/api/auth/login', { email: 'deact@omnizant.com', password: PASSWORD });
  assert.equal(back.status, 200);
  const activity = await owner.get(`/api/users/${user.id}`);
  const actions = activity.data.activity.map((a) => a.action);
  assert.ok(actions.includes('user.deactivated') && actions.includes('user.reactivated'));
  const deact = activity.data.activity.find((a) => a.action === 'user.deactivated');
  assert.equal(deact.actor_name, 'Fred Cohen');
});

test('owner and self protections', async () => {
  const ownerId = (await owner.get('/api/auth/me')).data.user.id;
  assert.equal((await owner.post(`/api/users/${ownerId}/deactivate`, {})).status, 403);
  assert.equal((await owner.patch(`/api/users/${ownerId}`, { role: 'ae' })).status, 403);
  const { client: mgr, user: mgrUser } = await addUser(h, owner, { name: 'Second Manager', email: 'mgr2@omnizant.com', role: 'manager' });
  assert.equal((await mgr.post(`/api/users/${ownerId}/deactivate`, {})).status, 403);
  assert.equal((await mgr.patch(`/api/users/${ownerId}`, { name: 'Not Fred' })).status, 403);
  assert.equal((await mgr.post(`/api/users/${mgrUser.id}/deactivate`, {})).status, 403);
  assert.equal((await mgr.patch(`/api/users/${mgrUser.id}`, { role: 'ae' })).status, 403);
  // The owner can demote the second manager, who then loses manager access at once.
  assert.equal((await owner.patch(`/api/users/${mgrUser.id}`, { role: 'am' })).status, 200);
  assert.equal((await mgr.get('/api/users')).status, 403);
});

test('email and role changes keep the same account and history', async () => {
  const { client: rep, user } = await addUser(h, owner, { name: 'Mover', email: 'mover@omnizant.com' });
  const r = await owner.patch(`/api/users/${user.id}`, { email: 'mover@ravenly.com', role: 'am', name: 'Mover Smith' });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.id, user.id);
  assert.equal(r.data.user.email, 'mover@ravenly.com');
  const login = await h.client().post('/api/auth/login', { email: 'mover@ravenly.com', password: PASSWORD });
  assert.equal(login.status, 200);
  assert.equal((await rep.get('/api/auth/me')).data.user.role, 'am');
  const detail = await owner.get(`/api/users/${user.id}`);
  assert.ok(detail.data.activity.some((a) => a.action === 'user.role_changed'));
});

test('learners cannot use management functions', async () => {
  const { client: rep, user } = await addUser(h, owner, { name: 'Plain Rep', email: 'plain@omnizant.com' });
  assert.equal((await rep.get('/api/users')).status, 403);
  assert.equal((await rep.post('/api/users', { name: 'X', email: 'x2@omnizant.com', role: 'manager' })).status, 403);
  assert.equal((await rep.patch(`/api/users/${user.id}`, { role: 'manager' })).status, 403);
  assert.equal((await rep.get('/api/reports/summary')).status, 403);
  assert.equal((await rep.get('/api/reviews')).status, 403);
  assert.equal((await rep.get('/api/settings')).status, 403);
  assert.equal((await rep.post('/api/knowledge', { title: 't', brand: 'both', subjects: ['product'], content: 'x' })).status, 403);
});

test('sign out of all sessions', async () => {
  const { client: rep, user } = await addUser(h, owner, { name: 'Many Sessions', email: 'many@ravenly.com' });
  const other = h.client();
  await other.post('/api/auth/login', { email: 'many@ravenly.com', password: PASSWORD });
  const before = await owner.get(`/api/users/${user.id}`);
  assert.equal(before.data.sessions.length, 2);
  const r = await owner.post(`/api/users/${user.id}/sessions/revoke`, {});
  assert.equal(r.data.revoked, 2);
  assert.equal((await rep.get('/api/auth/me')).status, 401);
  assert.equal((await other.get('/api/auth/me')).status, 401);
});

test('roster search and filters', async () => {
  const all = await owner.get('/api/users');
  assert.ok(all.data.users.length >= 5);
  const search = await owner.get('/api/users?q=vic');
  assert.ok(search.data.users.every((u) => /vic/i.test(u.name + u.email)));
  const ams = await owner.get('/api/users?role=am');
  assert.ok(ams.data.users.length > 0 && ams.data.users.every((u) => u.role === 'am'));
  const invited = await owner.get('/api/users?setup=invited');
  assert.ok(invited.data.users.every((u) => u.setupStatus === 'invited'));
  const fred = all.data.users.find((u) => u.isOwner);
  assert.ok(fred.lastLoginAt, 'last sign-in is tracked');
});

test('login throttling after repeated failures', async () => {
  await addUser(h, owner, { name: 'Throttle', email: 'throttle@omnizant.com' });
  const c = h.client();
  for (let i = 0; i < 5; i++) {
    const r = await c.post('/api/auth/login', { email: 'throttle@omnizant.com', password: 'wrong password!!' });
    assert.equal(r.status, 401);
  }
  const blocked = await c.post('/api/auth/login', { email: 'throttle@omnizant.com', password: PASSWORD });
  assert.equal(blocked.status, 429);
  assert.match(blocked.data.error.message, /Try again in/);
});

test('generic error for unknown email and wrong password', async () => {
  const a = await h.client().post('/api/auth/login', { email: 'nobody@omnizant.com', password: 'whatever password' });
  const b = await h.client().post('/api/auth/login', { email: 'fred.cohen@omnizant.com', password: 'wrong password here' });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.data.error.message, b.data.error.message);
});

test('passwords are stored as salted scrypt hashes', async () => {
  const rows = await h.db.many(`SELECT password_hash FROM users WHERE password_hash IS NOT NULL`);
  assert.ok(rows.length > 2);
  for (const r of rows) assert.match(r.password_hash, /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.notEqual(rows[0].password_hash, rows[1].password_hash);
  const plain = await h.db.one(`SELECT count(*) AS n FROM users WHERE password_hash LIKE $1`, [`%${PASSWORD}%`]);
  assert.equal(plain.n, 0);
});
