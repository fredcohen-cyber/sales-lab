// The Knowledge Library as collections of sections: the seeded split, reading, editing structure,
// and splitting long documents. Text and drills must survive the split exactly.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addUser, drillBySlug, ownerClient, sectionBy, startTestApp, submit, waitForCoaching } from '../helpers.js';
import { parseSections } from '../../server/lib/text.js';
import { SEED_DRILLS } from '../../server/seed/drills.js';
import { createSeedCollections, seed } from '../../server/seed/index.js';
import { loadSourceText } from '../../server/knowledge/service.js';
import { buildCoachingRequest } from '../../server/ai/prompt.js';

let h;
let owner;
let rep;
before(async () => {
  h = await startTestApp({ dbName: 'saleslab_test_sections' });
  owner = await ownerClient(h);
  ({ client: rep } = await addUser(h, owner, { name: 'Sam Sections', email: 'sam@ravenly.com' }));
});
after(() => h.close());

const SEED_FILES = { 'sales-playbook': 'sales-playbook.md', 'ravenly-sales-training': 'ravenly-sales-training.md' };
const seedSections = (slug) => parseSections(readFileSync(new URL(`../../server/seed/sources/${SEED_FILES[slug]}`, import.meta.url), 'utf8'));
const titlesOf = (ids) =>
  h.db
    .many(`SELECT s.id, v.title FROM knowledge_sources s JOIN knowledge_versions v ON v.id = s.latest_version_id WHERE s.id = ANY($1::uuid[])`, [ids])
    .then((rows) => ids.map((id) => rows.find((r) => r.id === id)?.title));
const collectionBySlug = async (slug) => (await owner.get('/api/knowledge')).data.collections.find((c) => c.slug === slug);
const drillBody = (fields) => ({
  title: 'Omnizant drill',
  brand: 'omnizant',
  subject: 'product',
  stage: 'pricing',
  roles: ['ae'],
  personas: ['managing_partner'],
  situation: 'A managing partner asks what Omnizant offers.',
  buyerLine: 'What exactly do you do for law firms?',
  objective: 'Answer accurately and move to discovery.',
  goodLooksLike: 'Uses the approved material.',
  assessedDimensions: ['product_accuracy'],
  defaults: { difficulty: 3, skepticism: 3, depth: 3 },
  ...fields,
});
const docVersion = (title, content) => ({ title, brand: 'omnizant', subjects: ['product'], content });

test('the playbook and the Ravenly guide become collections of approved sections; Omnizant starts as drafts', async () => {
  const lib = await owner.get('/api/knowledge');
  assert.equal(lib.status, 200);
  assert.deepEqual(
    lib.data.collections.map((c) => [c.slug, c.kind, c.brand, c.counts.approved, c.counts.drafts]),
    [
      ['sales-playbook', 'playbook', 'both', 10, 0],
      ['ravenly-product', 'product', 'ravenly', 22, 0],
      ['omnizant-product', 'product', 'omnizant', 0, 3],
    ],
  );
  const docs = await h.db.many(`SELECT slug, status, split_into_collection_id FROM knowledge_sources WHERE slug IN ('sales-playbook', 'ravenly-sales-training')`);
  assert.equal(docs.length, 2);
  assert.ok(docs.every((d) => d.status === 'archived' && d.split_into_collection_id), 'the original documents are archived, pointing at their collections');
  const ravenly = lib.data.sources.filter((s) => s.collectionName === 'Ravenly product knowledge');
  assert.deepEqual([...new Set(ravenly.map((s) => s.group))], ['Start here', 'Positioning and fit', 'Product capabilities', 'Pricing and packaging', 'Competitive', 'Selling Ravenly', 'Claims and sources']);
  const battlecard = ravenly.find((s) => s.title === '14 · Intaker battlecard');
  assert.deepEqual(battlecard.subjects, ['competitive']);
  assert.equal(battlecard.evidenceBasis, 'mixed');
});

