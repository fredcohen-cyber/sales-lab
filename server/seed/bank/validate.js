// Checks the question bank before it is seeded: structure, wording conventions, section references,
// whether coaching can run for each question, and each stage's mix of buyers, levels, and brands.
// Run `node server/seed/bank/validate.js [stage ...]` to check stage files while writing them.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BRANDS, DEFAULT_PERSONAS, DIMENSION_KEYS, STAGES, SUBJECTS } from '../../domain.js';
import { parseSections } from '../../lib/text.js';
import { ravenlySectionMeta } from '../collections.js';
import { SEED_DRILLS } from '../drills.js';
import { BANK_FILES } from './index.js';

const PERSONA_KEYS = DEFAULT_PERSONAS.map((p) => p.key);
const sourceSections = (file) =>
  parseSections(readFileSync(new URL(`../sources/${file}`, import.meta.url), 'utf8')).filter((s) => s.key !== 'intro');

// The approved collections a question may cite, with each section's subjects.
export const COLLECTION_SECTIONS = {
  'sales-playbook': { brand: 'both', sections: sourceSections('sales-playbook.md').map((s) => ({ title: s.title, subjects: ['sales_technique'] })) },
  'ravenly-product': {
    brand: 'ravenly',
    sections: sourceSections('ravenly-sales-training.md').map((s) => ({ title: s.title, subjects: ravenlySectionMeta(s)?.subjects || [] })),
  },
};

// A reference names a section by the start of its title, for example "12 · " or "6. Objections".
export function resolveSectionRef(collection, prefix) {
  const c = COLLECTION_SECTIONS[collection];
  if (!c) return { error: `unknown collection “${collection}”` };
  const hits = c.sections.filter((s) => s.title.startsWith(prefix));
  if (hits.length !== 1) return { error: `“${prefix}” matches ${hits.length} sections in ${collection}` };
  return { section: hits[0], brand: c.brand };
}

const isBullets = (s) => {
  const lines = String(s || '').split('\n').filter((l) => l.trim());
  return lines.length >= 2 && lines.every((l) => l.startsWith('- '));
};
const quoted = (s) => /^“[\s\S]+”[.!?]?$/.test(String(s || '').trim());
const len = (s) => String(s || '').trim().length;

