import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DIMENSIONS, DEFAULT_PERSONAS, defaultProductLine } from '../domain.js';
import { SEED_DRILLS, SEED_PATHS } from './drills.js';
import { ADDED_SECTIONS, CALL_LEARNINGS, OMNIZANT_AI_SEARCH, SEED_COLLECTIONS } from './collections.js';
import { createCollection, createSection, splitDocument, splitSourceIntoCollection } from '../knowledge/sections.js';
import { classifyBankDrills, refreshCorrectedQuestions, seedQuestionBank, SEEDED_DRILL_NOTE } from './bank/seed.js';
import { CORRECTED_QUESTIONS, FIRST_BANK_QUESTIONS } from './bank/index.js';
import { createPasswordLink, linkUrl } from '../users/links.js';
import { audit } from '../lib/audit.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const SEED_SOURCES = [
  {
    slug: 'ravenly-sales-training',
    // Public website, one demo account, and competitors' own claims, labeled passage by passage.
    evidenceBasis: 'mixed',
    file: 'sources/ravenly-sales-training.md',
    title: 'Ravenly sales training and product reference',
    brand: 'ravenly',
    subjects: ['product', 'competitive', 'sales_technique'],
    asOfDate: '2026-10-11',
    caveats:
      'Research snapshot as of October 11, 2026, combining Ravenly’s public website, a read-only review of one demo account, and competitors’ own public materials. ' +
      '“Observed” means visible in the demo, not tested end to end. “Public claim” means a vendor website statement that was not tested. ' +
      '“Sales interpretation” is a proposed benefit, not a measured result. “Confirm” marks unresolved scope, entitlement, or policy. ' +
      'Prices and product status change: confirm before quoting. Section 21 lists open claims to resolve.',
    changeNote: 'Supplied by Fred Cohen (ravenly-sales-training.html, October 11, 2026), converted to Markdown without changing the text.',
  },
  {
    slug: 'sales-playbook',
    // The company's own sales guidance.
    evidenceBasis: 'documented',
    file: 'sources/sales-playbook.md',
    title: 'Sales Playbook',
    brand: 'both',
    subjects: ['sales_technique'],
    asOfDate: '2026-10-10',
    caveats:
      'Sales technique guidance for both brands, not product facts. The playbook itself notes that calling and texting are regulated (TCPA, do-not-call lists, state rules) and that scripts should be cleared with counsel before scaling outreach.',
    changeNote: 'Supplied by Fred Cohen (Sales Playbook doc, October 10, 2026), exported to Markdown. One embedded diagram is noted in text.',
  },
];

async function once(db, key, fn, log) {
  return db.tx(async (q) => {
    await q.query(`SELECT pg_advisory_xact_lock(hashtext('seed:' || $1))`, [key]);
    const done = await q.one(`SELECT key FROM seed_runs WHERE key = $1`, [key]);
    if (done) return false;
    await fn(q);
    await q.query(`INSERT INTO seed_runs (key) VALUES ($1)`, [key]);
    log(`[seed] applied ${key}`);
    return true;
  });
}

// Owner account first so seeded content can name a creator. Idempotent.
export async function ensureOwner(db, config) {
  return db.tx(async (q) => {
    await q.query(`SELECT pg_advisory_xact_lock(hashtext('seed:owner'))`);
    let owner = await q.one(`SELECT * FROM users WHERE is_owner`);
    if (!owner) {
      const existing = await q.one(`SELECT * FROM users WHERE email = $1`, [config.ownerEmail]);
      if (existing) {
        owner = await q.one(`UPDATE users SET is_owner = true, role = 'manager', status = 'active' WHERE id = $1 RETURNING *`, [existing.id]);
      } else {
        owner = await q.one(`INSERT INTO users (email, name, role, is_owner) VALUES ($1, $2, 'manager', true) RETURNING *`, [
          config.ownerEmail,
          config.ownerName,
        ]);
        await audit(q, { action: 'user.created', targetUserId: owner.id, entityType: 'user', entityId: owner.id, details: { email: owner.email, owner: true, by: 'system' } });
      }
    }
    return owner;
  });
}