test('every section keeps the exact text, title, and metadata it had in the document', async () => {
  for (const [slug, collection] of [['sales-playbook', 'sales-playbook'], ['ravenly-sales-training', 'ravenly-product']]) {
    const doc = await h.db.one(
      `SELECT v.* FROM knowledge_sources s JOIN knowledge_versions v ON v.id = s.approved_version_id WHERE s.slug = $1`,
      [slug],
    );
    const rows = await h.db.many(
      `SELECT v.title, v.content, v.brand, v.as_of_date, v.caveats, v.evidence_basis, v.approved_at FROM knowledge_sources s
         JOIN knowledge_collections c ON c.id = s.collection_id JOIN knowledge_versions v ON v.id = s.approved_version_id
        WHERE c.slug = $1 ORDER BY s.position`,
      [collection],
    );
    const expected = parseSections(doc.content).filter((s) => s.key !== 'intro');
    assert.equal(rows.length, expected.length);
    expected.forEach((sec, i) => {
      assert.equal(rows[i].title, sec.title);
      assert.equal(`## ${rows[i].title}\n\n${rows[i].content}`, sec.text, `text of “${sec.title}” is unchanged`);
      assert.equal(rows[i].brand, doc.brand);
      assert.equal(rows[i].as_of_date, doc.as_of_date);
      assert.equal(rows[i].caveats, doc.caveats);
      assert.equal(rows[i].evidence_basis, doc.evidence_basis);
      assert.ok(rows[i].approved_at);
    });
  }
});

test('every seeded drill now points at the sections it pointed at before, in the same order', async () => {
  for (const d of SEED_DRILLS) {
    const expected = [];
    for (const s of d.sources) {
      const all = seedSections(s.source);
      for (const key of s.sections) {
        const title = all.find((x) => x.key === key)?.title;
        if (title && !expected.includes(title)) expected.push(title);
      }
    }
    const { source_refs: refs } = await h.db.one(`SELECT v.source_refs FROM drills d JOIN drill_versions v ON v.id = d.current_version_id WHERE d.slug = $1`, [d.slug]);
    assert.ok(refs.every((r) => r.sections.length === 0 && r.versionId), `${d.slug}: whole-section references with versions`);
    assert.deepEqual(await titlesOf(refs.map((r) => r.sourceId)), expected, d.slug);
  }
});

test('coaching stays available for every seeded drill, and grounds itself in the sections', async () => {
  const drills = (await owner.get('/api/drills')).data.drills;
  assert.equal(drills.length, SEED_DRILLS.length);
  for (const d of drills) assert.equal(d.coaching.available, true, `${d.title}: ${d.coaching.reason}`);

  const d = await drillBySlug(h, 'ravenly-clio-sync');
  const created = await submit(rep, d, 'Today the Clio handoff runs through Zapier. Which fields does your intake team need in Clio on day one?');
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const done = await waitForCoaching(rep, created.data.attempt.id);
  const used = done.attempt.sourceVersions;
  assert.deepEqual(
    used.map((s) => [s.collectionName, s.title]),
    [
      ['Ravenly product knowledge', '10 · Integrations and deployment'],
      ['Ravenly product knowledge', '18 · Objection handling and suggested language'],
    ],
  );
  const sources = await loadSourceText(h.db, used);
  assert.equal(sources[0].sections.length, 1);
  assert.equal(sources[0].sections[0].title, '10 · Integrations and deployment', 'the section is named after itself, not "Introduction"');
  const request = buildCoachingRequest({ scenario: done.attempt.scenario, answer: 'An answer.', sources });
  assert.match(request.user, /\[S1\] Ravenly product knowledge › 10 · Integrations and deployment \(version 1, as of 2026-10-11\)/);
  assert.match(request.user, /--- S2 section: 18 · Objection handling and suggested language/);
});

