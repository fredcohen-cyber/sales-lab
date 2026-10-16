// Rules added after the independent reviews: strict quotes, no score coercion, manager decisions,
// like-for-like improvement, and source relevance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReviewDecisions, isNegatedGuarantee, processEvaluation } from '../../server/ai/scoring.js';
import { DEFAULT_DIMENSIONS } from '../../server/domain.js';
import { quoteAppearsIn } from '../../server/lib/text.js';
import { retryImprovement, trendByWeek } from '../../server/reports/metrics.js';
import { sourceFit } from '../../server/knowledge/service.js';

test('quotes cannot be stitched together from scattered words', () => {
  const answer = 'We do not have a native Clio connector yet, but our Zapier route works. I can’t guarantee you’ll sign more cases.';
  const source = 'Clio integration: Ravenly does not establish a native two-way connector with Clio today.';
  assert.ok(!quoteAppearsIn('We do ... have a native Clio connector', answer, { strict: true }));
  assert.ok(quoteAppearsIn('We do not have a native Clio connector', answer, { strict: true }));
  assert.ok(!quoteAppearsIn('Clio ... does not establish a native ... connector', source, { strict: true }));
  assert.ok(!quoteAppearsIn('I ... guarantee ... sign more cases', answer, { strict: true }));
  assert.ok(!quoteAppearsIn('can', 'we cannot do that'), 'whole words only');
  assert.ok(quoteAppearsIn('a risk free trial', 'Start a risk-free trial today.'));
  assert.ok(isNegatedGuarantee('I can’t guarantee you’ll sign more cases.'));
  assert.ok(!isNegatedGuarantee('I guarantee you will sign more cases.'));
});

const scenario = { assessedDimensions: DEFAULT_DIMENSIONS.filter((d) => ['discovery', 'advancing'].includes(d.key)) };
const answer = 'What happens today when an inquiry comes in at 8 p.m.? Can we look at last month together on Thursday?';
const output = (scores) => ({
  summary: 's',
  dimensions: [
    { key: 'discovery', score: scores[0], rationale: 'r', evidence: [] },
    { key: 'advancing', score: scores[1], rationale: 'r', evidence: [] },
  ],
  strengths: [],
  improvements: [],
  claims: [],
  critical_failures: [],
  stronger_example: 'Better.',
  buyer_reaction: 'Okay.',
  next_focus: { dimension: 'discovery', suggestion: 'x' },
});

test('a missing or non-numeric score fails the run instead of becoming zero', () => {
  for (const bad of [null, '', 'eighty', true]) {
    assert.throws(
      () => processEvaluation({ output: output([bad, 80]), scenario, answer, sources: [], rubricDimensions: DEFAULT_DIMENSIONS, threshold: 70 }),
      (e) => e.code === 'invalid_response',
      `score ${JSON.stringify(bad)}`,
    );
  }
  const ok = processEvaluation({ output: output([80.4, 70]), scenario, answer, sources: [], rubricDimensions: DEFAULT_DIMENSIONS, threshold: 70 });
  assert.equal(ok.dimensionScores.find((d) => d.key === 'discovery').score, 80);
});

test('manager decisions: confirm, reject, promote a flag, and add a failure', () => {
  const ev = {
    weighted_score: 74,
    critical_failures: [{ id: 'cf1', type: 'unauthorized_guarantee', claimQuote: 'x', status: 'pending', origin: 'coach' }],
    review_flags: [
      { id: 'f1', kind: 'possible_guarantee', claimQuote: 'Can we look at last month together', status: 'open' },
      { id: 'f2', kind: 'unsupported', claimQuote: 'inquiry comes in at 8 p.m.', status: 'open' },
    ],
  };
  const opts = { answer, threshold: 70, reviewerName: 'Fred' };
  const undecided = applyReviewDecisions(ev, {}, opts);
  assert.equal(undecided.unresolved, 3);
  const rejectAll = applyReviewDecisions(ev, { criticalFailures: { cf1: 'reject' }, flags: { f1: 'dismiss', f2: 'dismiss' } }, opts);
  assert.equal(rejectAll.unresolved, 0);
  assert.equal(rejectAll.overallScore, 74);
  assert.equal(rejectAll.meetsTarget, true);
  const promote = applyReviewDecisions(ev, { criticalFailures: { cf1: 'reject' }, flags: { f1: 'critical', f2: 'dismiss' } }, opts);
  assert.equal(promote.overallScore, 0);
  assert.equal(promote.meetsTarget, false);
  const made = promote.criticalFailures.find((c) => c.fromFlag === 'f1');
  assert.equal(made.type, 'unauthorized_guarantee');
  assert.equal(made.status, 'confirmed');
  const added = applyReviewDecisions(
    ev,
    { criticalFailures: { cf1: 'reject' }, flags: { f1: 'dismiss', f2: 'dismiss' }, added: [{ type: 'invented_capability', claimQuote: 'not in the answer', explanation: 'e' }] },
    opts,
  );
  assert.equal(added.problems.length, 1, 'an added failure must quote the answer');
});

