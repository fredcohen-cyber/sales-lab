// The question bank: ideal answers proposed by the AI and approved by a manager, and deleting questions.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { addUser, drillBySlug, finishConversation, GOOD_ANSWER, ownerClient, sectionBy, startTestApp, submit, waitForCoaching } from '../helpers.js';

let h;
let owner;
let rep;
let objections;
before(async () => {
  h = await startTestApp({ dbName: 'saleslab_test_question_bank' });
  owner = await ownerClient(h);
  ({ client: rep } = await addUser(h, owner, { name: 'Quinn Bank', email: 'quinn@ravenly.com', role: 'ae' }));
  objections = await sectionBy(h, 'sales-playbook', '6. Objections');
});
after(() => h.close());

const draft = (fields = {}) => ({
  title: 'Managing partner says the price is too high',
  brand: 'both',
  subject: 'sales_technique',
  stage: 'pricing',
  roles: ['ae'],
  personas: ['managing_partner'],
  situation: 'A managing partner has seen your proposal and is weighing it against doing nothing.',
  buyerLine: '“Honestly, it costs more than I expected.”',
  objective: 'Isolate the real concern and agree on a next step.',
  goodLooksLike: '- Acknowledges the concern.\n- Asks what the price is being compared to.\n- Proposes a specific next step.',
  assessedDimensions: ['objection_handling', 'advancing'],
  defaults: { difficulty: 2, skepticism: 3, depth: 2 },
  sourceRefs: [{ sourceId: objections.id, sections: [], wholeSource: true }],
  ...fields,
});

test('the AI proposes an ideal answer from the approved material, with each fact matched to its source', async () => {
  const r = await owner.post('/api/drills/ideal-answer', draft());
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const p = r.data.proposal;
  assert.match(p.answer, /What would make this an easy yes for you\?/);
  assert.ok(p.approach.length > 5);
  assert.equal(p.claims.length, 1);
  assert.equal(p.claims[0].verified, true, 'the fact is in the answer and in the cited section');
  assert.match(p.claims[0].sourceTitle, /Sales Playbook/);
  assert.deepEqual(p.warnings, []);
  assert.deepEqual(p.persona, { key: 'managing_partner', label: (await h.db.one(`SELECT label FROM personas WHERE key = 'managing_partner'`)).label });
  assert.equal(p.sources.length, 1);
  // The question was not saved, and the request was written from the draft and its sources only.
  assert.equal((await h.db.one(`SELECT count(*)::int AS n FROM drill_versions WHERE title = $1`, [draft().title])).n, 0);
  const sent = h.provider.requests.at(-1);
  assert.equal(sent.tool.name, 'record_ideal_answer');
  assert.match(sent.user, /The buyer says: “Honestly, it costs more than I expected\.”/);
  assert.match(sent.user, /<source_material>\n\[S1\] Sales Playbook/);
  assert.equal((await h.db.one(`SELECT count(*)::int AS n FROM audit_events WHERE action = 'drill.ideal_answer_proposed'`)).n, 1);
});

test('a fact that cannot be matched to the material is flagged for the manager', async () => {
  const r = await owner.post('/api/drills/ideal-answer', draft({ buyerLine: '“How fast do you answer?” [[mock:unmatched]]' }));
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const unmatched = r.data.proposal.claims.filter((c) => !c.verified);
  assert.equal(unmatched.length, 1);
  assert.match(r.data.proposal.warnings[0], /1 fact could not be matched to the approved material/);
  // Without approved material the answer is still proposed, with a warning to check it.
  const bare = await owner.post('/api/drills/ideal-answer', draft({ sourceRefs: [] }));
  assert.equal(bare.status, 200);
  assert.match(bare.data.proposal.warnings[0], /No approved source material is attached/);
});

test('an incomplete proposal is asked for again; failures say what happened; reps cannot ask', async () => {
  const again = await owner.post('/api/drills/ideal-answer', draft({ buyerLine: '“Why so much?” [[mock:invalidonce]]' }));
  assert.equal(again.status, 200, JSON.stringify(again.data));
  assert.ok(h.logs.some((l) => /\[ideal\] incomplete proposal/.test(l)));
  const failed = await owner.post('/api/drills/ideal-answer', draft({ buyerLine: '“Why so much?” [[mock:fail]]' }));
  assert.equal(failed.status, 503);
  assert.equal(failed.data.error.message, 'The AI service is busy or unavailable. Try again in a minute.');
  const missing = await owner.post('/api/drills/ideal-answer', draft({ situation: '' }));
  assert.equal(missing.status, 400);
  assert.equal((await rep.post('/api/drills/ideal-answer', draft())).status, 403);
});

