// End-to-end: the whole manager and learner journey in a real browser against the real server.
// Coaching uses the test-only mock provider; nothing here talks to a real AI service.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { BASE, SHOTS, ownerSetupLink, shot } from './util.js';

test.describe.configure({ mode: 'serial' });

const OWNER = { name: 'Fred Cohen', email: 'fred.cohen@omnizant.com', password: 'owner-password-123' };
const VIC = { name: 'Vic Alvarez', email: 'vic.alvarez@ravenly.com', password: 'vic-first-password', reset: 'vic-second-password' };
const ANA = { name: 'Ana Ruiz', email: 'ana.ruiz@omnizant.com', password: 'ana-password-123' };
const ANSWER =
  'I hear you, and price matters. Before we talk numbers, can I ask how many after-hours leads you think you lose in a typical month? ' +
  'If one signed case covers the plan many times over, the real question is whether we catch the leads you are missing today. ' +
  'Could we look at last month together on Thursday?';
const DRILL = /That’s too expensive/;

const state = {};
let owner;
let vic;

async function newPage(browser, viewport = { width: 1360, height: 900 }) {
  const context = await browser.newContext({ baseURL: BASE, viewport });
  return context.newPage();
}

async function setPasswordFromLink(page, link, password) {
  await page.goto(link);
  await page.getByLabel('New password').fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page).toHaveURL(/\/login\?reset=1/);
}

async function signIn(page, email, password) {
  if (!page.url().includes('/login')) await page.goto('/login');
  await page.getByLabel('Company email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function addPerson(page, person, role = 'ae') {
  await page.goto('/users');
  await page.getByRole('button', { name: 'Add a person' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill(person.name);
  await dialog.getByLabel('Company email').fill(person.email);
  await dialog.getByLabel('Role').selectOption(role);
  await dialog.getByRole('button', { name: 'Add and create setup link' }).click();
  await expect(dialog.getByText('Setup link ready')).toBeVisible();
  const link = await dialog.getByLabel('Password link').inputValue();
  return { dialog, link };
}

async function submitAnswer(page, text) {
  await page.goto(state.drillUrl);
  await page.getByRole('textbox', { name: 'Your answer' }).fill(text);
  await page.getByRole('button', { name: 'Submit for coaching' }).click();
  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]{36}$/);
}

const toast = (page, text) => page.locator('.toast').filter({ hasText: text });
const score = (page) => page.getByLabel(/^Overall score \d+ out of 100$/);

test.beforeAll(() => fs.mkdirSync(SHOTS, { recursive: true }));
test.afterAll(async () => {
  await owner?.context().close();
  await vic?.context().close();
});

test('protected pages send visitors to the sign-in page', async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto('/manager');
  await expect(page).toHaveURL(/\/login\?next=%2Fmanager/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  const api = await page.request.get('/api/users');
  expect(api.status()).toBe(401);
  await signIn(page, OWNER.email, 'not-the-password');
  await expect(page.getByRole('alert')).toHaveText('That email and password do not match an active account.');
  await shot(page, '01-login');
  await page.context().close();
});

test('owner sets a password from the setup link and signs in', async ({ browser }) => {
  owner = await newPage(browser);
  await owner.goto(await ownerSetupLink());
  await expect(owner.getByRole('heading', { name: 'Set your password' })).toBeVisible();
  await expect(owner.getByText(`For ${OWNER.name} (${OWNER.email})`)).toBeVisible();
  await shot(owner, '02-set-password');
  await owner.getByLabel('New password').fill(OWNER.password);
  await owner.getByLabel('Confirm password').fill(OWNER.password);
  await owner.getByRole('button', { name: 'Save password' }).click();
  await expect(owner).toHaveURL(/\/login\?reset=1/);
  await expect(owner.getByText('Password saved. Sign in with your new password.')).toBeVisible();
  await expect(owner.getByLabel('Company email')).toHaveValue(OWNER.email);
  await owner.getByLabel('Password', { exact: true }).fill(OWNER.password);
  await owner.getByRole('button', { name: 'Sign in' }).click();
  await expect(owner.getByRole('heading', { name: 'Welcome back, Fred' })).toBeVisible();
  await expect(owner.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'User Management' })).toBeVisible();
  await shot(owner, '03-manager-home-empty');
});

