// The Practice Studio feed's choice of the next question: concept first, then version, then buyer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseNext } from '../../server/practice/feed.js';

const keepOrder = (xs) => xs;
const drill = (id, concept, personas = ['managing_partner', 'office_manager']) => ({ id, concept, personas });
const poolOf = (...ds) => ds.map((d) => ({ drill: d, personas: d.personas }));

test('the feed serves the concept met least, its version answered least, and the buyer met least', () => {
  const conceptByDrill = new Map([
    ['a1', 'A'],
    ['a2', 'A'],
    ['a3', 'A'],
    ['b1', 'B'],
    ['b2', 'B'],
    ['c1', 'c1'],
  ]);
  const pool = poolOf(drill('a1', 'A'), drill('a2', 'A'), drill('b1', 'B'), drill('b2', 'B'), drill('c1', ''));
  // Concept A was met twice through a version outside the pool, B once, and c1 (its own concept) never.
  let history = [
    { drill_id: 'a3', persona: 'managing_partner', n: 2 },
    { drill_id: 'b1', persona: 'managing_partner', n: 1 },
  ];
  assert.equal(chooseNext(pool, history, conceptByDrill, keepOrder).drill.id, 'c1');
  // Once c1 has been met twice, B is met least; its unanswered version b2 comes before b1.
  history = [...history, { drill_id: 'c1', persona: 'managing_partner', n: 2 }];
  const next = chooseNext(pool, history, conceptByDrill, keepOrder);
  assert.equal(next.drill.id, 'b2');
  // On a version answered with one buyer, the other buyer comes next.
  history = [
    { drill_id: 'b1', persona: 'managing_partner', n: 1 },
    { drill_id: 'a1', persona: 'managing_partner', n: 1 },
    { drill_id: 'c1', persona: 'managing_partner', n: 1 },
  ];
  const single = chooseNext(poolOf(drill('b1', 'B')), history, conceptByDrill, keepOrder);
  assert.deepEqual([single.drill.id, single.persona], ['b1', 'office_manager']);
});
