// Trying a question again from the Practice Studio: the list of answered questions and the retry itself.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { addUser, drillBySlug, finishConversation, GOOD_ANSWER, ownerClient, startTestApp, submitConversation, waitForCoaching } from '../helpers.js';

let h;
let owner;
let rep;
let drill;
let persona;
before(async () => {
  h = await startTestApp({ dbName: 'saleslab_test_try_again' });
  owner = await ownerClient(h);
  ({ client: rep } = await addUser(h, owner, { name: 'Tia Again', email: 'tia@ravenly.com', role: 'ae' }));
  drill = await drillBySlug(h, 'price-ravenly-over-allowance');
  persona = drill.personas[0];
});
after(() => h.close());

const answered = async (query = '') => (await rep.get(`/api/practice/answered${query}`)).data.questions;

test('answered questions list one entry per question and buyer, with the latest result and the best score', async () => {
  assert.deepEqual(await answered(), []);
  const first = await submitConversation(rep, drill, GOOD_ANSWER, { persona });
  assert.equal(first.last.conversation.next.state, 'finished');
  let [item, ...rest] = await answered();
  assert.equal(rest.length, 0);
  assert.equal(item.drillId, drill.id);
  assert.equal(item.persona.key, persona);
  assert.match(item.persona.label, /\w/);
  assert.equal(item.stage, 'pricing');
  assert.equal(item.conversations, 1);
  assert.equal(item.last.state, 'scored');
  assert.equal(item.best, item.last.score);
  assert.equal(item.openAttemptId, null);

  // Trying it again needs no stage draw: the rep answered it before with this buyer.
  assert.equal((await h.db.one(`SELECT count(*)::int AS n FROM practice_draws WHERE drill_id = $1`, [drill.id])).n, 0);
  const preview = await rep.post('/api/practice/preview', { drillId: drill.id, persona });
  assert.equal(preview.status, 200, JSON.stringify(preview.data));
  assert.equal(preview.data.scenario.persona.key, persona);
  const again = await rep.post('/api/practice/attempts', { clientRequestId: randomUUID(), drillId: drill.id, persona, mode: 'coached', answer: GOOD_ANSWER });
  assert.equal(again.status, 201, JSON.stringify(again.data));
  await waitForCoaching(rep, again.data.attempt.id);

  // While the new conversation is open, the list offers to continue it.
  [item] = await answered();
  assert.equal(item.conversations, 2);
  assert.equal(item.last.state, 'unfinished');
  assert.equal(item.openAttemptId, again.data.attempt.id);
  assert.equal(typeof first.last.conversation.score, 'number');
  assert.equal(item.best, first.last.conversation.score, 'the best is the finished conversation’s score');

  // Once it is finished, both conversations count toward the best score.
  const done = await finishConversation(rep, again.data.attempt.id);
  assert.equal(done.conversation.next.state, 'finished');
  [item] = await answered();
  assert.equal(item.openAttemptId, null);
  assert.equal(item.last.state, 'scored');
  const scores = await h.db.many(
    `SELECT a.conversation_id, round(avg(e.overall_score))::int AS score FROM attempts a JOIN evaluations e ON e.id = a.evaluation_id
      WHERE a.drill_id = $1 GROUP BY a.conversation_id`,
    [drill.id],
  );
  assert.equal(item.best, Math.max(...scores.map((s) => s.score)));
});

test('the list narrows by product and buyer, refuses unknown filters, and drops questions that cannot be practiced', async () => {
  const product = (await h.db.one(`SELECT product_line FROM drill_versions WHERE id = $1`, [drill.version_id])).product_line;
  assert.equal((await answered(`?product=${product}`)).length, 1);
  assert.equal((await answered(`?product=${product === 'general' ? 'ravenly' : 'general'}`)).length, 0);
  assert.equal((await answered(`?persona=${persona}`)).length, 1);
  const other = (await h.db.one(`SELECT key FROM personas WHERE key <> $1 ORDER BY key LIMIT 1`, [persona])).key;
  assert.equal((await answered(`?persona=${other}`)).length, 0);
  assert.equal((await rep.get('/api/practice/answered?product=nothing')).status, 400);
  assert.equal((await rep.get('/api/practice/answered?persona=nobody')).status, 400);

  // An archived question cannot be practiced again, so it leaves the list until it is restored.
  await h.db.query(`UPDATE drills SET status = 'archived' WHERE id = $1`, [drill.id]);
  assert.equal((await answered()).length, 0);
  await h.db.query(`UPDATE drills SET status = 'active' WHERE id = $1`, [drill.id]);
  assert.equal((await answered()).length, 1);

  // Each person sees only their own answers.
  const { client: other_rep } = await addUser(h, owner, { name: 'Uma Other', email: 'uma@ravenly.com', role: 'ae' });
  assert.deepEqual((await other_rep.get('/api/practice/answered')).data.questions, []);
});