test('manager adds Vic and gets a private setup link without seeing a password', async () => {
  await owner.goto('/users');
  await owner.getByRole('button', { name: 'Add a person' }).click();
  const dialog = owner.getByRole('dialog');
  await dialog.getByLabel('Full name').fill(VIC.name);
  await dialog.getByLabel('Company email').fill('vic.alvarez@gmail.com');
  await dialog.getByRole('button', { name: 'Add and create setup link' }).click();
  await expect(dialog.getByRole('alert')).toContainText('omnizant.com or ravenly.com');
  await dialog.getByLabel('Company email').fill(VIC.email);
  await dialog.getByRole('button', { name: 'Add and create setup link' }).click();
  await expect(dialog.getByText('Setup link ready')).toBeVisible();
  await expect(dialog).toContainText('Sales Lab does not email it, and you never see their password.');
  state.vicLink = await dialog.getByLabel('Password link').inputValue();
  expect(state.vicLink).toMatch(/^http:\/\/127\.0\.0\.1:3300\/set-password\/[A-Za-z0-9_-]{30,}$/);
  await shot(owner, '04-add-person-link');
  await dialog.getByRole('button', { name: 'Done' }).click();
  const row = owner.getByRole('row', { name: new RegExp(VIC.name) });
  await expect(row).toContainText('Setup link sent');
  await shot(owner, '05-user-management');
});

test('Vic sets a password, signs in, and the link cannot be reused', async ({ browser }) => {
  vic = await newPage(browser);
  await vic.goto(state.vicLink);
  await expect(vic.getByText(`For ${VIC.name} (${VIC.email})`)).toBeVisible();
  await vic.getByLabel('New password').fill('short');
  await expect(vic.getByText('At least 10 characters. A short phrase works well.')).toHaveClass(/error-text/);
  await setPasswordFromLink(vic, state.vicLink, VIC.password);
  await signIn(vic, VIC.email, VIC.password);
  await expect(vic.getByRole('heading', { name: 'Welcome back, Vic' })).toBeVisible();
  const nav = vic.getByRole('navigation', { name: 'Main' });
  for (const label of ['Practice Studio', 'Curriculum', 'My Progress', 'Knowledge Library']) await expect(nav.getByRole('link', { name: label })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'User Management' })).toHaveCount(0);
  await shot(vic, '06-rep-home');

  const again = await newPage(browser);
  await again.goto(state.vicLink);
  await expect(again.getByRole('heading', { name: 'This link can’t be used' })).toBeVisible();
  await expect(again.getByText('This link has already been used.')).toBeVisible();
  await again.context().close();
});

test('Vic practices a drill: draft survives a reload, the answer is saved first, then coaching appears', async () => {
  await vic.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Practice Studio' }).click();
  await expect(vic.getByRole('heading', { name: 'Practice Studio', level: 1 })).toBeVisible();
  await shot(vic, '07-practice-studio');
  await vic.getByRole('link', { name: DRILL }).click();
  await expect(vic.getByRole('heading', { name: DRILL, level: 1 })).toBeVisible();
  state.drillUrl = new URL(vic.url()).pathname;
  await expect(vic.getByText('Your goal')).toBeVisible();
  await vic.getByRole('textbox', { name: 'Your answer' }).fill(ANSWER);
  await shot(vic, '08-drill-runner');
  await vic.reload();
  await expect(vic.getByRole('textbox', { name: 'Your answer' })).toHaveValue(ANSWER);
  await vic.getByRole('button', { name: 'Submit for coaching' }).click();
  await expect(vic).toHaveURL(/\/attempts\/[0-9a-f-]{36}$/);
  await expect(vic.getByRole('status').filter({ hasText: 'Answer saved.' })).toBeVisible();
  await shot(vic, '09-coaching-running');
  await expect(score(vic)).toBeVisible({ timeout: 20_000 });
  await expect(vic.getByRole('heading', { name: 'What worked' })).toBeVisible();
  await expect(vic.getByRole('heading', { name: 'To improve' })).toBeVisible();
  await expect(vic.getByText('First attempt', { exact: true })).toBeVisible();
  state.vicAttemptUrl = new URL(vic.url()).pathname;
  await shot(vic, '10-coaching-result');

  // The draft was cleared once the answer was saved.
  await vic.goto(state.drillUrl);
  await expect(vic.getByRole('textbox', { name: 'Your answer' })).toHaveValue('');
});

