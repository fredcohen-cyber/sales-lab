// End-to-end: the Knowledge Library as collections of sections that are read, edited, approved, and
// arranged one at a time.
import { test, expect } from '@playwright/test';
import { BASE, ownerSetupLink, shot } from './util.js';

test.describe.configure({ mode: 'serial' });

const OWNER = { email: 'fred.cohen@omnizant.com', password: 'owner-password-123' };
let page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE, viewport: { width: 1360, height: 900 } });
  page = await context.newPage();
  // Works whether or not another spec already set the owner's password.
  await page.goto(await ownerSetupLink());
  await page.getByLabel('New password').fill(OWNER.password);
  await page.getByLabel('Confirm password').fill(OWNER.password);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page).toHaveURL(/\/login\?reset=1/);
  await page.getByLabel('Company email').fill(OWNER.email);
  await page.getByLabel('Password', { exact: true }).fill(OWNER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(`${BASE}/`);
});

test('the library lists the playbook and product knowledge as contents pages', async () => {
  await page.goto('/knowledge');
  await expect(page.getByRole('heading', { name: 'Sales playbook', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Product knowledge', level: 2 })).toBeVisible();
  const ravenly = page.locator('article.collection').filter({ has: page.getByRole('heading', { name: 'Ravenly product knowledge' }) });
  for (const group of ['Positioning and fit', 'Product capabilities', 'Competitive', 'Selling Ravenly']) {
    await expect(ravenly.getByRole('heading', { name: group, level: 4 })).toBeVisible();
  }
  const omnizant = page.locator('article.collection').filter({ has: page.getByRole('heading', { name: 'Omnizant product knowledge' }) });
  await expect(omnizant.getByText('Draft', { exact: true })).toHaveCount(3);
  // The AI Search Plans brief is its own collection of approved sections.
  const geo = page.locator('article.collection').filter({ has: page.getByRole('heading', { name: 'Omnizant AI Search Plans (GEO)' }) });
  await expect(geo.getByText('How the plans fit: Advantage AI and Max AI')).toBeVisible();
  await expect(geo.getByText('Draft', { exact: true })).toHaveCount(0);
  // The original documents are archived, so they appear only when asked for.
  await expect(page.getByRole('heading', { name: 'Other documents' })).toHaveCount(0);
  await page.getByLabel('Approval').selectOption('archived');
  await expect(page.getByRole('link', { name: 'Ravenly sales training and product reference' })).toBeVisible();
  await page.getByLabel('Approval').selectOption('');
  await shot(page, '40-knowledge-library');
});

test('a collection reads end to end, and a section links to its neighbors', async () => {
  await page.goto('/knowledge');
  await page.getByRole('link', { name: 'Sales Playbook', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sales Playbook', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Contents' }).getByRole('link')).toHaveCount(10);
  await expect(page.getByText('Caveats for every section')).toBeVisible();
  await shot(page, '41-playbook-reader');
  await page.getByRole('heading', { name: '6. Objections: each one is a request for clarity' }).getByRole('link').click();
  await expect(page.getByRole('heading', { name: '6. Objections: each one is a request for clarity', level: 1 })).toBeVisible();
  await expect(page.getByText('Section 7 of 10.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Drills that use this section' })).toBeVisible();
  await page.getByRole('link', { name: /Next section/ }).click();
  await expect(page.getByRole('heading', { name: '7. Follow-up and re-engagement', level: 1 })).toBeVisible();
});

test('the AI Search Plans collection reads as one brief', async () => {
  await page.goto('/knowledge');
  await page.getByRole('link', { name: 'Omnizant AI Search Plans (GEO)', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Omnizant AI Search Plans (GEO)', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Contents' }).getByRole('link')).toHaveCount(6);
  await expect(page.getByRole('cell', { name: 'Get Found' })).toBeVisible();
  await expect(page.getByText('Caveats for every section')).toBeVisible();
  await shot(page, '44-ai-search-plans');
});

