// AI providers for coaching. Keys are read from server-side configuration only.

export class ProviderError extends Error {
  constructor(code, message, { status = null, detail = null } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export const RUN_ERROR_MESSAGES = {
  ai_not_configured: 'AI coaching is not set up. A manager needs to add an AI key.',
  timeout: 'Coaching took too long and was stopped. Your answer is saved; retry coaching.',
  rate_limited: 'The AI service is limiting requests right now. Your answer is saved; retry in a minute.',
  provider_unavailable: 'The AI service is busy or unavailable. Your answer is saved; retry in a minute.',
  auth_error: 'The AI service rejected the key. A manager needs to check the AI settings.',
  bad_request: 'The AI service could not process this request. A manager can check the AI settings.',
  invalid_response: 'The coaching response was incomplete, so no score was recorded. Your answer is saved; retry coaching.',
  refusal: 'The AI declined to evaluate this answer, so no score was recorded. A manager can review it.',
  network: 'Sales Lab could not reach the AI service. Your answer is saved; retry in a minute.',
  interrupted: 'Coaching was interrupted before it finished. Your answer is saved; retry coaching.',
  busy: 'Coaching is busy with other answers right now. Your answer is saved; retry in a minute.',
  internal: 'Something went wrong while recording coaching. Your answer is saved; retry coaching.',
};

function mapHttpError(status, json) {
  const apiMessage = json?.error?.message || json?.message || '';
  if (status === 401 || status === 403) return new ProviderError('auth_error', RUN_ERROR_MESSAGES.auth_error, { status, detail: apiMessage });
  if (status === 429) return new ProviderError('rate_limited', RUN_ERROR_MESSAGES.rate_limited, { status, detail: apiMessage });
  if (status === 408 || status === 504) return new ProviderError('timeout', RUN_ERROR_MESSAGES.timeout, { status, detail: apiMessage });
  if (status >= 500) return new ProviderError('provider_unavailable', RUN_ERROR_MESSAGES.provider_unavailable, { status, detail: apiMessage });
  return new ProviderError('bad_request', RUN_ERROR_MESSAGES.bad_request, { status, detail: apiMessage });
}

async function postJson(url, headers, body, timeoutMs, signal = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
  // A superseded run cancels its request so it stops using a coaching slot.
  if (signal?.aborted) controller.abort();
  else if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON error body */
    }
    if (!res.ok) throw mapHttpError(res.status, json);
    if (!json) throw new ProviderError('invalid_response', RUN_ERROR_MESSAGES.invalid_response, { detail: 'non-JSON response' });
    return json;
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (signal?.aborted) throw new ProviderError('interrupted', RUN_ERROR_MESSAGES.interrupted);
    if (controller.signal.aborted) throw new ProviderError('timeout', RUN_ERROR_MESSAGES.timeout);
    throw new ProviderError('network', RUN_ERROR_MESSAGES.network, { detail: err.cause?.code || err.message });
  } finally {
    clearTimeout(timer);
  }
}

