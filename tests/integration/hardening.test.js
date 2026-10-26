// Fixes from the independent security and requirements reviews.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { addUser, drillBySlug, finishConversation, ownerClient, PASSWORD, prepare, sectionBy, startTestApp, submit, waitFor, waitForCoaching } from '../helpers.js';

let h;
let owner;
before(async () => {
  // Trust one proxy hop so tests can present different client addresses with X-Forwarded-For.
  h = await startTestApp({
    dbName: 'saleslab_test_hardening',
    env: { TRUST_PROXY: '1', AI_RUNS_PER_USER_PER_HOUR: '8', AI_MAX_CONCURRENT: '2' },
  });
  owner = await ownerClient(h);
});
after(() => h.close());

const from = (ip) => ({ headers: { 'x-forwarded-for': ip } });
const login = (c, email, password, ip) => c.post('/api/auth/login', { email, password }, from(ip));

test('parallel guesses cannot get past the sign-in limit', async () => {
  const { user } = await addUser(h, owner, { name: 'Pat Parallel', email: 'pat@omnizant.com' });
  const burst = await Promise.all(Array.from({ length: 30 }, (_, i) => login(h.client(), user.email, `wrong-guess-${i}`, '10.0.0.1')));
  let evaluated = burst.filter((r) => r.status === 401).length;
  assert.ok(evaluated <= 5, `at most 5 guesses reach the password check (got ${evaluated})`);
  assert.ok(burst.filter((r) => r.status === 429).length >= 25);
  // Later guesses only use up what is left of the same allowance.
  for (let i = 0; i < 10; i += 1) if ((await login(h.client(), user.email, `wrong-seq-${i}`, '10.0.0.1')).status === 401) evaluated += 1;
  assert.equal(evaluated, 5, 'five guesses in total, however they are sent');
  assert.equal((await login(h.client(), user.email, PASSWORD, '10.0.0.1')).status, 429);
  // The person themselves, from their own address, is not locked out by someone else's guesses.
  assert.equal((await login(h.client(), user.email, PASSWORD, '10.0.0.2')).status, 200);
});

test('blocked requests do not extend a lockout, and a manager can allow sign-in again', async () => {
  const { user } = await addUser(h, owner, { name: 'Lee Lockout', email: 'lee@ravenly.com' });
  for (let i = 0; i < 5; i += 1) assert.equal((await login(h.client(), user.email, 'nope-nope-nope', '10.0.1.1')).status, 401);
  for (let i = 0; i < 20; i += 1) assert.equal((await login(h.client(), user.email, 'nope-nope-nope', '10.0.1.1')).status, 429);
  const detail = await owner.get(`/api/users/${user.id}`);
  assert.equal(detail.data.signIn.paused, true);
  assert.equal(detail.data.signIn.recentFailures, 5, 'blocked requests are not counted as failures');
  const cleared = await owner.post(`/api/users/${user.id}/sign-in/clear`, {});
  assert.equal(cleared.status, 200);
  assert.equal(cleared.data.signIn.paused, false);
  assert.equal((await login(h.client(), user.email, PASSWORD, '10.0.1.1')).status, 200);
  const activity = (await owner.get(`/api/users/${user.id}`)).data.activity.map((e) => e.action);
  assert.ok(activity.includes('auth.sign_in_cleared'));
});

test('a new password from a reset link lifts the sign-in pause', async () => {
  const { user } = await addUser(h, owner, { name: 'Rory Reset', email: 'rory@omnizant.com' });
  for (let i = 0; i < 5; i += 1) await login(h.client(), user.email, 'still-wrong-pw', '10.0.2.1');
  assert.equal((await login(h.client(), user.email, PASSWORD, '10.0.2.1')).status, 429);
  const link = await owner.post(`/api/users/${user.id}/links`, {});
  const token = link.data.link.url.split('/').pop();
  assert.equal((await h.client().post(`/api/auth/link/${token}`, { password: 'a brand new passphrase' })).status, 200);
  assert.equal((await login(h.client(), user.email, 'a brand new passphrase', '10.0.2.1')).status, 200);
});