test('every section a seeded drill uses supports its coaching', async () => {
  const seeded = new Set(SEED_DRILLS.map((d) => d.slug));
  const drills = (await owner.get('/api/drills')).data.drills.filter((d) => seeded.has(d.slug));
  assert.equal(drills.length, SEED_DRILLS.length);
  for (const d of drills) {
    assert.deepEqual(
      d.sources.filter((x) => !x.available).map((x) => `${x.title}: ${x.reason}`),
      [],
      `${d.title} keeps all of its material`,
    );
  }
});

test('reps read approved collections only; managers also see drafts', async () => {
  const lib = await rep.get('/api/knowledge');
  assert.deepEqual(
    lib.data.collections.map((c) => c.slug),
    ['sales-playbook', 'ravenly-product'],
  );
  assert.ok(lib.data.sources.every((s) => s.status === 'approved' && s.collectionId), 'no drafts and no archived documents');
  const omnizant = await collectionBySlug('omnizant-product');
  assert.equal((await rep.get(`/api/knowledge/collections/${omnizant.id}`)).status, 404);
  const draft = await owner.get(`/api/knowledge/collections/${omnizant.id}`);
  assert.equal(draft.status, 200);
  assert.deepEqual(
    draft.data.sections.map((s) => [s.title, s.isApproved, s.group]),
    [
      ['Web development', false, 'Services'],
      ['SEO (search engine optimization)', false, 'Services'],
      ['GEO (generative engine optimization)', false, 'Services'],
    ],
  );
  const playbook = await collectionBySlug('sales-playbook');
  const read = await rep.get(`/api/knowledge/collections/${playbook.id}`);
  assert.equal(read.status, 200);
  assert.equal(read.data.sections[0].title, 'The playbook on one page');
  assert.equal(read.data.sections.at(-1).title, '9. Practice and coaching');
  assert.ok(read.data.sections.every((s) => s.content.length > 100 && s.isApproved));
  assert.match(read.data.collection.description, /Winning reps lead the sale/);
});

test('a section page shows where it sits and, for managers, which drills use it', async () => {
  const playbook = await collectionBySlug('sales-playbook');
  const list = (await rep.get(`/api/knowledge?collection=${playbook.id}`)).data.sources;
  const objections = list.find((s) => s.title.startsWith('6. Objections'));
  const forRep = (await rep.get(`/api/knowledge/${objections.id}`)).data.source;
  assert.equal(forRep.collection.name, 'Sales Playbook');
  assert.equal(forRep.neighbors.prev.title, '5. Closing: ask for the business');
  assert.equal(forRep.neighbors.next.title, '7. Follow-up and re-engagement');
  assert.deepEqual([forRep.neighbors.index, forRep.neighbors.count], [7, 10]);
  assert.equal(forRep.usedBy, undefined);
  const forOwner = (await owner.get(`/api/knowledge/${objections.id}`)).data.source;
  assert.ok(forOwner.usedBy.some((d) => d.title.length > 0));
  assert.equal(forOwner.usedBy.length, SEED_DRILLS.filter((d) => d.sources.some((s) => s.source === 'sales-playbook' && s.sections.includes('s6'))).length);
  const doc = await h.db.one(`SELECT id FROM knowledge_sources WHERE slug = 'sales-playbook'`);
  const archived = (await owner.get(`/api/knowledge/${doc.id}`)).data.source;
  assert.equal(archived.splitInto.name, 'Sales Playbook');
});

