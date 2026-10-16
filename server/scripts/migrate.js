import { loadConfig } from '../config.js';
import { createDb } from '../db.js';
import { migrate } from '../migrate.js';
import { seed } from '../seed/index.js';

const config = loadConfig();
const db = createDb(config.databaseUrl);
try {
  await migrate(db);
  await seed(db, config);
  console.log('Database is up to date.');
} finally {
  await db.end();
}