let drillId;
test('a manager saves a reviewed ideal answer; approval records who approved it and carries over unchanged', async () => {
  const proposal = (await owner.post('/api/drills/ideal-answer', draft())).data.proposal;
  const made = await owner.post('/api/drills', {
    ...draft(),
    idealAnswer: { text: proposal.answer, approved: true, origin: 'ai', approach: proposal.approach, claims: proposal.claims, persona: proposal.persona, model: proposal.model },
  });
  assert.equal(made.status, 201, JSON.stringify(made.data));
  drillId = made.data.id;
  let d = (await owner.get(`/api/drills/${drillId}`)).data.drill;
  assert.equal(d.idealAnswer.status, 'approved');
  assert.equal(d.idealAnswer.text, proposal.answer);
  assert.equal(d.idealAnswer.review.approvedByName, 'Fred Cohen');
  assert.equal(d.idealAnswer.review.origin, 'ai');
  assert.equal(d.idealAnswer.review.claims.length, 1);
  const approvedAt = d.idealAnswer.review.approvedAt;
  // The bank lists it with its ideal answer and how often reps answered it.
  const listed = (await owner.get('/api/drills')).data.drills.find((x) => x.id === drillId);
  assert.deepEqual([listed.idealAnswer.status, listed.answers], ['approved', 0]);

  // Editing another field keeps the approval as it was; an editor that does not send it keeps it too.
  const body = { ...draft({ objective: 'Find the real concern, then agree on a dated next step.' }), idealAnswer: { ...d.idealAnswer, ...d.idealAnswer.review, text: d.idealAnswer.text, approved: true } };
  assert.equal((await owner.put(`/api/drills/${drillId}`, body)).status, 200);
  d = (await owner.get(`/api/drills/${drillId}`)).data.drill;
  assert.equal(d.idealAnswer.review.approvedAt, approvedAt);
  assert.equal((await owner.put(`/api/drills/${drillId}`, draft())).status, 200);
  d = (await owner.get(`/api/drills/${drillId}`)).data.drill;
  assert.deepEqual([d.idealAnswer.status, d.idealAnswer.review.approvedAt], ['approved', approvedAt]);

  // Editing the text drops facts that are no longer in it; leaving it unapproved makes it a proposal again.
  const edited = 'I hear you. Before we talk numbers, what are you comparing it to? Could we look at that together on Thursday?';
  assert.equal((await owner.put(`/api/drills/${drillId}`, { ...draft(), idealAnswer: { text: edited, approved: false, origin: 'ai_edited', claims: d.idealAnswer.review.claims } })).status, 200);
  d = (await owner.get(`/api/drills/${drillId}`)).data.drill;
  assert.deepEqual([d.idealAnswer.status, d.idealAnswer.review.claims.length, d.idealAnswer.review.approvedAt], ['proposed', 0, undefined]);
  const tooLong = await owner.put(`/api/drills/${drillId}`, { ...draft(), idealAnswer: { text: 'x'.repeat(3001), approved: true } });
  assert.equal(tooLong.status, 400);
});

