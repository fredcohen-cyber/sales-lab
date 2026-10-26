// Splitting long documents into sections, and the seed's map of the Ravenly guide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitDocument } from '../../server/knowledge/sections.js';
import { parseSections } from '../../server/lib/text.js';
import { ravenlySectionMeta } from '../../server/seed/collections.js';
import { loadVersionSections, SECTION_CACHE_MAX } from '../../server/knowledge/service.js';

test('a document splits at its "## " headings; titles leave the text, and the intro drops its "# " title', () => {
  const doc = splitDocument('# Guide\n\nRead this first.\n\n## 01 · Setup\n\nStep one.\n\n### Detail\n\nMore.\n\n## 02 · Pricing\n\nPlans.\n```\n## not a heading\n```');
  assert.equal(doc.intro, 'Read this first.');
  assert.deepEqual(
    doc.sections.map((s) => s.title),
    ['01 · Setup', '02 · Pricing'],
  );
  assert.equal(doc.sections[0].content, 'Step one.\n\n### Detail\n\nMore.');
  assert.ok(doc.sections[1].content.includes('## not a heading'), 'headings inside code fences stay text');
});

test('every section of the Ravenly guide has a place and subjects', () => {
  const content = readFileSync(new URL('../../server/seed/sources/ravenly-sales-training.md', import.meta.url), 'utf8');
  const sections = parseSections(content).filter((s) => s.key !== 'intro');
  assert.equal(sections.length, 22);
  for (const s of sections) {
    const meta = ravenlySectionMeta(s);
    assert.ok(meta, `no meta for “${s.title}”`);
    assert.ok(meta.group && meta.subjects.length > 0);
  }
});

test('loading more versions than the cache holds still returns every one', async () => {
  const ids = Array.from({ length: SECTION_CACHE_MAX + 25 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
  const q = { many: async (_sql, [wanted]) => wanted.map((id) => ({ id, content: `## Part\n\nText of ${id}.` })) };
  assert.equal((await loadVersionSections(q, ids.slice(0, 30))).size, 30);
  const all = await loadVersionSections(q, ids);
  assert.equal(all.size, ids.length, 'cached and newly fetched versions are all returned');
  assert.ok(ids.every((id) => all.get(id)?.[0]?.text.endsWith(`Text of ${id}.`)));
});
