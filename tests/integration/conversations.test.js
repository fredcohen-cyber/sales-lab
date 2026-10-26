// The Practice Studio feed and practice conversations: reps choose a stage, never a question; each reply
// is coached, then the buyer pushes back, until the conversation ends.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { addUser, drillBySlug, finishConversation, ownerClient, sectionBy, startTestApp, submit, waitFor, waitForCoaching } from '../helpers.js';
import { STAGES } from '../../server/domain.js';
import { buildCoachingRequest } from '../../server/ai/prompt.js';

let h;
let owner;
let ae;
let am;
let other;
before(async () => {
  h = await startTestApp({ dbName: 'saleslab_test_conversations' });
  owner = await ownerClient(h);
  ({ client: ae } = await addUser(h, owner, { name: 'Ava Exec', email: 'ava@omnizant.com', role: 'ae' }));
  ({ client: am } = await addUser(h, owner, { name: 'Mo Manager', email: 'mo@ravenly.com', role: 'am' }));
  ({ client: other } = await addUser(h, owner, { name: 'Oli Other', email: 'oli@omnizant.com', role: 'ae' }));
});
after(() => h.close());

const reply = (client, afterId, answer, mode = 'coached') => client.post('/api/practice/attempts', { clientRequestId: randomUUID(), continueFrom: afterId, mode, answer });
const drillBody = (fields) => ({
  title: 'Conversation test',
  brand: 'both',
  subject: 'sales_technique',
  stage: 'closing',
  roles: ['ae'],
  personas: ['managing_partner'],
  situation: 'A managing partner has seen your proposal and is weighing it.',
  buyerLine: '“Send it over and I’ll think about it.”',
  objective: 'Agree on a dated next step.',
  goodLooksLike: '- Asks what the decision depends on.\n- Proposes a specific next step.',
  assessedDimensions: ['objection_handling', 'advancing'],
  defaults: { difficulty: 3, skepticism: 3, depth: 1 },
  ...fields,
});

test('reps see the stages for their role; managers see every stage', async () => {
  const mine = (await ae.get('/api/practice/stages')).data.stages;
  assert.ok(mine.length >= 7);
  assert.ok(mine.filter((s) => s.track === 'ae').length === 7, 'every AE stage is offered to an AE');
  assert.ok(mine.every((s) => s.track === 'ae' || s.questions >= 3), 'another role’s stage only with enough questions for this role');
  const cold = mine.find((s) => s.key === 'cold_outreach');
  assert.ok(cold.questions >= 3 && cold.description.length > 10);
  assert.deepEqual([cold.answered, cold.openAttemptId, cold.waiting], [0, null, false]);
  const forAm = (await am.get('/api/practice/stages')).data.stages;
  assert.ok(forAm.filter((s) => s.track === 'am').length === 3);
  const forOwner = (await owner.get('/api/practice/stages')).data.stages;
  assert.equal(forOwner.length, STAGES.length);
});

test('a stage serves one question for the rep’s role, at the levels the question sets, until it is answered', async () => {
  const first = await ae.post('/api/practice/stages/cold_outreach/draw', {});
  assert.equal(first.status, 200, JSON.stringify(first.data));
  const s = first.data.scenario;
  assert.equal(s.stage, 'cold_outreach');
  assert.equal(s.repRole, 'ae');
  assert.equal(s.goodLooksLike, undefined, 'the answer key stays hidden');
  assert.equal(s.pushbacks, undefined, 'so do the buyer’s pushbacks');
  const v = await h.db.one(`SELECT v.* FROM drills d JOIN drill_versions v ON v.id = d.current_version_id WHERE d.id = $1`, [first.data.drill.id]);
  assert.ok(v.roles.includes('ae'));
  assert.ok(v.personas.includes(s.persona.key));
  assert.deepEqual(s.settings, { difficulty: v.default_difficulty, skepticism: v.default_skepticism, depth: v.default_depth });
  // Asking again serves the same question: skipping never leads to an easier one.
  for (let i = 0; i < 3; i += 1) {
    const again = await ae.post('/api/practice/stages/cold_outreach/draw', {});
    assert.deepEqual([again.data.drill.id, again.data.scenario.persona.key], [first.data.drill.id, s.persona.key]);
  }
  assert.equal((await ae.get('/api/practice/stages')).data.stages.find((x) => x.key === 'cold_outreach').waiting, true);
  // An account manager is served questions written for account managers.
  const forAm = await am.post('/api/practice/stages/am_renewal/draw', {});
  assert.equal(forAm.status, 200);
  assert.equal(forAm.data.scenario.repRole, 'am');
  assert.equal((await ae.post('/api/practice/stages/no_such_stage/draw', {})).status, 404);
});