test('managers create collections, add, arrange, and move sections; reps cannot', async () => {
  const bad = await owner.post('/api/knowledge/collections', { name: '', kind: 'playbook', brand: 'both' });
  assert.equal(bad.status, 400);
  const made = await owner.post('/api/knowledge/collections', { name: 'Account management playbook', kind: 'playbook', brand: 'both', description: 'Keeping clients.' });
  assert.equal(made.status, 201);
  assert.equal((await rep.post('/api/knowledge/collections', { name: 'Nope', kind: 'playbook', brand: 'both' })).status, 403);

  const add = (title, group) =>
    owner.post('/api/knowledge', { title, brand: 'both', subjects: ['sales_technique'], content: `How to handle ${title.toLowerCase()}.`, approve: true, collectionId: made.data.id, group });
  const a = await add('Kickoff calls', 'Onboarding');
  const b = await add('Quarterly reviews', 'Ongoing value');
  const c = await add('Renewal conversations', 'Renewal');
  assert.ok([a, b, c].every((r) => r.status === 201));
  const order = async () => (await owner.get(`/api/knowledge/collections/${made.data.id}`)).data.sections.map((s) => [s.title, s.group]);
  assert.deepEqual(await order(), [
    ['Kickoff calls', 'Onboarding'],
    ['Quarterly reviews', 'Ongoing value'],
    ['Renewal conversations', 'Renewal'],
  ]);

  const arranged = await owner.post(`/api/knowledge/collections/${made.data.id}/arrange`, {
    sections: [
      { id: c.data.id, group: 'Renewal' },
      { id: a.data.id, group: 'Start here' },
      { id: b.data.id, group: 'Start here' },
    ],
  });
  assert.equal(arranged.status, 200);
  assert.deepEqual(await order(), [
    ['Renewal conversations', 'Renewal'],
    ['Kickoff calls', 'Start here'],
    ['Quarterly reviews', 'Start here'],
  ]);
  const versions = await h.db.one(`SELECT count(*) AS n FROM knowledge_versions WHERE source_id = ANY($1::uuid[])`, [[a.data.id, b.data.id, c.data.id]]);
  assert.equal(versions.n, 3, 'arranging creates no new versions');
  const d = await add('Welcome emails', 'Start here');
  assert.deepEqual((await order()).map((x) => x[0]), ['Renewal conversations', 'Kickoff calls', 'Quarterly reviews', 'Welcome emails'], 'a new section joins the end of its group');
  const e = await add('Upsell timing', 'Renewal');
  assert.deepEqual((await order()).map((x) => x[0]), ['Renewal conversations', 'Upsell timing', 'Kickoff calls', 'Quarterly reviews', 'Welcome emails']);
  for (const x of [d, e]) await owner.post(`/api/knowledge/${x.data.id}/archive`, {});
  const stale = await owner.post(`/api/knowledge/collections/${made.data.id}/arrange`, { sections: [{ id: a.data.id, group: '' }] });
  assert.equal(stale.status, 409);
  assert.equal((await rep.post(`/api/knowledge/collections/${made.data.id}/arrange`, { sections: [{ id: a.data.id, group: '' }] })).status, 403);

  const playbook = await collectionBySlug('sales-playbook');
  const moved = await owner.patch(`/api/knowledge/${b.data.id}/placement`, { collectionId: playbook.id, group: 'Extras' });
  assert.equal(moved.status, 200);
  const inPlaybook = (await owner.get(`/api/knowledge/collections/${playbook.id}`)).data.sections;
  assert.deepEqual([inPlaybook.at(-1).title, inPlaybook.at(-1).group], ['Quarterly reviews', 'Extras'], 'a moved section goes to the end');
  assert.equal((await owner.patch(`/api/knowledge/${b.data.id}/placement`, { collectionId: null, group: '' })).status, 200);
  const standalone = (await owner.get('/api/knowledge')).data.sources.find((s) => s.id === b.data.id);
  assert.equal(standalone.collectionId, null);
  assert.equal((await rep.patch(`/api/knowledge/${a.data.id}/placement`, { collectionId: null, group: '' })).status, 403);

  const renamed = await owner.put(`/api/knowledge/collections/${made.data.id}`, { name: 'AM playbook', kind: 'playbook', brand: 'both', description: 'Updated.' });
  assert.equal(renamed.status, 200);
  const after = (await owner.get(`/api/knowledge/collections/${made.data.id}`)).data.collection;
  assert.deepEqual([after.name, after.description], ['AM playbook', 'Updated.']);
});

