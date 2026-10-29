// Starts Sales Lab for browser tests: fresh database, built client, test-only mock coaching.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshDatabase } from '../helpers.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = await freshDatabase('saleslab_e2e');
const child = spawn(process.execPath, [path.join(root, 'server/index.js')], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: '3300',
    DATABASE_URL: url,
    APP_BASE_URL: 'http://127.0.0.1:3300',
    AI_PROVIDER: 'mock',
    VOICE_PROVIDER: 'mock',
    SALES_LAB_ALLOW_MOCK_AI: 'yes-test-only',
    AI_TIMEOUT_MS: '6000',
    MOCK_AI_DELAY_MS: '2500',
    SWEEP_INTERVAL_MS: '2000',
  },
});
const stop = () => child.kill('SIGTERM');
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
child.on('exit', (code) => process.exit(code ?? 0));