test('answering the served question opens a conversation that comes back until it is finished', async () => {
  const drawn = (await ae.post('/api/practice/stages/cold_outreach/draw', {})).data;
  const created = await ae.post('/api/practice/attempts', {
    clientRequestId: randomUUID(),
    drillId: drawn.drill.id,
    drillVersionId: drawn.drill.versionId,
    persona: drawn.scenario.persona.key,
    // Levels a rep sends are ignored: the question sets them.
    difficulty: 5,
    skepticism: 5,
    depth: 5,
    mode: 'coached',
    answer: 'Hi, this is Ava. This is a sales call, so I will be brief: may I take thirty seconds to say why I called?',
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.deepEqual(created.data.attempt.settings, drawn.scenario.settings);
  assert.equal(await h.db.one(`SELECT 1 FROM practice_draws WHERE drill_id = $1`, [drawn.drill.id]), null, 'answering settles the question');
  await waitForCoaching(ae, created.data.attempt.id);
  // Until the conversation is finished, the stage brings it back instead of a new question.
  const resumed = await ae.post('/api/practice/stages/cold_outreach/draw', {});
  assert.equal(resumed.data.resumeAttemptId, created.data.attempt.id);
  assert.equal((await ae.get('/api/practice/stages')).data.stages.find((x) => x.key === 'cold_outreach').openAttemptId, created.data.attempt.id);
  await finishConversation(ae, created.data.attempt.id);
  const next = await ae.post('/api/practice/stages/cold_outreach/draw', {});
  assert.equal(next.data.resumeAttemptId, undefined);
  assert.notEqual(next.data.drill.id, drawn.drill.id, 'questions not answered yet come first');
});

test('each reply is coached, then the buyer pushes back from what the rep said; replies are ranked', async () => {
  const d = await drillBySlug(h, 'ravenly-cold-reason');
  const v = await h.db.one(`SELECT default_difficulty FROM drill_versions WHERE id = $1`, [d.version_id]);
  assert.equal(v.default_difficulty, 3, 'two pushbacks at difficulty 3');
  h.provider.behavior = 'hold';
  const r1 = await submit(ae, d, 'Fair question. We help firms make sure no inquiry goes unanswered. What happens today when a form comes in at 8 p.m.?');
  assert.equal(r1.status, 201);
  assert.equal(r1.data.conversation.repliesPlanned, 3);
  assert.equal(r1.data.conversation.next.state, 'waiting');
  const early = await reply(ae, r1.data.attempt.id, 'Replying before the buyer has spoken again should not work.');
  assert.equal(early.status, 409);
  assert.equal(early.data.error.code, 'coaching_pending');
  h.provider.behavior = null;
  h.provider.release();
  const coached1 = await waitForCoaching(ae, r1.data.attempt.id);
  assert.equal(coached1.conversation.next.state, 'reply');
  assert.match(coached1.conversation.next.buyerLine, /^Mock pushback after reply 1/);
  assert.match(h.provider.requests.at(-1).user, /this is reply 1 of 3/);

  const r2 = await reply(ae, r1.data.attempt.id, 'Understood. Most firms we talk to are not sure either. Could we look at last month’s inquiries together on Thursday?');
  assert.equal(r2.status, 201, JSON.stringify(r2.data));
  const a2 = r2.data.attempt;
  assert.deepEqual([a2.turn, a2.conversationId, a2.coachedNumber, a2.attemptNumber], [2, r1.data.attempt.id, null, r1.data.attempt.attemptNumber]);
  assert.equal(a2.scenario.buyerLine, coached1.conversation.next.buyerLine, 'the reply answers the buyer’s pushback');
  assert.equal(a2.scenario.conversation.history[0].answer, r1.data.attempt.answer);
  const coached2 = await waitForCoaching(ae, a2.id);
  const prompt2 = h.provider.requests.at(-1).user;
  assert.match(prompt2, /this is reply 2 of 3/);
  assert.match(prompt2, /<conversation>\nTurn 1\nThe buyer said: /);
  assert.match(prompt2, /The buyer now says/);
  // One reply per pushback, by the rep only.
  const twice = await reply(ae, r1.data.attempt.id, 'A second reply to the same pushback should not be saved.');
  assert.equal(twice.status, 409);
  assert.equal(twice.data.error.code, 'already_replied');
  assert.equal((await reply(other, a2.id, 'Someone else cannot continue this conversation.')).status, 404);
  assert.equal((await reply(owner, a2.id, 'A manager cannot reply for the rep either, even with access.')).status, 404);

  const r3 = await reply(ae, coached2.conversation.next.afterAttemptId, 'That makes sense. Who else would weigh in, and could we book twenty minutes with both of you next Tuesday?');
  assert.equal(r3.status, 201);
  const last = await waitForCoaching(ae, r3.data.attempt.id);
  assert.match(h.provider.requests.at(-1).user, /this is the rep’s last reply/);
  assert.match(last.evaluation.feedback.buyerReaction, /^Mock closing response after reply 3/);
  const conv = last.conversation;
  assert.equal(conv.next.state, 'finished');
  assert.equal(conv.turns.length, 3);
  const scores = conv.turns.map((t) => t.score);
  assert.equal(conv.score, Math.round((scores[0] + scores[1] + scores[2]) / 3));
  assert.deepEqual(
    conv.ranked.map((x) => x.score),
    [...scores].sort((x, y) => y - x),
    'replies from strongest to weakest',
  );
  assert.equal((await reply(ae, r3.data.attempt.id, 'The conversation is over, so this is refused.')).status, 409);
  // The history lists one entry for the conversation, with its score.
  const list = (await ae.get(`/api/practice/attempts?drillId=${d.id}`)).data.attempts;
  assert.equal(list.length, 1);
  assert.deepEqual([list[0].conversation_state, list[0].conversation_score, list[0].replies_done], ['scored', conv.score, 3]);
  // The buyer's written pushbacks are part of the answer key: managers see them, reps do not.
  const asRep = (await ae.get(`/api/practice/attempts/${r1.data.attempt.id}`)).data.attempt.scenario;
  const asManager = (await owner.get(`/api/practice/attempts/${r1.data.attempt.id}`)).data.attempt.scenario;
  assert.equal(asRep.pushbacks, undefined);
  assert.ok(Array.isArray(asManager.pushbacks));
});

test('without coaching, the buyer pushes back with the question’s written pushbacks', async () => {
  const made = await owner.post(
    '/api/drills',
    drillBody({ title: 'Unscored conversation', pushbacks: ['“What would that cost us?”', '“My partner will say no.”'], sourceRefs: [] }),
  );
  assert.equal(made.status, 201, JSON.stringify(made.data));
  const id = made.data.id;
  const { current_version_id: versionId } = await h.db.one(`SELECT current_version_id FROM drills WHERE id = $1`, [id]);
  const drill = { id, version_id: versionId, personas: ['managing_partner'] };
  const first = await submit(ae, drill, 'Before I send anything, what would you need to see to decide by Friday?', { mode: 'unscored' });
  assert.equal(first.status, 201, JSON.stringify(first.data));
  assert.equal(first.data.conversation.repliesPlanned, 3);
  assert.deepEqual(first.data.conversation.next, { state: 'reply', afterAttemptId: first.data.attempt.id, buyerLine: '“What would that cost us?”' });
  const second = await reply(ae, first.data.attempt.id, 'Fair. What does a missed case cost you today, roughly?', 'unscored');
  assert.equal(second.status, 201);
  assert.equal(second.data.conversation.next.buyerLine, '“My partner will say no.”');
  const third = await reply(ae, second.data.attempt.id, 'Then let us include your partner. Could the three of us meet Thursday?', 'unscored');
  assert.equal(third.data.conversation.next.state, 'finished');
  assert.equal(third.data.conversation.scoreState, 'unscored');
  // A question without written pushbacks is a single answer when coaching is off.
  const plain = await owner.post('/api/drills', drillBody({ title: 'No pushbacks', sourceRefs: [] }));
  const p = await h.db.one(`SELECT current_version_id FROM drills WHERE id = $1`, [plain.data.id]);
  const single = await submit(ae, { id: plain.data.id, version_id: p.current_version_id, personas: ['managing_partner'] }, 'What would make this an easy yes for you?', { mode: 'unscored' });
  assert.equal(single.data.conversation.repliesPlanned, 1);
  assert.equal(single.data.conversation.next.state, 'finished');
});

test('what a good answer does is written for the rep’s role', async () => {
  const objections = await sectionBy(h, 'sales-playbook', '6. Objections');
  const made = await owner.post(
    '/api/drills',
    drillBody({
      title: 'Both roles',
      stage: 'pricing',
      roles: ['ae', 'am'],
      roleGuidance: { ae: '- Earns a first commitment from a new firm.', am: '- Protects the existing account and its renewal.' },
      pushbacks: ['“Still too much.”'],
      sourceRefs: [{ sourceId: objections.id, sections: [], wholeSource: true }],
    }),
  );
  assert.equal(made.status, 201, JSON.stringify(made.data));
  const shown = (await owner.get(`/api/drills/${made.data.id}`)).data.drill;
  assert.deepEqual(shown.roleGuidance, { ae: '- Earns a first commitment from a new firm.', am: '- Protects the existing account and its renewal.' });
  assert.deepEqual(shown.pushbacks, ['“Still too much.”']);
  const { current_version_id: versionId } = await h.db.one(`SELECT current_version_id FROM drills WHERE id = $1`, [made.data.id]);
  const drill = { id: made.data.id, version_id: versionId, personas: ['managing_partner'] };
  const asAe = await submit(ae, drill, 'I hear you on price. What would it be worth to answer every inquiry within minutes?');
  const asAm = await submit(am, drill, 'I hear you on price. Let us look at what your team used this year before we talk numbers.');
  const g = (x) => x.data.attempt.scenario.goodLooksLike;
  assert.match(g(asAe), /For an account executive:\n- Earns a first commitment/);
  assert.doesNotMatch(g(asAe), /Protects the existing account/);
  assert.match(g(asAm), /For an account manager:\n- Protects the existing account/);
  assert.equal(asAm.data.attempt.scenario.repRole, 'am');
  // The coach is told who is answering.
  const request = buildCoachingRequest({ scenario: asAm.data.attempt.scenario, answer: 'An answer.', sources: [] });
  assert.match(request.user, /The rep: Account manager: looks after an existing client/);
  // Role expectations for a role the drill is not for are dropped.
  const trimmed = await owner.put(`/api/drills/${made.data.id}`, drillBody({ title: 'Both roles', stage: 'pricing', roles: ['ae'], roleGuidance: { am: '- Not for this drill.' }, sourceRefs: [] }));
  assert.equal(trimmed.status, 200);
  assert.deepEqual((await owner.get(`/api/drills/${made.data.id}`)).data.drill.roleGuidance, {});
});

test('an assigned exercise is complete when its conversation is', async () => {
  const d = await drillBySlug(h, 'just-looking');
  const assigned = await owner.post('/api/assignments', {
    learnerIds: [(await h.db.one(`SELECT id FROM users WHERE email = 'oli@omnizant.com'`)).id],
    title: 'Conversation exercise',
    items: [{ drillId: d.id, persona: d.personas[0], difficulty: 2, skepticism: 2, depth: 1 }],
  });
  assert.equal(assigned.status, 201, JSON.stringify(assigned.data));
  const item = (await other.get('/api/curriculum/mine')).data.active[0].items[0];
  const first = await other.post('/api/practice/attempts', { clientRequestId: randomUUID(), assignmentItemId: item.id, mode: 'coached', answer: 'Totally fair. What made you start looking this week?' });
  assert.equal(first.status, 201);
  await waitForCoaching(other, first.data.attempt.id);
  let mine = (await other.get('/api/curriculum/mine')).data.active[0].items[0];
  assert.equal(mine.state, 'available');
  assert.deepEqual(mine.lastAttempt.replies, { done: 1, planned: 2 });
  await finishConversation(other, first.data.attempt.id);
  mine = (await other.get('/api/curriculum/mine')).data;
  assert.equal(mine.active.length, 0);
  const done = mine.completed[0].items[0];
  assert.equal(done.completedAttemptId, first.data.attempt.id);
  assert.equal(typeof done.proficiency.score, 'number');
});

test('reports count a finished conversation once, averaging its replies', async () => {
  const report = await owner.get(`/api/reports/rep/${(await h.db.one(`SELECT id FROM users WHERE email = 'ava@omnizant.com'`)).id}?period=7`);
  assert.equal(report.status, 200);
  const rows = report.data.attempts;
  assert.ok(rows.every((r) => r.replies >= 1 && r.repliesPlanned >= r.replies));
  const conv = rows.find((r) => r.drillTitle === 'Give a 20-second reason to talk');
  assert.ok(conv, 'the conversation is one row');
  assert.equal(conv.replies, 3);
  const view = (await ae.get(`/api/practice/attempts/${conv.id}`)).data.conversation;
  assert.equal(conv.overallScore, view.score);
  assert.equal(conv.firstAttemptScored, true);
  const e = report.data.reps[0].engagement;
  assert.ok(e.replies > e.submitted, 'replies include the pushbacks answered');
});

test('the conversation is shown on every reply’s page', async () => {
  const d = await drillBySlug(h, 'send-me-information');
  const first = await submit(other, d, 'Happy to send it. So I send the right thing, may I ask two quick questions first?');
  await waitForCoaching(other, first.data.attempt.id);
  const second = await reply(other, first.data.attempt.id, 'Thanks. What prompted you to look into this now, and who else would read it?');
  const view1 = (await other.get(`/api/practice/attempts/${first.data.attempt.id}`)).data.conversation;
  assert.equal(view1.isLatest, false);
  assert.equal(view1.latestAttemptId, second.data.attempt.id);
  assert.deepEqual(view1.turns.map((t) => t.turn), [1, 2]);
  await waitFor(async () => (await other.get(`/api/practice/attempts/${second.data.attempt.id}`)).data.evaluation);
});