test('a long document can be split into a new collection; its drills follow their sections', async () => {
  const doc = await owner.post('/api/knowledge', {
    title: 'Omnizant SEO guide',
    brand: 'omnizant',
    subjects: ['product'],
    caveats: 'Prices as of October.',
    content: '# Omnizant SEO guide\n\nRead before selling SEO.\n\n## 1. What we offer\n\nLocal SEO for law firms.\n\n## 2. Pricing\n\nMonthly retainers.\n\n## 3. Proof\n\nCase studies to confirm.',
    approve: true,
  });
  assert.equal(doc.status, 201);
  const drill = await owner.post('/api/drills', {
    title: 'Omnizant SEO pricing',
    brand: 'omnizant',
    subject: 'product',
    stage: 'pricing',
    roles: ['ae'],
    personas: ['managing_partner'],
    situation: 'A managing partner asks about SEO pricing.',
    buyerLine: 'What does SEO cost?',
    objective: 'Answer accurately and move to discovery.',
    goodLooksLike: 'Uses the approved pricing.',
    assessedDimensions: ['product_accuracy'],
    defaults: { difficulty: 3, skepticism: 3, depth: 3 },
    sourceRefs: [{ sourceId: doc.data.id, sections: ['s2'], wholeSource: false }],
  });
  assert.equal(drill.status, 201, JSON.stringify(drill.data));
  assert.equal((await rep.post(`/api/knowledge/${doc.data.id}/split`, { newCollection: { name: 'X', kind: 'product', brand: 'omnizant' } })).status, 403);
  assert.equal((await owner.post(`/api/knowledge/${doc.data.id}/split`, {})).status, 400, 'a destination is required');

  const split = await owner.post(`/api/knowledge/${doc.data.id}/split`, { newCollection: { name: 'Omnizant SEO', kind: 'product', brand: 'omnizant' } });
  assert.equal(split.status, 200, JSON.stringify(split.data));
  assert.equal(split.data.sections, 3);
  assert.equal(split.data.drillVersionsUpdated, 1);
  const col = (await owner.get(`/api/knowledge/collections/${split.data.collectionId}`)).data;
  assert.equal(col.collection.description, 'Read before selling SEO.', 'the introduction becomes the description');
  assert.deepEqual(col.sections.map((s) => [s.title, s.isApproved, s.caveats]), [
    ['1. What we offer', true, 'Prices as of October.'],
    ['2. Pricing', true, 'Prices as of October.'],
    ['3. Proof', true, 'Prices as of October.'],
  ]);
  const view = (await owner.get(`/api/drills/${drill.data.id}`)).data.drill;
  assert.deepEqual(view.sourceRefs.map((r) => r.sourceId), [col.sections[1].id]);
  assert.equal(view.coaching.available, true);
  assert.equal((await owner.post(`/api/knowledge/${doc.data.id}/split`, { collectionId: split.data.collectionId })).status, 409, 'a document splits only once');

  const short = await owner.post('/api/knowledge', { title: 'One part', brand: 'omnizant', subjects: ['product'], content: '## Only\n\nOne section.' });
  assert.equal((await owner.post(`/api/knowledge/${short.data.id}/split`, { collectionId: split.data.collectionId })).status, 400);
});

test('running the seed again changes nothing', async () => {
  const count = () => h.db.one(`SELECT (SELECT count(*) FROM knowledge_collections) AS c, (SELECT count(*) FROM knowledge_sources) AS s`);
  const before = await count();
  await seed(h.db, h.config, { log: () => {} });
  assert.deepEqual(await count(), before);
});

test('a drill can use any number of sections up to the limit', async () => {
  const ids = (await owner.get('/api/knowledge')).data.sources.filter((s) => s.collectionName === 'Ravenly product knowledge').map((s) => s.id);
  const body = {
    title: 'Everything Ravenly',
    brand: 'ravenly',
    subject: 'product',
    stage: 'demo',
    roles: ['ae'],
    personas: ['managing_partner'],
    situation: 'A full product walkthrough.',
    buyerLine: 'Show me everything.',
    objective: 'Stay accurate.',
    goodLooksLike: 'Accurate.',
    assessedDimensions: ['product_accuracy'],
    defaults: { difficulty: 3, skepticism: 3, depth: 3 },
    sourceRefs: ids.map((sourceId) => ({ sourceId, sections: [], wholeSource: true })),
  };
  const r = await owner.post('/api/drills', body);
  assert.equal(r.status, 201, JSON.stringify(r.data));
});

