// Practice conversations as numbers: how many replies, what a conversation scores, and how reports
// roll replies up into conversations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushbacksFor } from '../../server/domain.js';
import { continueScenario, expectationsFor, practiceRole, repliesPlanned, scenarioFor, previewOf } from '../../server/practice/scenario.js';
import { conversationScore, conversationView } from '../../server/practice/conversation.js';
import { toConversationRows, isCounted, isFirstScored, performanceFor, engagementFor } from '../../server/reports/metrics.js';
import { BANK_QUESTIONS } from '../../server/seed/bank/index.js';
import { validateBank } from '../../server/seed/bank/validate.js';

test('the buyer pushes back once at easy levels, twice at standard, three times at hard ones', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(pushbacksFor), [1, 1, 2, 3, 3]);
  assert.equal(repliesPlanned({ difficulty: 4, coached: true, pushbacks: [] }), 4, 'coaching writes the pushbacks');
  assert.equal(repliesPlanned({ difficulty: 4, coached: false, pushbacks: ['“a”', '“b”'] }), 3, 'without coaching, only the written ones');
  assert.equal(repliesPlanned({ difficulty: 1, coached: false, pushbacks: [] }), 1);
});

test('a rep answers as their own role; managers answer as the role the stage trains', () => {
  const drill = { roles: ['ae', 'am'], stage: 'am_renewal' };
  assert.equal(practiceRole({ role: 'ae' }, drill), 'ae');
  assert.equal(practiceRole({ role: 'manager' }, drill), 'am');
  assert.equal(practiceRole({ role: 'ae' }, { roles: ['am'], stage: 'am_value' }), 'am');
  const d = { good_looks_like: '- Shared.', role_guidance: { am: '- Protect the account.' } };
  assert.equal(expectationsFor(d, 'ae'), '- Shared.');
  assert.equal(expectationsFor(d, 'am'), '- Shared.\n\nFor an account manager:\n- Protect the account.');
});

test('the next reply’s scenario carries the conversation; reps never see the written pushbacks', () => {
  const s = { buyerLine: '“Too much.”', pushbacks: ['“x”'], goodLooksLike: '- g', conversation: { turn: 1, replies: 3, history: [] } };
  const next = continueScenario(s, { buyerLine: '“Still too much.”', previousAnswer: 'What would it be worth?' });
  assert.equal(next.buyerLine, '“Still too much.”');
  assert.deepEqual(next.conversation, { turn: 2, replies: 3, history: [{ turn: 1, buyerLine: '“Too much.”', answer: 'What would it be worth?' }] });
  assert.equal(scenarioFor({ isManager: false }, next).pushbacks, undefined);
  assert.deepEqual(scenarioFor({ isManager: true }, next).pushbacks, ['“x”']);
  assert.equal(previewOf(s).pushbacks, undefined);
  assert.equal(previewOf(s).goodLooksLike, undefined);
});

const reply = (turn, fields = {}) => ({ id: `r${turn}`, turn_number: turn, mode: 'coached', evaluation_id: `e${turn}`, overall_score: 70, review_status: 'final', ...fields });

test('a conversation scores the average of its replies once all are in and their coaching counts', () => {
  assert.deepEqual(conversationScore([reply(1, { overall_score: 80 }), reply(2, { overall_score: 61 })], 2), { state: 'scored', score: 71 });
  assert.equal(conversationScore([reply(1)], 3).state, 'unfinished');
  assert.equal(conversationScore([reply(1), reply(2, { evaluation_id: null, overall_score: null })], 2).state, 'awaiting_coaching');
  assert.equal(conversationScore([reply(1), reply(2, { overall_score: null, review_status: 'provisional' })], 2).state, 'pending_review');
  assert.equal(conversationScore([reply(1), reply(2, { review_status: 'disputed' })], 2).state, 'disputed');
  assert.equal(conversationScore([reply(1, { overall_score: 0, review_status: 'confirmed' }), reply(2, { overall_score: 90 })], 2).score, 45, 'a confirmed critical failure scores that reply 0');
  assert.equal(conversationScore([{ ...reply(1), mode: 'unscored' }], 1).state, 'unscored');
});

test('the conversation view ranks replies and says what comes next', () => {
  const turns = [reply(1, { overall_score: 62, buyer_reaction: '“Push 1”' }), reply(2, { overall_score: 85, buyer_reaction: '“Push 2”' })];
  const mid = conversationView(turns, { current: { id: 'r2', conversation_id: 'r1', turn_number: 2, replies_planned: 3 }, pushbacks: [] });
  assert.deepEqual(mid.next, { state: 'reply', afterAttemptId: 'r2', buyerLine: '“Push 2”' });
  assert.deepEqual(mid.ranked.map((r) => r.turn), [2, 1]);
  assert.equal(mid.score, null);
  const waiting = conversationView([reply(1, { evaluation_id: null, run_status: 'running' })], { current: { id: 'r1', conversation_id: 'r1', turn_number: 1, replies_planned: 2 } });
  assert.equal(waiting.next.state, 'waiting');
  const stopped = conversationView([reply(1, { evaluation_id: null, run_status: 'failed' })], { current: { id: 'r1', conversation_id: 'r1', turn_number: 1, replies_planned: 2 } });
  assert.equal(stopped.next.state, 'coaching_stopped');
  const unscored = conversationView([{ ...reply(1), mode: 'unscored', evaluation_id: null }], { current: { id: 'r1', conversation_id: 'r1', turn_number: 1, replies_planned: 2 }, pushbacks: ['“Written one”'] });
  assert.equal(unscored.next.buyerLine, '“Written one”');
});