function anthropicProvider(config) {
  const { anthropicKey, model, maxOutputTokens } = config.ai;
  return {
    name: 'anthropic',
    model,
    async evaluate(request, { timeoutMs, signal }) {
      const json = await postJson(
        'https://api.anthropic.com/v1/messages',
        { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        {
          model,
          max_tokens: maxOutputTokens,
          system: request.system,
          messages: [{ role: 'user', content: request.user }],
          tools: [request.tool],
          tool_choice: { type: 'tool', name: request.tool.name },
        },
        timeoutMs,
        signal,
      );
      if (json.stop_reason === 'refusal') throw new ProviderError('refusal', RUN_ERROR_MESSAGES.refusal);
      const block = (json.content || []).find((b) => b.type === 'tool_use' && b.name === request.tool.name);
      if (!block) {
        const why = json.stop_reason === 'max_tokens' ? 'response cut off at max_tokens' : `no tool call (stop_reason ${json.stop_reason})`;
        throw new ProviderError('invalid_response', RUN_ERROR_MESSAGES.invalid_response, { detail: why });
      }
      return { output: block.input, usage: json.usage || null, model: json.model || model };
    },
    async ping({ timeoutMs = 20_000 } = {}) {
      const json = await postJson(
        'https://api.anthropic.com/v1/messages',
        { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        { model, max_tokens: 16, messages: [{ role: 'user', content: 'Reply with the single word: ready' }] },
        timeoutMs,
      );
      return { model: json.model || model };
    },
  };
}

function openaiProvider(config) {
  const { openaiKey, model, maxOutputTokens } = config.ai;
  return {
    name: 'openai',
    model,
    async evaluate(request, { timeoutMs, signal }) {
      const json = await postJson(
        'https://api.openai.com/v1/chat/completions',
        { authorization: `Bearer ${openaiKey}` },
        {
          model,
          max_completion_tokens: maxOutputTokens,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
          tools: [{ type: 'function', function: { name: request.tool.name, description: request.tool.description, parameters: request.tool.input_schema } }],
          tool_choice: { type: 'function', function: { name: request.tool.name } },
        },
        timeoutMs,
        signal,
      );
      const choice = json.choices?.[0];
      if (choice?.message?.refusal) throw new ProviderError('refusal', RUN_ERROR_MESSAGES.refusal);
      const call = choice?.message?.tool_calls?.find((c) => c.function?.name === request.tool.name);
      if (!call) throw new ProviderError('invalid_response', RUN_ERROR_MESSAGES.invalid_response, { detail: `no tool call (${choice?.finish_reason})` });
      let output;
      try {
        output = JSON.parse(call.function.arguments);
      } catch {
        throw new ProviderError('invalid_response', RUN_ERROR_MESSAGES.invalid_response, { detail: 'tool arguments were not valid JSON' });
      }
      return { output, usage: json.usage || null, model: json.model || model };
    },
    async ping({ timeoutMs = 20_000 } = {}) {
      const json = await postJson(
        'https://api.openai.com/v1/chat/completions',
        { authorization: `Bearer ${openaiKey}` },
        { model, max_completion_tokens: 16, messages: [{ role: 'user', content: 'Reply with the single word: ready' }] },
        timeoutMs,
      );
      return { model: json.model || model };
    },
  };
}

// ---------------------------------------------------------------- test-only mock
// Deterministic, offline, and impossible to enable in production (see config.js).
// Answers can include [[mock:...]] markers to exercise failure paths in automated tests.
function mockProvider() {
  // Waits end early when the run is superseded, like a cancelled HTTP request.
  const sleep = (ms, signal) =>
    new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new ProviderError('interrupted', RUN_ERROR_MESSAGES.interrupted));
      const t = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new ProviderError('interrupted', RUN_ERROR_MESSAGES.interrupted));
      }, { once: true });
    });
  const firstWords = (s, n) => String(s).replace(/\[\[mock:[a-z]+\]\]/g, '').trim().split(/\s+/).slice(0, n).join(' ');
  return {
    name: 'mock',
    model: 'mock-evaluator',
    // Tests may set behavior to 'fail', 'slow', 'invalid', or 'hold' (wait until release()) for the next calls.
    behavior: null,
    delayMs: Number(process.env.MOCK_AI_DELAY_MS || 300),
    calls: 0,
    _waiters: [],
    release() {
      const w = this._waiters;
      this._waiters = [];
      w.forEach((fn) => fn());
    },
    _seen: new Set(),
    async evaluate(request, { timeoutMs, signal }) {
      this.calls += 1;
      const answer = /<rep_answer>\n([\s\S]*?)\n<\/rep_answer>/.exec(request.user)?.[1] || '';
      let mode = this.behavior;
      // "once" markers misbehave on the first call for an answer and succeed on the retry (browser tests).
      if (!mode && (answer.includes('[[mock:failonce]]') || answer.includes('[[mock:hangonce]]')) && !this._seen.has(answer)) {
        this._seen.add(answer);
        mode = answer.includes('[[mock:failonce]]') ? 'fail' : 'slow';
      }
      if (mode === 'hold') await new Promise((resolve) => this._waiters.push(resolve));
      if (mode === 'slow' || answer.includes('[[mock:slow]]')) {
        await sleep(timeoutMs + 500, signal);
        throw new ProviderError('timeout', RUN_ERROR_MESSAGES.timeout);
      }
      await sleep(Math.min(this.delayMs, timeoutMs), signal);
      if (mode === 'fail' || answer.includes('[[mock:fail]]')) {
        throw new ProviderError('provider_unavailable', RUN_ERROR_MESSAGES.provider_unavailable, { status: 529 });
      }
      if (mode === 'invalid') return { output: { summary: 'partial', dimensions: [] }, usage: null, model: 'mock-evaluator' };
      const keys = request.tool.input_schema.properties.dimensions.items.properties.key.enum;
      if (answer.includes('[[mock:invalid]]')) return { output: { summary: 'partial', dimensions: [] }, usage: null, model: 'mock-evaluator' };
      const quote = firstWords(answer, 6);
      const hasQuestion = answer.includes('?');
      const base = Math.min(92, 55 + Math.floor(answer.length / 12));
      const dimensions = keys.map((key, i) => ({
        key,
        score: Math.max(0, Math.min(100, base + (hasQuestion && (key === 'discovery' || key === 'advancing') ? 6 : 0) - i)),
        rationale: `Mock rationale for ${key}.`,
        evidence: [quote],
      }));
      const sourceMatch = /--- S1 section: [^\n]*\n([^\n]{40,})/.exec(request.user);
      const realSourceQuote = sourceMatch ? sourceMatch[1].replace(/[*_`#>|]/g, '').trim().split(/\s+/).slice(0, 8).join(' ') : '';
      const critical = [];
      const claims = [];
      if (answer.includes('[[mock:gtee]]')) {
        const sentence = /[^.!?]*guarantee[^.!?]*/i.exec(answer)?.[0]?.trim() || quote;
        critical.push({ type: 'unauthorized_guarantee', claim_quote: sentence, explanation: 'Promises a commercial result as certain.' });
      }
      if (answer.includes('[[mock:contradiction]]')) {
        critical.push({ type: 'contradicts_approved_fact', claim_quote: quote, source_ref: 'S1', source_quote: realSourceQuote, explanation: 'Contradicts the approved source.' });
      }
      if (answer.includes('[[mock:badsource]]')) {
        critical.push({ type: 'invented_capability', claim_quote: quote, source_ref: 'S1', source_quote: 'this sentence does not exist in any approved source', explanation: 'Claims an unavailable feature.' });
      }
      if (answer.includes('[[mock:unsupported]]')) {
        claims.push({ claim_quote: quote, status: 'unsupported', note: 'Not covered by approved material.' });
      }
      return {
        output: {
          summary: 'Mock evaluation for automated tests.',
          dimensions,
          strengths: [{ point: 'Opened directly.', evidence: quote }],
          improvements: [{ point: 'Ask a sharper question.', evidence: quote, suggestion: 'Ask what the problem costs them each week.' }],
          claims,
          critical_failures: critical,
          stronger_example: 'Mock stronger example response.',
          buyer_reaction: 'Mock buyer reaction.',
          next_focus: { dimension: keys[0], suggestion: 'Mock next focus.' },
          injection_detected: answer.includes('[[mock:inject]]'),
        },
        usage: null,
        model: 'mock-evaluator',
      };
    },
    async ping() {
      return { model: 'mock-evaluator' };
    },
  };
}

export function createProvider(config) {
  switch (config.ai.provider) {
    case 'anthropic':
      return config.ai.anthropicKey ? anthropicProvider(config) : null;
    case 'openai':
      return config.ai.openaiKey ? openaiProvider(config) : null;
    case 'mock':
      return mockProvider(config);
    default:
      return null;
  }
}
