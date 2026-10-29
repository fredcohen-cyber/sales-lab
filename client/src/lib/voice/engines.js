// The phone line for practice calls. RealtimeCall talks to OpenAI over WebRTC: audio goes straight
// between the browser and OpenAI, and Sales Lab's server only forwards the connection offer (with the
// hidden brief and its own key). MockCall is the test stand-in: it plays scripted lines as the same
// events, and the rep "speaks" by typing.
import { ApiError } from '../../api.js';

async function connectionAnswer(callId, sdp, mic) {
  let res;
  try {
    res = await fetch(`/api/voice/calls/${callId}/connect?mic=${mic === 'room' ? 'room' : 'headset'}`, {
      method: 'POST',
      headers: { 'x-requested-with': 'SalesLab', 'content-type': 'application/sdp' },
      body: sdp,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'network', 'Sales Lab could not be reached. Check your connection and try again.');
  }
  const text = await res.text();
  if (!res.ok) {
    let err = {};
    try {
      err = JSON.parse(text).error || {};
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, err.code || 'error', err.message || `The call could not connect (${res.status}).`);
  }
  return text;
}

export class RealtimeCall {
  constructor({ callId, mic, onEvent, onDrop }) {
    this.callId = callId;
    this.mic = mic;
    this.onEvent = onEvent;
    this.onDrop = onDrop;
    this.stream = null;
    this.pc = null;
    this.dc = null;
    this.audio = null;
    this.closed = false;
  }

  // Asks for the microphone first, so a refusal is clear before anything is dialed or billed.
  async openMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new ApiError(0, 'no_mic', 'This browser cannot use a microphone here. Use Chrome or Edge on a computer.');
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      throw new ApiError(
        0,
        'no_mic',
        denied
          ? 'Sales Lab needs your microphone for the call. Allow it in the browser’s address bar, then dial again.'
          : 'No microphone was found. Plug in a headset, then dial again.',
      );
    }
    return this.stream;
  }

  async connect() {
    if (!this.stream) await this.openMic();
    const pc = new RTCPeerConnection();
    this.pc = pc;
    this.audio = new Audio();
    this.audio.autoplay = true;
    pc.ontrack = (e) => {
      this.audio.srcObject = e.streams[0];
      this.audio.play().catch(() => {});
    };
    pc.addTrack(this.stream.getAudioTracks()[0], this.stream);
    const dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.addEventListener('message', (e) => {
      let ev;
      try {
        ev = JSON.parse(e.data);
      } catch {
        return;
      }
      this.onEvent(ev);
    });
    const opened = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new ApiError(0, 'timeout', 'The call did not connect. Check your connection and dial again.')), 20000);
      dc.addEventListener('open', () => {
        clearTimeout(t);
        resolve();
      });
    });
    pc.addEventListener('connectionstatechange', () => {
      if (!this.closed && ['failed', 'disconnected', 'closed'].includes(pc.connectionState)) this.onDrop?.(pc.connectionState);
    });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const answer = await connectionAnswer(this.callId, offer.sdp, this.mic);
    await pc.setRemoteDescription({ type: 'answer', sdp: answer });
    await opened;
  }

  send(event) {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(event));
  }

  // A stage direction the person at the firm hears (never spoken or transcribed), then their turn.
  cue(text) {
    this.send({ type: 'conversation.item.create', item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] } });
    this.send({ type: 'response.create' });
  }

  // The person at the firm picks up and speaks first.
  pickUp() {
    this.cue('The phone rings and you pick up. Answer it now in one short line, then wait for the caller to speak.');
  }

  // The rep has gone quiet: the person at the firm reacts as anyone on a phone call would.
  nudge() {
    this.cue('The line has been quiet for several seconds. React the way you would on a phone call, in a few words.');
  }

  setMuted(muted) {
    for (const t of this.stream?.getAudioTracks() || []) t.enabled = !muted;
  }

  // On hang-up: the rep's last words are still transcribed, but the buyer says nothing more.
  beginHangUp() {
    this.setMuted(true);
    if (this.audio) this.audio.muted = true;
    this.send({ type: 'session.update', session: { type: 'realtime', audio: { input: { turn_detection: { type: 'semantic_vad', create_response: false, interrupt_response: false } } } } });
  }

  close() {
    this.closed = true;
    try {
      this.dc?.close();
    } catch {
      /* already closed */
    }
    try {
      this.pc?.close();
    } catch {
      /* already closed */
    }
    for (const t of this.stream?.getTracks() || []) t.stop();
    if (this.audio) this.audio.srcObject = null;
  }
}