const row = (o) => ({
  mode: 'coached',
  evaluation_id: 'e',
  review_status: 'final',
  learner_id: 'L',
  drill_id: o.drill || 'D',
  persona: 'p',
  stage: o.stage || 'pricing',
  subject: o.subject || 'product',
  difficulty: o.difficulty ?? 3,
  skepticism: o.skepticism ?? 3,
  depth: o.depth ?? 3,
  coached_number: o.n ?? 1,
  overall_score: o.score,
  day: o.day,
});

test('retries at easier settings are not counted as improvement', () => {
  const first = row({ score: 60, difficulty: 4 });
  const harder = row({ score: 70, n: 2, difficulty: 5 });
  const easier = row({ score: 95, n: 3, difficulty: 1 });
  const r = retryImprovement([first, harder, easier]);
  assert.equal(r.exercises, 1);
  assert.equal(r.averageGain, 10, 'only the same-or-harder retry counts');
  assert.equal(r.easierRetriesExcluded, 1);
});

test('the trend separates like-for-like change from a different mix of drills', () => {
  const weekA = ['2026-09-28', '2026-09-29', '2026-09-30'].map((day, i) => row({ day, drill: `d${i}`, score: 60, difficulty: 4, subject: 'product' }));
  // Week B: same kind of drill at the same difficulty scores the same; easy technique drills inflate the average.
  const weekB = [
    row({ day: '2026-10-05', drill: 'd0', score: 60, difficulty: 4, subject: 'product' }),
    row({ day: '2026-10-06', drill: 'x1', score: 95, difficulty: 1, subject: 'sales_technique', stage: 'closing' }),
    row({ day: '2026-10-07', drill: 'x2', score: 95, difficulty: 1, subject: 'sales_technique', stage: 'closing' }),
  ];
  const t = trendByWeek([...weekA, ...weekB]);
  assert.equal(t.statement.kind, 'up');
  assert.equal(t.statement.comparableDelta, 0, 'no change on comparable drills');
  assert.ok(t.statement.mixChanged);
  assert.match(t.statement.text, /comparable drills/);
  assert.match(t.statement.text, /easier/);
});

test('source relevance: brand, subject, and persona', () => {
  const ravenly = { brand: 'ravenly', subjects: ['product', 'competitive', 'sales_technique'], personas: [] };
  const playbook = { brand: 'both', subjects: ['sales_technique'], personas: [] };
  assert.deepEqual(sourceFit(ravenly, { brand: 'ravenly', subject: 'product' }), { usable: true, primary: true, reasons: [] });
  assert.equal(sourceFit(playbook, { brand: 'omnizant', subject: 'product' }).primary, false, 'technique material cannot stand in for product facts');
  assert.equal(sourceFit(playbook, { brand: 'omnizant', subject: 'product' }).usable, true);
  assert.deepEqual(sourceFit(ravenly, { brand: 'omnizant', subject: 'product' }).reasons, ['brand']);
  const mpOnly = { brand: 'both', subjects: ['sales_technique'], personas: ['managing_partner'] };
  assert.deepEqual(sourceFit(mpOnly, { brand: 'both', subject: 'sales_technique', persona: 'solo_attorney' }).reasons, ['persona']);
});