test('failed coaching keeps the answer, invents nothing, and a retry succeeds', async () => {
  await submitAnswer(vic, `${ANSWER} [[mock:failonce]]`);
  await expect(vic.getByText('Coaching did not finish')).toBeVisible({ timeout: 20_000 });
  await expect(vic.getByText('The AI service is busy or unavailable. Your answer is saved; retry in a minute.')).toBeVisible();
  await expect(vic.getByText('No score was recorded, so nothing about this answer has been guessed.')).toBeVisible();
  await expect(vic.locator('.pad-text')).toContainText('[[mock:failonce]]');
  await expect(score(vic)).toHaveCount(0);
  await shot(vic, '11-coaching-failed');
  await vic.getByRole('button', { name: 'Retry coaching' }).click();
  await expect(score(vic)).toBeVisible({ timeout: 20_000 });
  await expect(vic.getByText('Retry 1', { exact: true })).toBeVisible();
});

test('Vic can stop waiting, and a timed-out evaluation can be retried later', async () => {
  await submitAnswer(vic, `${ANSWER} [[mock:hangonce]]`);
  await expect(vic.getByRole('status').filter({ hasText: 'Answer saved.' })).toBeVisible();
  await vic.getByRole('button', { name: 'Stop waiting' }).click();
  await expect(vic.getByText('You stopped waiting')).toBeVisible();
  await shot(vic, '12-stopped-waiting');
  // The server stops the stuck request on its own (6s test timeout); checking again shows that honestly.
  await vic.waitForTimeout(3000);
  await vic.getByRole('button', { name: 'Check again' }).click();
  await expect(vic.getByText('Coaching did not finish')).toBeVisible({ timeout: 20_000 });
  await expect(vic.getByText(/took too long and was stopped/)).toBeVisible();
  await vic.getByRole('button', { name: 'Retry coaching' }).click();
  await expect(score(vic)).toBeVisible({ timeout: 20_000 });
});

test('the manager reviews Vic’s answer, adds a note, and sees him on the dashboard', async () => {
  await owner.goto('/coaching?filter=all');
  await expect(owner.getByRole('heading', { name: 'Team Coaching' })).toBeVisible();
  await expect(owner.getByRole('link', { name: VIC.name }).first()).toBeVisible();
  await shot(owner, '13-team-coaching');
  await owner.goto(state.vicAttemptUrl);
  await expect(owner.getByRole('heading', { name: 'Manager review' })).toBeVisible();
  await expect(owner.getByText('Vic Alvarez wrote')).toBeVisible();
  await owner.getByLabel('Add a coaching note').fill('Good reframe. Next time, quantify one missed lead before you talk about price.');
  await owner.getByRole('button', { name: 'Add note' }).click();
  await expect(toast(owner, 'Coaching note added')).toBeVisible();
  await owner.getByRole('button', { name: 'Confirm evaluation' }).click();
  await expect(toast(owner, 'Evaluation confirmed')).toBeVisible();
  await shot(owner, '14-manager-review');

  await owner.goto('/manager');
  await expect(owner.getByRole('heading', { name: 'Manager Dashboard' })).toBeVisible();
  await expect(owner.getByRole('link', { name: VIC.name }).first()).toBeVisible();
  await shot(owner, '15-manager-dashboard');
  await owner.getByRole('link', { name: VIC.name }).first().click();
  await expect(owner.getByRole('heading', { name: VIC.name, level: 1 })).toBeVisible();
  await shot(owner, '16-rep-report');

  const csv = await owner.request.get('/api/reports/export.csv?type=attempts&period=30');
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain('Vic Alvarez');

  await vic.goto(state.vicAttemptUrl);
  await expect(vic.getByText('Good reframe. Next time, quantify one missed lead before you talk about price.')).toBeVisible();
  await expect(vic.getByRole('heading', { name: 'Manager review' })).toHaveCount(0);
});

