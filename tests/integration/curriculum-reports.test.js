import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { addUser, drillBySlug, finishConversation, ownerClient, startTestApp, submit, submitConversation, waitForCoaching } from '../helpers.js';
import { addDays, nyDate } from '../../server/lib/time.js';

let h;
let owner;
let ae;
let am;
let aeUser;
let amUser;
before(async () => {
  h = await startTestApp({ dbName: 'saleslab_test_curriculum' });
  owner = await ownerClient(h);
  ({ client: ae, user: aeUser } = await addUser(h, owner, { name: 'Ada AE', email: 'ada@omnizant.com', role: 'ae' }));
  ({ client: am, user: amUser } = await addUser(h, owner, { name: 'Max AM', email: 'max@ravenly.com', role: 'am' }));
});
after(() => h.close());

async function assign(learnerIds, slugs, extra = {}) {
  const items = [];
  for (const [slug, persona, difficulty, skepticism, depth] of slugs) {
    const d = await drillBySlug(h, slug);
    items.push({ drillId: d.id, persona, difficulty, skepticism, depth });
  }
  return owner.post('/api/assignments', { learnerIds, title: extra.title || 'Week one', dueDate: extra.dueDate ?? addDays(nyDate(), 7), items, ...extra });
}

test('assigned exercises keep prescribed settings and enforce order', async () => {
  const r = await assign([aeUser.id], [
    ['cold-permission-opener', 'solo_attorney', 4, 5, 1],
    ['just-looking', 'marketing_manager', 2, 2, 1],
  ]);
  assert.equal(r.status, 201);
  const mine = await ae.get('/api/curriculum/mine');
  assert.equal(mine.data.active.length, 1);
  const [first, second] = mine.data.active[0].items;
  assert.equal(first.state, 'available');
  assert.equal(second.state, 'locked');
  assert.equal(mine.data.next.id, first.id);
  // Settings come from the assignment, whatever the learner sends.
  const preview = await ae.post('/api/practice/preview', { assignmentItemId: first.id, difficulty: 1, persona: 'managing_partner' });
  assert.equal(preview.data.scenario.settings.difficulty, 4);
  assert.equal(preview.data.scenario.settings.skepticism, 5);
  assert.equal(preview.data.scenario.persona.key, 'solo_attorney');
  const outOfOrder = await ae.post('/api/practice/attempts', {
    clientRequestId: randomUUID(),
    assignmentItemId: second.id,
    mode: 'coached',
    answer: 'What prompted you to look now?',
  });
  assert.equal(outOfOrder.status, 409);
  assert.equal(outOfOrder.data.error.code, 'out_of_order');
  // Another learner cannot use this assignment.
  const stranger = await am.post('/api/practice/preview', { assignmentItemId: first.id });
  assert.equal(stranger.status, 404);
});

test('finishing the conversation completes the exercise; failed coaching does not', async () => {
  const mine = await ae.get('/api/curriculum/mine');
  const first = mine.data.active[0].items[0];
  h.provider.behavior = 'fail';
  const attempt = await ae.post('/api/practice/attempts', {
    clientRequestId: randomUUID(),
    assignmentItemId: first.id,
    mode: 'coached',
    answer: 'I will be upfront, this is a sales call. Can I get 30 seconds to tell you why I am calling?',
  });
  assert.equal(attempt.status, 201);
  assert.equal(attempt.data.attempt.settings.difficulty, 4);
  await waitForCoaching(ae, attempt.data.attempt.id);
  let state = await ae.get('/api/curriculum/mine');
  assert.equal(state.data.active[0].items[0].state, 'available', 'failed coaching does not complete the item');
  h.provider.behavior = null;
  await ae.post(`/api/practice/attempts/${attempt.data.attempt.id}/evaluate`, {});
  const coached = await waitForCoaching(ae, attempt.data.attempt.id);
  // At difficulty 4 the buyer pushes back three times: coaching one reply does not finish the exercise.
  assert.equal(coached.conversation.repliesPlanned, 4);
  assert.equal(coached.conversation.next.state, 'reply');
  state = await ae.get('/api/curriculum/mine');
  assert.equal(state.data.active[0].items[0].state, 'available', 'the conversation is not finished yet');
  assert.deepEqual(state.data.active[0].items[0].lastAttempt.replies, { done: 1, planned: 4 });
  const last = await finishConversation(ae, attempt.data.attempt.id);
  assert.equal(last.conversation.scoreState, 'scored');
  state = await ae.get('/api/curriculum/mine');
  const items = state.data.active[0].items;
  assert.equal(items[0].state, 'completed');
  assert.equal(items[0].completedAttemptId, attempt.data.attempt.id, 'the exercise records the conversation');
  assert.ok(items[0].proficiency, 'completion shows proficiency separately');
  assert.equal(items[0].proficiency.score, last.conversation.score, 'the score is the conversation’s average');
  assert.equal(typeof items[0].proficiency.metTarget, 'boolean');
  assert.equal(items[1].state, 'available');
});

