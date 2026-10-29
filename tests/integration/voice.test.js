// Practice Studio-Voice: setting up a call, dialing through OpenAI (a local stand-in here), saving and
// ending the call, written coaching on the transcript, limits, and who can see what.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { addUser, ownerClient, startTestApp, waitFor } from '../helpers.js';
import { sweepVoiceCalls } from '../../server/voice/sweep.js';

let h;
let owner;
let rep;
let other;
let am;
let fake;

const OFFER = 'v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';

// A stand-in for OpenAI's realtime calls endpoint: records what Sales Lab sends and answers as told.
function startFakeOpenAI() {
  const state = { mode: 'ok', calls: [], hangups: [] };
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    if (req.method === 'POST' && req.url === '/v1/realtime/calls') {
      const form = await new Response(body, { headers: { 'content-type': req.headers['content-type'] } }).formData();
      state.calls.push({ auth: req.headers.authorization, safety: req.headers['openai-safety-identifier'], sdp: form.get('sdp'), session: JSON.parse(form.get('session')) });
      if (state.mode === 'quota') {
        res.writeHead(429, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'You exceeded your current quota, please check your plan and billing details.', type: 'insufficient_quota' } }));
      }
      if (state.mode === 'auth') {
        res.writeHead(401, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'Incorrect API key provided.' } }));
      }
      res.writeHead(201, { 'content-type': 'application/sdp', location: `/v1/realtime/calls/rtc_test_${state.calls.length}` });
      return res.end('v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=OpenAI answer\r\nt=0 0\r\n');
    }
    const hang = /^\/v1\/realtime\/calls\/([^/]+)\/hangup$/.exec(req.url);
    if (req.method === 'POST' && hang) {
      state.hangups.push(hang[1]);
      res.writeHead(200);
      return res.end();
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ state, server, url: `http://127.0.0.1:${server.address().port}/v1` })));
}

before(async () => {
  h = await startTestApp({ dbName: 'saleslab_test_voice' });
  owner = await ownerClient(h);
  ({ client: rep } = await addUser(h, owner, { name: 'Vera Voice', email: 'vera@ravenly.com', role: 'ae' }));
  ({ client: other } = await addUser(h, owner, { name: 'Otto Other', email: 'otto@ravenly.com', role: 'ae' }));
  ({ client: am } = await addUser(h, owner, { name: 'Amy Manager', email: 'amy@omnizant.com', role: 'am' }));
  fake = await startFakeOpenAI();
});
after(async () => {
  await h.close();
  await new Promise((r) => fake.server.close(r));
});

const useOpenAI = () => Object.assign(h.config.voice, { provider: 'openai', openaiKey: 'sk-test-voice', baseUrl: fake.url });
const useMock = () => Object.assign(h.config.voice, { provider: 'mock', openaiKey: '', baseUrl: 'https://api.openai.com/v1' });
const dial = (client, id, mic) => client.req('POST', `/api/voice/calls/${id}/connect${mic ? `?mic=${mic}` : ''}`, undefined, { raw: { body: OFFER, type: 'application/sdp' } });
const transcript = (repLines, { buyerFirst = 'Good morning, this is the front desk.' } = {}) => {
  const out = [{ speaker: 'buyer', text: buyerFirst, atMs: 1000 }];
  repLines.forEach((t, i) => {
    out.push({ speaker: 'rep', text: t, atMs: 4000 + i * 9000 });
    out.push({ speaker: 'buyer', text: `Buyer reply ${i + 1}. We mostly use the phone here.`, atMs: 8000 + i * 9000 });
  });
  return out;
};
const GOOD_LINES = [
  'Hi, this is Vera with Ravenly. I help law firms respond to website inquiries faster. Did I catch you at a bad time?',
  'Fair enough. How does your team handle a website inquiry that comes in at eight at night today?',
  'Would it be worth fifteen minutes on Thursday at two to see whether it fits?',
];

async function startCall(client, body = { productLine: 'ravenly' }) {
  const r = await client.post('/api/voice/calls', body);
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data.call;
}
async function waitForCallCoaching(client, id) {
  return waitFor(async () => {
    const r = await client.get(`/api/voice/calls/${id}`);
    return r.data.call.coaching.status !== 'running' ? r.data.call : null;
  });
}