test('a document with an unapproved draft is split only after the draft is approved', async () => {
  const doc = await owner.post('/api/knowledge', { ...docVersion('Omnizant web guide', '## Builds\n\nSites in six weeks.\n\n## Care\n\nMonthly care plans.'), approve: true });
  assert.equal(doc.status, 201);
  assert.equal((await rep.get(`/api/knowledge/${doc.data.id}`)).data.source.splitPreview, undefined, 'reps are not offered a split');
  const draft = await owner.post(`/api/knowledge/${doc.data.id}/versions`, docVersion('Omnizant web guide', '## Builds\n\nSites in four weeks.\n\n## Care\n\nMonthly care plans.'));
  assert.equal(draft.status, 201);
  const preview = async () => (await owner.get(`/api/knowledge/${doc.data.id}`)).data.source.splitPreview;
  assert.deepEqual(await preview(), { version: 1, sections: 2, hasIntro: false, pendingDraftVersion: 2 });

  const refused = await owner.post(`/api/knowledge/${doc.data.id}/split`, { newCollection: { name: 'Omnizant web', kind: 'product', brand: 'omnizant' } });
  assert.equal(refused.status, 409);
  assert.equal(refused.data.error.code, 'pending_draft');
  assert.equal(await h.db.one(`SELECT id FROM knowledge_collections WHERE name = 'Omnizant web'`), null, 'the new collection is not left behind');

  assert.equal((await owner.post(`/api/knowledge/${doc.data.id}/approve`, { versionId: draft.data.versionId })).status, 200);
  assert.deepEqual(await preview(), { version: 2, sections: 2, hasIntro: false, pendingDraftVersion: null });
  const split = await owner.post(`/api/knowledge/${doc.data.id}/split`, { newCollection: { name: 'Omnizant web', kind: 'product', brand: 'omnizant' } });
  assert.equal(split.status, 200, JSON.stringify(split.data));
  const col = (await owner.get(`/api/knowledge/collections/${split.data.collectionId}`)).data;
  assert.equal(col.sections[0].content, 'Sites in four weeks.', 'the approved edit is the text that was split');
});