test('a possible critical failure waits for the manager, who confirms it in review', async () => {
  await submitAnswer(vic, 'Absolutely. I guarantee you will sign more cases in the first month with Ravenly. [[mock:gtee]]');
  await expect(vic.getByText('Possible critical failure, waiting for manager review')).toBeVisible({ timeout: 20_000 });
  await expect(vic.getByLabel('Score pending manager review')).toBeVisible();
  await expect(vic.getByText(/If your manager confirms it, this answer scores 0/)).toBeVisible();
  state.cfAttemptUrl = new URL(vic.url()).pathname;
  await shot(vic, '15a-critical-pending');

  await owner.goto('/coaching');
  await expect(owner.getByText(/possible critical failure to decide/)).toBeVisible();
  await owner.goto(state.cfAttemptUrl);
  const save = owner.getByRole('button', { name: 'Save review' });
  await expect(save).toBeDisabled();
  await owner.getByLabel('Confirm critical failure (score 0)').check();
  await expect(save).toBeEnabled();
  await shot(owner, '15b-review-decisions');
  await save.click();
  await expect(toast(owner, 'Review saved: critical failure confirmed')).toBeVisible();

  await vic.reload();
  await expect(score(vic)).toHaveText(/^0/);
  await expect(vic.getByText('Critical failure', { exact: true })).toBeVisible();
});

test('learners see only their own records', async ({ browser }) => {
  const { dialog, link } = await addPerson(owner, ANA, 'am');
  await dialog.getByRole('button', { name: 'Done' }).click();
  const ana = await newPage(browser);
  await setPasswordFromLink(ana, link, ANA.password);
  await signIn(ana, ANA.email, ANA.password);
  await expect(ana.getByRole('heading', { name: 'Welcome back, Ana' })).toBeVisible();

  await ana.goto(state.vicAttemptUrl);
  await expect(ana.getByText('That answer was not found.')).toBeVisible();
  await expect(ana.getByText(ANSWER.slice(0, 40))).toHaveCount(0);
  await ana.goto('/manager');
  await expect(ana.getByRole('heading', { name: 'Managers only' })).toBeVisible();
  await ana.goto('/progress');
  await expect(ana.getByRole('heading', { name: 'My Progress' })).toBeVisible();
  await expect(ana.getByText(DRILL)).toHaveCount(0);

  const attemptId = state.vicAttemptUrl.split('/').pop();
  expect((await ana.request.get(`/api/practice/attempts/${attemptId}`)).status()).toBe(404);
  expect((await ana.request.get('/api/users')).status()).toBe(403);
  expect((await ana.request.get('/api/reports/summary')).status()).toBe(403);
  expect((await ana.request.get('/api/reviews?filter=all')).status()).toBe(403);
  await ana.context().close();
});

test('signing out ends the session, clears unsent drafts, and returns to the sign-in page', async () => {
  await vic.goto(state.drillUrl);
  await vic.getByRole('textbox', { name: 'Your answer' }).fill('A private draft Vic has not submitted yet.');
  await vic.goto('/');
  await vic.getByRole('button', { name: 'Sign out' }).click();
  await expect(vic).toHaveURL(/\/login\?signedout=1/);
  await expect(vic.getByText('You are signed out.')).toBeVisible();
  expect((await vic.request.get('/api/auth/me')).status()).toBe(401);
  await vic.goto('/progress');
  await expect(vic).toHaveURL(/\/login\?next=%2Fprogress/);
  const keys = await vic.evaluate(() => Object.keys(window.localStorage).filter((k) => k.startsWith('sales-lab-draft:')));
  expect(keys).toEqual([]);
  await signIn(vic, VIC.email, VIC.password);
  await expect(vic).toHaveURL(/\/progress$/);
  await expect(vic.getByRole('heading', { name: 'My Progress' })).toBeVisible();
  await shot(vic, '17-my-progress');
});