const row = (fields) => ({
  learner_id: 'u1',
  drill_id: 'd1',
  persona: 'managing_partner',
  mode: 'coached',
  day: '2026-10-26',
  difficulty: 3,
  skepticism: 3,
  depth: 3,
  coached_number: 1,
  proficiency_threshold: 70,
  dimension_scores: [
    { key: 'persuasion', assessed: true, score: 60, weight: 25, label: 'P' },
    { key: 'discovery', assessed: false, weight: 10, label: 'D' },
  ],
  critical_failures: [],
  ...fields,
});

test('reports roll replies up into conversations', () => {
  const rows = toConversationRows([
    row({ id: 'a', conversation_id: 'a', turn_number: 1, replies_planned: 2, evaluation_id: 'e1', overall_score: 60, review_status: 'final' }),
    row({
      id: 'b',
      conversation_id: 'a',
      turn_number: 2,
      replies_planned: 2,
      coached_number: null,
      evaluation_id: 'e2',
      overall_score: 90,
      review_status: 'confirmed',
      dimension_scores: [{ key: 'persuasion', assessed: true, score: 90, weight: 25, label: 'P' }],
    }),
    // Unfinished: one reply of three.
    row({ id: 'c', conversation_id: 'c', turn_number: 1, replies_planned: 3, evaluation_id: 'e3', overall_score: 88, review_status: 'final', drill_id: 'd2' }),
    // A later reply whose conversation started outside the selection is left out.
    row({ id: 'z', conversation_id: 'y', turn_number: 2, replies_planned: 2, evaluation_id: 'e9', overall_score: 10, review_status: 'final' }),
  ]);
  assert.equal(rows.length, 2);
  const [done, open] = rows;
  assert.deepEqual([done.overall_score, done.replies, done.review_status, done.meets_target], [75, 2, 'confirmed', true]);
  assert.equal(done.dimension_scores.find((d) => d.key === 'persuasion').score, 75);
  assert.equal(done.dimension_scores.find((d) => d.key === 'discovery').assessed, false);
  assert.ok(isFirstScored(done));
  assert.equal(open.unfinished, true);
  assert.equal(open.evaluation_id, null);
  assert.ok(!isCounted(open), 'an unfinished conversation does not count yet');
  const perf = performanceFor(rows);
  assert.deepEqual([perf.scoredFirstAttempts, perf.firstAttemptAverage, perf.excluded.unfinished, perf.excluded.awaitingCoaching], [1, 75, 1, 0]);
  assert.deepEqual([engagementFor(rows).submitted, engagementFor(rows).replies], [2, 3]);
  // One disputed reply leaves the conversation out of averages; a pending one waits.
  const disputed = toConversationRows([
    row({ id: 'p', conversation_id: 'p', turn_number: 1, replies_planned: 2, evaluation_id: 'e1', overall_score: 60, review_status: 'final' }),
    row({ id: 'q', conversation_id: 'p', turn_number: 2, replies_planned: 2, coached_number: null, evaluation_id: 'e2', overall_score: 90, review_status: 'disputed' }),
  ])[0];
  assert.equal(disputed.review_status, 'disputed');
  const pending = toConversationRows([
    row({ id: 'p', conversation_id: 'p', turn_number: 1, replies_planned: 2, evaluation_id: 'e1', overall_score: 60, review_status: 'final' }),
    row({ id: 'q', conversation_id: 'p', turn_number: 2, replies_planned: 2, coached_number: null, evaluation_id: 'e2', overall_score: null, review_status: 'provisional', critical_failures: [{ status: 'pending' }] }),
  ])[0];
  assert.deepEqual([pending.review_status, pending.overall_score], ['provisional', null]);
  // A single-reply conversation reads exactly like an answer did before.
  const single = toConversationRows([row({ id: 's', conversation_id: 's', turn_number: 1, replies_planned: 1, evaluation_id: 'e', overall_score: 0, review_status: 'confirmed', critical_failures: [{ status: 'confirmed' }] })])[0];
  assert.deepEqual([single.overall_score, single.meets_target], [0, false]);
});

test('the question bank passes its checks', () => {
  const { problems, summary } = validateBank();
  assert.deepEqual(problems, []);
  for (const [stage, s] of Object.entries(summary)) assert.ok(s.total >= 12, `${stage} has ${s.total} questions`);
  assert.ok(BANK_QUESTIONS.length >= 90);
});