test('changing a password with a borrowed session is throttled and audited', async () => {
  const { client, user } = await addUser(h, owner, { name: 'Cam Change', email: 'cam@ravenly.com' });
  for (let i = 0; i < 5; i += 1) {
    const r = await client.post('/api/auth/password', { currentPassword: `guess-${i}-xxxxx`, newPassword: 'another long passphrase' }, from('10.0.3.1'));
    assert.equal(r.status, 400);
  }
  const blocked = await client.post('/api/auth/password', { currentPassword: PASSWORD, newPassword: 'another long passphrase' }, from('10.0.3.1'));
  assert.equal(blocked.status, 429);
  const activity = (await owner.get(`/api/users/${user.id}`)).data.activity.map((e) => e.action);
  assert.ok(activity.includes('auth.password_change_failed'));
});

test('a sign-in racing a deactivation never leaves a working session', async () => {
  for (let round = 0; round < 3; round += 1) {
    const email = `race${round}@omnizant.com`;
    const { user } = await addUser(h, owner, { name: `Race ${round}`, email });
    const c = h.client();
    const [signIn] = await Promise.all([login(c, email, PASSWORD, `10.0.4.${round}`), owner.post(`/api/users/${user.id}/deactivate`, {})]);
    assert.ok([200, 401].includes(signIn.status));
    assert.equal((await c.get('/api/auth/me')).status, 401, 'no session survives deactivation');
    await owner.post(`/api/users/${user.id}/reactivate`, {});
    assert.equal((await c.get('/api/auth/me')).status, 401, 'reactivation does not restore it');
  }
});

test('only the owner can sign the owner out or revoke the owner’s links', async () => {
  const { client: mgr } = await addUser(h, owner, { name: 'Mia Manager', email: 'mia@omnizant.com', role: 'manager' });
  const ownerId = (await owner.get('/api/auth/me')).data.user.id;
  assert.equal((await mgr.post(`/api/users/${ownerId}/sessions/revoke`, {})).status, 403);
  assert.equal((await mgr.post(`/api/users/${ownerId}/links/revoke`, {})).status, 403);
  assert.equal((await owner.get('/api/auth/me')).status, 200);
});

async function createDrill(body) {
  const base = {
    title: 'Omnizant pricing question',
    brand: 'omnizant',
    subject: 'product',
    stage: 'pricing',
    roles: ['ae'],
    personas: ['managing_partner'],
    situation: 'A managing partner asks what Omnizant costs for a firm of twelve attorneys.',
    buyerLine: 'What does Omnizant cost for a firm our size?',
    objective: 'Answer without inventing prices and move to discovery.',
    goodLooksLike: 'Does not invent a price. Asks about firm size and needs.',
    assessedDimensions: ['product_accuracy', 'advancing'],
    defaults: { difficulty: 3, skepticism: 3, depth: 3 },
    sourceRefs: [],
    ...body,
  };
  const r = await owner.post('/api/drills', base);
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data.id;
}

test('coaching needs a relevant source: technique material cannot score an Omnizant product drill', async () => {
  const objections = await sectionBy(h, 'sales-playbook', '6. Objections');
  const presenting = await sectionBy(h, 'sales-playbook', '4. Presenting');
  const id = await createDrill({ sourceRefs: [{ sourceId: objections.id, sections: [] }, { sourceId: presenting.id }] });
  const { client: rep } = await addUser(h, owner, { name: 'Omar Omni', email: 'omar@omnizant.com' });
  await prepare(rep, id);
  const preview = await rep.post('/api/practice/preview', { drillId: id });
  assert.equal(preview.status, 200);
  assert.equal(preview.data.coaching.available, false);
  assert.equal(preview.data.coaching.reason, 'no_relevant_sources');
  const coached = await rep.post('/api/practice/attempts', { clientRequestId: randomUUID(), drillId: id, mode: 'coached', answer: 'It depends on your firm. How many attorneys handle intake today?' });
  assert.equal(coached.status, 409);
  const unscored = await rep.post('/api/practice/attempts', { clientRequestId: randomUUID(), drillId: id, mode: 'unscored', answer: 'It depends on your firm. How many attorneys handle intake today?' });
  assert.equal(unscored.status, 201);
  assert.equal(unscored.data.attempt.mode, 'unscored');
  const listed = (await owner.get('/api/drills')).data.drills.find((d) => d.id === id);
  assert.equal(listed.coaching.available, false);
  assert.equal(listed.coaching.reason, 'no_relevant_sources');
});