test('a split follows drill sections by title, keeps the ones it cannot match, and can make the introduction a section', async () => {
  const imports = await owner.post('/api/knowledge/collections', { name: 'Imported guides', kind: 'product', brand: 'omnizant', description: 'Guides imported from documents.' });
  const v1 = '# GEO guide\n\nHow we talk about GEO.\n\n## Audits\n\nWe audit AI answers.\n\n## Content\n\nWe write answer-ready pages.\n\n## Reporting\n\nMonthly visibility reports.';
  const doc = await owner.post('/api/knowledge', { ...docVersion('GEO guide', v1), approve: true });
  const keys = Object.fromEntries((await owner.get(`/api/knowledge/${doc.data.id}`)).data.version.sections.map((x) => [x.title, x.key]));
  const drill = await owner.post(
    '/api/drills',
    drillBody({ title: 'GEO reporting', sourceRefs: [{ sourceId: doc.data.id, sections: [keys['GEO guide'], keys.Reporting, keys.Audits], wholeSource: false }] }),
  );
  assert.equal(drill.status, 201, JSON.stringify(drill.data));
  // The next version retitles "Reporting", so the drill's choice of it can no longer be followed.
  const v2 = await owner.post(`/api/knowledge/${doc.data.id}/versions`, { ...docVersion('GEO guide', v1.replace('## Reporting', '## Monthly reporting')), approve: true });
  assert.equal(v2.status, 201);
  assert.deepEqual((await owner.get(`/api/knowledge/${doc.data.id}`)).data.source.splitPreview, { version: 2, sections: 3, hasIntro: true, pendingDraftVersion: null });

  const split = await owner.post(`/api/knowledge/${doc.data.id}/split`, { collectionId: imports.data.id });
  assert.equal(split.status, 200, JSON.stringify(split.data));
  assert.deepEqual([split.data.sections, split.data.drillVersionsUpdated, split.data.unmatched], [4, 1, 1]);
  const col = (await owner.get(`/api/knowledge/collections/${imports.data.id}`)).data;
  assert.equal(col.collection.description, 'Guides imported from documents.', 'an existing description is kept');
  assert.deepEqual(col.sections.map((x) => x.title), ['Introduction', 'Audits', 'Content', 'Monthly reporting']);
  assert.equal(col.sections[0].content, 'How we talk about GEO.');

  const view = (await owner.get(`/api/drills/${drill.data.id}`)).data.drill;
  assert.deepEqual(
    view.sourceRefs.map((r) => [r.sourceId, r.sections]),
    [
      [col.sections[0].id, []],
      [col.sections[1].id, []],
      [doc.data.id, [keys.Reporting]],
    ],
    'the introduction and Audits follow; the retitled section stays listed against the archived document',
  );
  assert.deepEqual(view.sources.map((x) => [x.available, x.reason]), [[true, null], [true, null], [false, 'archived']]);
  assert.equal(view.coaching.available, true);
  const event = await h.db.one(`SELECT details FROM audit_events WHERE action = 'knowledge.split' AND entity_id = $1`, [doc.data.id]);
  const { current_version_id: drillVersionId } = await h.db.one(`SELECT current_version_id FROM drills WHERE id = $1`, [drill.data.id]);
  assert.deepEqual(event.details.unmatched, [{ drillVersionId, sections: [keys.Reporting] }]);
  // Saving the drill again keeps the unmatched choice on record until a manager removes it.
  const resaved = await owner.put(`/api/drills/${drill.data.id}`, drillBody({ title: 'GEO reporting', sourceRefs: view.sourceRefs.map(({ sourceId, sections, wholeSource }) => ({ sourceId, sections, wholeSource })) }));
  assert.equal(resaved.status, 200, JSON.stringify(resaved.data));
});

test('a split document can no longer be edited, approved, moved, or restored', async () => {
  const doc = await h.db.one(`SELECT id, approved_version_id, latest_version_id FROM knowledge_sources WHERE slug = 'sales-playbook'`);
  const playbook = await collectionBySlug('sales-playbook');
  const tries = [
    await owner.post(`/api/knowledge/${doc.id}/versions`, { title: 'Sales Playbook', brand: 'both', subjects: ['sales_technique'], content: '## New\n\nText.' }),
    await owner.post(`/api/knowledge/${doc.id}/approve`, { versionId: doc.approved_version_id }),
    await owner.post(`/api/knowledge/${doc.id}/restore`, {}),
    await owner.patch(`/api/knowledge/${doc.id}/placement`, { collectionId: playbook.id, group: '' }),
  ];
  assert.deepEqual(
    tries.map((r) => [r.status, r.data.error?.code]),
    Array(4).fill([409, 'document_split']),
  );
  const after = await h.db.one(`SELECT status, latest_version_id, collection_id FROM knowledge_sources WHERE id = $1`, [doc.id]);
  assert.deepEqual(after, { status: 'archived', latest_version_id: doc.latest_version_id, collection_id: null });
});