test('a password reset link replaces the password and signs out open sessions', async ({ browser }) => {
  await owner.goto('/users');
  await owner.getByRole('link', { name: VIC.name }).click();
  await expect(owner.getByRole('heading', { name: VIC.name, level: 1 })).toBeVisible();
  await owner.getByRole('button', { name: 'Create password reset link' }).click();
  await expect(owner.getByText('Password reset link ready')).toBeVisible();
  const first = await owner.getByLabel('Password link').inputValue();
  // A replacement link cancels the first one.
  await owner.getByRole('button', { name: 'Create a new setup link' }).or(owner.getByRole('button', { name: 'Create password reset link' })).click();
  await expect(owner.getByLabel('Password link')).not.toHaveValue(first);
  const second = await owner.getByLabel('Password link').inputValue();
  await shot(owner, '18-user-detail-reset');

  const other = await newPage(browser);
  await other.goto(first);
  await expect(other.getByRole('heading', { name: 'This link can’t be used' })).toBeVisible();
  await other.goto(second);
  await expect(other.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await setPasswordFromLink(other, second, VIC.reset);
  await other.context().close();

  // Vic's open session was signed out by the password change.
  await vic.goto('/progress');
  await expect(vic).toHaveURL(/\/login/);
  await signIn(vic, VIC.email, VIC.password);
  await expect(vic.getByRole('alert')).toHaveText('That email and password do not match an active account.');
  await signIn(vic, VIC.email, VIC.reset);
  await expect(vic).toHaveURL(/\/progress$/);
  await expect(vic.getByRole('heading', { name: 'My Progress' })).toBeVisible();
});

test('deactivation blocks Vic immediately, keeps his history, and reactivation needs a fresh sign-in', async () => {
  await owner.goto('/users');
  await owner.getByRole('link', { name: VIC.name }).click();
  await owner.getByRole('button', { name: 'Deactivate' }).click();
  await owner.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();
  await expect(toast(owner, 'Account deactivated')).toBeVisible();
  await expect(owner.getByText('Deactivated', { exact: true }).first()).toBeVisible();

  await vic.goto('/practice');
  await expect(vic).toHaveURL(/\/login/);
  await signIn(vic, VIC.email, VIC.reset);
  await expect(vic.getByRole('alert')).toHaveText('That email and password do not match an active account.');

  await owner.goto(state.vicAttemptUrl);
  await expect(owner.getByText('Vic Alvarez wrote')).toBeVisible();
  await owner.goBack();
  await owner.getByRole('button', { name: 'Reactivate' }).click();
  await expect(toast(owner, 'Account reactivated')).toBeVisible();
  await signIn(vic, VIC.email, VIC.reset);
  await expect(vic.getByRole('heading', { name: 'Practice Studio', level: 1 })).toBeVisible();
});

test('managers cannot deactivate or demote themselves, and the owner is protected', async () => {
  await owner.goto('/users');
  await owner.getByRole('link', { name: OWNER.name }).click();
  await expect(owner.getByRole('button', { name: 'Deactivate' })).toHaveCount(0);
  await expect(owner.getByLabel('Role')).toBeDisabled();
  await expect(owner.getByText('The owner account cannot be deactivated.')).toBeVisible();
});

test('remaining screens render for review', async ({ browser }) => {
  for (const [path, name, heading] of [
    ['/', '19-manager-home', /Welcome back, Fred/],
    ['/curriculum', '20-curriculum', 'Curriculum'],
    ['/knowledge', '21-knowledge', 'Knowledge Library'],
    ['/settings', '22-settings', 'Workspace Settings'],
  ]) {
    await owner.goto(path);
    await expect(owner.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await owner.waitForLoadState('networkidle');
    await shot(owner, name);
  }
  await owner.goto(`${state.drillUrl.replace('/practice/drill/', '/drills/')}/edit`);
  await expect(owner.getByRole('heading', { name: /^Edit/, level: 1 })).toBeVisible();
  // The drill's sources are sections of the playbook and the Ravenly collection, chosen whole.
  await expect(owner.getByText(/\d+ chosen\. Coaching reads them/)).toBeVisible();
  await expect(owner.locator('.picker-collection input[type="checkbox"]:checked').first()).toBeVisible();
  await shot(owner, '27-drill-editor');
  await owner.goto('/knowledge');
  await owner.getByRole('link', { name: 'Ravenly product knowledge' }).click();
  await expect(owner.getByRole('heading', { name: 'Ravenly product knowledge', level: 1 })).toBeVisible();
  await owner.getByRole('link', { name: '14 · Intaker battlecard' }).first().click();
  await expect(owner.getByRole('heading', { name: '14 · Intaker battlecard', level: 1 })).toBeVisible();
  await owner.screenshot({ path: `${SHOTS}/23-source.png` });

  const phone = await newPage(browser, { width: 390, height: 844 });
  await phone.goto('/login');
  await shot(phone, '24-phone-login');
  await signIn(phone, VIC.email, VIC.reset);
  await expect(phone.getByRole('heading', { name: 'Welcome back, Vic' })).toBeVisible();
  await shot(phone, '25-phone-home');
  await phone.goto(state.vicAttemptUrl);
  await expect(score(phone)).toBeVisible();
  await shot(phone, '26-phone-attempt');
  const width = await phone.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await phone.context().close();
});