// While the owner has no password, issue a fresh 48-hour setup link on each start and print it to the server log.
export async function ownerSetupLinkIfNeeded(db, config, log) {
  const owner = await db.one(`SELECT * FROM users WHERE is_owner`);
  if (!owner || owner.password_hash) return null;
  const link = await db.tx((q) => createPasswordLink(q, { userId: owner.id, purpose: 'setup', createdBy: null }));
  const url = linkUrl(config.publicUrl, link.token);
  log('');
  log('==================================================================');
  log(`Owner setup link for ${owner.email} (single use, valid 48 hours):`);
  log(url);
  log('A new link is printed each time the server starts until the owner sets a password.');
  log('==================================================================');
  log('');
  return url;
}

export async function seed(db, config, { log = console.log } = {}) {
  const owner = await ensureOwner(db, config);

  await once(
    db,
    'workspace-v1',
    async (q) => {
      const rubric = await q.one(
        `INSERT INTO rubric_versions (version, dimensions, note, created_by) VALUES (1, $1, $2, $3) RETURNING id`,
        [JSON.stringify(DEFAULT_DIMENSIONS), 'Initial weights from the Sales Lab specification. Calibrate against real answers.', owner.id],
      );
      await q.query(`INSERT INTO workspace_settings (id, current_rubric_id, updated_by) VALUES (1, $1, $2)`, [rubric.id, owner.id]);
      for (const p of DEFAULT_PERSONAS) {
        await q.query(`INSERT INTO personas (key, label, responsibilities, concerns, position) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`, [
          p.key,
          p.label,
          p.responsibilities,
          p.concerns,
          p.position,
        ]);
      }
    },
    log,
  );

  await once(
    db,
    'sources-v1',
    async (q) => {
      for (const s of SEED_SOURCES) {
        const content = await readFile(path.join(HERE, s.file), 'utf8');
        const src = await q.one(`INSERT INTO knowledge_sources (slug, created_by) VALUES ($1, $2) RETURNING id`, [s.slug, owner.id]);
        const v = await q.one(
          `INSERT INTO knowledge_versions (source_id, version, title, brand, subjects, personas, as_of_date, caveats, content, change_note, created_by, approved_at, approved_by, evidence_basis)
           VALUES ($1, 1, $2, $3, $4, '{}', $5, $6, $7, $8, $9, now(), $9, $10) RETURNING id`,
          [src.id, s.title, s.brand, s.subjects, s.asOfDate, s.caveats, content, s.changeNote, owner.id, s.evidenceBasis],
        );
        await q.query(`UPDATE knowledge_sources SET latest_version_id = $2, approved_version_id = $2, status = 'approved' WHERE id = $1`, [src.id, v.id]);
      }
    },
    log,
  );

  await once(
    db,
    'drills-v1',
    async (q) => {
      const sources = await q.many(`SELECT id, slug, latest_version_id FROM knowledge_sources WHERE slug IS NOT NULL`);
      const bySlug = new Map(sources.map((s) => [s.slug, s]));
      for (const d of SEED_DRILLS) {
        const refs = d.sources.map((s) => {
          const src = bySlug.get(s.source);
          if (!src) throw new Error(`Seed drill ${d.slug} references unknown source ${s.source}`);
          // versionId records which version the section keys come from.
          return { sourceId: src.id, sections: s.sections, versionId: src.latest_version_id };
        });
        const drill = await q.one(`INSERT INTO drills (slug, status, created_by) VALUES ($1, 'active', $2) RETURNING id`, [d.slug, owner.id]);
        const v = await q.one(
          `INSERT INTO drill_versions (drill_id, version, title, brand, subject, stage, roles, personas, situation, buyer_line, persona_lines,
             objective, good_looks_like, assessed_dimensions, default_difficulty, default_skepticism, default_depth, source_refs, change_note, created_by,
             product_line, concept)
           VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING id`,
          [
            drill.id,
            d.title,
            d.brand,
            d.subject,
            d.stage,
            d.roles,
            d.personas,
            d.situation,
            d.buyerLine,
            JSON.stringify(d.personaLines || {}),
            d.objective,
            d.goodLooksLike,
            d.assessed,
            d.defaults[0],
            d.defaults[1],
            d.defaults[2],
            JSON.stringify(refs),
            SEEDED_DRILL_NOTE,
            owner.id,
            defaultProductLine(d.brand),
            d.slug,
          ],
        );
        await q.query(`UPDATE drills SET current_version_id = $2 WHERE id = $1`, [drill.id, v.id]);
      }
    },
    log,
  );

  await once(
    db,
    'paths-v1',
    async (q) => {
      const drills = await q.many(`SELECT id, slug FROM drills WHERE slug IS NOT NULL`);
      const bySlug = new Map(drills.map((d) => [d.slug, d.id]));
      for (const p of SEED_PATHS) {
        const items = p.items.map(([slug, persona, difficulty, skepticism, depth]) => {
          const drillId = bySlug.get(slug);
          if (!drillId) throw new Error(`Seed path ${p.slug} references unknown drill ${slug}`);
          return { drillId, persona, difficulty, skepticism, depth };
        });
        await q.query(`INSERT INTO learning_paths (slug, name, description, audience, items, created_by) VALUES ($1, $2, $3, $4, $5, $6)`, [
          p.slug,
          p.name,
          p.description,
          p.audience,
          JSON.stringify(items),
          owner.id,
        ]);
      }
    },
    log,
  );

  // The playbook and the Ravenly guide become collections of sections that are edited one at a time.
  // Drills move to the matching sections; the two documents stay archived for history.
  await once(db, 'knowledge-sections-v1', (q) => createSeedCollections(q, owner, log), log);

  // The Practice Studio question bank: questions per stage, each with the buyer's follow-up objections.
  // Later questions cite material seeded below, so they are added by question-bank-v2.
  await once(db, 'question-bank-v1', (q) => seedQuestionBank(q, owner, log, { questions: FIRST_BANK_QUESTIONS }), log);

  // Omnizant's GEO offer, the AI Search Plans, from the positioning brief Fred supplied.
  await once(db, OMNIZANT_AI_SEARCH.seedKey, (q) => createDocumentCollection(q, owner, log, OMNIZANT_AI_SEARCH), log);

  // Single sections supplied later for existing collections, such as the Ravenly vs Intaker battle card.
  for (const spec of ADDED_SECTIONS) await once(db, spec.seedKey, (q) => addDocumentSection(q, owner, log, spec), log);

  // What 14 booked Omnizant calls taught: playbook field notes and new Omnizant sections.
  await once(db, CALL_LEARNINGS.seedKey, (q) => addCallLearnings(q, owner, log, CALL_LEARNINGS), log);

  // Buyer personas added after launch, such as the office manager or intake director.
  await once(
    db,
    'personas-v2',
    async (q) => {
      for (const p of DEFAULT_PERSONAS) {
        await q.query(`INSERT INTO personas (key, label, responsibilities, concerns, position) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`, [
          p.key,
          p.label,
          p.responsibilities,
          p.concerns,
          p.position,
        ]);
      }
    },
    log,
  );

  // Three versions of every concept: questions added since the first bank, corrections to first-bank
  // questions, and each question's product line and concept.
  await once(
    db,
    'question-bank-v2',
    async (q) => {
      await seedQuestionBank(q, owner, log);
      await refreshCorrectedQuestions(q, owner, log, { slugs: CORRECTED_QUESTIONS });
      await classifyBankDrills(q, log);
    },
    log,
  );
}

