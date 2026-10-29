// OpenAI's realtime voice for practice calls. The browser and OpenAI exchange audio directly over WebRTC;
// Sales Lab sits only in the setup: the browser sends its connection offer here, and the server forwards it
// with the session (model, voice, and the hidden instructions) under the server's own key. The key and the
// instructions never pass through the browser this way.
import { createHash } from 'node:crypto';
import { HttpError } from '../lib/errors.js';
import { buyerInstructions, transcriptionPrompt } from './scenario.js';

// The person who answers ends the call by calling this once they have said goodbye.
export const END_CALL_TOOL = {
  type: 'function',
  name: 'end_call',
  description: 'Hang up the phone. Use only after you have said goodbye to the caller.',
  parameters: {
    type: 'object',
    properties: {
      outcome: {
        type: 'string',
        enum: ['agreed_next_step', 'asked_for_information', 'not_interested', 'call_back_later', 'other'],
        description: 'How the call ended from your side.',
      },
    },
    required: ['outcome'],
  },
};

// mic: 'headset' for a close-talking microphone, 'room' for a laptop or desk microphone.
export function sessionConfig(scenario, config, { mic = 'headset' } = {}) {
  const v = config.voice;
  const session = {
    type: 'realtime',
    model: v.model,
    instructions: buyerInstructions(scenario, { maxCallMinutes: v.maxCallMinutes }),
    output_modalities: ['audio'],
    audio: {
      input: {
        noise_reduction: { type: mic === 'room' ? 'far_field' : 'near_field' },
        transcription: { model: v.transcribeModel, language: 'en', prompt: transcriptionPrompt(scenario) },
        // Semantic turn detection waits out a rep's "um" instead of jumping in, and either side can interrupt.
        turn_detection: { type: 'semantic_vad', eagerness: 'auto', create_response: true, interrupt_response: true },
      },
      output: { voice: scenario.buyer.voice },
    },
    tools: [END_CALL_TOOL],
    tool_choice: 'auto',
  };
  // Reasoning models think a little before each turn; on a phone call speed matters more.
  if (/^gpt-realtime-2/.test(v.model)) session.reasoning = { effort: 'low' };
  return session;
}

// The call id OpenAI returns in the Location header, e.g. /v1/realtime/calls/rtc_123.
export function callIdFrom(location) {
  const m = /\/realtime\/calls\/([^/?#\s]+)/.exec(String(location || ''));
  return m ? m[1] : null;
}

const MESSAGES = {
  auth: 'OpenAI rejected the voice key. A manager needs to check OPENAI_API_KEY in Railway.',
  quota: 'OpenAI refused the call because the account is out of credit or over its limit. A manager needs to check the OpenAI account’s billing.',
  busy: 'OpenAI’s voice service is busy right now. Try the call again in a minute.',
  bad: 'OpenAI could not start the call. Try again; if it keeps happening, a manager can check the voice settings.',
  network: 'Sales Lab could not reach OpenAI to start the call. Try again in a minute.',
};

// One opaque id per person, so OpenAI can attribute misuse to a user without learning who they are.
const safetyId = (userId) => createHash('sha256').update(`saleslab:${userId}`).digest('hex').slice(0, 32);

async function openai(config, path, { body, headers = {}, accept = 'application/json' }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.voice.requestTimeoutMs);
  try {
    return await fetch(`${config.voice.baseUrl}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.voice.openaiKey}`, accept, ...headers },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    throw new HttpError(503, 'voice_unreachable', MESSAGES.network, { detail: err.cause?.code || err.message });
  } finally {
    clearTimeout(timer);
  }
}

// Starts the call at OpenAI: returns the answer to the browser's connection offer, and the call's id.
export async function startRealtimeCall(config, { offerSdp, session, userId, log = () => {} }) {
  if (config.voice.provider === 'mock') {
    return { answerSdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=mock answer\r\nt=0 0\r\n', callId: `mock_${Date.now().toString(36)}` };
  }
  const form = new FormData();
  form.set('sdp', offerSdp);
  form.set('session', JSON.stringify(session));
  const res = await openai(config, '/realtime/calls', { body: form, accept: 'application/sdp', headers: { 'OpenAI-Safety-Identifier': safetyId(userId) } });
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 500);
    try {
      detail = JSON.parse(text)?.error?.message || detail;
    } catch {
      /* not JSON */
    }
    log(`[voice] OpenAI refused the call: HTTP ${res.status} ${detail}`);
    if (res.status === 401 || res.status === 403) throw new HttpError(502, 'voice_auth', MESSAGES.auth);
    if (res.status === 429) throw new HttpError(503, /quota|billing|credit/i.test(detail) ? 'voice_quota' : 'voice_busy', /quota|billing|credit/i.test(detail) ? MESSAGES.quota : MESSAGES.busy);
    if (res.status >= 500) throw new HttpError(503, 'voice_busy', MESSAGES.busy);
    throw new HttpError(502, 'voice_rejected', MESSAGES.bad);
  }
  if (!/^v=0/.test(text.trim())) {
    log(`[voice] OpenAI answered without a connection description: ${text.slice(0, 200)}`);
    throw new HttpError(502, 'voice_rejected', MESSAGES.bad);
  }
  return { answerSdp: text, callId: callIdFrom(res.headers.get('location')) };
}

// Ends the call at OpenAI so billing stops even if the browser never closed the connection. A call that
// already ended is fine.
export async function hangUpRealtimeCall(config, callId, log = () => {}) {
  if (!callId || config.voice.provider !== 'openai' || !config.voice.openaiKey) return;
  try {
    const res = await openai(config, `/realtime/calls/${encodeURIComponent(callId)}/hangup`, { accept: '*/*' });
    if (!res.ok && res.status !== 404) log(`[voice] hang-up for ${callId} returned HTTP ${res.status}`);
  } catch (err) {
    log(`[voice] hang-up for ${callId} failed: ${err.message}`);
  }
}
