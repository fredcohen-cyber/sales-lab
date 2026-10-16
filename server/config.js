// Runtime configuration from environment variables. Secrets stay server-side.

function intFrom(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(env = process.env) {
  // Running on Railway counts as production even if NODE_ENV was not set: secure cookies,
  // proxy-aware client addresses, and no test-only coaching.
  const onRailway = Boolean(env.RAILWAY_ENVIRONMENT_NAME || env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID || env.RAILWAY_PUBLIC_DOMAIN);
  const nodeEnv = env.NODE_ENV || (onRailway ? 'production' : 'development');
  const isProduction = nodeEnv === 'production' || onRailway;
  const port = intFrom(env.PORT, 3000);
  if (isProduction && !env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add the Postgres connection string as a service variable.');
  }

  let publicUrl = env.APP_BASE_URL;
  if (!publicUrl && env.RAILWAY_PUBLIC_DOMAIN) publicUrl = `https://${env.RAILWAY_PUBLIC_DOMAIN}`;
  if (!publicUrl) publicUrl = `http://localhost:${port}`;
  publicUrl = publicUrl.replace(/\/+$/, '');

  const explicitProvider = (env.AI_PROVIDER || '').trim().toLowerCase();
  let provider = explicitProvider;
  if (!provider) {
    if (env.ANTHROPIC_API_KEY) provider = 'anthropic';
    else if (env.OPENAI_API_KEY) provider = 'openai';
    else provider = 'none';
  }
  if (!['anthropic', 'openai', 'mock', 'none'].includes(provider)) {
    throw new Error(`AI_PROVIDER must be anthropic, openai, or none (got "${provider}")`);
  }
  // The mock provider exists only for automated tests. It must never run where real people practice.
  if (provider === 'mock' && (isProduction || env.SALES_LAB_ALLOW_MOCK_AI !== 'yes-test-only')) {
    throw new Error('AI_PROVIDER=mock is only allowed in automated tests.');
  }

  const defaultModel = provider === 'openai' ? 'gpt-5' : 'claude-sonnet-5-5';

  return {
    nodeEnv,
    isProduction,
    port,
    publicUrl,
    databaseUrl: env.DATABASE_URL || 'postgres://postgres@127.0.0.1:5432/saleslab_dev',
    ownerEmail: (env.OWNER_EMAIL || 'fred.cohen@omnizant.com').trim().toLowerCase(),
    ownerName: (env.OWNER_NAME || 'Fred Cohen').trim(),
    trustProxy: env.TRUST_PROXY ? intFrom(env.TRUST_PROXY, 1) : isProduction ? 1 : 0,
    secureCookies: env.SECURE_COOKIES ? env.SECURE_COOKIES === 'true' : isProduction,
    ai: {
      provider,
      anthropicKey: env.ANTHROPIC_API_KEY || '',
      openaiKey: env.OPENAI_API_KEY || '',
      model: (env.AI_MODEL || defaultModel).trim(),
      timeoutMs: intFrom(env.AI_TIMEOUT_MS, 90_000),
      maxOutputTokens: intFrom(env.AI_MAX_OUTPUT_TOKENS, 4_000),
    },
    sweepIntervalMs: intFrom(env.SWEEP_INTERVAL_MS, 15_000),
  };
}

export function aiConfigured(config) {
  const { provider, anthropicKey, openaiKey } = config.ai;
  if (provider === 'anthropic') return Boolean(anthropicKey);
  if (provider === 'openai') return Boolean(openaiKey);
  if (provider === 'mock') return true;
  return false;
}
