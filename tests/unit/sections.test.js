// Splitting long documents into sections, and the seed's map of the Ravenly guide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitDocument } from '../../server/knowledge/sections.js';
import { parseSections } from '../../server/lib/text.js';
import { ravenlySectionMeta } from '../../server/seed/collections.js';

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
