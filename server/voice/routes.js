// Practice Studio-Voice: practice phone calls with a realtime voice, coached in writing afterwards.
import express, { Router } from 'express';
import { z } from 'zod';
import { HttpError, notFound, parseBody, route } from '../lib/errors.js';
import { aiConfigured, voiceConfigured } from '../config.js';
import { PRODUCT_LINES } from '../domain.js';
import { resolveSourceRefs } from '../knowledge/service.js';
import { currentRubric } from '../settings/routes.js';
import { buildCallScenario, CALL_TYPES, callOptions, callTypeFor, pickScenario, VOICE_PRODUCTS } from './scenario.js';
import { hangUpRealtimeCall, sessionConfig, startRealtimeCall } from './realtime.js';
import { repText, scheduleCallCoaching } from './coach.js';

const MAX_LINES = 400;
const MAX_LINE_CHARS = 2000;
const MAX_TRANSCRIPT_CHARS = 60_000;
const MAX_NOTES = 4000;
// The rep has to say this much before a call is worth coaching.
const MIN_REP_WORDS = 8;
// A call the rep never dialed is set aside after this long.
const READY_TTL_MINUTES = 30;
export const END_REASONS = {
  rep_hung_up: 'You hung up',
  buyer_hung_up: 'They hung up',
  time_limit: 'Time limit reached',
  connection_lost: 'The connection dropped',
  left_page: 'You left the call screen',
  error: 'The call stopped because of an error',
};

const lineSchema = z.object({
  speaker: z.enum(['rep', 'buyer']),
  text: z.string().max(8000),
  atMs: z.number().int().min(0).max(4 * 3600 * 1000),
  interrupted: z.boolean().optional(),
});
const msSchema = z.number().int().min(0).max(4 * 3600 * 1000);
const talkSchema = z.object({ repMs: msSchema.optional(), buyerMs: msSchema.optional() });
const progressSchema = z.object({
  transcript: z.array(lineSchema).max(MAX_LINES * 2).default([]),
  talk: talkSchema.default({}),
  notes: z.string().max(MAX_NOTES * 2).default(''),
});
const endSchema = progressSchema.extend({
  durationMs: msSchema.default(0),
  endReason: z.enum(Object.keys(END_REASONS)).default('rep_hung_up'),
});
const startSchema = z.object({
  productLine: z.enum(VOICE_PRODUCTS),
  persona: z.string().trim().max(60).optional().nullable(),
  callType: z.enum(Object.keys(CALL_TYPES)).optional(),
});