test('editing one section waits for approval without touching the others', async () => {
  await page.goto('/knowledge');
  await page.getByRole('link', { name: '12 · Packaging, pricing, trial, and commercial discovery' }).click();
  await page.getByRole('link', { name: 'Edit as new version' }).click();
  await expect(page.getByRole('heading', { name: /^New version of/, level: 1 })).toBeVisible();
  const text = page.getByRole('textbox', { name: 'Section text' });
  await text.fill(`${await text.inputValue()}\n\n### Note for this test\n\nConfirm current prices before quoting.`);
  await page.getByLabel('Change note').fill('Added a reminder to confirm prices');
  await page.getByRole('button', { name: 'Save as draft' }).click();
  await expect(page.getByText('Not the approved version')).toBeVisible();
  await page.goto('/knowledge');
  const row = page.getByRole('link', { name: /12 · Packaging, pricing, trial, and commercial discovery/ });
  await expect(row.getByText('Edit awaiting approval')).toBeVisible();
  await expect(page.locator('.contents-row').filter({ hasText: 'Edit awaiting approval' })).toHaveCount(1);
  await row.click();
  await page.getByRole('link', { name: /^v2/ }).click();
  await page.getByRole('button', { name: 'Approve this version' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve version 2' }).click();
  await expect(page.getByText('Version approved')).toBeVisible();
  await page.goto('/knowledge');
  await expect(page.locator('.contents-row').filter({ hasText: 'Edit awaiting approval' })).toHaveCount(0);
});

test('sections are reordered and grouped without new versions, and new sections join a collection', async () => {
  await page.goto('/knowledge');
  const omnizant = page.locator('article.collection').filter({ has: page.getByRole('heading', { name: 'Omnizant product knowledge' }) });
  await omnizant.getByRole('link', { name: 'Edit or reorder' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Omnizant product knowledge', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Move “GEO (generative engine optimization)” up' }).click();
  await page.getByLabel('Group for “Web development”').fill('Build');
  await page.getByRole('button', { name: 'Save order and groups' }).click();
  await expect(page.getByText('Order and groups saved')).toBeVisible();
  await page.goto('/knowledge');
  await expect(omnizant.locator('.contents-title')).toHaveText(['Web development', 'GEO (generative engine optimization)', 'SEO (search engine optimization)']);
  await expect(omnizant.getByRole('heading', { name: 'Build', level: 4 })).toBeVisible();

  await omnizant.getByRole('link', { name: 'Add section' }).click();
  await expect(page.getByRole('heading', { name: 'Add a section to Omnizant product knowledge', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Brand')).toHaveValue('omnizant');
  await page.getByLabel('Title').fill('Website care plans');
  await page.getByLabel('Group').fill('Build');
  await page.getByRole('textbox', { name: 'Section text' }).fill('Monthly updates and security patches for firm websites. Confirm plan prices before quoting.');
  await page.getByRole('button', { name: 'Save as draft' }).click();
  await expect(page.getByRole('heading', { name: 'Website care plans', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Omnizant product knowledge' })).toBeVisible();
  await page.goto('/knowledge');
  // A new section joins the end of its group.
  await expect(omnizant.locator('.contents-title')).toHaveText(['Web development', 'Website care plans', 'GEO (generative engine optimization)', 'SEO (search engine optimization)']);
});

test('a long document splits into sections once its pending draft is approved', async () => {
  const headers = { 'x-requested-with': 'SalesLab' };
  const fields = { title: 'Omnizant SEO handbook', brand: 'omnizant', subjects: ['product'] };
  const text = (weeks) =>
    `# Omnizant SEO handbook\n\nHow we sell SEO to law firms.\n\n## Audits\n\nA technical audit in ${weeks} weeks.\n\n## Local SEO\n\nMap pack visibility for each office.`;
  const made = await page.request.post('/api/knowledge', { headers, data: { ...fields, content: text(3), approve: true } });
  expect(made.status()).toBe(201);
  const { id } = await made.json();
  expect((await page.request.post(`/api/knowledge/${id}/versions`, { headers, data: { ...fields, content: text(2) } })).status()).toBe(201);

  await page.goto(`/knowledge/${id}`);
  await page.getByRole('button', { name: 'Split into sections' }).click();
  const dialog = page.getByRole('dialog', { name: 'Split into sections' });
  await expect(dialog.getByText('Version 2 is not approved yet')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Split into 2 sections' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Approve this version' }).click();
  await page.getByRole('dialog', { name: 'Approve this version?' }).getByRole('button', { name: 'Approve version 2' }).click();
  await expect(page.getByText('Version approved')).toBeVisible();
  await page.getByRole('button', { name: 'Split into sections' }).click();
  await expect(dialog.getByText('The text before the first heading becomes the collection’s description.')).toBeVisible();
  await dialog.getByLabel('Collection name').fill('Omnizant SEO');
  await shot(page, '43-split-document');
  await dialog.getByRole('button', { name: 'Split into 2 sections' }).click();
  await expect(page.getByRole('heading', { name: 'Omnizant SEO', level: 1 })).toBeVisible();
  await expect(page.getByText('How we sell SEO to law firms.')).toBeVisible();
  await expect(page.getByText('A technical audit in 2 weeks.')).toBeVisible();
});