test('learners never see the titles of sources that are not approved', async () => {
  const draft = await owner.post('/api/knowledge', {
    title: 'Secret Omnizant pricing draft',
    brand: 'omnizant',
    subjects: ['product'],
    content: '# Draft\n\n## 01 · Pricing\n\nNot final.',
  });
  assert.equal(draft.status, 201);
  const id = await createDrill({ title: 'Draft source drill', sourceRefs: [{ sourceId: draft.data.id, sections: [] }] });
  const { client: rep } = await addUser(h, owner, { name: 'Tia Titles', email: 'tia@ravenly.com' });
  assert.equal((await rep.get(`/api/drills/${id}`)).status, 403, 'reps never open questions directly');
  await prepare(rep, id);
  const preview = await rep.post('/api/practice/preview', { drillId: id });
  assert.equal(preview.data.scenario.sources[0].title, null);
  assert.ok(!JSON.stringify(preview.data).includes('Secret Omnizant pricing draft'));
  const mgrView = await owner.get(`/api/drills/${id}`);
  assert.equal(mgrView.data.drill.sources[0].title, 'Secret Omnizant pricing draft');
});

test('unscored practice does not use up the first attempt', async () => {
  const draft = await owner.post('/api/knowledge', {
    title: 'Omnizant product facts',
    brand: 'omnizant',
    subjects: ['product'],
    evidenceBasis: 'documented',
    content: '# Omnizant facts\n\n## 01 · Pricing\n\nPricing depends on firm size and is quoted after discovery.',
  });
  const id = await createDrill({ title: 'First attempt drill', sourceRefs: [{ sourceId: draft.data.id, sections: [] }] });
  const { client: rep, user } = await addUser(h, owner, { name: 'Una Unscored', email: 'una@omnizant.com' });
  await prepare(rep, id);
  const answer = 'Pricing depends on your firm size. How many attorneys are on intake today?';
  const u = await rep.post('/api/practice/attempts', { clientRequestId: randomUUID(), drillId: id, mode: 'unscored', answer });
  assert.equal(u.status, 201);
  const approve = await owner.post(`/api/knowledge/${draft.data.id}/approve`, { versionId: (await owner.get(`/api/knowledge/${draft.data.id}`)).data.version.id });
  assert.equal(approve.status, 200);
  const drill = await h.db.one(`SELECT id, current_version_id AS version_id, ARRAY['managing_partner'] AS personas FROM drills WHERE id = $1`, [id]);
  const c = await submit(rep, drill, answer);
  assert.equal(c.status, 201, JSON.stringify(c.data));
  assert.equal(c.data.attempt.isFirstAttempt, true);
  assert.equal(c.data.attempt.coachedNumber, 1);
  await finishConversation(rep, c.data.attempt.id);
  const report = await owner.get(`/api/reports/rep/${user.id}?period=7`);
  assert.equal(report.data.reps[0].performance.scoredFirstAttempts, 1);
});

