// Product lines, concepts, and the Practice Studio's product and buyer filters.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { addUser, ownerClient, startTestApp } from '../helpers.js';
import { PRODUCT_LINES } from '../../server/domain.js';

let h;
let owner;
let rep;
let repId;
before(async () => {
  h = await startTestApp({ dbName: 'saleslab_test_filters' });
  owner = await ownerClient(h);
  ({ client: rep } = await addUser(h, owner, { name: 'Fia Filter', email: 'fia@ravenly.com', role: 'ae' }));
  repId = (await h.db.one(`SELECT id FROM users WHERE email = 'fia@ravenly.com'`)).id;
});
after(() => h.close());

const forRole = (stage, role, where = 'true', params = []) =>
  h.db.one(
    `SELECT count(*)::int AS n FROM drills d JOIN drill_versions v ON v.id = d.current_version_id
      WHERE d.status = 'active' AND v.stage = $1 AND $2 = ANY(v.roles) AND ${where}`,
    [stage, role, ...params],
  );

test('every question has a product line that belongs to its brand, and reps meet a fourth buyer', async () => {
  const meta = (await rep.get('/api/meta')).data;
  assert.deepEqual(Object.keys(meta.productLines).sort(), Object.keys(PRODUCT_LINES).sort());
  assert.ok(meta.personas.some((p) => p.key === 'office_manager' && /intake director/i.test(p.label)));
  const wrong = await h.db.one(
    `SELECT count(*)::int AS n FROM drill_versions WHERE NOT ((product_line = 'general') = (brand = 'both') AND (product_line = 'ravenly') = (brand = 'ravenly'))`,
  );
  assert.equal(wrong.n, 0);
  // Seeded questions carry a concept: their own slug when they start one.
  const seeded = await h.db.one(`SELECT v.concept, v.product_line FROM drills d JOIN drill_versions v ON v.id = d.current_version_id WHERE d.slug = 'price-ravenly-over-allowance'`);
  assert.deepEqual([seeded.concept, seeded.product_line], ['price-ravenly-over-allowance', 'ravenly']);
  const ai = await h.db.one(`SELECT v.product_line FROM drills d JOIN drill_versions v ON v.id = d.current_version_id WHERE d.slug = 'disc-omnizant-ai-search-partners'`);
  assert.equal(ai.product_line, 'omnizant_ai_search');
});

test('stage tiles count only the questions that match the filters', async () => {
  const all = (await rep.get('/api/practice/stages')).data.stages.find((s) => s.key === 'pricing');
  assert.equal(all.questions, (await forRole('pricing', 'ae')).n);
  assert.ok(all.concepts >= 1 && all.concepts <= all.questions);
  const ravenly = (await rep.get('/api/practice/stages?product=ravenly&persona=solo_attorney')).data.stages.find((s) => s.key === 'pricing');
  assert.equal(ravenly.questions, (await forRole('pricing', 'ae', `v.product_line = 'ravenly' AND 'solo_attorney' = ANY(v.personas)`)).n);
  assert.ok(ravenly.questions < all.questions);
  assert.equal((await rep.get('/api/practice/stages?product=nothing')).status, 400);
  assert.equal((await rep.get('/api/practice/stages?persona=nobody')).status, 400);
});

test('a stage serves a question from the chosen product and buyer, and a new filter replaces the waiting one', async () => {
  const drawn = await rep.post('/api/practice/stages/pricing/draw', { product: 'ravenly', persona: 'solo_attorney' });
  assert.equal(drawn.status, 200, JSON.stringify(drawn.data));
  assert.equal(drawn.data.scenario.persona.key, 'solo_attorney');
  assert.equal(drawn.data.scenario.productLine, 'ravenly');
  // The same filters serve the same question until it is answered.
  const again = await rep.post('/api/practice/stages/pricing/draw', { product: 'ravenly', persona: 'solo_attorney' });
  assert.equal(again.data.drill.id, drawn.data.drill.id);
  // Other filters replace it with a question that fits them.
  const { product_line: otherProduct } = await h.db.one(
    `SELECT v.product_line FROM drills d JOIN drill_versions v ON v.id = d.current_version_id
      WHERE d.status = 'active' AND v.stage = 'pricing' AND 'ae' = ANY(v.roles) AND v.product_line <> 'ravenly'
      ORDER BY v.product_line LIMIT 1`,
  );
  const other = await rep.post('/api/practice/stages/pricing/draw', { product: otherProduct });
  assert.equal(other.status, 200, JSON.stringify(other.data));
  assert.equal(other.data.scenario.productLine, otherProduct);
  const waiting = await h.db.many(`SELECT drill_id FROM practice_draws WHERE learner_id = $1 AND stage = 'pricing'`, [repId]);
  assert.deepEqual(waiting.map((w) => w.drill_id), [other.data.drill.id]);
  assert.equal((await rep.post('/api/practice/stages/pricing/draw', { product: 'nothing' })).status, 400);
});

test('a question’s product line must belong to its brand; its concept is for managers', async () => {
  const body = {
    title: 'Product line check',
    brand: 'ravenly',
    subject: 'sales_technique',
    stage: 'closing',
    roles: ['ae'],
    personas: ['office_manager'],
    situation: 'An intake director likes the plan but wants the partners to decide.',
    buyerLine: '“I’ll take it to the partners on Friday.”',
    objective: 'Get a dated meeting with the partners.',
    goodLooksLike: '- Asks who decides.\n- Proposes a dated meeting with the partners.',
    assessedDimensions: ['advancing', 'objection_handling'],
    defaults: { difficulty: 2, skepticism: 2, depth: 1 },
    sourceRefs: [],
  };
  const wrong = await owner.post('/api/drills', { ...body, productLine: 'omnizant_web' });
  assert.equal(wrong.status, 400);
  assert.match(wrong.data.error.message, /not a product of Ravenly/);
  const made = await owner.post('/api/drills', { ...body, concept: 'close-partners-decide' });
  assert.equal(made.status, 201, JSON.stringify(made.data));
  const shown = (await owner.get(`/api/drills/${made.data.id}`)).data.drill;
  assert.deepEqual([shown.productLine, shown.concept], ['ravenly', 'close-partners-decide']);
});
