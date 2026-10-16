// Issue a fresh single-use setup or reset link for the owner account and print it.
// Usage (for example with the Railway CLI): railway run npm run owner-link
import { loadConfig } from '../config.js';
import { createDb } from '../db.js';
import { migrate } from '../migrate.js';
import { seed } from '../seed/index.js';
import { createPasswordLink, linkUrl } from '../users/links.js';

const config = loadConfig();
const db = createDb(config.databaseUrl);
try {
  await migrate(db);
  await seed(db, config);
  const owner = await db.one(`SELECT * FROM users WHERE is_owner`);
  const link = await db.tx((q) => createPasswordLink(q, { userId: owner.id, purpose: owner.password_hash ? 'reset' : 'setup', createdBy: null }));
  console.log(`${owner.password_hash ? 'Reset' : 'Setup'} link for ${owner.email} (single use, valid 48 hours):`);
  console.log(linkUrl(config.publicUrl, link.token));
} finally {
  await db.end();
}
