import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { useAuth } from '../state.jsx';
import { BrandChip, ErrorNotice, fmtDateTime, Loading, Modal, Notice, ReviewBadge, useToast } from '../components/ui.jsx';
import { CheckIcon, RefreshIcon } from '../components/Icons.jsx';
import { CoachingResult } from '../components/Coaching.jsx';

const POLL_MS = 1500;
const EXPECTED_SECONDS = 40;

export function AttemptPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [stopped, setStopped] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const timer = useRef(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const d = await get(`/practice/attempts/${id}`, { timeoutMs: 12000 });
      if (!alive.current) return null;
      offset.current = new Date(d.coaching.serverNow).getTime() - Date.now();
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      if (alive.current) setError(e);
      return null;
    }
  }, [id]);

  // Poll only while coaching runs and the person has not chosen to stop waiting. One request at a time.
  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const d = await load();
      if (!alive.current) return;
      if (!d || d.coaching.run?.status === 'running') schedule();
    }, POLL_MS);
  }, [load]);

  useEffect(() => {
    alive.current = true;
    setStopped(false);
    load().then((d) => {
      if (d?.coaching.run?.status === 'running') schedule();
    });
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, [load, schedule]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (data) document.title = `${data.attempt.scenario.title} · Sales Lab`;
  }, [data]);

  const stopWaiting = () => {
    setStopped(true);
    clearTimeout(timer.current);
  };
  const resume = async () => {
    setStopped(false);
    const d = await load();
    if (d?.coaching.run?.status === 'running') schedule();
  };
  const retry = async () => {
    setRetrying(true);
    try {
      const d = await post(`/practice/attempts/${id}/evaluate`, {}, { timeoutMs: 15000 });
      setData(d);
      setStopped(false);
      schedule();
    } catch (e) {
      toast(e.message, { error: true });
      await load();
    } finally {
      setRetrying(false);
    }
  };

  if (error && !data) {
    return (
      <div className="page">
        <ErrorNotice error={error} retry={load} />
      </div>
    );
  }
  if (!data) return <div className="page"><Loading /></div>;

  const { attempt, coaching, evaluation } = data;
  const s = attempt.scenario;
  const run = coaching.run;
  const running = run?.status === 'running';
  const serverNow = now + offset.current;
  const elapsed = running ? Math.max(0, Math.round((serverNow - new Date(run.startedAt).getTime()) / 1000)) : 0;
  const overdue = running && serverNow > new Date(run.deadlineAt).getTime();
  const isOwn = attempt.learner.id === user.id;
  const againLink = attempt.assignment
    ? `/practice/assigned/${attempt.assignment.itemId}`
    : `/practice/drill/${attempt.drillId}?persona=${attempt.persona}&difficulty=${attempt.settings.difficulty}&skepticism=${attempt.settings.skepticism}&depth=${attempt.settings.depth}`;

  return (
    <div className="page">
      <Link className="crumb" to={user.isManager && !isOwn ? '/coaching' : '/progress'}>
        Back to {user.isManager && !isOwn ? 'Team Coaching' : 'My Progress'}
      </Link>
      <div className="page-head">
        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <span className="chip">{s.stageLabel}</span>
            <BrandChip brand={s.brand} />
            {attempt.assignment && <span className="chip">Assignment: {attempt.assignment.title}</span>}
          </div>
          <h1>{s.title}</h1>
          <p className="sub">
            {isOwn ? 'Your answer' : `${attempt.learner.name}’s answer`}, submitted {fmtDateTime(attempt.submittedAt)}. Buyer: {s.persona.label}. Difficulty {s.settings.difficulty}, skepticism{' '}
            {s.settings.skepticism}, product depth {s.settings.depth}.
          </p>
        </div>
        {isOwn && (
          <Link className="btn btn-secondary" to={againLink}>
            Try this drill again
          </Link>
        )}
      </div>

      {location.state?.justSubmitted && attempt.mode === 'unscored' && (
        <div style={{ marginBottom: 18 }}>
          <Notice kind="ok" title="Your answer is saved">
            <p>It is recorded as unscored practice.</p>
          </Notice>
        </div>
      )}

      <div className="attempt-grid">
        <section className="stack attempt-answer" aria-labelledby="yours">
          <div className="buyer">
            <div className="who-says">{s.persona.label} said</div>
            <blockquote>{s.buyerLine}</blockquote>
          </div>
          <h2 id="yours" className="section-title">
            {isOwn ? 'You wrote' : `${attempt.learner.name} wrote`}
          </h2>
          <div className="pad">
            <div className="pad-top" aria-hidden="true" />
            <div className="pad-text">{attempt.answer}</div>
          </div>
        </section>

        <div className="stack attempt-extras">
          <details className="panel panel-tight">
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>The goal and what a good answer does</summary>
            <div className="stack-sm" style={{ marginTop: 10 }}>
              <p>
                <strong>Goal:</strong> {s.objective}
              </p>
              <div className="prewrap small">{s.goodLooksLike}</div>
              <p className="tiny muted" style={{ margin: 0 }}>
                Drill version {s.drillVersion}. Scored against {attempt.sourceVersions.length ? attempt.sourceVersions.map((v) => `${v.title} (v${v.version})`).join(' and ') : 'no approved source'}.
              </p>
            </div>
          </details>
          {data.siblings.length > 1 && (
            <div className="panel panel-tight">
              <h2 className="section-title">All attempts at this drill with this buyer</h2>
              <ul className="feedback-list small">
                {data.siblings.map((x) => (
                  <li key={x.id}>
                    {x.id === attempt.id ? <strong>This answer</strong> : <Link to={`/attempts/${x.id}`}>{x.attempt_number === 1 ? 'First attempt' : `Retry ${x.attempt_number - 1}`}</Link>}
                    {x.id === attempt.id && ` (${x.attempt_number === 1 ? 'first attempt' : `retry ${x.attempt_number - 1}`})`}
                    <span className="muted">
                      {' '}
                      {fmtDateTime(x.submitted_at)}. {x.mode === 'unscored' ? 'Unscored practice' : x.overall_score !== null ? `Score ${x.overall_score}` : 'No score'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <section className="stack attempt-coaching" aria-label="Coaching">
          {attempt.mode === 'unscored' && <UnscoredPanel attempt={attempt} />}

          {attempt.mode === 'coached' && !evaluation && (
            <CoachingStatus
              run={run}
              running={running}
              elapsed={elapsed}
              overdue={overdue}
              stopped={stopped}
              coaching={coaching}
              onStop={stopWaiting}
              onResume={resume}
              onRetry={retry}
              retrying={retrying}
            />
          )}

          {evaluation && <CoachingResult attempt={attempt} evaluation={evaluation} next={data.next} />}

          {data.notes.length > 0 && (
            <section className="panel">
              <h2 className="section-title">Coaching notes</h2>
              <ul className="feedback-list">
                {data.notes.map((n) => (
                  <li key={n.id}>
                    <p style={{ marginBottom: 4 }} className="prewrap">
                      {n.body}
                    </p>
                    <span className="tiny muted">
                      {n.author_name}, {fmtDateTime(n.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {user.isManager && <ManagerReview data={data} onChange={load} />}
        </section>
      </div>
    </div>
  );
}

function CoachingStatus({ run, running, elapsed, overdue, stopped, coaching, onStop, onResume, onRetry, retrying }) {
  if (running && !stopped) {
    const pct = Math.min(95, Math.round((elapsed / EXPECTED_SECONDS) * 100));
    return (
      <div className="panel stack" role="status" aria-live="polite">
        <div className="row">
          <CheckIcon style={{ color: 'var(--green)' }} />
          <strong>Answer saved.</strong>
          <span className="muted">Coaching is running ({elapsed}s).</span>
        </div>
        <div className="progress-line" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Coaching usually takes 15 to 45 seconds. It stops on its own after {Math.round((new Date(run.deadlineAt) - new Date(run.startedAt)) / 1000)} seconds.
        </p>
        <div className="row">
          <button className="btn btn-secondary btn-small" onClick={onStop}>
            Stop waiting
          </button>
          {(overdue || coaching.canRetry) && (
            <button className="btn btn-small" onClick={onRetry} disabled={retrying}>
              <RefreshIcon />
              {retrying ? 'Restarting…' : 'Restart coaching'}
            </button>
          )}
        </div>
      </div>
    );
  }
  if (running && stopped) {
    return (
      <Notice kind="info" title="You stopped waiting">
        <p>Your answer is saved. Coaching may still finish in the background.</p>
        <div className="row">
          <button className="btn btn-secondary btn-small" onClick={onResume}>
            Check again
          </button>
          {coaching.canRetry && (
            <button className="btn btn-small" onClick={onRetry} disabled={retrying}>
              <RefreshIcon />
              Retry coaching
            </button>
          )}
          {!coaching.canRetry && coaching.retryInSeconds && <span className="small muted">You can restart it in about {coaching.retryInSeconds} seconds.</span>}
        </div>
      </Notice>
    );
  }
  // failed, timed out, or superseded without a result
  return (
    <Notice kind="critical" title="Coaching did not finish">
      <p>{run?.errorMessage || 'No coaching result was recorded. Your answer is saved.'}</p>
      <p className="small">No score was recorded, so nothing about this answer has been guessed.</p>
      {coaching.canRetry ? (
        <button className="btn btn-small" onClick={onRetry} disabled={retrying}>
          <RefreshIcon />
          {retrying ? 'Retrying…' : 'Retry coaching'}
        </button>
      ) : (
        <p className="small" style={{ margin: 0 }}>
          {coaching.retryBlockedReason === 'too_many_runs'
            ? 'Coaching was retried several times. Your manager can review this answer.'
            : coaching.retryBlockedReason === 'ai_not_configured'
              ? 'AI coaching is not set up right now.'
              : ''}
        </p>
      )}
    </Notice>
  );
}

function UnscoredPanel({ attempt }) {
  const s = attempt.scenario;
  return (
    <div className="stack">
      <Notice kind="info" title="Unscored practice">
        <p>
          No AI coaching ran for this answer{attempt.unscoredReason === 'ai_not_configured' ? ' because AI coaching is not set up' : attempt.unscoredReason === 'no_approved_sources' ? ' because this drill has no approved source material' : ''}. It has no score
          and does not count toward assignments or performance reports.
        </p>
      </Notice>
      <section className="panel stack-sm">
        <h2 className="section-title">Check your own answer</h2>
        <p className="small muted">Compare what you wrote with what a good answer does:</p>
        <div className="prewrap">{s.goodLooksLike}</div>
      </section>
    </div>
  );
}

function ManagerReview({ data, onChange }) {
  const toast = useToast();
  const ev = data.evaluation;
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [dispute, setDispute] = useState(false);
  const [disputeNote, setDisputeNote] = useState('');
  const [showRaw, setShowRaw] = useState(false);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      await onChange();
    } catch (e) {
      toast(e.message, { error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel stack" aria-labelledby="review-title">
      <div className="row-between">
        <h2 id="review-title" className="section-title" style={{ margin: 0 }}>
          Manager review
        </h2>
        {ev && <ReviewBadge status={ev.reviewStatus} />}
      </div>
      {ev ? (
        <>
          <p className="small muted" style={{ margin: 0 }}>
            Confirming counts this evaluation in reports. Disputing removes it from averages and records your reason.
            {ev.reviewedAt ? ` Last reviewed by ${ev.reviewedByName} on ${fmtDateTime(ev.reviewedAt)}.` : ''}
          </p>
          <div className="row">
            {ev.reviewStatus !== 'confirmed' && (
              <button className="btn btn-small" disabled={busy} onClick={() => act(() => post(`/evaluations/${ev.id}/confirm`, { note: '' }), 'Evaluation confirmed')}>
                Confirm evaluation
              </button>
            )}
            {ev.reviewStatus !== 'disputed' && (
              <button className="btn btn-secondary btn-small" disabled={busy} onClick={() => setDispute(true)}>
                Dispute evaluation
              </button>
            )}
            <button className="btn btn-quiet btn-small" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? 'Hide' : 'Show'} raw coaching output
            </button>
          </div>
          {showRaw && <pre className="small" style={{ whiteSpace: 'pre-wrap', maxHeight: 360, overflow: 'auto', background: 'var(--surface-2)', padding: 10, borderRadius: 4 }}>{JSON.stringify(ev.rawOutput, null, 2)}</pre>}
        </>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>
          There is no evaluation to review yet.
        </p>
      )}
      <form
        className="stack-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          act(async () => {
            await post(`/attempts/${data.attempt.id}/notes`, { body: note.trim() });
            setNote('');
          }, 'Coaching note added');
        }}
      >
        <label htmlFor="note" className="section-title" style={{ display: 'block' }}>
          Add a coaching note
        </label>
        <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="The rep sees this note with their answer." />
        <div>
          <button className="btn btn-secondary btn-small" type="submit" disabled={busy || !note.trim()}>
            Add note
          </button>
        </div>
      </form>
      <Modal
        open={dispute}
        onClose={() => setDispute(false)}
        title="Dispute this evaluation"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDispute(false)}>
              Cancel
            </button>
            <button
              className="btn"
              disabled={busy || disputeNote.trim().length < 3}
              onClick={() =>
                act(async () => {
                  await post(`/evaluations/${ev.id}/dispute`, { note: disputeNote.trim() });
                  setDispute(false);
                  setDisputeNote('');
                }, 'Evaluation disputed')
              }
            >
              Dispute evaluation
            </button>
          </>
        }
      >
        <p className="small">Disputed evaluations stay visible to the rep but are excluded from performance averages.</p>
        <div className="field">
          <label htmlFor="dispute-note">Reason</label>
          <textarea id="dispute-note" rows={3} value={disputeNote} onChange={(e) => setDisputeNote(e.target.value)} />
        </div>
      </Modal>
    </section>
  );
}