// Field notes for existing sections (a new approved version with the notes at the end) and new sections.
export async function addCallLearnings(q, owner, log, spec) {
  let appended = 0;
  for (const a of spec.appendTo) {
    if (await appendToSection(q, owner, log, { ...a, asOfDate: spec.asOfDate, changeNote: spec.changeNote })) appended += 1;
  }
  let added = 0;
  for (const s of spec.sections) {
    if (await addDocumentSection(q, owner, log, { ...s, asOfDate: spec.asOfDate, evidenceBasis: 'documented', changeNote: spec.changeNote })) added += 1;
  }
  log(`[seed] call learnings: field notes added to ${appended} sections, ${added} new sections`);
  return { appended, added };
}

// Adds text at the end of a section's approved version, as a new approved version. A section is left as
// it is when it cannot be found, has an unapproved draft (which the new version would leave behind), or
// already has the text.
export async function appendToSection(q, owner, log, { collectionSlug, titleStart, file, asOfDate, changeNote }) {
  const rows = await q.many(
    `SELECT s.id, s.latest_version_id, s.approved_version_id, v.* FROM knowledge_sources s
       JOIN knowledge_collections c ON c.id = s.collection_id JOIN knowledge_versions v ON v.id = s.approved_version_id
      WHERE c.slug = $1 AND s.status = 'approved' AND v.title LIKE $2`,
    [collectionSlug, `${titleStart.replace(/[%_\\]/g, '\\$&')}%`],
  );
  const where = `${collectionSlug} › ${titleStart}`;
  if (rows.length !== 1) {
    log(`[seed] field notes for “${where}” were not added: ${rows.length} approved sections match`);
    return null;
  }
  const sec = rows[0];
  if (sec.latest_version_id !== sec.approved_version_id) {
    log(`[seed] field notes for “${where}” were not added: the section has an unapproved draft`);
    return null;
  }
  const addition = (await readFile(path.join(HERE, file), 'utf8')).trim();
  const firstLine = addition.split('\n')[0];
  if (sec.content.includes(firstLine)) {
    log(`[seed] “${where}” already has these field notes`);
    return null;
  }
  const next = await q.one(`SELECT COALESCE(max(version), 0) + 1 AS v FROM knowledge_versions WHERE source_id = $1`, [sec.source_id]);
  const v = await q.one(
    `INSERT INTO knowledge_versions (source_id, version, title, brand, subjects, personas, as_of_date, caveats, content, change_note, created_by,
       approved_at, approved_by, evidence_basis)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $11, $12) RETURNING id`,
    [sec.source_id, next.v, sec.title, sec.brand, sec.subjects, sec.personas, asOfDate || sec.as_of_date, sec.caveats, `${sec.content.trim()}\n\n${addition}`, changeNote, owner.id, sec.evidence_basis],
  );
  await q.query(`UPDATE knowledge_sources SET latest_version_id = $2, approved_version_id = $2, updated_at = now() WHERE id = $1`, [sec.source_id, v.id]);
  log(`[seed] added field notes to “${sec.title}” (version ${next.v})`);
  return { sourceId: sec.source_id, versionId: v.id, version: next.v };
}