test('reps see an approved ideal answer only after answering, and coaching gets it for the first reply', async () => {
  const drill = await h.db.one(`SELECT d.id, v.id AS version_id, v.personas FROM drills d JOIN drill_versions v ON v.id = d.current_version_id WHERE d.id = $1`, [drillId]);
  // Still a proposal: nobody sees it.
  let first = await submit(rep, drill, GOOD_ANSWER);
  assert.equal(first.status, 201, JSON.stringify(first.data));
  await waitForCoaching(rep, first.data.attempt.id);
  assert.equal((await rep.get(`/api/practice/attempts/${first.data.attempt.id}`)).data.attempt.scenario.idealAnswer, null);
  assert.doesNotMatch(h.provider.requests.at(-1).user, /A model answer the manager approved/);
  await finishConversation(rep, first.data.attempt.id);

  // Approved: hidden in the preview, shown with the answer key afterwards, and given to coaching.
  const approved = 'I understand. What are you comparing the price to, so we look at the same thing? Could we go through it on Thursday?';
  assert.equal((await owner.put(`/api/drills/${drillId}`, { ...draft(), idealAnswer: { text: approved, approved: true } })).status, 200);
  const preview = await rep.post('/api/practice/preview', { drillId, persona: 'managing_partner' });
  assert.equal(preview.status, 200, JSON.stringify(preview.data));
  assert.equal(preview.data.scenario.idealAnswer, undefined);
  assert.equal(preview.data.scenario.goodLooksLike, undefined);
  const second = await rep.post('/api/practice/attempts', { clientRequestId: randomUUID(), drillId, persona: 'managing_partner', mode: 'coached', answer: GOOD_ANSWER });
  assert.equal(second.status, 201, JSON.stringify(second.data));
  await waitForCoaching(rep, second.data.attempt.id);
  const seen = (await rep.get(`/api/practice/attempts/${second.data.attempt.id}`)).data.attempt.scenario;
  assert.equal(seen.idealAnswer, approved);
  const coached = h.provider.requests.filter((x) => x.tool.name === 'record_evaluation').at(-1).user;
  assert.match(coached, /A model answer the manager approved/);
  assert.ok(coached.includes(approved));
});

test('deleting a question takes it out of the bank and practice; answers already given stay', async () => {
  // A question nobody answered.
  const fresh = (await owner.post('/api/drills', draft({ title: 'A question to delete' }))).data.id;
  const gone = await owner.del(`/api/drills/${fresh}`);
  assert.deepEqual([gone.status, gone.data.answers], [200, 0]);
  assert.equal((await owner.get(`/api/drills/${fresh}`)).status, 404);
  assert.equal((await owner.put(`/api/drills/${fresh}`, draft())).status, 404);
  assert.equal((await owner.post(`/api/drills/${fresh}/status`, { status: 'active' })).status, 404);
  assert.equal((await owner.post('/api/practice/preview', { drillId: fresh, persona: 'managing_partner' })).status, 404);
  assert.equal((await owner.del(`/api/drills/${fresh}`)).status, 404, 'already deleted');
  assert.ok(!(await owner.get('/api/drills')).data.drills.some((d) => d.id === fresh));
  assert.equal((await owner.get('/api/drills?status=deleted')).status, 400);

  // A question reps answered: its history stays, and it can no longer be practiced or assigned.
  const answered = await h.db.one(`SELECT id FROM attempts WHERE drill_id = $1 AND learner_id = (SELECT id FROM users WHERE email = 'quinn@ravenly.com') ORDER BY submitted_at LIMIT 1`, [drillId]);
  await h.db.query(`INSERT INTO practice_draws (learner_id, stage, drill_id, persona) SELECT id, 'closing', $1, 'managing_partner' FROM users WHERE email = 'quinn@ravenly.com' ON CONFLICT DO NOTHING`, [drillId]);
  const del = await owner.del(`/api/drills/${drillId}`);
  assert.equal(del.status, 200);
  assert.ok(del.data.answers >= 2);
  assert.equal((await h.db.one(`SELECT count(*)::int AS n FROM practice_draws WHERE drill_id = $1`, [drillId])).n, 0);
  assert.equal((await rep.get(`/api/practice/attempts/${answered.id}`)).status, 200, 'the rep keeps the answer');
  assert.ok(!(await rep.get('/api/practice/answered')).data.questions.some((q) => q.drillId === drillId), 'not offered to try again');
  const quinn = (await h.db.one(`SELECT id FROM users WHERE email = 'quinn@ravenly.com'`)).id;
  const assign = await owner.post('/api/assignments', { learnerIds: [quinn], title: 'Deleted', items: [{ drillId, persona: 'managing_partner', difficulty: 2, skepticism: 2, depth: 1 }] });
  assert.equal(assign.status, 400);
  const event = await h.db.one(`SELECT details FROM audit_events WHERE action = 'drill.deleted' AND entity_id = $1`, [drillId]);
  assert.equal(event.details.title, draft().title);
  // The material it used no longer lists it.
  const usedBy = (await owner.get(`/api/knowledge/${objections.id}`)).data.source.usedBy;
  assert.ok(Array.isArray(usedBy));
  assert.ok(!usedBy.some((d) => d.id === drillId), 'not listed as using the section');
  // Other questions are unaffected.
  assert.equal((await owner.get(`/api/drills/${(await drillBySlug(h, 'just-looking')).id}`)).status, 200);
});