function checkQuestion(q, stage, problems) {
  const at = `${stage}/${q.slug || '(no slug)'}`;
  const bad = (msg) => problems.push(`${at}: ${msg}`);
  const stageDef = STAGES.find((s) => s.key === stage);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(q.slug || '')) bad('slug must be lowercase words joined by hyphens');
  if (q.stage !== stage) bad(`stage must be "${stage}"`);
  if (len(q.title) < 3 || len(q.title) > 80) bad('title must be 3 to 80 characters');
  if (!BRANDS[q.brand]) bad('unknown brand');
  if (!SUBJECTS[q.subject]) bad('unknown subject');
  if (q.brand !== 'ravenly' && q.subject !== 'sales_technique') bad('only Ravenly questions may test product or competitive facts; use sales_technique');
  if (!Array.isArray(q.roles) || !q.roles.length || q.roles.some((r) => !['ae', 'am'].includes(r)) || new Set(q.roles).size !== q.roles.length) bad('roles must be "ae", "am", or both');
  else if (!q.roles.includes(stageDef.track)) bad(`roles must include "${stageDef.track}" for this stage`);
  if (!Array.isArray(q.personas) || q.personas.length < 1 || q.personas.length > 2 || q.personas.some((p) => !PERSONA_KEYS.includes(p))) bad('personas must be one or two of the persona keys');
  const lines = q.personaLines || {};
  for (const k of Object.keys(lines)) if (!(q.personas || []).slice(1).includes(k)) bad(`personaLines.${k} is not a second persona of this question`);
  for (const k of (q.personas || []).slice(1)) if (!lines[k]) bad(`personaLines.${k} is missing`);
  for (const [k, v] of Object.entries(lines)) if (!quoted(v)) bad(`personaLines.${k} must be in curly quotes “…”`);
  if (len(q.situation) < 20 || len(q.situation) > 1200) bad('situation must be 20 to 1200 characters');
  if (!quoted(q.buyerLine) || len(q.buyerLine) > 600) bad('buyerLine must be in curly quotes “…” and under 600 characters');
  if (len(q.objective) < 10 || len(q.objective) > 600) bad('objective must be 10 to 600 characters');
  if (!isBullets(q.goodLooksLike) || len(q.goodLooksLike) > 2000) bad('goodLooksLike must be 2 or more "- " bullet lines, under 2000 characters');
  const guidance = q.roleGuidance || {};
  for (const [k, v] of Object.entries(guidance)) {
    if (!(q.roles || []).includes(k)) bad(`roleGuidance.${k} is for a role this question is not for`);
    if (!isBullets(v)) bad(`roleGuidance.${k} must be "- " bullet lines`);
  }
  if ((q.roles || []).length === 2 && (!guidance.ae || !guidance.am)) bad('a question for both roles needs roleGuidance for ae and am');
  if (!Array.isArray(q.pushbacks) || q.pushbacks.length !== 3) bad('pushbacks must list exactly 3 follow-up objections');
  else q.pushbacks.forEach((p, i) => (!quoted(p) || len(p) > 400) && bad(`pushbacks[${i}] must be in curly quotes “…” and under 400 characters`));
  if (!Array.isArray(q.assessed) || q.assessed.length < 2 || q.assessed.length > 4 || q.assessed.some((d) => !DIMENSION_KEYS.includes(d)) || new Set(q.assessed).size !== q.assessed.length) {
    bad('assessed must be 2 to 4 distinct dimension keys');
  }
  const needsFacts = q.subject !== 'sales_technique';
  if ((q.assessed || []).includes('product_accuracy') !== needsFacts) bad(needsFacts ? 'product and competitive questions assess product_accuracy' : 'sales technique questions do not assess product_accuracy');
  if (!Array.isArray(q.defaults) || q.defaults.length !== 3 || q.defaults.some((n) => !Number.isInteger(n) || n < 1 || n > 5)) bad('defaults must be [difficulty, skepticism, depth], each 1 to 5');
  const text = [q.title, q.situation, q.buyerLine, q.objective, q.goodLooksLike, ...Object.values(lines), ...Object.values(guidance), ...(q.pushbacks || [])].join('\n');
  if (/"/.test(text)) bad('use curly quotes “ ” instead of straight double quotes');
  if (/ -- |—/.test(text)) bad('avoid em dashes; use a comma, colon, or a new sentence');
  // Sources: approved collections only, and at least one section that covers the question's subject.
  let covers = false;
  let count = 0;
  for (const ref of q.sources || []) {
    for (const prefix of ref.sections || []) {
      count += 1;
      const hit = resolveSectionRef(ref.collection, prefix);
      if (hit.error) {
        bad(hit.error);
        continue;
      }
      if (hit.brand !== 'both' && hit.brand !== q.brand) bad(`“${hit.section.title}” is about ${hit.brand}, not ${q.brand}`);
      if (hit.section.subjects.includes(q.subject)) covers = true;
    }
  }
  if (count < 1 || count > 6) bad('sources must name 1 to 6 sections');
  else if (!covers) bad(`no cited section covers ${q.subject}, so coaching could not run`);
}

