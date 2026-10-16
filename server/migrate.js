import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const LOCK_KEY = 7_241_960_013; // arbitrary constant for pg_advisory_lock

// Applies pending SQL migrations in order. Safe to call on every boot.
export async function migrate(db, { log = console.log } = {}) {
  const client = await db.pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const done = new Set((await client.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      log(`[migrate] applying ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    } finally {
      client.release();
    }
  }
}
