// Seeds the Practice Studio question bank, and gives the drills seeded earlier the buyer's follow-up
// objections and role expectations as a new version. Drills a manager has edited are left alone.
import { BANK_QUESTIONS, EXISTING_UPDATES, productOf } from './index.js';
import { SEED_DRILLS } from '../drills.js';

export const SEEDED_DRILL_NOTE = 'Seeded from the supplied Ravenly reference and Sales Playbook.';
export const BANK_NOTE = 'Practice Studio question bank, written from the approved Sales Playbook and Ravenly product knowledge.';
export const UPGRADE_NOTE = 'Added the buyer’s follow-up objections and, where the drill is for both roles, what a good answer does for each role.';

// Sections of the approved collections, found by the start of their titles.
async function sectionFinder(q) {
  const rows = await q.many(
    `SELECT c.slug AS collection, s.id, s.latest_version_id, v.title
       FROM knowledge_sources s
       JOIN knowledge_collections c ON c.id = s.collection_id
       JOIN knowledge_versions v ON v.id = s.latest_version_id
      WHERE s.status <> 'archived'`,
  );
  return (collection, prefix) => {
    const hits = rows.filter((r) => r.collection === collection && r.title.startsWith(prefix));
    return hits.length === 1 ? hits[0] : null;
  };
}

export async function seedQuestionBank(q, owner, log = () => {}, { questions = BANK_QUESTIONS, updates = EXISTING_UPDATES } = {}) {
  const find = await sectionFinder(q);
  let added = 0;
  for (const b of questions) {
    if (await q.one(`SELECT id FROM drills WHERE slug = $1`, [b.slug])) continue;
    const refs = [];
    for (const ref of b.sources) {
      for (const prefix of ref.sections) {
        const hit = find(ref.collection, prefix);
        if (!hit) {
          log(`[seed] question ${b.slug}: no single section “${prefix}” in ${ref.collection}; left out`);
          continue;
        }
        if (!refs.some((r) => r.sourceId === hit.id)) refs.push({ sourceId: hit.id, sections: [], versionId: hit.latest_version_id });
      }
    }
    const drill = await q.one(`INSERT INTO drills (slug, status, created_by) VALUES ($1, 'active', $2) RETURNING id`, [b.slug, owner.id]);
    const v = await insertSeedVersion(q, drill.id, 1, { ...b, sourceRefs: refs, changeNote: BANK_NOTE }, owner.id);
    await q.query(`UPDATE drills SET current_version_id = $2 WHERE id = $1`, [drill.id, v.id]);
    added += 1;
  }
  let upgraded = 0;
  for (const [slug, add] of Object.entries(updates)) {
    const cur = await q.one(
      `SELECT v.* FROM drills d JOIN drill_versions v ON v.id = d.current_version_id WHERE d.slug = $1`,
      [slug],
    );
    if (!cur) continue;
    if (cur.version !== 1 || cur.change_note !== SEEDED_DRILL_NOTE) {
      log(`[seed] drill ${slug} was edited, so its follow-up objections were not added`);
      continue;
    }
    const roleGuidance = Object.fromEntries(Object.entries(add.roleGuidance || {}).filter(([role]) => cur.roles.includes(role)));
    // Sections the new pushbacks rely on join the drill's own, chosen whole.
    const refs = [...(cur.source_refs || [])];
    for (const ref of add.sources || []) {
      for (const prefix of ref.sections) {
        const hit = find(ref.collection, prefix);
        if (hit && !refs.some((r) => r.sourceId === hit.id)) refs.push({ sourceId: hit.id, sections: [], versionId: hit.latest_version_id });
      }
    }
    const v = await q.one(
      `INSERT INTO drill_versions (drill_id, version, title, brand, subject, stage, roles, personas, situation, buyer_line, persona_lines,
         objective, good_looks_like, assessed_dimensions, default_difficulty, default_skepticism, default_depth, source_refs, change_note,
         created_by, role_guidance, pushbacks, product_line, concept)
       SELECT drill_id, 2, title, brand, subject, stage, roles, personas, situation, buyer_line, persona_lines,
              objective, good_looks_like, assessed_dimensions, default_difficulty, default_skepticism, default_depth, $6, $2,
              $3, $4, $5, product_line, concept
         FROM drill_versions WHERE id = $1
       RETURNING id`,
      [cur.id, UPGRADE_NOTE, owner.id, JSON.stringify(roleGuidance), JSON.stringify(add.pushbacks || []), JSON.stringify(refs)],
    );
    await q.query(`UPDATE drills SET current_version_id = $2, updated_at = now() WHERE id = $1`, [cur.drill_id, v.id]);
    upgraded += 1;
  }
  log(`[seed] question bank: ${added} questions added, ${upgraded} earlier drills given follow-up objections`);
  return { added, upgraded };
}

async function insertSeedVersion(q, drillId, version, b, ownerId) {
  return q.one(
    `INSERT INTO drill_versions (drill_id, version, title, brand, subject, stage, roles, personas, situation, buyer_line, persona_lines,
       objective, good_looks_like, assessed_dimensions, default_difficulty, default_skepticism, default_depth, source_refs, change_note,
       created_by, role_guidance, pushbacks, product_line, concept)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING id`,
    [
      drillId,
      version,
      b.title,
      b.brand,
      b.subject,
      b.stage,
      b.roles,
      b.personas,
      b.situation,
      b.buyerLine,
      JSON.stringify(b.personaLines || {}),
      b.objective,
      b.goodLooksLike,
      b.assessed,
      b.defaults[0],
      b.defaults[1],
      b.defaults[2],
      JSON.stringify(b.sourceRefs),
      b.changeNote,
      ownerId,
      JSON.stringify(b.roleGuidance || {}),
      JSON.stringify(b.pushbacks || []),
      productOf(b),
      b.concept || b.slug,
    ],
  );
}

// Sets each seeded question's product line and concept on its current version. Questions a manager has
// edited since are left alone. These two fields only sort and filter questions, so they are updated in
// place rather than as a new version.
export async function classifyBankDrills(q, log = () => {}, { questions = [...SEED_DRILLS, ...BANK_QUESTIONS] } = {}) {
  let changed = 0;
  for (const b of questions) {
    const r = await q.query(
      `UPDATE drill_versions v SET product_line = $2, concept = $3
         FROM drills d
        WHERE d.slug = $1 AND v.id = d.current_version_id AND v.change_note = ANY($4::text[])
          AND (v.product_line <> $2 OR v.concept <> $3)`,
      [b.slug, productOf(b), b.concept || b.slug, [SEEDED_DRILL_NOTE, BANK_NOTE, UPGRADE_NOTE]],
    );
    changed += r.rowCount;
  }
  log(`[seed] question bank: product line and concept set on ${changed} questions`);
  return changed;
}