test('the voice screen offers each product and buyer for the rep’s role, with the daily limit', async () => {
  const r = await rep.get('/api/voice');
  assert.equal(r.status, 200);
  assert.equal(r.data.configured, true);
  assert.deepEqual(
    r.data.callTypes.map((t) => t.key),
    ['prospect'],
    'an account executive calls new prospects',
  );
  const ravenly = r.data.callTypes[0].products.find((p) => p.key === 'ravenly');
  assert.ok(ravenly.calls > 0);
  assert.ok(ravenly.personas.some((p) => p.key === 'office_manager' && p.calls > 0));
  assert.deepEqual(r.data.limits, { maxCallMinutes: 10, callsPerDay: 20, usedToday: 0 });
  assert.equal(r.data.team, undefined, 'reps do not see the team’s calls');
  assert.equal(r.data.model, undefined);

  const forAm = await am.get('/api/voice');
  assert.deepEqual(
    forAm.data.callTypes.map((t) => t.key),
    ['client'],
    'an account manager calls existing clients',
  );
  const forOwner = await owner.get('/api/voice');
  assert.deepEqual(
    forOwner.data.callTypes.map((t) => t.key),
    ['prospect', 'client'],
  );
  assert.ok(Array.isArray(forOwner.data.team));
});

test('a call is set up from a hidden question: the rep sees only the product and who picks up', async () => {
  useOpenAI();
  try {
    const call = await startCall(rep, { productLine: 'ravenly', persona: 'office_manager' });
    assert.equal(call.status, 'ready');
    assert.equal(call.callType, 'prospect');
    assert.equal(call.productLabel, 'Ravenly');
    assert.equal(call.persona.key, 'office_manager');
    assert.match(call.phone, /^\(\d{3}\) 555-01\d{2}$/);
    assert.equal(call.revealed, null);
    assert.deepEqual(call.transcript, []);
    assert.equal(call.mockScript, undefined);
    const row = await h.db.one(`SELECT scenario FROM voice_calls WHERE id = $1`, [call.id]);
    const text = JSON.stringify(call);
    for (const hidden of [row.scenario.situation, row.scenario.buyerLine, row.scenario.buyer.name, row.scenario.buyer.firm]) {
      assert.ok(!text.includes(hidden), `the rep must not see "${hidden}" before the call`);
    }
    assert.equal(row.scenario.persona.key, 'office_manager');
    assert.ok(['cold_outreach'].includes(row.scenario.stage));
    assert.ok(row.scenario.assessedDimensions.some((d) => d.key === 'discovery'));
    assert.ok(row.scenario.assessedDimensions.some((d) => d.key === 'advancing'));

    // Starting another call sets the undialed one aside.
    const next = await startCall(rep, { productLine: 'omnizant_web' });
    assert.equal((await h.db.one(`SELECT status FROM voice_calls WHERE id = $1`, [call.id])).status, 'abandoned');
    await rep.post(`/api/voice/calls/${next.id}/end`, { transcript: [] });
  } finally {
    useMock();
  }
});

test('dialing forwards the offer to OpenAI with the hidden session, under the server’s key', async () => {
  useOpenAI();
  try {
    const call = await startCall(rep, { productLine: 'ravenly' });
    const before = fake.state.calls.length;
    const r = await dial(rep, call.id, 'room');
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.match(r.headers.get('content-type'), /application\/sdp/);
    assert.match(r.data, /^v=0/);
    const sent = fake.state.calls.at(-1);
    assert.equal(fake.state.calls.length, before + 1);
    assert.equal(sent.auth, 'Bearer sk-test-voice');
    assert.match(sent.safety, /^[0-9a-f]{32}$/, 'a hashed person id, never their email');
    assert.equal(sent.sdp.trim(), OFFER.trim());
    const s = sent.session;
    const row = await h.db.one(`SELECT scenario, status, openai_call_id, connected_at FROM voice_calls WHERE id = $1`, [call.id]);
    assert.equal(s.type, 'realtime');
    assert.equal(s.model, 'gpt-realtime-2.1');
    assert.deepEqual(s.output_modalities, ['audio']);
    assert.equal(s.audio.output.voice, row.scenario.buyer.voice);
    assert.equal(s.audio.input.noise_reduction.type, 'far_field');
    assert.equal(s.audio.input.transcription.model, 'gpt-4o-transcribe');
    assert.equal(s.audio.input.turn_detection.type, 'semantic_vad');
    assert.deepEqual(s.reasoning, { effort: 'low' });
    assert.equal(s.tools[0].name, 'end_call');
    assert.ok(s.instructions.includes(row.scenario.buyer.name));
    assert.ok(s.instructions.includes(row.scenario.buyer.firm));
    assert.ok(s.instructions.includes(row.scenario.situation));
    assert.match(s.instructions, /never say so/);
    assert.equal(row.status, 'live');
    assert.equal(row.openai_call_id, `rtc_test_${fake.state.calls.length}`);
    assert.ok(row.connected_at);

    // Dialing twice never opens a second paid session.
    const again = await dial(rep, call.id);
    assert.equal(again.status, 409);
    assert.equal(fake.state.calls.length, before + 1);
    // Only the caller can dial their call.
    assert.equal((await dial(other, call.id)).status, 404);
    assert.equal((await dial(owner, call.id)).status, 403);

    const ended = await rep.post(`/api/voice/calls/${call.id}/end`, { transcript: transcript(GOOD_LINES), durationMs: 40_000, talk: { repMs: 20_000, buyerMs: 15_000 } });
    assert.equal(ended.status, 200);
    await waitFor(() => fake.state.hangups.includes(row.openai_call_id));
  } finally {
    useMock();
  }
});