// Test-only: the call's scripted lines (sent by the server only in automated tests) as realtime events.
export class MockCall {
  constructor({ callId, script, onEvent }) {
    this.callId = callId;
    this.script = script || [];
    this.onEvent = onEvent;
    this.next = 0;
    this.n = 0;
    this.timers = [];
    this.closed = false;
  }

  async openMic() {
    return null;
  }

  async connect() {
    await connectionAnswer(this.callId, 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=mock offer\r\nt=0 0\r\n', 'headset');
  }

  later(ms, fn) {
    this.timers.push(setTimeout(() => !this.closed && fn(), ms));
  }

  speak(text, { last = false } = {}) {
    const id = `buyer_${(this.n += 1)}`;
    const response = `resp_${this.n}`;
    this.onEvent({ type: 'response.output_item.added', item: { id, type: 'message', role: 'assistant' } });
    this.onEvent({ type: 'output_audio_buffer.started', response_id: response });
    this.later(250, () => {
      this.onEvent({ type: 'response.output_audio_transcript.done', item_id: id, transcript: text });
      this.onEvent({ type: 'output_audio_buffer.stopped', response_id: response });
      if (last) this.onEvent({ type: 'response.function_call_arguments.done', name: 'end_call', call_id: 'call_mock', arguments: '{"outcome":"other"}' });
    });
  }

  pickUp() {
    if (this.script.length) this.speak(this.script[this.next++]);
  }

  // The rep "says" a line.
  say(text) {
    const id = `rep_${(this.n += 1)}`;
    this.onEvent({ type: 'input_audio_buffer.speech_started', item_id: id, audio_start_ms: this.n * 1000 });
    this.onEvent({ type: 'input_audio_buffer.speech_stopped', item_id: id, audio_end_ms: this.n * 1000 + 1500 });
    this.later(100, () => this.onEvent({ type: 'conversation.item.input_audio_transcription.completed', item_id: id, transcript: text }));
    if (this.next < this.script.length) {
      const line = this.script[this.next++];
      const last = this.next >= this.script.length;
      this.later(400, () => this.speak(line, { last }));
    }
  }

  nudge() {}
  setMuted() {}
  beginHangUp() {}

  close() {
    this.closed = true;
    this.timers.forEach(clearTimeout);
  }
}

// A US ringback tone (440 + 480 Hz, two seconds on, four off) while the call connects.
export function startRingback() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return () => {};
  let ctx;
  try {
    ctx = new Ctx();
  } catch {
    return () => {};
  }
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  const oscs = [440, 480].map((f) => {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    o.connect(gain);
    o.start();
    return o;
  });
  const t0 = ctx.currentTime + 0.05;
  for (let i = 0; i < 10; i += 1) {
    gain.gain.setValueAtTime(0.06, t0 + i * 6);
    gain.gain.setValueAtTime(0, t0 + i * 6 + 2);
  }
  return () => {
    try {
      gain.gain.cancelScheduledValues(0);
      gain.gain.value = 0;
      oscs.forEach((o) => o.stop());
      ctx.close();
    } catch {
      /* already stopped */
    }
  };
}

// How loud the rep's microphone is, 0 to 1, a few times a second: shows the mic is working.
export function watchMicLevel(stream, onLevel) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!stream || !Ctx) return () => {};
  let ctx;
  try {
    ctx = new Ctx();
  } catch {
    return () => {};
  }
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  const timer = setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += ((v - 128) / 128) ** 2;
    onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
  }, 120);
  return () => {
    clearInterval(timer);
    try {
      ctx.close();
    } catch {
      /* already closed */
    }
  };
}
