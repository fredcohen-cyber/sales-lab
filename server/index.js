import { loadConfig, aiConfigured, voiceConfigured } from './config.js';
import { createDb } from './db.js';
import { migrate } from './migrate.js';
import { ownerSetupLinkIfNeeded, seed } from './seed/index.js';
import { createProvider } from './ai/provider.js';
import { createApp } from './app.js';
import { sweepStaleRuns, waitForEvaluations } from './ai/evaluate.js';
import { sweepVoiceCalls } from './voice/sweep.js';

const log = (...args) => console.log(...args);

async function main() {
  const config = loadConfig();
  const db = createDb(config.databaseUrl);
  await migrate(db, { log });
  await seed(db, config, { log });
  await ownerSetupLinkIfNeeded(db, config, log);

  const provider = createProvider(config);
  log(
    voiceConfigured(config)
      ? `[voice] Voice practice enabled: ${config.voice.provider} / ${config.voice.model}`
      : '[voice] Voice practice is not configured (set OPENAI_API_KEY).',
  );
  log(
    aiConfigured(config)
      ? `[coach] AI coaching enabled: ${config.ai.provider} / ${config.ai.model}`
      : '[coach] AI coaching is not configured (set ANTHROPIC_API_KEY). Drills will run as clearly labeled unscored practice.',
  );

  const app = createApp({ db, config, provider, log });
  const server = app.listen(config.port, () => log(`[http] Sales Lab listening on port ${config.port} (${config.publicUrl})`));

  const sweep = async () => {
    try {
      const n = await sweepStaleRuns(db);
      if (n) log(`[coach] marked ${n} stalled coaching run(s) as timed out`);
    } catch (err) {
      log(`[coach] sweep failed: ${err.message}`);
    }
    try {
      const v = await sweepVoiceCalls({ db, config, provider, log });
      if (v.overdue || v.stale) log(`[voice] ended ${v.overdue} call(s) at the time limit; marked ${v.stale} stalled coaching run(s)`);
    } catch (err) {
      log(`[voice] sweep failed: ${err.message}`);
    }
  };
  await sweep();
  const timer = setInterval(sweep, config.sweepIntervalMs);
  timer.unref();

  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    log(`[http] ${signal} received, shutting down`);
    clearInterval(timer);
    server.close();
    await Promise.race([waitForEvaluations(), new Promise((r) => setTimeout(r, 10_000))]);
    await db.end().catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