// What a transcript is stored as: in order, trimmed, and bounded.
export function cleanTranscript(lines) {
  let budget = MAX_TRANSCRIPT_CHARS;
  const out = [];
  for (const l of [...lines].sort((a, b) => a.atMs - b.atMs)) {
    let text = String(l.text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    if (text.length > MAX_LINE_CHARS) text = `${text.slice(0, MAX_LINE_CHARS - 1)}…`;
    if (budget - text.length < 0 || out.length >= MAX_LINES) break;
    budget -= text.length;
    out.push({ speaker: l.speaker, text, atMs: l.atMs, ...(l.interrupted ? { interrupted: true } : {}) });
  }
  return out;
}

const wordCount = (s) => String(s || '').split(/\s+/).filter(Boolean).length;

// Calls made today (New York time) count toward the daily limit once they connect.
async function callsToday(q, userId) {
  const row = await q.one(
    `SELECT count(*)::int AS n FROM voice_calls
      WHERE learner_id = $1 AND connected_at >= (date_trunc('day', now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York')`,
    [userId],
  );
  return row.n;
}

const CALL_SELECT = `SELECT c.*, u.name AS learner_name FROM voice_calls c JOIN users u ON u.id = c.learner_id`;

// What a person sees of a call. Until it ends, only what the rep knows before dialing: the hidden brief,
// the buyer's name, and the transcript stay on the server.
export function shapeCall(row, viewer, config) {
  const s = row.scenario;
  const over = ['ended', 'failed', 'abandoned'].includes(row.status);
  const ev = row.evaluation;
  const engine = config.voice.provider === 'mock' ? 'mock' : 'openai';
  return {
    id: row.id,
    status: row.status,
    learner: { id: row.learner_id, name: row.learner_name || null, role: row.learner_role },
    callType: row.call_type,
    callTypeLabel: CALL_TYPES[row.call_type]?.label || row.call_type,
    company: s.company,
    productLine: row.product_line,
    productLabel: PRODUCT_LINES[row.product_line]?.label || s.productLabel,
    persona: { key: s.persona.key, label: s.persona.label },
    phone: s.buyer.phone,
    createdAt: row.created_at,
    connectedAt: row.connected_at,
    endedAt: row.ended_at,
    endReason: row.end_reason,
    endReasonLabel: END_REASONS[row.end_reason] || null,
    durationMs: row.duration_ms,
    talk: row.talk || {},
    maxCallMinutes: config.voice.maxCallMinutes,
    engine,
    connectError: row.status === 'ready' ? row.connect_error : null,
    revealed: over
      ? {
          title: s.title,
          stageLabel: s.stageLabel,
          buyer: { name: s.buyer.name, firm: s.buyer.firm },
          situation: s.situation,
          buyerLine: s.buyerLine,
          pushbacks: s.pushbacks,
          objective: s.objective,
          goodLooksLike: s.goodLooksLike,
          idealAnswer: s.idealAnswer || null,
          settings: s.settings,
          sources: (s.sources || []).filter((x) => x.available && x.title).map((x) => (x.collectionName ? `${x.collectionName} › ${x.title}` : x.title)),
        }
      : null,
    transcript: over ? row.transcript : [],
    notes: over || row.learner_id === viewer.id ? row.notes : '',
    coaching: {
      status: row.coaching_status,
      error: row.coaching_error,
      detail: viewer.isManager ? row.coaching_detail : null,
      evaluation: row.coaching_status === 'done' ? ev : null,
    },
    score: row.coaching_status === 'done' ? row.score : null,
    // Test-only: the stand-in voice in automated tests reads its lines from here.
    mockScript: engine === 'mock' && !over ? [s.buyer.greeting, s.buyerLine, ...s.pushbacks.slice(0, 1), 'Okay. Thanks for calling, goodbye.'] : undefined,
  };
}

// One row of a list of calls.
function listRow(row) {
  const s = row.scenario;
  const over = ['ended', 'failed'].includes(row.status);
  return {
    id: row.id,
    status: row.status,
    learner: { id: row.learner_id, name: row.learner_name },
    callType: row.call_type,
    productLabel: PRODUCT_LINES[row.product_line]?.label || s.productLabel,
    personaLabel: s.persona.label,
    buyerName: over ? s.buyer.name : null,
    firm: over ? s.buyer.firm : null,
    createdAt: row.created_at,
    durationMs: row.duration_ms,
    coachingStatus: row.coaching_status,
    score: row.coaching_status === 'done' ? row.score : null,
    nextStep: row.coaching_status === 'done' ? row.evaluation?.outcome?.nextStep || null : null,
  };
}

export function voiceRoutes({ db, config, provider, log = () => {} }) {
  const r = Router();
  const ctx = { db, config, provider, log };

  async function loadCall(q, id, viewer, { lock = false } = {}) {
    if (!/^[0-9a-f-]{36}$/i.test(String(id))) throw notFound('That call was not found.');
    const row = await q.one(`${CALL_SELECT} WHERE c.id = $1 ${lock ? 'FOR UPDATE OF c' : ''}`, [id]);
    if (!row || (row.learner_id !== viewer.id && !viewer.isManager)) throw notFound('That call was not found.');
    return row;
  }
  const own = (row, viewer) => {
    if (row.learner_id !== viewer.id) throw new HttpError(403, 'forbidden', 'Only the person who made this call can do that.');
  };

  // The screen where a call starts: what can be called about, today's calls, and recent calls.
  r.get(
    '/',
    route(async (req, res) => {
      const user = req.user;
      const mine = await db.many(`${CALL_SELECT} WHERE c.learner_id = $1 AND c.status IN ('live', 'ended', 'failed') ORDER BY c.created_at DESC LIMIT 30`, [user.id]);
      const team = user.isManager
        ? await db.many(`${CALL_SELECT} WHERE c.learner_id <> $1 AND c.status IN ('live', 'ended', 'failed') ORDER BY c.created_at DESC LIMIT 60`, [user.id])
        : null;
      res.json({
        configured: voiceConfigured(config),
        coachingConfigured: aiConfigured(config),
        model: user.isManager ? config.voice.model : undefined,
        limits: { maxCallMinutes: config.voice.maxCallMinutes, callsPerDay: config.voice.callsPerDay, usedToday: await callsToday(db, user.id) },
        callTypes: await callOptions(db, config, user),
        calls: mine.map(listRow),
        team: team ? team.map(listRow) : undefined,
      });
    }),
  );

  // Sets up a call: picks the hidden question and who answers. Nothing is billed until the rep dials.
  r.post(
    '/calls',
    route(async (req, res) => {
      const user = req.user;
      if (!voiceConfigured(config)) {
        throw new HttpError(409, 'voice_not_configured', 'Voice practice is not set up yet. A manager needs to add an OpenAI API key in Railway.');
      }
      const body = parseBody(startSchema, req.body);
      const callType = callTypeFor(user, body.callType);
      const persona = body.persona || null;
      const row = await db.tx(async (q) => {
        if (persona && !(await q.one(`SELECT 1 FROM personas WHERE key = $1`, [persona]))) {
          throw new HttpError(400, 'validation_failed', 'Choose who picks up from the list.');
        }
        if ((await callsToday(q, user.id)) >= config.voice.callsPerDay) {
          throw new HttpError(429, 'voice_daily_limit', `You have made ${config.voice.callsPerDay} practice calls today, the daily limit. Calls open again tomorrow.`);
        }
        // Only one call waits to be dialed at a time.
        await q.query(`UPDATE voice_calls SET status = 'abandoned' WHERE learner_id = $1 AND status = 'ready'`, [user.id]);
        const { drill, persona: personaKey } = await pickScenario(q, config, user, { callType, productLine: body.productLine, persona });
        const p = await q.one(`SELECT key, label, responsibilities, concerns FROM personas WHERE key = $1`, [personaKey]);
        const sources = await resolveSourceRefs(q, drill.source_refs, drill, personaKey);
        const available = sources.filter((s) => s.available);
        const rubric = await currentRubric(q);
        const scenario = buildCallScenario({ drill, persona: p, callType, rubricDimensions: rubric.dimensions, sources });
        const sourceVersions = available.map((s) => ({
          sourceId: s.sourceId,
          versionId: s.versionId,
          version: s.version,
          title: s.title,
          collectionName: s.collectionName || null,
          asOfDate: s.asOfDate,
          caveats: s.caveats,
          evidenceBasis: s.evidenceBasis,
          sections: s.sections,
        }));
        const created = await q.one(
          `INSERT INTO voice_calls (learner_id, learner_role, call_type, brand, product_line, persona, drill_id, drill_version_id, scenario,
             rubric_version_id, source_versions, voice_model, voice)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
          [
            user.id,
            user.role,
            callType,
            drill.brand,
            drill.product_line,
            personaKey,
            drill.id,
            drill.version_id,
            JSON.stringify(scenario),
            rubric.id,
            JSON.stringify(sourceVersions),
            config.voice.model,
            scenario.buyer.voice,
          ],
        );
        return q.one(`${CALL_SELECT} WHERE c.id = $1`, [created.id]);
      });
      res.status(201).json({ call: shapeCall(row, user, config) });
    }),
  );

  r.get(
    '/calls/:id',
    route(async (req, res) => {
      res.json({ call: shapeCall(await loadCall(db, req.params.id, req.user), req.user, config) });
    }),
  );

  // Dials: forwards the browser's WebRTC offer to OpenAI with the session, and returns OpenAI's answer.
  r.post(
    '/calls/:id/connect',
    express.text({ type: ['application/sdp', 'text/plain'], limit: '200kb' }),
    route(async (req, res) => {
      const user = req.user;
      if (!voiceConfigured(config)) {
        throw new HttpError(409, 'voice_not_configured', 'Voice practice is not set up yet. A manager needs to add an OpenAI API key in Railway.');
      }
      const offer = typeof req.body === 'string' ? req.body : '';
      if (!/^v=0/.test(offer.trim())) throw new HttpError(400, 'validation_failed', 'The call could not be set up. Reload the page and try again.');
      const mic = req.query.mic === 'room' ? 'room' : 'headset';
      const answer = await db.tx(async (q) => {
        // Held until OpenAI answers, so a double click cannot open two paid sessions for one call.
        const row = await loadCall(q, req.params.id, user, { lock: true });
        own(row, user);
        if (row.status === 'live') throw new HttpError(409, 'already_connected', 'This call is already connected.');
        if (row.status !== 'ready') throw new HttpError(409, 'call_over', 'This call is over. Start a new one.');
        if (Date.now() - new Date(row.created_at).getTime() > READY_TTL_MINUTES * 60_000) {
          await q.query(`UPDATE voice_calls SET status = 'abandoned' WHERE id = $1`, [row.id]);
          throw new HttpError(409, 'call_over', 'This call waited too long to be dialed. Start a new one.');
        }
        if ((await callsToday(q, user.id)) >= config.voice.callsPerDay) {
          throw new HttpError(429, 'voice_daily_limit', `You have made ${config.voice.callsPerDay} practice calls today, the daily limit. Calls open again tomorrow.`);
        }
        const other = await q.one(
          `SELECT id FROM voice_calls WHERE learner_id = $1 AND status = 'live' AND id <> $2
              AND connected_at > now() - make_interval(secs => $3::int)`,
          [user.id, row.id, config.voice.maxCallMinutes * 60 + 120],
        );
        if (other) throw new HttpError(409, 'on_another_call', 'You are already on a practice call, maybe in another tab. Hang up there first.');
        try {
          const started = await startRealtimeCall(config, { offerSdp: offer, session: sessionConfig(row.scenario, config, { mic }), userId: user.id, log });
          await q.query(`UPDATE voice_calls SET status = 'live', connected_at = now(), openai_call_id = $2, connect_error = NULL WHERE id = $1`, [row.id, started.callId]);
          return started.answerSdp;
        } catch (err) {
          // The rep can dial the same call again.
          if (err instanceof HttpError) {
            await q.query(`UPDATE voice_calls SET connect_error = $2 WHERE id = $1`, [row.id, err.message]);
            return err;
          }
          throw err;
        }
      });
      if (answer instanceof HttpError) throw answer;
      res.status(201).type('application/sdp').send(answer);
    }),
  );

  // Saves the transcript so far, so a crashed tab loses little.
  r.post(
    '/calls/:id/progress',
    route(async (req, res) => {
      const body = parseBody(progressSchema, req.body);
      const row = await loadCall(db, req.params.id, req.user);
      own(row, req.user);
      if (row.status === 'live') {
        await db.query(`UPDATE voice_calls SET transcript = $2, talk = $3, notes = $4 WHERE id = $1 AND status = 'live'`, [
          row.id,
          JSON.stringify(cleanTranscript(body.transcript)),
          JSON.stringify(body.talk),
          body.notes.slice(0, MAX_NOTES),
        ]);
      }
      res.json({ ok: true });
    }),
  );

  // Hangs up: stores the call and starts written coaching on it.
  r.post(
    '/calls/:id/end',
    route(async (req, res) => {
      const body = parseBody(endSchema, req.body);
      const user = req.user;
      let coach = false;
      let hangUp = null;
      const row = await db.tx(async (q) => {
        const call = await loadCall(q, req.params.id, user, { lock: true });
        own(call, user);
        if (call.status === 'ready') {
          await q.query(`UPDATE voice_calls SET status = 'abandoned' WHERE id = $1`, [call.id]);
        } else if (call.status === 'live') {
          // A tab that reloaded mid-call has nothing to send: what it saved along the way stands.
          const sent = cleanTranscript(body.transcript);
          const saved = Array.isArray(call.transcript) ? call.transcript : [];
          const transcript = sent.length >= saved.length ? sent : saved;
          const talk = body.talk.repMs || body.talk.buyerMs ? body.talk : call.talk || {};
          const notes = (body.notes || call.notes || '').slice(0, MAX_NOTES);
          // The call cannot have run longer than it was connected, or past the limit.
          const elapsed = Date.now() - new Date(call.connected_at).getTime();
          const durationMs = Math.max(0, Math.min(body.durationMs || elapsed, elapsed + 5000, config.voice.maxCallMinutes * 60_000 + 60_000));
          const enough = wordCount(repText(transcript)) >= MIN_REP_WORDS;
          coach = enough && aiConfigured(config);
          await q.query(
            `UPDATE voice_calls SET status = 'ended', ended_at = now(), end_reason = $2, duration_ms = $3, transcript = $4, talk = $5, notes = $6,
                    coaching_status = $7, coaching_started_at = CASE WHEN $7 = 'running' THEN now() ELSE NULL END, coaching_error = $8
              WHERE id = $1`,
            [
              call.id,
              body.endReason,
              durationMs,
              JSON.stringify(transcript),
              JSON.stringify(talk),
              notes,
              coach ? 'running' : 'skipped',
              coach ? null : enough ? 'AI coaching is not set up, so this call was not coached. A manager needs to add an AI key.' : 'The call ended before you said enough to coach.',
            ],
          );
          hangUp = call.openai_call_id;
        }
        return q.one(`${CALL_SELECT} WHERE c.id = $1`, [call.id]);
      });
      if (hangUp) hangUpRealtimeCall(config, hangUp, log);
      if (coach) scheduleCallCoaching(ctx, row.id);
      res.json({ call: shapeCall(row, user, config) });
    }),
  );

  // Runs coaching again after it failed.
  r.post(
    '/calls/:id/coach',
    route(async (req, res) => {
      const row = await db.tx(async (q) => {
        const call = await loadCall(q, req.params.id, req.user, { lock: true });
        if (call.status !== 'ended' || call.coaching_status !== 'failed') {
          throw new HttpError(409, 'not_retryable', 'Coaching can be retried only after it stopped.');
        }
        if (!aiConfigured(config)) throw new HttpError(409, 'ai_not_configured', 'AI coaching is not set up. A manager needs to add an AI key.');
        await q.query(`UPDATE voice_calls SET coaching_status = 'running', coaching_started_at = now(), coaching_error = NULL, coaching_detail = NULL WHERE id = $1`, [call.id]);
        return q.one(`${CALL_SELECT} WHERE c.id = $1`, [call.id]);
      });
      scheduleCallCoaching(ctx, row.id);
      res.json({ call: shapeCall(row, req.user, config) });
    }),
  );

  return r;
}
