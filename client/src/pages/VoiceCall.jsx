// One practice call: the phone while it is ready or live, and the written coaching once it ends.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { useAuth } from '../state.jsx';
import { ErrorNotice, fmtDateTime, Loading, Notice, ScoreBar, Segmented } from '../components/ui.jsx';
import { CF_LABEL, FLAG_LABEL } from '../components/Coaching.jsx';
import {
  CaptionsIcon,
  CaptionsOffIcon,
  CheckCircleIcon,
  FirmIcon,
  MicIcon,
  MicOffIcon,
  NotesIcon,
  PhoneIcon,
  PhoneOffIcon,
  RefreshIcon,
  SparkIcon,
  TargetIcon,
} from '../components/Icons.jsx';
import { callLines, clock, initialCallState, pendingRepLines, reduceCall, talkTotals, toTranscript } from '../lib/voice/callState.js';
import { MockCall, RealtimeCall, startRingback, watchMicLevel } from '../lib/voice/engines.js';
import { NEXT_STEP } from './VoiceStudio.jsx';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIC_KEY = 'saleslab:voice-mic';
function savedMic() {
  try {
    return localStorage.getItem(MIC_KEY) === 'room' ? 'room' : 'headset';
  } catch {
    return 'headset';
  }
}

// Sends the end of a call even while the page is closing (keepalive outlives the page).
function endOnLeave(callId, body) {
  try {
    fetch(`/api/voice/calls/${callId}/end`, {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'x-requested-with': 'SalesLab', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    /* the page is going away */
  }
}

function MicLevel({ level, muted }) {
  const bars = [0.12, 0.3, 0.5, 0.7, 0.88];
  return (
    <span className={`mic-level${muted ? ' muted' : ''}`} aria-hidden="true">
      {bars.map((b) => (
        <span key={b} className={!muted && level >= b ? 'on' : undefined} />
      ))}
    </span>
  );
}

function LiveTranscript({ lines, buyerLabel }) {
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [lines.length, lines.at(-1)?.text]);
  return (
    <div className="live-transcript" aria-live="polite">
      {lines.length === 0 && <p className="tiny muted">The transcript appears here as you talk.</p>}
      {lines.map((l) => (
        <p key={l.id} className={`tline tline-${l.speaker}`}>
          <span className="tline-who">{l.speaker === 'rep' ? 'You' : buyerLabel}</span>
          {l.failed && !l.text ? <em className="muted">(could not make that out)</em> : l.text}
        </p>
      ))}
      <span ref={end} />
    </div>
  );
}

function PhoneScreen({ call, onEnded }) {
  const [phase, setPhase] = useState('ready'); // ready, dialing, live, ending
  const [mic, setMic] = useState(savedMic);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [notes, setNotes] = useState('');
  const [state, setState] = useState(initialCallState);
  const [error, setError] = useState(null);
  const [endError, setEndError] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [mockLine, setMockLine] = useState('');
  const line = useRef(null);
  const t0 = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const done = useRef(false);
  const stops = useRef([]);
  const pendingEnd = useRef(null);

  const lastActivity = useRef(0);
  const nudges = useRef(0);
  const elapsed = () => (t0.current === null ? 0 : performance.now() - t0.current);
  const onEvent = useCallback((ev) => {
    if (/^(input_audio_buffer\.speech_(started|stopped)|output_audio_buffer\.(started|stopped|cleared))$/.test(ev?.type || '')) {
      lastActivity.current = performance.now();
      if (ev.type === 'input_audio_buffer.speech_started') nudges.current = 0;
    }
    setState((s) => reduceCall(s, ev, elapsed()));
  }, []);
  const maxMs = call.maxCallMinutes * 60_000;

  const endBody = (reason) => {
    const s = stateRef.current;
    return { transcript: toTranscript(s), talk: talkTotals(s, elapsed()), durationMs: Math.round(elapsed()), endReason: reason, notes: notesRef.current };
  };

  const sendEnd = async (body) => {
    setEndError(null);
    for (let n = 1; n <= 3; n += 1) {
      try {
        const { call: ended } = await post(`/voice/calls/${call.id}/end`, body, { timeoutMs: 30000 });
        onEnded(ended);
        return;
      } catch (err) {
        if (n === 3 || (err.status >= 400 && err.status < 500)) {
          pendingEnd.current = body;
          setEndError(err);
          return;
        }
        await sleep(1500 * n);
      }
    }
  };

  const hangUp = useCallback(
    async (reason = 'rep_hung_up') => {
      if (done.current) return;
      done.current = true;
      setPhase('ending');
      const engine = line.current;
      engine?.beginHangUp();
      setState((s) => ({ ...s, closing: true }));
      // The rep's last words may still be on their way to the transcript.
      const deadline = performance.now() + 2500;
      while (pendingRepLines(stateRef.current) > 0 && performance.now() < deadline) await sleep(150);
      engine?.close();
      stops.current.forEach((f) => f());
      await sendEnd(endBody(reason));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [call.id],
  );

  const dial = async () => {
    setError(null);
    setPhase('dialing');
    try {
      localStorage.setItem(MIC_KEY, mic);
    } catch {
      /* not remembered */
    }
    const engine =
      call.engine === 'mock'
        ? new MockCall({ callId: call.id, script: call.mockScript, onEvent })
        : new RealtimeCall({ callId: call.id, mic, onEvent, onDrop: () => phaseRef.current === 'live' && hangUp('connection_lost') });
    line.current = engine;
    let stream;
    try {
      stream = await engine.openMic();
    } catch (err) {
      setError(err);
      setPhase('ready');
      return;
    }
    const stopRing = startRingback();
    const ringing = performance.now();
    try {
      await engine.connect();
    } catch (err) {
      stopRing();
      engine.close();
      setError(err);
      setPhase('ready');
      return;
    }
    // Let it ring at least once, as a call would.
    await sleep(Math.max(0, 3200 - (performance.now() - ringing)));
    stopRing();
    t0.current = performance.now();
    setPhase('live');
    stops.current.push(watchMicLevel(stream, setLevel));
    engine.pickUp();
  };

  // The clock, the time limit, and saving the transcript as the call goes.
  useEffect(() => {
    if (phase !== 'live') return undefined;
    const tick = setInterval(() => {
      const ms = elapsed();
      setElapsedMs(ms);
      if (ms >= maxMs) {
        hangUp('time_limit');
        return;
      }
      // Nine seconds of silence on the line: "Hello? Are you still there?" (twice at most in a row).
      const s = stateRef.current;
      if (s.answeredAtMs !== null && !s.buyerSpeaking && !s.repSpeaking && !s.hangUp && nudges.current < 2 && performance.now() - lastActivity.current > 9000) {
        nudges.current += 1;
        lastActivity.current = performance.now();
        line.current?.nudge();
      }
    }, 500);
    const save = setInterval(() => {
      const body = endBody('rep_hung_up');
      post(`/voice/calls/${call.id}/progress`, { transcript: body.transcript, talk: body.talk, notes: body.notes }).catch(() => {});
    }, 20000);
    return () => {
      clearInterval(tick);
      clearInterval(save);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // The person at the firm hung up: let their goodbye finish, then end the call.
  useEffect(() => {
    if (!state.hangUp || phase !== 'live') return undefined;
    let cancelled = false;
    (async () => {
      const deadline = performance.now() + 5000;
      await sleep(400);
      while (!cancelled && stateRef.current.buyerSpeaking && performance.now() < deadline) await sleep(150);
      if (!cancelled) hangUp('buyer_hung_up');
    })();
    return () => {
      cancelled = true;
    };
  }, [state.hangUp, phase, hangUp]);

  // Leaving the page ends the call, so nothing keeps running (or billing) in the background.
  useEffect(() => {
    const leave = () => {
      if (done.current || !['live', 'dialing'].includes(phaseRef.current)) return;
      done.current = true;
      line.current?.close();
      stops.current.forEach((f) => f());
      endOnLeave(call.id, endBody('left_page'));
    };
    const warn = (e) => {
      if (phaseRef.current === 'live') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('pagehide', leave);
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('beforeunload', warn);
      leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id]);

  // Most realtime errors are recoverable notices; a dropped call is handled by the connection itself.
  useEffect(() => {
    if (state.error) console.warn('[voice]', state.error);
  }, [state.error]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    line.current?.setMuted(next);
  };

  const lines = callLines(state);
  const timeLeft = maxMs - elapsedMs;
  const statusText = {
    ready: 'Ready to call',
    dialing: 'Ringing…',
    live: state.answeredAtMs === null ? 'Connecting…' : 'On the call',
    ending: endError ? 'Call ended' : 'Hanging up…',
  }[phase];

  return (
    <div className="call-layout">
      <section className={`phone phone-${phase}`} aria-labelledby="phone-status">
        <div className="phone-top">
          <span className="phone-state" id="phone-status" role="status">
            <span className={`phone-dot${phase === 'live' ? ' on' : ''}`} aria-hidden="true" />
            {statusText}
          </span>
          <span className="phone-timer num">{phase === 'live' || phase === 'ending' ? clock(elapsedMs) : 'Practice line'}</span>
        </div>

        <div className="phone-who">
          <div className={`phone-avatar${state.buyerSpeaking ? ' speaking' : ''}${phase === 'dialing' ? ' ringing' : ''}`}>
            <FirmIcon size={34} />
          </div>
          <p className="phone-name">Law firm</p>
          <p className="phone-role">{call.persona.label}</p>
          <p className="phone-number num">{call.phone}</p>
        </div>

        {phase === 'ready' && (
          <div className="phone-dialpad stack">
            <div className="phone-mic-choice">
              <span className="phone-mic-label" id="mic-choice">
                Your microphone
              </span>
              <Segmented
                label="Your microphone"
                value={mic}
                onChange={setMic}
                options={[
                  { value: 'headset', label: 'Headset' },
                  { value: 'room', label: 'Laptop or desk mic' },
                ]}
              />
            </div>
            {(error || call.connectError) && (
              <p className="phone-error" role="alert">
                {error?.message || call.connectError}
              </p>
            )}
            <button type="button" className="phone-round phone-call" onClick={dial} aria-label="Call">
              <PhoneIcon size={26} />
            </button>
            <span className="phone-round-label">Call</span>
          </div>
        )}

        {phase === 'dialing' && <p className="phone-note">Ringing the firm. Your browser may ask to use the microphone.</p>}

        {(phase === 'live' || phase === 'ending') && (
          <div className="phone-incall">
            <p className="phone-you">
              <MicLevel level={level} muted={muted} />
              {muted ? 'You are muted' : state.repSpeaking ? 'You are talking' : 'Your microphone is on'}
            </p>
            {phase === 'live' && timeLeft <= 60_000 && <p className="phone-warning">Less than a minute left on this call.</p>}
            <div className="phone-controls">
              <button type="button" className="phone-btn" aria-pressed={muted} onClick={toggleMute} disabled={phase !== 'live'}>
                {muted ? <MicOffIcon /> : <MicIcon />}
                <span>{muted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button type="button" className="phone-btn" aria-pressed={captions} onClick={() => setCaptions((v) => !v)}>
                {captions ? <CaptionsOffIcon /> : <CaptionsIcon />}
                <span>{captions ? 'Hide transcript' : 'Transcript'}</span>
              </button>
            </div>
            <button type="button" className="phone-round phone-hangup" onClick={() => hangUp('rep_hung_up')} disabled={phase !== 'live'} aria-label="Hang up">
              <PhoneOffIcon size={26} />
            </button>
            <span className="phone-round-label">{phase === 'ending' ? (endError ? 'Call ended' : 'Hanging up…') : 'Hang up'}</span>
            {endError && (
              <div className="phone-error" role="alert">
                <p>{endError.message} Your call is not saved yet.</p>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => sendEnd(pendingEnd.current)}>
                  Try saving again
                </button>
              </div>
            )}
          </div>
        )}

        {call.engine === 'mock' && phase === 'live' && (
          <form
            className="phone-mock"
            onSubmit={(e) => {
              e.preventDefault();
              if (!mockLine.trim()) return;
              line.current?.say(mockLine.trim());
              setMockLine('');
            }}
          >
            <label htmlFor="mock-say">Say (test mode)</label>
            <input id="mock-say" value={mockLine} onChange={(e) => setMockLine(e.target.value)} autoComplete="off" />
            <button type="submit" className="btn btn-secondary btn-small">
              Say it
            </button>
          </form>
        )}
      </section>

      <aside className="call-side stack">
        <section className="panel panel-tight" aria-labelledby="know-title">
          <h2 id="know-title" className="section-title">
            What you know
          </h2>
          <dl className="kv call-know">
            <dt>You are selling</dt>
            <dd>{call.productLabel}</dd>
            <dt>The firm is</dt>
            <dd>{call.callType === 'client' ? 'An existing client' : 'A new prospect'}</dd>
            <dt>Who picks up</dt>
            <dd>{call.persona.label}</dd>
          </dl>
          <p className="tiny muted" style={{ margin: '10px 0 0' }}>
            The rest you find out on the call. The call ends after {call.maxCallMinutes} minutes.
          </p>
        </section>
        {captions && (phase === 'live' || phase === 'ending') && (
          <section className="panel panel-tight" aria-labelledby="live-title">
            <h2 id="live-title" className="section-title">
              Live transcript
            </h2>
            <LiveTranscript lines={lines} buyerLabel="Them" />
          </section>
        )}
        <section className="panel panel-tight" aria-labelledby="notes-title">
          <h2 id="notes-title" className="section-title with-icon">
            <NotesIcon size={16} />
            Notes
          </h2>
          <div className="field">
            <label htmlFor="call-notes" className="visually-hidden">
              Notes
            </label>
            <textarea id="call-notes" rows={6} value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 4000))} placeholder="Names, numbers, next steps…" />
            <span className="hint">Saved with the call.</span>
          </div>
        </section>
      </aside>
    </div>
  );
}

function Quote({ children }) {
  if (!children) return null;
  return <span className="evidence">“{children}”</span>;
}

function CallFeedback({ ev }) {
  const assessed = ev.dimensionScores.filter((d) => d.assessed);
  const flags = (ev.reviewFlags || []).filter((f) => (f.status || 'open') === 'open');
  return (
    <>
      {ev.criticalFailures.length > 0 && (
        <Notice kind="critical" title="Check this before your next call">
          <ul className="feedback-list">
            {ev.criticalFailures.map((c) => (
              <li key={c.id || c.claimQuote}>
                <strong>{CF_LABEL[c.type] || c.type}.</strong> {c.explanation}
                <Quote>{c.claimQuote}</Quote>
                {c.sourceQuote && (
                  <span className="quote-source">
                    {c.sourceTitle ? `${c.sourceTitle}: ` : 'Approved material: '}“{c.sourceQuote}”
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="tiny" style={{ marginTop: 8 }}>
            In written practice, a critical failure a manager confirms sets the score to zero. On practice calls it is shown here instead.
          </p>
        </Notice>
      )}
      {flags.length > 0 && (
        <Notice kind="warn" title="Checked against the approved material">
          <ul className="feedback-list">
            {flags.map((f) => (
              <li key={f.id || f.note}>
                <strong>{FLAG_LABEL[f.kind] || 'Flag'}.</strong> {f.note}
                <Quote>{f.claimQuote}</Quote>
                {f.sourceQuote && <span className="quote-source">Approved material: “{f.sourceQuote}”</span>}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title with-icon worked">
            <CheckCircleIcon size={16} />
            What worked
          </h2>
          {ev.feedback.strengths.length === 0 ? (
            <p className="muted small">No specific strengths were noted.</p>
          ) : (
            <ul className="feedback-list">
              {ev.feedback.strengths.map((x, i) => (
                <li key={i}>
                  {x.point}
                  <Quote>{x.evidence}</Quote>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel">
          <h2 className="section-title with-icon improve">
            <TargetIcon size={16} />
            To improve
          </h2>
          {ev.feedback.improvements.length === 0 ? (
            <p className="muted small">No specific improvements were noted.</p>
          ) : (
            <ul className="feedback-list">
              {ev.feedback.improvements.map((x, i) => (
                <li key={i}>
                  <strong>{x.point}</strong>
                  <Quote>{x.evidence}</Quote>
                  <span className="small" style={{ display: 'block', marginTop: 6 }}>
                    Try: {x.suggestion}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {ev.keyMoments.length > 0 && (
        <section className="panel" aria-labelledby="moments-title">
          <h2 id="moments-title" className="section-title with-icon improve">
            <SparkIcon size={16} />
            Moments that mattered
          </h2>
          <ol className="moments">
            {ev.keyMoments.map((m, i) => (
              <li key={i} className="moment">
                {m.repQuote && (
                  <p className="moment-said">
                    <span className="moment-label">You said</span>
                    <span className="evidence">“{m.repQuote}”</span>
                  </p>
                )}
                <p className="small" style={{ margin: '8px 0' }}>
                  {m.whatHappened}
                </p>
                <p className="moment-try">
                  <span className="moment-label">Try instead</span>
                  <span className="model-answer">{m.betterLine}</span>
                </p>
              </li>
            ))}
          </ol>
          <p className="tiny muted" style={{ marginBottom: 0 }}>
            Written from approved material only. Use them as models, not scripts.
          </p>
        </section>
      )}

      <section className="panel" aria-labelledby="dims-title">
        <div className="panel-head">
          <h2 id="dims-title" className="section-title" style={{ margin: 0 }}>
            Scores by dimension
          </h2>
          <span className="tiny muted">Weighted by the scoring rubric; only the dimensions this call tests count.</span>
        </div>
        <div className="dim-list">
          {assessed.map((d) => (
            <div key={d.key} className="dim">
              <span className="dim-name">
                {d.label} <span className="muted tiny">({d.weight}% weight)</span>
              </span>
              <span className="dim-score">{d.score}</span>
              <ScoreBar value={d.score} label={d.label} />
              <div className="dim-body">
                {d.rationale}
                {d.evidence.map((q, i) => (
                  <Quote key={i}>{q}</Quote>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel-tight stack-sm">
        <h2 className="section-title">Practice next</h2>
        <p style={{ margin: 0 }}>{ev.feedback.nextFocus.suggestion}</p>
      </section>
    </>
  );
}

function TalkSplit({ talk }) {
  const rep = Number(talk?.repMs) || 0;
  const buyer = Number(talk?.buyerMs) || 0;
  if (rep + buyer < 1000) return null;
  const share = Math.round((rep / (rep + buyer)) * 100);
  return (
    <div className="talk-split">
      <div className="talk-bar" role="img" aria-label={`You talked ${share}% of the time; they talked ${100 - share}%.`}>
        <span className="talk-rep" style={{ width: `${share}%` }} />
        <span className="talk-buyer" style={{ width: `${100 - share}%` }} />
      </div>
      <p className="tiny muted" style={{ margin: '6px 0 0' }}>
        You talked {share}% of the time, they talked {100 - share}%.
      </p>
    </div>
  );
}

function CallReview({ call, viewer, onRetry, retrying }) {
  const navigate = useNavigate();
  const [again, setAgain] = useState(false);
  const [againError, setAgainError] = useState(null);
  const r = call.revealed;
  const ev = call.coaching.evaluation;
  const mine = call.learner.id === viewer.id;
  const next = ev?.outcome?.nextStep ? NEXT_STEP[ev.outcome.nextStep] : null;
  const buyerFirst = r?.buyer?.name?.split(' ')[0] || 'They';

  const callAgain = async () => {
    setAgain(true);
    setAgainError(null);
    try {
      const { call: fresh } = await post('/voice/calls', { productLine: call.productLine, persona: call.persona.key, callType: call.callType });
      navigate(`/voice/calls/${fresh.id}`);
    } catch (err) {
      setAgainError(err);
      setAgain(false);
    }
  };

  if (call.status === 'abandoned' || call.status === 'failed') {
    return (
      <Notice kind="info" title={call.status === 'failed' ? 'This call did not connect' : 'This call was never dialed'}>
        <p>
          Start a new call from <Link to="/voice">Practice Studio-Voice</Link>.
        </p>
      </Notice>
    );
  }

  return (
    <div className="stack-lg">
      <section className="panel" aria-labelledby="call-score">
        <h2 id="call-score" className="visually-hidden">
          How the call went
        </h2>
        <div className="score-slip">
          {call.score !== null && call.score !== undefined ? (
            <div className="score-figure" aria-label={`Score ${call.score} out of 100`}>
              {call.score}
              <small>/100</small>
            </div>
          ) : (
            <div className="score-figure pending" aria-label="No score">
              —
            </div>
          )}
          <div className="stack-sm">
            <div className="row">
              {next && <span className={`badge ${next.className}`}>{next.label}</span>}
              <span className="badge badge-neutral">{clock(call.durationMs)}</span>
              {call.endReasonLabel && <span className="badge badge-neutral">{call.endReasonLabel}</span>}
              {ev && (ev.meetsTarget ? <span className="badge badge-ok">Met target of {ev.proficiencyThreshold}</span> : <span className="badge badge-neutral">Below target of {ev.proficiencyThreshold}</span>)}
            </div>
            {ev && (
              <p className="small muted" style={{ margin: 0 }}>
                {ev.feedback.summary}
                {ev.outcome.summary ? ` ${ev.outcome.summary}` : ''}
              </p>
            )}
            <TalkSplit talk={call.talk} />
          </div>
        </div>
      </section>

      {call.coaching.status === 'running' && (
        <section className="panel stack-sm" role="status">
          <p style={{ margin: 0, fontWeight: 600 }}>Sales Lab is reading your call…</p>
          <div className="progress-line">
            <span />
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>
            This usually takes under a minute. You can leave this page; the coaching will be here when you come back.
          </p>
        </section>
      )}
      {call.coaching.status === 'failed' && (
        <Notice
          kind="critical"
          title="Coaching stopped"
          action={
            <button type="button" className="btn btn-secondary btn-small" onClick={onRetry} disabled={retrying}>
              <RefreshIcon />
              {retrying ? 'Retrying…' : 'Retry coaching'}
            </button>
          }
        >
          <p>{call.coaching.error}</p>
          {call.coaching.detail && <p className="tiny muted">Technical detail for managers: {call.coaching.detail}</p>}
        </Notice>
      )}
      {call.coaching.status === 'skipped' && <Notice kind="info">{call.coaching.error}</Notice>}

      {ev && <CallFeedback ev={ev} />}

      {r && (
        <section className="panel stack" aria-labelledby="hidden-title">
          <h2 id="hidden-title" className="section-title" style={{ margin: 0 }}>
            What you did not know
          </h2>
          <p className="small muted" style={{ margin: 0 }}>
            {r.buyer.name}, {call.persona.label.toLowerCase()} at {r.buyer.firm}. This is what they knew and were waiting to say.
          </p>
          <div className="stack-sm">
            <h3 className="call-sub">The situation</h3>
            <p style={{ margin: 0 }}>{r.situation}</p>
          </div>
          <div className="stack-sm">
            <h3 className="call-sub">What worried {buyerFirst} most</h3>
            <div className="buyer-reply">
              <blockquote>{r.buyerLine}</blockquote>
            </div>
          </div>
          {r.pushbacks.length > 0 && (
            <div className="stack-sm">
              <h3 className="call-sub">What {buyerFirst} could have raised next</h3>
              <ul className="call-pushbacks">
                {r.pushbacks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="stack-sm">
            <h3 className="call-sub">What a good answer to that concern does</h3>
            <p className="small" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {r.goodLooksLike}
            </p>
          </div>
          {r.idealAnswer && (
            <div className="stack-sm">
              <h3 className="call-sub">A model answer your manager approved</h3>
              <div className="model-answer">{r.idealAnswer}</div>
            </div>
          )}
        </section>
      )}

      <section className="panel" aria-labelledby="transcript-title">
        <div className="panel-head">
          <h2 id="transcript-title" className="section-title" style={{ margin: 0 }}>
            Transcript
          </h2>
          <span className="tiny muted">Made by speech recognition, so names and words can be off.</span>
        </div>
        {call.transcript.length === 0 ? (
          <p className="muted small">Nothing was said on this call.</p>
        ) : (
          <ol className="transcript">
            {call.transcript.map((l, i) => (
              <li key={i} className={`tline tline-${l.speaker}`}>
                <span className="tline-time num">{clock(l.atMs)}</span>
                <span className="tline-who">{l.speaker === 'rep' ? (mine ? 'You' : call.learner.name) : buyerFirst}</span>
                <span className="tline-text">
                  {l.text}
                  {l.interrupted && <span className="tiny muted"> (cut off)</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {call.notes && (
        <section className="panel panel-tight">
          <h2 className="section-title with-icon">
            <NotesIcon size={16} />
            {mine ? 'Your notes' : 'Notes'}
          </h2>
          <p className="small" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {call.notes}
          </p>
        </section>
      )}

      {mine && (
        <div className="row">
          <button type="button" className="btn btn-call" onClick={callAgain} disabled={again}>
            <PhoneIcon />
            {again ? 'Setting up…' : 'Call again'}
          </button>
          <Link className="btn btn-secondary" to="/voice">
            Back to Practice Studio-Voice
          </Link>
          {againError && <ErrorNotice error={againError} />}
        </div>
      )}
    </div>
  );
}

export function VoiceCallPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [call, setCall] = useState(null);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [closingStale, setClosingStale] = useState(false);

  const load = useCallback(async () => {
    try {
      const { call: c } = await get(`/voice/calls/${id}`);
      setCall(c);
      setError(null);
      return c;
    } catch (err) {
      setError(err);
      return null;
    }
  }, [id]);

  useEffect(() => {
    setCall(null);
    load();
  }, [load]);

  // A call still marked live when the page loads lost its connection (a reload, a closed tab): end it,
  // keeping what was saved along the way.
  useEffect(() => {
    if (!call || call.status !== 'live' || call.learner.id !== user.id || closingStale) return;
    setClosingStale(true);
    post(`/voice/calls/${call.id}/end`, { transcript: [], endReason: 'connection_lost' })
      .then(({ call: ended }) => setCall(ended))
      .catch(setError);
  }, [call, user.id, closingStale]);

  // Coaching runs after the call: check back until it is done.
  useEffect(() => {
    if (call?.coaching?.status !== 'running') return undefined;
    const t = setTimeout(load, 2500);
    return () => clearTimeout(t);
  }, [call, load]);

  useEffect(() => {
    if (!call) return;
    document.title = `${call.revealed ? `Call with ${call.revealed.buyer.name}` : 'Practice call'} · Sales Lab`;
  }, [call]);

  const retry = async () => {
    setRetrying(true);
    try {
      const { call: c } = await post(`/voice/calls/${id}/coach`, {});
      setCall(c);
    } catch (err) {
      setError(err);
    } finally {
      setRetrying(false);
    }
  };

  if (!call) return <div className="page">{error ? <ErrorNotice error={error} retry={load} /> : <Loading />}</div>;

  const mine = call.learner.id === user.id;
  const r = call.revealed;
  return (
    <div className="page">
      <Link to="/voice" className="crumb">
        Back to Practice Studio-Voice
      </Link>
      {call.status === 'ready' && mine ? (
        <>
          <div className="page-head">
            <div>
              <h1>Practice call</h1>
              <p className="sub">
                {call.productLabel}, to {call.callType === 'client' ? 'an existing client' : 'a new prospect'}. Dial when you are ready.
              </p>
            </div>
          </div>
          <PhoneScreen call={call} onEnded={setCall} />
        </>
      ) : (
        <>
          <div className="page-head">
            <div>
              <h1>{r ? `${mine ? 'Your call' : `${call.learner.name}’s call`} with ${r.buyer.name}` : 'Practice call'}</h1>
              <p className="sub">
                {call.persona.label}
                {r ? ` at ${r.buyer.firm}` : ''}, about {call.productLabel}, {call.callType === 'client' ? 'an existing client' : 'a new prospect'}.{' '}
                {fmtDateTime(call.connectedAt || call.createdAt)}.
              </p>
            </div>
          </div>
          {error && <ErrorNotice error={error} />}
          {(call.status === 'live' || call.status === 'ready') && mine && <Loading label="Ending the call…" />}
          {(call.status === 'live' || call.status === 'ready') && !mine && (
            <Notice kind="info" title={call.status === 'live' ? `${call.learner.name} is on this call now` : `${call.learner.name} has not dialed this call yet`}>
              <p>The transcript and coaching appear here once the call ends.</p>
            </Notice>
          )}
          {!['live', 'ready'].includes(call.status) && <CallReview call={call} viewer={user} onRetry={retry} retrying={retrying} />}
        </>
      )}
    </div>
  );
}