test('reports keep answers under the role the person had when they wrote them', async () => {
  const { client: rep, user } = await addUser(h, owner, { name: 'Rho Rolechange', email: 'rho@ravenly.com', role: 'am' });
  const d = await drillBySlug(h, 'am-qbr-value');
  const a = await submit(rep, d, 'Let us look at what changed since launch: how many inquiries came in after hours, and how many became consults?');
  await waitForCoaching(rep, a.data.attempt.id);
  assert.equal((await owner.patch(`/api/users/${user.id}`, { role: 'ae' })).status, 200);
  let summary = (await owner.get('/api/reports/summary?period=7')).data;
  const amRow = summary.reps.find((r) => r.id === user.id);
  assert.deepEqual(amRow.rolesPracticed, ['am']);
  assert.ok(summary.groups.am.engagement.submitted >= 1, 'the AM-era answer stays in the AM column');
  assert.ok(summary.disclosures.some((x) => x.includes('changed role')));
  const amOnly = (await owner.get('/api/reports/summary?period=7&role=am')).data;
  assert.ok(amOnly.reps.some((r) => r.id === user.id), 'visible in the AM view by the role they had');
  assert.equal((await owner.patch(`/api/users/${user.id}`, { role: 'manager' })).status, 200);
  summary = (await owner.get('/api/reports/summary?period=7')).data;
  assert.ok(summary.reps.some((r) => r.id === user.id), 'a rep promoted to manager keeps their practice history');
  const csv = await owner.get('/api/reports/export.csv?type=attempts&period=7');
  assert.ok(String(csv.data).includes('Role at the time'));
});

test('CSV exports carry the reporting notes', async () => {
  const csv = await owner.get('/api/reports/export.csv?type=reps&period=90');
  const text = String(csv.data);
  assert.ok(text.includes('Reporting history begins on'), 'incomplete history is disclosed in the file');
  assert.ok(text.includes('not employment decisions'));
});