test('when OpenAI refuses, the rep is told why in plain words and can dial the same call again', async () => {
  useOpenAI();
  try {
    const call = await startCall(rep, { productLine: 'ravenly' });
    fake.state.mode = 'quota';
    const r = await dial(rep, call.id);
    assert.equal(r.status, 503);
    assert.equal(r.data.error.code, 'voice_quota');
    assert.match(r.data.error.message, /billing/);
    let row = await h.db.one(`SELECT status, connect_error FROM voice_calls WHERE id = $1`, [call.id]);
    assert.equal(row.status, 'ready');
    assert.match(row.connect_error, /billing/);

    fake.state.mode = 'auth';
    const bad = await dial(rep, call.id);
    assert.equal(bad.status, 502);
    assert.match(bad.data.error.message, /OPENAI_API_KEY/);

    fake.state.mode = 'ok';
    assert.equal((await dial(rep, call.id)).status, 201);
    row = await h.db.one(`SELECT status, connect_error FROM voice_calls WHERE id = $1`, [call.id]);
    assert.deepEqual([row.status, row.connect_error], ['live', null]);
    await rep.post(`/api/voice/calls/${call.id}/end`, { transcript: [] });
  } finally {
    fake.state.mode = 'ok';
    useMock();
  }
});

test('a finished call is coached in writing; the hidden brief, transcript, and feedback appear only after it ends', async () => {
  const call = await startCall(rep, { productLine: 'ravenly' });
  assert.ok(Array.isArray(call.mockScript), 'the test stand-in reads its lines from the call');
  assert.equal((await dial(rep, call.id)).status, 201);

  const partial = transcript(GOOD_LINES.slice(0, 1));
  assert.equal((await rep.post(`/api/voice/calls/${call.id}/progress`, { transcript: partial, talk: { repMs: 5000, buyerMs: 3000 }, notes: 'Front desk screens' })).status, 200);
  let mid = (await rep.get(`/api/voice/calls/${call.id}`)).data.call;
  assert.equal(mid.status, 'live');
  assert.deepEqual(mid.transcript, [], 'no transcript is sent back during the call');
  assert.equal(mid.revealed, null);
  assert.equal(mid.notes, 'Front desk screens');

  const lines = [...transcript(GOOD_LINES), { speaker: 'rep', text: '   ', atMs: 60_000 }];
  const ended = await rep.post(`/api/voice/calls/${call.id}/end`, {
    transcript: lines,
    durationMs: 61_000,
    talk: { repMs: 22_000, buyerMs: 18_000 },
    endReason: 'buyer_hung_up',
    notes: 'Booked Thursday 2pm',
  });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  assert.equal(ended.data.call.status, 'ended');
  assert.equal(ended.data.call.endReason, 'buyer_hung_up');
  assert.equal(ended.data.call.coaching.status, 'running');

  const done = await waitForCallCoaching(rep, call.id);
  assert.equal(done.coaching.status, 'done', JSON.stringify(done.coaching));
  assert.equal(done.transcript.length, 7, 'empty lines are dropped');
  assert.ok(done.durationMs > 0 && done.durationMs <= 61_000);
  assert.ok(done.revealed.situation.length > 20);
  assert.ok(done.revealed.buyerLine.length > 5);
  assert.ok(done.revealed.buyer.name && done.revealed.buyer.firm);
  const ev = done.coaching.evaluation;
  assert.equal(typeof done.score, 'number');
  assert.equal(ev.score, done.score);
  assert.ok(ev.dimensionScores.filter((d) => d.assessed).every((d) => d.evidence.every((q) => GOOD_LINES.join(' ').includes(q))), 'evidence quotes the rep only');
  assert.equal(ev.keyMoments.length, 1);
  assert.ok(GOOD_LINES[0].includes(ev.keyMoments[0].repQuote));
  assert.equal(ev.outcome.nextStep, 'booked');
  assert.equal(ev.feedback.strongerExample, undefined);

  const coached = h.provider.requests.filter((x) => x.tool.name === 'record_call_evaluation').at(-1).user;
  assert.match(coached, /<rep>Hi, this is Vera with Ravenly/);
  assert.match(coached, /<buyer>Good morning, this is the front desk\.<\/buyer>/);
  assert.match(coached, /Talk time measured by Sales Lab: rep 55%, buyer 45%/);
  assert.match(coached, /Hidden from the rep/);

  // Ending again changes nothing.
  const twice = await rep.post(`/api/voice/calls/${call.id}/end`, { transcript: [], endReason: 'rep_hung_up' });
  assert.equal(twice.data.call.endReason, 'buyer_hung_up');

  const list = (await rep.get('/api/voice')).data;
  const row = list.calls.find((c) => c.id === call.id);
  assert.equal(row.score, done.score);
  assert.equal(row.nextStep, 'booked');
  assert.equal(row.firm, done.revealed.buyer.firm);
  assert.equal(list.limits.usedToday >= 1, true);
});