export function validateBank(files = BANK_FILES, { stages = Object.keys(files), complete = true } = {}) {
  const problems = [];
  const summary = {};
  const seen = new Map(SEED_DRILLS.map((d) => [d.slug, 'seeded drills']));
  for (const stage of stages) {
    const f = files[stage];
    if (!f) {
      problems.push(`${stage}: no such stage file`);
      continue;
    }
    for (const q of f.QUESTIONS) {
      if (seen.has(q.slug)) problems.push(`${stage}/${q.slug}: slug already used in ${seen.get(q.slug)}`);
      seen.set(q.slug, stage);
      checkQuestion(q, stage, problems);
    }
    const existing = SEED_DRILLS.filter((d) => d.stage === stage);
    for (const [slug, add] of Object.entries(f.EXISTING || {})) {
      const d = existing.find((x) => x.slug === slug);
      if (!d) {
        problems.push(`${stage}: EXISTING.${slug} is not a seeded drill in this stage`);
        continue;
      }
      if (!Array.isArray(add.pushbacks) || add.pushbacks.length !== 3 || add.pushbacks.some((p) => !quoted(p))) problems.push(`${stage}: EXISTING.${slug}.pushbacks must be 3 lines in curly quotes`);
      const g = add.roleGuidance || {};
      if (d.roles.length === 2 && (!isBullets(g.ae) || !isBullets(g.am))) problems.push(`${stage}: EXISTING.${slug} is for both roles, so it needs roleGuidance for ae and am`);
      for (const k of Object.keys(g)) if (!d.roles.includes(k)) problems.push(`${stage}: EXISTING.${slug}.roleGuidance.${k} is for a role the drill is not for`);
      // Sections the new pushbacks rely on, added to the drill's own.
      for (const ref of add.sources || []) {
        for (const prefix of ref.sections || []) {
          const hit = resolveSectionRef(ref.collection, prefix);
          if (hit.error) problems.push(`${stage}: EXISTING.${slug}.sources: ${hit.error}`);
          else if (hit.brand !== 'both' && hit.brand !== d.brand) problems.push(`${stage}: EXISTING.${slug}.sources: “${hit.section.title}” is about ${hit.brand}, not ${d.brand}`);
        }
      }
    }
    if (complete) {
      for (const d of existing) if (!f.EXISTING?.[d.slug]) problems.push(`${stage}: EXISTING is missing “${d.slug}”`);
    }
    // The stage's mix, counting the seeded drills already in it.
    const all = [
      ...existing.map((d) => ({ brand: d.brand, persona: d.personas[0], difficulty: d.defaults[0], roles: d.roles })),
      ...f.QUESTIONS.map((q) => ({ brand: q.brand, persona: q.personas?.[0], difficulty: q.defaults?.[0], roles: q.roles || [] })),
    ];
    const tally = (fn) => all.reduce((m, x) => ((m[fn(x)] = (m[fn(x)] || 0) + 1), m), {});
    const levels = tally((x) => (x.difficulty <= 2 ? 'easy (1-2)' : x.difficulty === 3 ? 'standard (3)' : x.difficulty === 4 ? 'advanced (4)' : 'expert (5)'));
    summary[stage] = { total: all.length, new: f.QUESTIONS.length, brands: tally((x) => x.brand), personas: tally((x) => x.persona), levels, roles: tally((x) => x.roles.join('+')) };
    if (complete) {
      const need = (cond, msg) => !cond && problems.push(`${stage}: ${msg}`);
      need(all.length >= 12, `has ${all.length} questions; needs at least 12`);
      for (const p of PERSONA_KEYS) need((summary[stage].personas[p] || 0) >= 3, `needs at least 3 questions led by ${p}`);
      need((levels['easy (1-2)'] || 0) >= 2, 'needs at least 2 easy questions (difficulty 1 or 2)');
      need((levels['standard (3)'] || 0) >= 3, 'needs at least 3 standard questions (difficulty 3)');
      need((levels['advanced (4)'] || 0) >= 3, 'needs at least 3 advanced questions (difficulty 4)');
      need((levels['expert (5)'] || 0) >= 1, 'needs at least 1 expert question (difficulty 5)');
      need((summary[stage].brands.omnizant || 0) >= 2, 'needs at least 2 Omnizant questions');
      need((summary[stage].brands.ravenly || 0) >= 5, 'needs at least 5 Ravenly questions');
    }
  }
  return { problems, summary };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const stages = process.argv.slice(2);
  const { problems, summary } = validateBank(BANK_FILES, stages.length ? { stages } : {});
  console.log(JSON.stringify(summary, null, 2));
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`- ${p}`);
    process.exitCode = 1;
  } else {
    console.log('\nNo problems found.');
  }
}