test('a restored section returns to the end of its group, never sharing a place', async () => {
  const made = await owner.post('/api/knowledge/collections', { name: 'Restore order', kind: 'playbook', brand: 'both' });
  const add = (title, group) =>
    owner.post('/api/knowledge', { title, brand: 'both', subjects: ['sales_technique'], content: `About ${title}.`, approve: true, collectionId: made.data.id, group });
  const a = await add('Alpha', 'First');
  const b = await add('Bravo', 'First');
  const c = await add('Charlie', 'Second');
  await owner.post(`/api/knowledge/${a.data.id}/archive`, {});
  // Arranging the remaining sections reuses the archived section's old place.
  const arranged = await owner.post(`/api/knowledge/collections/${made.data.id}/arrange`, {
    sections: [
      { id: b.data.id, group: 'First' },
      { id: c.data.id, group: 'Second' },
    ],
  });
  assert.equal(arranged.status, 200);
  assert.equal((await owner.post(`/api/knowledge/${a.data.id}/restore`, {})).status, 200);
  const rows = await h.db.many(
    `SELECT v.title, s.position FROM knowledge_sources s JOIN knowledge_versions v ON v.id = s.latest_version_id WHERE s.collection_id = $1 ORDER BY s.position`,
    [made.data.id],
  );
  assert.deepEqual(rows.map((r) => r.title), ['Bravo', 'Alpha', 'Charlie']);
  assert.equal(new Set(rows.map((r) => r.position)).size, rows.length, 'no two sections share a place');
});

test('learners never learn the name of a collection they cannot read', async () => {
  const omnizant = await collectionBySlug('omnizant-product');
  const seo = (await owner.get(`/api/knowledge/collections/${omnizant.id}`)).data.sections.find((x) => x.title.startsWith('SEO'));
  const objections = await sectionBy(h, 'sales-playbook', '6. Objections');
  const made = await owner.post(
    '/api/drills',
    drillBody({
      title: 'Omnizant SEO first call',
      sourceRefs: [
        { sourceId: seo.id, sections: [], wholeSource: true },
        { sourceId: objections.id, sections: [], wholeSource: true },
      ],
    }),
  );
  assert.equal(made.status, 201, JSON.stringify(made.data));
  const names = (drill) => drill.sources.map((x) => [x.title === null, x.collectionName]);
  assert.deepEqual(names((await owner.get(`/api/drills/${made.data.id}`)).data.drill), [
    [false, 'Omnizant product knowledge'],
    [false, 'Sales Playbook'],
  ]);
  const forRep = (await rep.get(`/api/drills/${made.data.id}`)).data.drill;
  assert.deepEqual(names(forRep), [
    [true, null],
    [false, 'Sales Playbook'],
  ]);
  assert.equal(forRep.coaching.available, false, 'draft outlines never support coaching');

  const row = await h.db.one(`SELECT current_version_id FROM drills WHERE id = $1`, [made.data.id]);
  const created = await submit(rep, { id: made.data.id, version_id: row.current_version_id, personas: ['managing_partner'] }, 'We start with an audit.', { mode: 'unscored' });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const attempt = (await rep.get(`/api/practice/attempts/${created.data.attempt.id}`)).data.attempt;
  assert.deepEqual(attempt.scenario.sources.map((x) => [x.title === null, x.collectionName]), [
    [true, null],
    [false, 'Sales Playbook'],
  ]);
});

test('the seed leaves a document it cannot split as it is, and still starts', async () => {
  const doc = await owner.post('/api/knowledge', docVersion('Single-part guide', '## Only part\n\nOne section.'));
  await h.db.query(`UPDATE knowledge_sources SET slug = 'single-part-guide' WHERE id = $1`, [doc.data.id]);
  const ownerRow = await h.db.one(`SELECT * FROM users WHERE is_owner`);
  const lines = [];
  await h.db.tx((q) =>
    createSeedCollections(q, ownerRow, (l) => lines.push(l), [
      { slug: 'single-part', name: 'Single part', kind: 'product', brand: 'omnizant', description: '', position: 50, from: 'single-part-guide' },
    ]),
  );
  assert.ok(lines.some((l) => l.includes('left “single-part-guide” as one document')), lines.join('\n'));
  const after = await h.db.one(`SELECT status, collection_id, split_into_collection_id FROM knowledge_sources WHERE id = $1`, [doc.data.id]);
  assert.deepEqual(after, { status: 'draft', collection_id: null, split_into_collection_id: null });
  assert.ok(await h.db.one(`SELECT id FROM knowledge_collections WHERE slug = 'single-part'`), 'the rest of the step still applies');
});