// Adds one section (approved unless the spec says approve: false), from a supplied document, at the end of
// its group in an existing collection (see ADDED_SECTIONS). Nothing is added when the collection is missing or already has a section with
// that title.
export async function addDocumentSection(q, owner, log, spec) {
  const collection = await q.one(`SELECT * FROM knowledge_collections WHERE slug = $1`, [spec.collectionSlug]);
  if (!collection) {
    log(`[seed] “${spec.title}” was not added: there is no collection “${spec.collectionSlug}”`);
    return null;
  }
  const exists = await q.one(
    `SELECT 1 FROM knowledge_sources s JOIN knowledge_versions v ON v.id = s.latest_version_id
      WHERE s.collection_id = $1 AND s.status <> 'archived' AND lower(v.title) = lower($2)`,
    [collection.id, spec.title],
  );
  if (exists) {
    log(`[seed] ${collection.name} already has a section “${spec.title}”, so it was left as it is`);
    return null;
  }
  const made = await createSection(q, {
    collection,
    title: spec.title,
    content: (await readFile(path.join(HERE, spec.file), 'utf8')).trim(),
    brand: spec.brand,
    subjects: spec.subjects,
    asOfDate: spec.asOfDate,
    caveats: spec.caveats,
    evidenceBasis: spec.evidenceBasis,
    group: spec.group,
    changeNote: spec.changeNote,
    approve: spec.approve !== false,
    actorId: owner.id,
  });
  log(`[seed] ${collection.name}: added “${spec.title}”${spec.approve === false ? ' as a draft' : ''}`);
  return made;
}