test('learning paths can target new or experienced account managers', async () => {
  const d = await drillBySlug(h, 'am-adoption-email');
  const r = await owner.post('/api/paths', {
    name: 'New AM onboarding',
    audience: 'new_hire_am',
    items: [{ drillId: d.id, persona: d.personas[0], difficulty: 2, skepticism: 2, depth: 2 }],
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
});

// A long document (not part of a collection) whose drills point at chosen "## " sections.
const LONG_DOC = '# Field guide\n\n## 01 · Setup\n\nConnect the website widget first.\n\n## 02 · Pricing\n\nPlans start with a trial.\n\n## 03 · Integrations\n\nA Zapier route exists today.';
async function longDocWithDrill(title, sections) {
  const doc = await owner.post('/api/knowledge', { title, brand: 'ravenly', subjects: ['product'], content: LONG_DOC, approve: true });
  assert.equal(doc.status, 201);
  const drillId = await createDrill({ title: `${title} drill`, brand: 'ravenly', sourceRefs: [{ sourceId: doc.data.id, sections, wholeSource: false }] });
  return { docId: doc.data.id, drillId };
}

test('approving a source version warns about drills whose sections would disappear', async () => {
  const { docId, drillId } = await longDocWithDrill('Impact guide', ['s2', 's3']);
  const v = await owner.post(`/api/knowledge/${docId}/versions`, {
    title: 'Impact guide',
    brand: 'ravenly',
    subjects: ['product'],
    content: '# Field guide\n\n## 01 · Setup\n\nShort replacement text.',
  });
  assert.equal(v.status, 201);
  const impact = await owner.get(`/api/knowledge/${docId}/drill-impact?versionId=${v.data.versionId}`);
  assert.equal(impact.status, 200);
  const hit = impact.data.drills.find((d) => d.drillId === drillId);
  assert.ok(hit, 'the drill that uses the dropped sections is listed');
  assert.deepEqual(hit.missing.map((m) => m.why), ['removed', 'removed']);
  assert.equal(hit.allMissing, true);
});

test('sources record their evidence basis and can be filtered by it', async () => {
  const r = await owner.post('/api/knowledge', {
    title: 'Competitor claims roundup',
    brand: 'ravenly',
    subjects: ['competitive'],
    evidenceBasis: 'public_claims',
    content: '# Claims\n\n## 01 · Intaker\n\nIntaker says its AI agent follows up automatically.',
  });
  assert.equal(r.status, 201);
  const list = await owner.get('/api/knowledge?evidence=public_claims');
  assert.ok(list.data.sources.some((s) => s.id === r.data.id && s.evidenceBasis === 'public_claims'));
  assert.ok(list.data.sources.every((s) => s.evidenceBasis === 'public_claims'));
});

test('reps can retry coaching a few times an hour; a manager can always restart it', async () => {
  const { client: rep } = await addUser(h, owner, { name: 'Ty Tries', email: 'ty@omnizant.com' });
  const d = await drillBySlug(h, 'just-looking');
  h.provider.behavior = 'fail';
  try {
    const a = await submit(rep, d, 'Totally fair. What prompted you to start looking now, and what would a good outcome look like?');
    const id = a.data.attempt.id;
    await waitForCoaching(rep, id);
    for (let i = 1; i < 6; i += 1) {
      const r = await rep.post(`/api/practice/attempts/${id}/evaluate`, {});
      assert.equal(r.status, 202, `retry ${i}: ${JSON.stringify(r.data)}`);
      await waitForCoaching(rep, id);
    }
    const blocked = await rep.post(`/api/practice/attempts/${id}/evaluate`, {});
    assert.equal(blocked.status, 409);
    assert.equal(blocked.data.error.code, 'retry_too_many_runs');
    h.provider.behavior = null;
    const restarted = await owner.post(`/api/practice/attempts/${id}/evaluate`, {});
    assert.equal(restarted.status, 202);
    const done = await waitForCoaching(rep, id);
    assert.ok(done.evaluation, 'the manager restart produced coaching');
  } finally {
    h.provider.behavior = null;
  }
});

test('a flood from one address does not lock the person out from another, even while it lasts', async () => {
  const { user } = await addUser(h, owner, { name: 'Flo Flood', email: 'flo@ravenly.com' });
  const first = await Promise.all(Array.from({ length: 60 }, (_, i) => login(h.client(), user.email, `flood-${i}-xx`, '10.9.0.1')));
  assert.ok(first.filter((r) => r.status === 401).length <= 5);
  for (let i = 0; i < 5; i += 1) await login(h.client(), user.email, `flood-seq-${i}`, '10.9.0.1');
  // While a second flood from the blocked address is in progress, the person signs in from their own.
  const flood = Promise.all(Array.from({ length: 120 }, (_, i) => login(h.client(), user.email, `flood2-${i}-xx`, '10.9.0.1')));
  const own = [];
  for (let i = 0; i < 5; i += 1) own.push((await login(h.client(), user.email, PASSWORD, '10.9.0.2')).status);
  await flood;
  assert.deepEqual(own, [200, 200, 200, 200, 200], 'their own address keeps working during the flood');
});

test('parallel submissions cannot get past the hourly coaching limit', async () => {
  // Coaching limits apply to everyone; a manager can submit any question, so no stage feed is involved.
  const { client: rep } = await addUser(h, owner, { name: 'Ria Rate', email: 'ria@omnizant.com', role: 'manager' });
  const d = await drillBySlug(h, 'just-looking');
  const results = await Promise.all(
    Array.from({ length: 12 }, (_, i) => submit(rep, d, `Totally fair. What prompted you to start looking now? Variation ${i} of my answer.`)),
  );
  const accepted = results.filter((r) => r.status === 201);
  assert.ok(accepted.length <= 8, `at most 8 coaching runs started (got ${accepted.length})`);
  assert.ok(results.filter((r) => r.status === 429).every((r) => r.data.error.code === 'coaching_rate_limited'));
  for (const r of accepted) await waitForCoaching(rep, r.data.attempt.id);
});

test('coaching requests wait their turn instead of failing when every slot is busy', async () => {
  const { client: rep } = await addUser(h, owner, { name: 'Quin Queue', email: 'quin@ravenly.com', role: 'manager' });
  const d = await drillBySlug(h, 'send-me-information');
  h.provider.behavior = 'hold';
  try {
    const a = await submit(rep, d, 'Happy to. So I send the right thing, can I ask two quick questions about your intake?');
    const b = await submit(rep, d, 'Of course. What would you want the information to answer for you and your partners?');
    await waitFor(() => h.provider._waiters.length === 2);
    const c = await submit(rep, d, 'Sure. Before I send anything, who else will read it, and what decision is it for?');
    const queued = await rep.get(`/api/practice/attempts/${c.data.attempt.id}`);
    assert.equal(queued.data.coaching.run.status, 'running');
    assert.equal(queued.data.coaching.run.callStartedAt, null, 'still waiting for a slot');
    assert.equal(queued.data.coaching.retryBlockedReason, 'queued');
    h.provider.behavior = null;
    h.provider.release();
    for (const x of [a, b, c]) {
      const done = await waitForCoaching(rep, x.data.attempt.id);
      assert.ok(done.evaluation, 'every queued answer was coached');
    }
  } finally {
    h.provider.behavior = null;
    h.provider.release();
  }
});

test('disputing sets undecided items aside; reviewing again needs fresh decisions', async () => {
  const { client: rep } = await addUser(h, owner, { name: 'Dee Dispute', email: 'dee@omnizant.com' });
  const d = await drillBySlug(h, 'ravenly-guarantee-ask');
  const a = await submit(rep, d, 'Yes. I guarantee you will sign more cases with Ravenly this quarter. [[mock:gtee]]');
  const ev = (await waitForCoaching(rep, a.data.attempt.id)).evaluation;
  assert.equal(ev.criticalFailures[0].status, 'pending');
  assert.equal((await owner.post(`/api/evaluations/${ev.id}/dispute`, { note: 'Coaching misread the drill.' })).status, 200);
  const view = (await rep.get(`/api/practice/attempts/${a.data.attempt.id}`)).data.evaluation;
  assert.equal(view.criticalFailures[0].status, 'set_aside');
  const critical = await owner.get('/api/reviews?filter=critical');
  assert.ok(!critical.data.items.some((i) => i.evaluation_id === ev.id), 'no longer listed as a failure to decide');
  assert.equal((await owner.post(`/api/evaluations/${ev.id}/review`, {})).status, 409);
  const re = await owner.post(`/api/evaluations/${ev.id}/review`, { criticalFailures: { cf1: 'reject' } });
  assert.equal(re.status, 200);
  assert.equal(re.data.overallScore, ev.weightedScore);
});

test('a completed exercise shows a target verdict only once its evaluation counts', async () => {
  const { client: rep, user } = await addUser(h, owner, { name: 'Cal Curriculum', email: 'cal@ravenly.com' });
  const d = await drillBySlug(h, 'close-ask-for-business');
  const asg = await owner.post('/api/assignments', {
    learnerIds: [user.id],
    title: 'Closing practice',
    items: [{ drillId: d.id, persona: d.personas[0], difficulty: 3, skepticism: 3, depth: 3 }],
  });
  assert.equal(asg.status, 201, JSON.stringify(asg.data));
  const mine = (await rep.get('/api/curriculum/mine')).data;
  const item = mine.active[0].items[0];
  const a = await rep.post('/api/practice/attempts', {
    clientRequestId: randomUUID(),
    assignmentItemId: item.id,
    mode: 'coached',
    answer: 'Have you heard enough to make a decision today? I can send the agreement now. [[mock:unsupported]]',
  });
  assert.equal(a.status, 201, JSON.stringify(a.data));
  await finishConversation(rep, a.data.attempt.id);
  const after = (await rep.get('/api/curriculum/mine')).data.completed[0].items[0];
  assert.equal(after.state, 'completed');
  assert.equal(after.proficiency.reviewStatus, 'provisional');
  assert.equal(after.proficiency.metTarget, null, 'no verdict while the evaluation waits for review');
});

test('a drill about both brands is not scored against one brand’s product material', async () => {
  const pricing = await sectionBy(h, 'ravenly-product', '12 · Packaging, pricing');
  const id = await createDrill({ title: 'Both-brand pricing', brand: 'both', sourceRefs: [{ sourceId: pricing.id, sections: [] }] });
  const preview = await owner.post('/api/practice/preview', { drillId: id });
  assert.equal(preview.data.coaching.available, false);
  assert.equal(preview.data.coaching.reason, 'no_relevant_sources');
});

test('approving a renumbered source keeps drills on the same material', async () => {
  const { docId, drillId } = await longDocWithDrill('Renumbered guide', ['s2', 's3']);
  const before = (await owner.post('/api/practice/preview', { drillId })).data.scenario.sources.find((x) => x.sourceId === docId);
  assert.equal(before.sections.length, 2);
  // Insert a new section 02 and push every later section down by one.
  const renumbered = LONG_DOC.replace(/^## (\d{2}) · /gm, (m, n) => (Number(n) >= 2 ? `## ${String(Number(n) + 1).padStart(2, '0')} · ` : m)).replace(
    /^## 03 · /m,
    '## 02 · What changed this quarter\n\nNew material for this test.\n\n## 03 · ',
  );
  const v = await owner.post(`/api/knowledge/${docId}/versions`, { title: 'Renumbered guide', brand: 'ravenly', subjects: ['product'], content: renumbered });
  assert.equal(v.status, 201);
  const impact = await owner.get(`/api/knowledge/${docId}/drill-impact?versionId=${v.data.versionId}`);
  assert.ok(!impact.data.drills.some((x) => x.drillId === drillId), 'renumbering alone does not affect the drill');
  assert.equal((await owner.post(`/api/knowledge/${docId}/approve`, { versionId: v.data.versionId })).status, 200);
  const after = (await owner.post('/api/practice/preview', { drillId })).data;
  const src = after.scenario.sources.find((x) => x.sourceId === docId);
  const strip = (t) => t.replace(/^\d+ · /, '');
  assert.deepEqual(src.sections.map((x) => strip(x.title)), before.sections.map((x) => strip(x.title)), 'same sections, new numbers');
  assert.notDeepEqual(src.sections.map((x) => x.key), before.sections.map((x) => x.key));
  assert.equal(after.coaching.available, true);
});

test('saving a drill never widens it to the whole source by accident', async () => {
  const draft = await owner.post('/api/knowledge', {
    title: 'Ravenly onboarding notes',
    brand: 'ravenly',
    subjects: ['product'],
    content: '# Notes\n\n## 01 · Setup steps\n\nConnect the website widget first.\n\n## 02 · Training\n\nTrain intake staff in week one.',
    approve: true,
  });
  assert.equal(draft.status, 201);
  const src = (await owner.get(`/api/knowledge/${draft.data.id}`)).data.version;
  const id = await createDrill({
    title: 'Onboarding drill',
    brand: 'ravenly',
    sourceRefs: [{ sourceId: draft.data.id, sections: ['s1'], wholeSource: false }],
  });
  // A new version retitles section 01, so the drill's chosen section is no longer found.
  const v2 = await owner.post(`/api/knowledge/${draft.data.id}/versions`, {
    title: src.title,
    brand: 'ravenly',
    subjects: ['product'],
    content: '# Notes\n\n## 01 · Pricing overview\n\nNew material.\n\n## 02 · Training\n\nTrain intake staff in week one.',
    approve: true,
  });
  assert.equal(v2.status, 201);
  const edit = (await owner.get(`/api/drills/${id}`)).data.drill;
  assert.equal(edit.sourceRefs[0].sections.length, 0);
  assert.equal(edit.sourceRefs[0].wholeSource, false);
  assert.equal(edit.sourceRefs[0].unmatched[0].why, 'retitled');
  assert.equal(edit.coaching.reason, 'sections_missing');
  const base = { ...edit, defaults: edit.defaults, sourceRefs: [{ sourceId: draft.data.id, sections: [], wholeSource: false }] };
  const body = Object.fromEntries(
    ['title', 'brand', 'subject', 'stage', 'roles', 'personas', 'situation', 'buyerLine', 'personaLines', 'objective', 'goodLooksLike', 'assessedDimensions', 'defaults', 'sourceRefs'].map((k) => [k, base[k]]),
  );
  const refused = await owner.put(`/api/drills/${id}`, body);
  assert.equal(refused.status, 400, 'saving with no sections and no explicit whole-source choice is refused');
  const whole = await owner.put(`/api/drills/${id}`, { ...body, sourceRefs: [{ sourceId: draft.data.id, sections: [], wholeSource: true }] });
  assert.equal(whole.status, 200, 'choosing the whole source explicitly is allowed');
});
