import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../../server/db.js';
import { createPasswordLink, linkUrl } from '../../server/users/links.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SHOTS = path.join(here, '.artifacts', 'screens');
export const BASE = 'http://127.0.0.1:3300';
export const DB_URL = 'postgres://postgres@127.0.0.1:5432/saleslab_e2e';

// The owner's first link would normally come from the server log; tests mint one the same way.
export async function ownerSetupLink() {
  const db = createDb(DB_URL);
  try {
    const owner = await db.one(`SELECT id FROM users WHERE is_owner`);
    const link = await db.tx((q) => createPasswordLink(q, { userId: owner.id, purpose: 'setup', createdBy: null }));
    return linkUrl(BASE, link.token);
  } finally {
    await db.end();
  }
}

export async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

export async function signIn(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Company email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