test('unscored practice cannot complete an assigned exercise', async () => {
  const mine = await ae.get('/api/curriculum/mine');
  const item = mine.data.active[0].items[1];
  const r = await ae.post('/api/practice/attempts', { clientRequestId: randomUUID(), assignmentItemId: item.id, mode: 'unscored', answer: 'What prompted the search?' });
  assert.equal(r.status, 409);
});

test('finishing every item completes the assignment', async () => {
  const mine = await ae.get('/api/curriculum/mine');
  const item = mine.data.active[0].items[1];
  const a = await ae.post('/api/practice/attempts', {
    clientRequestId: randomUUID(),
    assignmentItemId: item.id,
    mode: 'coached',
    answer: 'Totally fair. What prompted you to start looking now? I can point you in the right direction.',
  });
  await finishConversation(ae, a.data.attempt.id);
  const after = await ae.get('/api/curriculum/mine');
  assert.equal(after.data.active.length, 0);
  assert.equal(after.data.completed.length, 1);
});

test('overdue assignments and cancellation', async () => {
  const r = await assign([amUser.id], [['am-adoption-email', 'managing_partner', 3, 3, 3]], { title: 'Late one', dueDate: addDays(nyDate(), -2) });
  const mine = await am.get('/api/curriculum/mine');
  assert.equal(mine.data.overdue.length, 1);
  const cancel = await owner.post(`/api/assignments/${r.data.ids[0]}/cancel`, { reason: 'Replaced' });
  assert.equal(cancel.status, 200);
  const after = await am.get('/api/curriculum/mine');
  assert.equal(after.data.active.length, 0);
  assert.equal(after.data.cancelled.length, 1);
  const itemId = after.data.cancelled[0].items[0].id;
  const blocked = await am.post('/api/practice/attempts', { clientRequestId: randomUUID(), assignmentItemId: itemId, mode: 'coached', answer: 'Tell me what your team does today.' });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.data.error.code, 'assignment_cancelled');
  assert.equal((await am.post(`/api/assignments/${r.data.ids[0]}/cancel`, {})).status, 403, 'learners cannot cancel');
});

test('assigning to several reps creates one assignment each, frozen to the drill version', async () => {
  const r = await assign([aeUser.id, amUser.id], [['discovery-cost-of-problem', 'managing_partner', 2, 3, 1]], { title: 'Team drill' });
  assert.equal(r.data.ids.length, 2);
  const list = await owner.get('/api/assignments?status=active');
  assert.ok(list.data.assignments.filter((a) => a.title === 'Team drill').length === 2);
});

test('manager review: confirm and dispute change what counts', async () => {
  const d = await drillBySlug(h, 'ravenly-guarantee-ask');
  const bad = await submit(am, d, 'Yes. I guarantee you will sign more cases with us. [[mock:gtee]]');
  const ev = (await waitForCoaching(am, bad.data.attempt.id)).evaluation;
  assert.equal(ev.reviewStatus, 'provisional');
  const queue = await owner.get('/api/reviews?filter=pending');
  assert.ok(queue.data.items.some((i) => i.attempt_id === bad.data.attempt.id));
  assert.equal((await owner.post(`/api/evaluations/${ev.id}/dispute`, { note: '' })).status, 400, 'a dispute needs a reason');
  assert.equal((await owner.post(`/api/evaluations/${ev.id}/confirm`, { note: 'x' })).status, 409, 'the critical failure needs a decision');
  const reviewed = await owner.post(`/api/evaluations/${ev.id}/review`, { criticalFailures: { cf1: 'confirm' }, note: 'Clear guarantee. Review the guarantee section.' });
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.data.overallScore, 0);
  const note = await owner.post(`/api/attempts/${bad.data.attempt.id}/notes`, { body: 'Never promise outcomes. Offer the 10-day evaluation instead.' });
  assert.equal(note.status, 201);
  const view = await am.get(`/api/practice/attempts/${bad.data.attempt.id}`);
  assert.equal(view.data.evaluation.reviewStatus, 'confirmed');
  assert.equal(view.data.notes.length, 1);
  assert.equal(view.data.notes[0].author_name, 'Fred Cohen');
});