// A collection of approved sections made from one supplied document (see OMNIZANT_AI_SEARCH). Nothing
// changes when a collection with that slug already exists.
export async function createDocumentCollection(q, owner, log, spec) {
  if (await q.one(`SELECT 1 FROM knowledge_collections WHERE slug = $1`, [spec.slug])) {
    log(`[seed] ${spec.name}: a collection “${spec.slug}” already exists, so it was left as it is`);
    return null;
  }
  const { intro, sections } = splitDocument(await readFile(path.join(HERE, spec.file), 'utf8'));
  const collection = await createCollection(q, { slug: spec.slug, name: spec.name, kind: spec.kind, brand: spec.brand, description: intro, actorId: owner.id });
  for (const s of sections) {
    await createSection(q, {
      collection,
      title: s.title,
      content: s.content,
      brand: spec.brand,
      subjects: spec.subjects(s),
      asOfDate: spec.asOfDate,
      caveats: spec.caveats,
      evidenceBasis: spec.evidenceBasis,
      changeNote: spec.changeNote,
      approve: true,
      append: true,
      actorId: owner.id,
    });
  }
  log(`[seed] ${spec.name}: ${sections.length} approved sections`);
  return { collectionId: collection.id, sections: sections.length };
}

// Creates the starting collections. A document that cannot be split (edited since it was supplied, or
// archived) is left as it is and reported in the log, so the server always starts.
export async function createSeedCollections(q, owner, log, collections = SEED_COLLECTIONS) {
  for (const c of collections) {
    const collection =
      (await q.one(`SELECT * FROM knowledge_collections WHERE slug = $1`, [c.slug])) ||
      (await createCollection(q, { slug: c.slug, name: c.name, kind: c.kind, brand: c.brand, description: c.description, position: c.position, actorId: owner.id }));
    if (c.from) {
      const doc = await q.one(`SELECT id, status, collection_id, split_into_collection_id FROM knowledge_sources WHERE slug = $1`, [c.from]);
      if (doc && doc.status !== 'archived' && !doc.collection_id && !doc.split_into_collection_id) {
        await q.query('SAVEPOINT split_document');
        try {
          const out = await splitSourceIntoCollection(q, { sourceId: doc.id, collectionId: collection.id, actorId: owner.id, meta: c.meta, intro: 'skip' });
          await q.query('RELEASE SAVEPOINT split_document');
          log(`[seed] ${c.name}: ${out.sections.length} sections; ${out.drillVersionsUpdated} drill versions now point at them`);
          if (out.unmatched.length) log(`[seed] ${c.name}: ${out.unmatched.length} drill references could not follow their section and still point at the archived document`);
        } catch (err) {
          await q.query('ROLLBACK TO SAVEPOINT split_document');
          log(`[seed] ${c.name}: left “${c.from}” as one document (${err.message})`);
        }
      } else if (doc) {
        log(`[seed] ${c.name}: “${c.from}” is archived or already split, so it was not split`);
      }
    }
    for (const d of c.drafts || []) {
      await createSection(q, { collection, title: d.title, content: d.content, brand: c.brand, subjects: d.subjects, group: d.group, changeNote: 'Outline to fill in.', actorId: owner.id });
    }
  }
}
