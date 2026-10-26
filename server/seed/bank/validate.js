// Checks the question bank before it is seeded: structure, wording conventions, section references,
// whether coaching can run for each question, each concept's versions, and each stage's mix of buyers,
// levels, and brands.
//   node server/seed/bank/validate.js                       the whole bank, with every mix check
//   node server/seed/bank/validate.js more/pricing.js ...   only the questions in those files (no mix checks)
//   node server/seed/bank/validate.js pricing ...           the first bank's files for those stages
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BRANDS, DEFAULT_PERSONAS, DIMENSION_KEYS, PRODUCT_LINES, STAGES, SUBJECTS, defaultProductLine } from '../../domain.js';
import { parseSections } from '../../lib/text.js';
import { splitDocument } from '../../knowledge/sections.js';
import { CALL_LEARNINGS, OMNIZANT_AI_SEARCH, RAVENLY_VS_INTAKER, ravenlySectionMeta } from '../collections.js';
import { SEED_DRILLS } from '../drills.js';
import { BANK_FILES, EXTRA_FILES, conceptOf, productOf } from './index.js';

const PERSONA_KEYS = DEFAULT_PERSONAS.map((p) => p.key);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const sourceSections = (file) => parseSections(read(file)).filter((s) => s.key !== 'intro');

// The approved sections a question may cite, by collection, with each section's subjects. Drafts (such as
// Omnizant at a glance) are left out: coaching cannot use them.
export const COLLECTION_SECTIONS = {
  'sales-playbook': { brand: 'both', sections: sourceSections('sources/sales-playbook.md').map((s) => ({ title: s.title, subjects: ['sales_technique'] })) },
  'ravenly-product': {
    brand: 'ravenly',
    sections: [
      ...sourceSections('sources/ravenly-sales-training.md').map((s) => ({ title: s.title, subjects: ravenlySectionMeta(s)?.subjects || [] })),
      { title: RAVENLY_VS_INTAKER.title, subjects: RAVENLY_VS_INTAKER.subjects },
    ],
  },
  'omnizant-ai-search': {
    brand: 'omnizant',
    sections: splitDocument(read(OMNIZANT_AI_SEARCH.file)).sections.map((s) => ({ title: s.title, subjects: OMNIZANT_AI_SEARCH.subjects(s) })),
  },
  'omnizant-product': {
    brand: 'omnizant',
    sections: CALL_LEARNINGS.sections.filter((s) => s.approve !== false).map((s) => ({ title: s.title, subjects: s.subjects })),
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
const SLUG_PREFIX = {
  cold_outreach: 'cold-',
  discovery: 'disc-',
  demo: 'demo-',
  pricing: 'price-',
  competitor: 'comp-',
  closing: 'close-',
  stalled: 'stall-',
  am_adoption: 'adopt-',
  am_value: 'value-',
  am_renewal: 'renew-',
};

function checkQuestion(q, problems) {
  const at = `${q.stage || '(no stage)'}/${q.slug || '(no slug)'}`;
  const bad = (msg) => problems.push(`${at}: ${msg}`);
  const stageDef = STAGES.find((s) => s.key === q.stage);
  if (!stageDef) {
    bad('unknown stage');
    return;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(q.slug || '')) bad('slug must be lowercase words joined by hyphens');
  else if (!q.slug.startsWith(SLUG_PREFIX[q.stage])) bad(`slug must start with “${SLUG_PREFIX[q.stage]}” for this stage`);
  if (len(q.title) < 3 || len(q.title) > 80) bad('title must be 3 to 80 characters');
  if (!BRANDS[q.brand]) bad('unknown brand');
  if (!SUBJECTS[q.subject]) bad('unknown subject');
  if (q.brand === 'both' && q.subject !== 'sales_technique') bad('a question for both brands tests sales technique only');
  if (q.product !== undefined && !PRODUCT_LINES[q.product]) bad(`unknown product “${q.product}”`);
  else if (PRODUCT_LINES[productOf(q)]?.brand !== q.brand) bad(`product “${productOf(q)}” does not belong to brand “${q.brand}”`);
  if (!Array.isArray(q.roles) || !q.roles.length || q.roles.some((r) => !['ae', 'am'].includes(r)) || new Set(q.roles).size !== q.roles.length) bad('roles must be "ae", "am", or both');
  else if (!q.roles.includes(stageDef.track)) bad(`roles must include "${stageDef.track}" for this stage`);
  if (!Array.isArray(q.personas) || q.personas.length < 1 || q.personas.length > 2 || q.personas.some((p) => !PERSONA_KEYS.includes(p))) bad(`personas must be one or two of ${PERSONA_KEYS.join(', ')}`);
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
  if ((q.roles || []).length === 1 && Object.keys(guidance).length) bad('a question for one role keeps all its criteria in goodLooksLike (no roleGuidance)');
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
  if (q.concept !== undefined && (typeof q.concept !== 'string' || !q.concept || q.concept === q.slug)) bad('concept names another question’s slug; leave it out on a concept’s first question');
  // Sources: approved sections only, and at least one section that covers the question's subject.
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

// Every question in the bank, with the file it comes from ('seeded drills' for the drills seeded first).
function allQuestions(files) {
  const out = SEED_DRILLS.map((d) => ({ q: d, file: 'seeded drills', seeded: true }));
  for (const [stage, f] of Object.entries(files.bank)) for (const q of f.QUESTIONS) out.push({ q, file: `${stage}.js` });
  for (const [file, f] of Object.entries(files.extra)) for (const q of f.QUESTIONS) out.push({ q, file });
  return out;
}

// Concepts: each question names the first question of its concept, which must exist, sit in the same
// stage, and sell the same product.
function checkConcepts(entries, only, complete, problems) {
  const bySlug = new Map(entries.map((e) => [e.q.slug, e.q]));
  const concepts = new Map();
  for (const { q } of entries) {
    const key = conceptOf(q);
    if (!concepts.has(key)) concepts.set(key, []);
    concepts.get(key).push(q);
  }
  for (const { q, file } of entries) {
    if (only && !only.has(file)) continue;
    const key = conceptOf(q);
    if (key === q.slug) continue;
    const lead = bySlug.get(key);
    const at = `${q.stage}/${q.slug}`;
    if (!lead) problems.push(`${at}: concept “${key}” is not the slug of any question`);
    else if (conceptOf(lead) !== lead.slug) problems.push(`${at}: concept “${key}” is itself a version of “${conceptOf(lead)}”; name the first question`);
    else {
      if (lead.stage !== q.stage) problems.push(`${at}: its concept’s first question is in ${lead.stage}, not ${q.stage}`);
      if (productOf(lead) !== productOf(q)) problems.push(`${at}: its concept’s first question sells ${productOf(lead)}, not ${productOf(q)}`);
    }
  }
  if (!complete) return concepts;
  for (const [key, versions] of concepts) {
    if (!bySlug.has(key)) continue;
    const stage = versions[0].stage;
    if (versions.length < 3) problems.push(`${stage}: concept “${key}” has ${versions.length} version${versions.length === 1 ? '' : 's'}; needs 3`);
    if (new Set(versions.map((v) => v.personas?.[0])).size < Math.min(2, versions.length)) problems.push(`${stage}: concept “${key}” needs versions led by at least 2 different buyers`);
    const lines = versions.map((v) => String(v.buyerLine || '').trim());
    if (new Set(lines).size !== lines.length) problems.push(`${stage}: concept “${key}” repeats a buyer line`);
  }
  return concepts;
}

// args: stage keys (the first bank's files) or file paths such as "more/pricing.js" (checked alone).
export function validateBank({ bank = BANK_FILES, extra = EXTRA_FILES, args = [] } = {}) {
  const problems = [];
  const summary = {};
  const files = { bank, extra };
  const entries = allQuestions(files);
  const complete = args.length === 0;
  const only = complete
    ? null
    : new Set(args.map((a) => (bank[a] ? `${a}.js` : a)).concat(args.filter((a) => bank[a]).map(() => 'seeded drills')));
  for (const a of args) if (!bank[a] && !extra[a]) problems.push(`${a}: no such stage or file`);

  const seen = new Map();
  for (const { q, file, seeded } of entries) {
    if (seen.has(q.slug)) problems.push(`${q.stage}/${q.slug}: slug already used in ${seen.get(q.slug)}`);
    seen.set(q.slug, file);
    if (seeded) continue;
    if (only && !only.has(file)) continue;
    checkQuestion(q, problems);
  }
  const concepts = checkConcepts(entries, only, complete, problems);

  for (const [stage, f] of Object.entries(bank)) {
    if (only && !only.has(`${stage}.js`)) continue;
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
      for (const ref of add.sources || []) {
        for (const prefix of ref.sections || []) {
          const hit = resolveSectionRef(ref.collection, prefix);
          if (hit.error) problems.push(`${stage}: EXISTING.${slug}.sources: ${hit.error}`);
          else if (hit.brand !== 'both' && hit.brand !== d.brand) problems.push(`${stage}: EXISTING.${slug}.sources: “${hit.section.title}” is about ${hit.brand}, not ${d.brand}`);
        }
      }
    }
    if (complete) for (const d of existing) if (!f.EXISTING?.[d.slug]) problems.push(`${stage}: EXISTING is missing “${d.slug}”`);
  }

  // Each stage's mix, counting every file.
  for (const stage of STAGES.map((s) => s.key)) {
    const all = entries.filter((e) => e.q.stage === stage).map((e) => e.q);
    const tally = (fn) => all.reduce((m, x) => ((m[fn(x)] = (m[fn(x)] || 0) + 1), m), {});
    const levels = tally((x) => (x.defaults[0] <= 2 ? 'easy (1-2)' : x.defaults[0] === 3 ? 'standard (3)' : x.defaults[0] === 4 ? 'advanced (4)' : 'expert (5)'));
    summary[stage] = {
      total: all.length,
      concepts: [...concepts.values()].filter((v) => v[0].stage === stage).length,
      products: tally((x) => productOf(x)),
      personas: tally((x) => x.personas[0]),
      levels,
    };
    if (!complete) continue;
    const need = (cond, msg) => !cond && problems.push(`${stage}: ${msg}`);
    for (const p of PERSONA_KEYS) need((summary[stage].personas[p] || 0) >= 3, `needs at least 3 questions led by ${p}`);
    need((levels['easy (1-2)'] || 0) >= 2, 'needs at least 2 easy questions (difficulty 1 or 2)');
    need((levels['standard (3)'] || 0) >= 3, 'needs at least 3 standard questions (difficulty 3)');
    need((levels['advanced (4)'] || 0) >= 3, 'needs at least 3 advanced questions (difficulty 4)');
    need((levels['expert (5)'] || 0) >= 1, 'needs at least 1 expert question (difficulty 5)');
    const brands = tally((x) => x.brand);
    need((brands.omnizant || 0) >= 2, 'needs at least 2 Omnizant questions');
    need((brands.ravenly || 0) >= 5, 'needs at least 5 Ravenly questions');
  }
  return { problems, summary };
}

export const defaultProduct = defaultProductLine;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const { problems, summary } = validateBank({ args });
  console.log(JSON.stringify(summary, null, 2));
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`- ${p}`);
    process.exitCode = 1;
  } else {
    console.log(`\nNo problems found${args.length ? ` in ${args.join(', ')}` : ''}.`);
  }
}