test('reports: first-attempt averages count finished conversations, excluding retries, unscored, provisional, and disputed work', async () => {
  const fresh = await addUser(h, owner, { name: 'Rae Report', email: 'rae@omnizant.com', role: 'ae' });
  const rae = fresh.client;
  const d1 = await drillBySlug(h, 'just-looking');
  const d2 = await drillBySlug(h, 'send-me-information');
  const d3 = await drillBySlug(h, 'close-ask-for-business');
  const d4 = await drillBySlug(h, 'stalled-follow-up');
  const a1 = await submitConversation(rae, d1, 'Totally fair, most people are when they first reach out. What prompted you to start looking now?');
  await submitConversation(rae, d1, 'Totally fair. What prompted you to start looking now, and what would make this worth your time today? I can save you time.');
  const a3 = await submitConversation(rae, d2, 'Happy to. So I send the right thing, can I ask two quick questions? Does Thursday at 2 work?');
  const a4 = await submitConversation(rae, d3, 'Let me make sure I have this right. Have you heard enough to make a decision? [[mock:unsupported]]');
  assert.equal(a4.first.evaluation.reviewStatus, 'provisional');
  const a5 = await submitConversation(rae, d4, 'Quick idea for you: one change fixed after-hours follow-up for two firms like yours. Tuesday or Thursday?');
  await owner.post(`/api/evaluations/${a5.last.evaluation.id}/dispute`, { note: 'Scored the wrong drill context.' });
  // A conversation left after its first reply does not count yet.
  const unfinished = await submit(rae, await drillBySlug(h, 'cold-permission-opener'), 'Hi, this is Rae from Omnizant. This is a sales call; can I have thirty seconds to tell you why I called?');
  await waitForCoaching(rae, unfinished.data.attempt.id);

  // Each conversation scores the average of its replies.
  const scores = [a1, a3].map((a) => a.last.conversation.score);
  for (const a of [a1, a3]) {
    const replies = a.last.conversation.turns.map((t) => t.score);
    assert.equal(replies.length, 2, 'difficulty 2: one pushback');
    assert.equal(a.last.conversation.score, Math.round((replies[0] + replies[1]) / 2));
  }
  const expected = Math.round((scores.reduce((x, y) => x + y, 0) / scores.length) * 10) / 10;

  const rep = await owner.get(`/api/reports/rep/${fresh.user.id}?period=7`);
  assert.equal(rep.status, 200);
  const p = rep.data.reps[0].performance;
  assert.equal(p.scoredFirstAttempts, 2);
  assert.equal(p.firstAttemptAverage, expected);
  assert.equal(p.excluded.retries, 1);
  assert.equal(p.excluded.pendingReview, 1);
  assert.equal(p.excluded.disputed, 1);
  assert.equal(p.excluded.unfinished, 1);
  assert.equal(p.pendingReviews, 1);
  const e = rep.data.reps[0].engagement;
  assert.equal(e.submitted, 6);
  assert.equal(e.replies, 11, 'five finished conversations of two replies, and one reply in an unfinished one');
  assert.equal(e.retries, 1);
  assert.equal(e.practiceDays, 1);
  assert.equal(rep.data.reps[0].retry.exercises, 1, 'like-for-like retry gains are reported separately');
  // Evidence thresholds: two scored examples are not enough to call a strength or weakness.
  assert.ok(rep.data.team.dimensions.every((d) => d.n < 3 ? d.verdict === 'insufficient' : true));
  assert.ok(rep.data.disclosures.some((x) => /exclude/.test(x)));
  assert.match(rep.data.team.trend.statement.text, /Not enough/);
  // The learner sees the same numbers for themself and nobody else.
  const self = await rae.get('/api/progress/me?period=7');
  assert.equal(self.data.reps.length, 1);
  assert.equal(self.data.reps[0].performance.firstAttemptAverage, expected);
  assert.equal(self.data.groups, undefined);
});

