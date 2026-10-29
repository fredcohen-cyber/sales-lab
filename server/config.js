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

  // Voice practice: OpenAI's realtime voice plays the person who answers the call. Coaching on the call
  // still runs on the AI provider above. Like coaching, the stand-in exists only for automated tests.
  let voiceProvider = (env.VOICE_PROVIDER || '').trim().toLowerCase();
  if (!voiceProvider) voiceProvider = env.OPENAI_API_KEY ? 'openai' : 'none';
  if (!['openai', 'mock', 'none'].includes(voiceProvider)) {
    throw new Error(`VOICE_PROVIDER must be openai or none (got "${voiceProvider}")`);
  }
  if (voiceProvider === 'mock' && (isProduction || env.SALES_LAB_ALLOW_MOCK_AI !== 'yes-test-only')) {
    throw new Error('VOICE_PROVIDER=mock is only allowed in automated tests.');
  }

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
      // Needed only for an Anthropic key that works across several workspaces: requests must name one.
      anthropicWorkspaceId: (env.ANTHROPIC_WORKSPACE_ID || '').trim(),
      openaiKey: env.OPENAI_API_KEY || '',
      model: (env.AI_MODEL || defaultModel).trim(),
      timeoutMs: intFrom(env.AI_TIMEOUT_MS, 120_000),
      // Room for a full evaluation of a long reply with many product claims; a response cut off at this
      // limit is incomplete and has to be asked for again.
      maxOutputTokens: intFrom(env.AI_MAX_OUTPUT_TOKENS, 8_000),
      // At most this many coaching requests run at once; more wait their turn in a queue.
      maxConcurrent: intFrom(env.AI_MAX_CONCURRENT, 8),
      // How long a coaching request may wait for a free slot before it fails as "busy".
      queueWaitMs: intFrom(env.AI_QUEUE_WAIT_MS, 300_000),
      // Coaching runs one person may start per hour (new answers plus retries).
      runsPerUserPerHour: intFrom(env.AI_RUNS_PER_USER_PER_HOUR, 60),
    },
    voice: {
      provider: voiceProvider,
      openaiKey: env.OPENAI_API_KEY || '',
      // Only tests point this elsewhere (a stand-in for OpenAI's realtime calls endpoint).
      baseUrl: (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/+$/, ''),
      model: (env.VOICE_MODEL || 'gpt-realtime-2.1').trim(),
      transcribeModel: (env.VOICE_TRANSCRIBE_MODEL || 'gpt-4o-transcribe').trim(),
      // Calls are billed by the minute: each call ends at this length, and each person gets this many a day.
      maxCallMinutes: intFrom(env.VOICE_MAX_CALL_MINUTES, 10),
      callsPerDay: intFrom(env.VOICE_CALLS_PER_DAY, 20),
      requestTimeoutMs: intFrom(env.VOICE_REQUEST_TIMEOUT_MS, 20_000),
    },
    sweepIntervalMs: intFrom(env.SWEEP_INTERVAL_MS, 15_000),
  };
}

export function voiceConfigured(config) {
  const { provider, openaiKey } = config.voice;
  if (provider === 'openai') return Boolean(openaiKey);
  return provider === 'mock';
}

export function aiConfigured(config) {
  const { provider, anthropicKey, openaiKey } = config.ai;
  if (provider === 'anthropic') return Boolean(anthropicKey);
  if (provider === 'openai') return Boolean(openaiKey);
  if (provider === 'mock') return true;
  return false;
}