test('a call too short to coach is kept but not coached; coaching that fails can be retried', async () => {
  const short = await startCall(rep);
  await dial(rep, short.id);
  const s = await rep.post(`/api/voice/calls/${short.id}/end`, { transcript: transcript(['Hello?']), durationMs: 5000 });
  assert.equal(s.data.call.coaching.status, 'skipped');
  assert.match(s.data.call.coaching.error, /before you said enough/);

  const call = await startCall(rep);
  await dial(rep, call.id);
  h.provider.behavior = 'fail';
  try {
    await rep.post(`/api/voice/calls/${call.id}/end`, { transcript: transcript(GOOD_LINES), durationMs: 30_000 });
    const failed = await waitForCallCoaching(rep, call.id);
    assert.equal(failed.coaching.status, 'failed');
    assert.match(failed.coaching.error, /Your call is saved/);
    assert.equal(failed.coaching.detail, null, 'reps do not see technical detail');
    const asManager = (await owner.get(`/api/voice/calls/${call.id}`)).data.call;
    assert.match(asManager.coaching.detail, /529/);
  } finally {
    h.provider.behavior = null;
  }
  assert.equal((await other.post(`/api/voice/calls/${call.id}/coach`, {})).status, 404);
  const retry = await rep.post(`/api/voice/calls/${call.id}/coach`, {});
  assert.equal(retry.status, 200);
  assert.equal(retry.data.call.coaching.status, 'running');
  const done = await waitForCallCoaching(rep, call.id);
  assert.equal(done.coaching.status, 'done');
  assert.equal((await rep.post(`/api/voice/calls/${call.id}/coach`, {})).status, 409, 'nothing to retry');
});

test('a guarantee on the call is flagged as a possible critical failure without zeroing the practice score', async () => {
  const call = await startCall(rep);
  await dial(rep, call.id);
  await rep.post(`/api/voice/calls/${call.id}/end`, {
    transcript: transcript([...GOOD_LINES.slice(0, 2), 'I guarantee you will sign more cases in your first month with us. [[mock:gtee]]']),
    durationMs: 30_000,
  });
  const done = await waitForCallCoaching(rep, call.id);
  const ev = done.coaching.evaluation;
  assert.equal(ev.criticalFailures.length, 1);
  assert.equal(ev.criticalFailures[0].type, 'unauthorized_guarantee');
  assert.ok(done.score > 0);
});

