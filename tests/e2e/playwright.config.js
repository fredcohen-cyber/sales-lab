import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const E2E_PORT = 3300;

export default defineConfig({
  testDir: here,
  testMatch: /.*\.spec\.js/,
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: path.join(here, '.artifacts', 'results'),
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1360, height: 900 },
  },
  webServer: {
    command: `node ${path.join(here, 'start-server.js')}`,
    url: `http://127.0.0.1:${E2E_PORT}/healthz`,
    timeout: 60_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