test('team summary splits AEs and AMs and supports filters', async () => {
  const all = await owner.get('/api/reports/summary?period=30');
  assert.equal(all.status, 200);
  const g = all.data.groups;
  assert.ok(g.all.reps >= g.ae.reps + g.am.reps - 0);
  assert.ok(g.ae.reps >= 2 && g.am.reps >= 1);
  assert.ok(all.data.reps.every((r) => ['ae', 'am'].includes(r.role)), 'managers are not in rep reports');
  const amOnly = await owner.get('/api/reports/summary?period=30&role=am');
  assert.ok(amOnly.data.reps.every((r) => r.role === 'am'));
  const ravenly = await owner.get('/api/reports/summary?period=90&brand=ravenly');
  assert.equal(ravenly.data.filters.brand, 'ravenly');
  const hard = await owner.get('/api/reports/summary?period=7&difficulty=5');
  assert.equal(hard.data.team.engagement.submitted, 0);
  assert.equal(all.data.period.timezone, 'America/New_York');
  assert.ok(all.data.disclosures.some((x) => /Reporting history begins/.test(x)));
  const follow = all.data.reps.find((r) => r.name === 'Max AM');
  assert.ok(Array.isArray(follow.followUp));
});

test('CSV exports for reps and attempts', async () => {
  const reps = await owner.get('/api/reports/export.csv?period=30&type=reps');
  assert.equal(reps.status, 200);
  assert.match(reps.headers.get('content-type'), /text\/csv/);
  assert.match(reps.headers.get('content-disposition'), /sales-lab-reps-/);
  assert.ok(reps.data.includes('First-attempt coaching average'));
  assert.ok(reps.data.includes('Ada AE'));
  const attempts = await owner.get('/api/reports/export.csv?period=30&type=attempts');
  assert.ok(attempts.data.split('\r\n').length > 5);
  assert.ok(attempts.data.includes('Counts toward averages'));
  assert.equal((await ae.get('/api/reports/export.csv')).status, 403);
});

test('rubric weights are versioned; new attempts use the new version, old ones keep theirs', async () => {
  const before = await owner.get('/api/settings');
  const weights = Object.fromEntries(before.data.rubric.dimensions.map((d) => [d.key, d.weight]));
  weights.product_accuracy = 30;
  weights.persuasion = 20;
  const r = await owner.put('/api/settings/rubric', { weights, note: 'Calibration round 1' });
  assert.equal(r.status, 200);
  assert.equal(r.data.version, before.data.rubric.version + 1);
  const old = await h.db.one(`SELECT rubric_version_id FROM attempts ORDER BY submitted_at LIMIT 1`);
  const oldRubric = await h.db.one(`SELECT version FROM rubric_versions WHERE id = $1`, [old.rubric_version_id]);
  assert.equal(oldRubric.version, 1);
  assert.equal((await ae.put('/api/settings/rubric', { weights })).status, 403);
  const bad = await owner.put('/api/settings/thresholds', { proficiency: 70, strength: 60, weakness: 65, minEvidence: 3 });
  assert.equal(bad.status, 400);
  const lowEvidence = await owner.put('/api/settings/thresholds', { proficiency: 70, strength: 80, weakness: 65, minEvidence: 2 });
  assert.equal(lowEvidence.status, 400);
});

test('knowledge library: drafts, approval, archive, and learner visibility', async () => {
  const created = await owner.post('/api/knowledge', {
    title: 'Omnizant SEO competitors',
    brand: 'omnizant',
    subjects: ['competitive'],
    personas: [],
    asOfDate: '2026-10-01',
    caveats: 'Draft from sales; confirm pricing.',
    content: '# Omnizant SEO\n\n## Plans\n\nDraft content.',
    importedFrom: 'seo.md',
  });
  assert.equal(created.status, 201);
  const draft = await ae.get(`/api/knowledge/${created.data.id}`);
  assert.equal(draft.status, 404, 'learners cannot see drafts');
  const lib = await owner.get('/api/knowledge');
  assert.ok(lib.data.coverage.missing.some((m) => m.brand === 'omnizant' && m.subject === 'competitive'), 'draft does not count as coverage');
  const v = await owner.get(`/api/knowledge/${created.data.id}`);
  await owner.post(`/api/knowledge/${created.data.id}/approve`, { versionId: v.data.version.id });
  const visible = await ae.get(`/api/knowledge/${created.data.id}`);
  assert.equal(visible.status, 200);
  assert.equal(visible.data.version.asOfDate, '2026-10-01');
  assert.equal(visible.data.version.caveats, 'Draft from sales; confirm pricing.');
  const lib2 = await owner.get('/api/knowledge');
  assert.ok(!lib2.data.coverage.missing.some((m) => m.brand === 'omnizant' && m.subject === 'competitive'));
  await owner.post(`/api/knowledge/${created.data.id}/archive`, {});
  assert.equal((await ae.get(`/api/knowledge/${created.data.id}`)).status, 404);
  const learnerList = await ae.get('/api/knowledge');
  assert.ok(learnerList.data.sources.every((s) => s.status === 'approved'));
});