test('only the caller and managers can see a call; managers see the team’s calls', async () => {
  const call = await startCall(rep);
  await dial(rep, call.id);
  await rep.post(`/api/voice/calls/${call.id}/end`, { transcript: transcript(GOOD_LINES), durationMs: 30_000 });
  await waitForCallCoaching(rep, call.id);
  assert.equal((await other.get(`/api/voice/calls/${call.id}`)).status, 404);
  assert.equal((await other.get(`/api/voice/calls/not-a-call`)).status, 404);
  const asOwner = await owner.get(`/api/voice/calls/${call.id}`);
  assert.equal(asOwner.status, 200);
  assert.equal(asOwner.data.call.learner.name, 'Vera Voice');
  const team = (await owner.get('/api/voice')).data.team;
  assert.ok(team.some((c) => c.id === call.id && c.learner.name === 'Vera Voice'));
  assert.equal((await other.post(`/api/voice/calls/${call.id}/progress`, { transcript: [] })).status, 404);
});

test('calls stop at the daily limit, and one live call at a time', async () => {
  const used = (await other.get('/api/voice')).data.limits.usedToday;
  const first = await startCall(other);
  assert.equal((await dial(other, first.id)).status, 201);
  const second = await startCall(other);
  const busy = await dial(other, second.id);
  assert.equal(busy.status, 409);
  assert.equal(busy.data.error.code, 'on_another_call');
  await other.post(`/api/voice/calls/${first.id}/end`, { transcript: [] });

  const limit = h.config.voice.callsPerDay;
  h.config.voice.callsPerDay = used + 1;
  try {
    const blocked = await other.post('/api/voice/calls', { productLine: 'ravenly' });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.data.error.code, 'voice_daily_limit');
    // A call set up before the limit was reached cannot be dialed past it either.
    assert.equal((await dial(other, second.id)).status, 429);
  } finally {
    h.config.voice.callsPerDay = limit;
  }
});

test('a call left running past the time limit is hung up at OpenAI and coached from what was saved', async () => {
  useOpenAI();
  try {
    const call = await startCall(rep);
    assert.equal((await dial(rep, call.id)).status, 201);
    await rep.post(`/api/voice/calls/${call.id}/progress`, { transcript: transcript(GOOD_LINES), talk: { repMs: 30_000, buyerMs: 20_000 } });
    const { openai_call_id: openaiId } = await h.db.one(`SELECT openai_call_id FROM voice_calls WHERE id = $1`, [call.id]);
    await h.db.query(`UPDATE voice_calls SET connected_at = now() - interval '13 minutes' WHERE id = $1`, [call.id]);
    const ready = await startCall(other);
    await h.db.query(`UPDATE voice_calls SET created_at = now() - interval '31 minutes' WHERE id = $1`, [ready.id]);

    const swept = await sweepVoiceCalls({ db: h.db, config: h.config, provider: h.provider, log: () => {} });
    assert.deepEqual([swept.overdue, swept.abandoned], [1, 1]);
    assert.ok(fake.state.hangups.includes(openaiId));
    const done = await waitForCallCoaching(rep, call.id);
    assert.equal(done.status, 'ended');
    assert.equal(done.endReason, 'time_limit');
    assert.equal(done.durationMs, 10 * 60_000);
    assert.equal(done.coaching.status, 'done');
    assert.equal((await h.db.one(`SELECT status FROM voice_calls WHERE id = $1`, [ready.id])).status, 'abandoned');
    const late = await dial(other, ready.id);
    assert.equal(late.status, 409);
  } finally {
    useMock();
  }
});

test('voice practice says plainly when it is not set up', async () => {
  const saved = { ...h.config.voice };
  Object.assign(h.config.voice, { provider: 'none', openaiKey: '' });
  try {
    const r = await rep.get('/api/voice');
    assert.equal(r.data.configured, false);
    const start = await rep.post('/api/voice/calls', { productLine: 'ravenly' });
    assert.equal(start.status, 409);
    assert.match(start.data.error.message, /OpenAI API key/);
    assert.equal((await rep.get('/api/meta')).data.voice.configured, false);
  } finally {
    Object.assign(h.config.voice, saved);
  }
  const bad = await rep.post('/api/voice/calls', { productLine: 'general' });
  assert.equal(bad.status, 400);
  const nobody = await rep.post('/api/voice/calls', { productLine: 'ravenly', persona: 'astronaut' });
  assert.equal(nobody.status, 400);
});
