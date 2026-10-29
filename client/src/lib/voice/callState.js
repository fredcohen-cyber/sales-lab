// A practice call as the screen sees it, built from OpenAI realtime events (the same events the test
// stand-in sends). Pure functions: no browser APIs, so they run in unit tests.
//
// Times are milliseconds since the call connected. The rep's talk time comes from OpenAI's own
// speech markers; the buyer's from when their audio started and stopped playing.

export function initialCallState() {
  return {
    items: {},
    order: [],
    repTalkMs: 0,
    buyerTalkMs: 0,
    repSpeaking: false,
    buyerSpeaking: false,
    buyerSince: null,
    repStarts: {},
    answeredAtMs: null,
    hangUp: null,
    error: null,
    closing: false,
  };
}

function withItem(state, id, speaker, atMs) {
  if (!id || state.items[id]) return state;
  return {
    ...state,
    items: { ...state.items, [id]: { id, speaker, text: '', final: false, failed: false, interrupted: false, atMs } },
    order: [...state.order, id],
  };
}

function patchItem(state, id, patch) {
  const item = state.items[id];
  if (!item) return state;
  return { ...state, items: { ...state.items, [id]: { ...item, ...(typeof patch === 'function' ? patch(item) : patch) } } };
}

function stopBuyer(state, nowMs) {
  if (!state.buyerSpeaking) return state;
  const talked = state.buyerSince === null ? 0 : Math.max(0, nowMs - state.buyerSince);
  return { ...state, buyerSpeaking: false, buyerSince: null, buyerTalkMs: state.buyerTalkMs + talked };
}

// One realtime event in, the next state out.
export function reduceCall(state, ev, nowMs) {
  if (!ev || typeof ev.type !== 'string') return state;
  switch (ev.type) {
    case 'input_audio_buffer.speech_started': {
      const s = withItem(state, ev.item_id, 'rep', nowMs);
      return { ...s, repSpeaking: true, repStarts: { ...s.repStarts, [ev.item_id]: ev.audio_start_ms } };
    }
    case 'input_audio_buffer.speech_stopped': {
      const start = state.repStarts[ev.item_id];
      const talked = typeof start === 'number' && typeof ev.audio_end_ms === 'number' ? Math.max(0, ev.audio_end_ms - start) : 0;
      return { ...state, repSpeaking: false, repTalkMs: state.repTalkMs + talked };
    }
    case 'conversation.item.input_audio_transcription.delta': {
      const s = withItem(state, ev.item_id, 'rep', nowMs);
      return patchItem(s, ev.item_id, (it) => (it.final ? {} : { text: it.text + (ev.delta || '') }));
    }
    case 'conversation.item.input_audio_transcription.completed': {
      const s = withItem(state, ev.item_id, 'rep', nowMs);
      return patchItem(s, ev.item_id, { text: String(ev.transcript || '').trim(), final: true });
    }
    case 'conversation.item.input_audio_transcription.failed': {
      const s = withItem(state, ev.item_id, 'rep', nowMs);
      return patchItem(s, ev.item_id, (it) => ({ final: true, failed: true, text: it.text }));
    }
    case 'response.output_item.added': {
      const item = ev.item || {};
      // Once the rep has hung up, nothing more the buyer says is part of the call.
      if (state.closing || item.type !== 'message' || item.role !== 'assistant') return state;
      return withItem(state, item.id, 'buyer', nowMs);
    }
    case 'response.output_audio_transcript.delta':
      return patchItem(state, ev.item_id, (it) => (it.final ? {} : { text: it.text + (ev.delta || '') }));
    case 'response.output_audio_transcript.done':
      return patchItem(state, ev.item_id, { text: String(ev.transcript || '').trim(), final: true });
    case 'output_audio_buffer.started':
      if (state.buyerSpeaking) return state;
      return { ...state, buyerSpeaking: true, buyerSince: nowMs, answeredAtMs: state.answeredAtMs ?? nowMs };
    case 'output_audio_buffer.stopped':
    case 'output_audio_buffer.cleared':
      return stopBuyer(state, nowMs);
    case 'response.done': {
      const r = ev.response || {};
      let s = state;
      // The rep talked over the buyer: what the buyer was saying was cut off.
      if (r.status === 'cancelled') {
        for (const out of r.output || []) if (out?.type === 'message') s = patchItem(s, out.id, { interrupted: true });
      }
      const call = (r.output || []).find((o) => o?.type === 'function_call' && o.name === 'end_call');
      if (call && !s.hangUp) s = { ...s, hangUp: { outcome: parseOutcome(call.arguments) } };
      return s;
    }
    case 'response.function_call_arguments.done':
      if (ev.name !== 'end_call' || state.hangUp) return state;
      return { ...state, hangUp: { outcome: parseOutcome(ev.arguments) } };
    case 'error':
      return { ...state, error: ev.error?.message || 'The voice service reported an error.' };
    default:
      return state;
  }
}

function parseOutcome(args) {
  try {
    return JSON.parse(args || '{}').outcome || 'other';
  } catch {
    return 'other';
  }
}

// The lines of the call so far, in order. Unfinished lines show what has been heard of them.
export function callLines(state) {
  return state.order.map((id) => state.items[id]).filter((it) => it && (it.text.trim() || it.failed));
}

// What is saved: finished, non-empty lines.
export function toTranscript(state) {
  return state.order
    .map((id) => state.items[id])
    .filter((it) => it && it.text.trim())
    .map((it) => ({ speaker: it.speaker, text: it.text.trim(), atMs: Math.max(0, Math.round(it.atMs)), ...(it.interrupted ? { interrupted: true } : {}) }));
}

// The rep's words still being transcribed: worth a moment's wait before hanging up for good.
export function pendingRepLines(state) {
  return state.order.map((id) => state.items[id]).filter((it) => it && it.speaker === 'rep' && !it.final).length;
}

export function talkTotals(state, nowMs) {
  const buyer = state.buyerSpeaking && state.buyerSince !== null ? state.buyerTalkMs + Math.max(0, nowMs - state.buyerSince) : state.buyerTalkMs;
  return { repMs: Math.round(state.repTalkMs), buyerMs: Math.round(buyer) };
}

export function clock(ms) {
  const s = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
