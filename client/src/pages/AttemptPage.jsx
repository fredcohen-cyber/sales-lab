import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { get, newRequestId, post } from '../api.js';
import { DRAFT_PREFIX, useAuth } from '../state.jsx';
import { BrandChip, ErrorNotice, fmtDateTime, Loading, Modal, Notice, ReviewBadge, useToast, attemptLabel, scoreText } from '../components/ui.jsx';
import { CheckIcon, RefreshIcon } from '../components/Icons.jsx';
import { CF_LABEL, CoachingResult, FLAG_LABEL } from '../components/Coaching.jsx';

const MAX_REPLY = 6000;

function readDraft(key) {
  try {
    return window.localStorage.getItem(`${DRAFT_PREFIX}${key}`) || '';
  } catch {
    return '';
  }
}
function writeDraft(key, text) {
  try {
    if (text) window.localStorage.setItem(`${DRAFT_PREFIX}${key}`, text);
    else window.localStorage.removeItem(`${DRAFT_PREFIX}${key}`);
  } catch {
    /* storage unavailable: the draft simply is not remembered */
  }
}

// A reply's score for the transcript: the number, or why there is none.
function turnScore(t) {
  if (t.mode === 'unscored') return null;
  if (t.reviewStatus === 'disputed') return 'Disputed';
  if (typeof t.score === 'number') return String(t.score);
  if (t.reviewStatus === 'provisional') return 'Pending review';
  if (t.runStatus === 'running') return 'Coaching…';
  return t.runStatus ? 'No score yet' : null;
}

// The buyer's lines and the rep's replies so far, with each reply's score.
function Transcript({ conversation, currentId, persona, who }) {
  return (
    <ol className="transcript">
      {conversation.turns.map((t) => {
        const current = t.attemptId === currentId;
        const score = turnScore(t);
        return (
          <li key={t.attemptId} className={current ? 'turn turn-current' : 'turn'} aria-current={current ? 'true' : undefined}>
            <div className="buyer">
              <div className="who-says">
                {persona} {t.turn === 1 ? 'said' : 'pushed back'}
              </div>
              <blockquote>{t.buyerLine}</blockquote>
            </div>
            <div className="turn-reply">
              <div className="row-between">
                <span className="section-title" style={{ margin: 0 }}>
                  {who} replied{conversation.repliesPlanned > 1 ? ` (reply ${t.turn} of ${conversation.repliesPlanned})` : ''}
                </span>
                {score && <span className={/^\d+$/.test(score) ? 'score-chip' : 'tiny muted'}>{score}</span>}
              </div>
              <div className="pad-text">{t.answer}</div>
              {!current && (
                <Link className="small" to={`/attempts/${t.attemptId}`}>
                  Coaching for reply {t.turn}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// Once every reply is in: the conversation's score and its replies from strongest to weakest.
function ConversationSummary({ conversation, scenario, isOwn, againLink, assigned }) {
  const { scoreState, score, ranked, repliesPlanned } = conversation;
  const why = {
    awaiting_coaching: 'The score appears once every reply has been coached.',
    pending_review: 'A reply is waiting for a manager to review a possible critical failure, so the score is not final yet.',
    disputed: 'A manager disputed the coaching on a reply, so this conversation has no score that counts.',
    unscored: 'This was unscored practice, so it has no score.',
  };
  return (
    <section className="panel stack-sm conversation-summary" aria-labelledby="conv-title">
      <div className="row-between">
        <h2 id="conv-title" className="section-title" style={{ margin: 0 }}>
          Conversation complete
        </h2>
        {scoreState === 'scored' && (
          <span className="score-chip score-chip-lg" aria-label={`Conversation score ${score} out of 100`}>
            {score}
            <small>/100</small>
          </span>
        )}
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        {scoreState === 'scored' ? `The average of your ${repliesPlanned} replies.` : why[scoreState] || ''}
      </p>
      {ranked.length > 1 && (
        <>
          <h3 className="tiny muted" style={{ margin: '6px 0 0' }}>
            Replies from strongest to weakest
          </h3>
          <ol className="ranked">
            {ranked.map((r, i) => (
              <li key={r.attemptId}>
                <Link to={`/attempts/${r.attemptId}`}>Reply {r.turn}</Link>
                <span className="score-chip">{r.score}</span>
                {i === 0 && <span className="tiny muted">strongest</span>}
                {i === ranked.length - 1 && <span className="tiny muted">weakest</span>}
              </li>
            ))}
          </ol>
        </>
      )}
      {isOwn && (
        <div className="row">
          {!assigned && (
            <Link className="btn btn-small" to={`/practice/stage/${scenario.stage}`}>
              Next {scenario.stageLabel.toLowerCase()} question
            </Link>
          )}
          <Link className="btn btn-secondary btn-small" to={againLink}>
            Try this question again
          </Link>
        </div>
      )}
    </section>
  );
}

// The buyer's pushback and the box to answer it, once the last reply has been coached.
function ReplyBox({ conversation, attempt, persona, userId }) {
  const navigate = useNavigate();
  const next = conversation.next;
  const key = `${userId}:reply:${next.afterAttemptId}`;
  const [text, setText] = useState(() => readDraft(key));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(null);
  const nextTurn = conversation.turns.length + 1;
  const send = async () => {
    setError(null);
    if (text.trim().length < 15) {
      setError({ message: 'Write a fuller reply before sending.' });
      return;
    }
    if (!requestId.current) requestId.current = newRequestId();
    setBusy(true);
    try {
      const r = await post('/practice/attempts', { clientRequestId: requestId.current, continueFrom: next.afterAttemptId, mode: attempt.mode, answer: text }, { timeoutMs: 25000 });
      writeDraft(key, '');
      navigate(`/attempts/${r.attempt.id}`, { state: { justSubmitted: true } });
    } catch (e) {
      if (e.code === 'timeout' || e.code === 'network') {
        setError({ message: 'Sales Lab could not confirm your reply was saved. Your text is still here; send it again. It will not be saved twice.' });
      } else {
        setError(e);
        requestId.current = null;
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="reply" className="panel stack reply-box" aria-labelledby="reply-title">
      <h2 id="reply-title" className="section-title" style={{ margin: 0 }}>
        The {persona.toLowerCase()} pushes back: reply {nextTurn} of {conversation.repliesPlanned}
      </h2>
      <div className="buyer">
        <div className="who-says">{persona} says</div>
        <blockquote>{next.buyerLine}</blockquote>
      </div>
      <div className="pad">
        <div className="pad-top" aria-hidden="true" />
        <label htmlFor="reply-text" className="visually-hidden">
          Your reply
        </label>
        <textarea
          id="reply-text"
          value={text}
          maxLength={MAX_REPLY}
          disabled={busy}
          spellCheck="true"
          onChange={(e) => {
            setText(e.target.value);
            writeDraft(key, e.target.value);
            requestId.current = null;
          }}
        />
      </div>
      {error && <ErrorNotice error={{ message: error.message, status: error.status }} />}
      <div className="row">
        <button className="btn" onClick={send} disabled={busy || !text.trim()}>
          {busy ? 'Saving your reply…' : attempt.mode === 'coached' ? 'Send reply for coaching' : 'Send reply'}
        </button>
        <span className="tiny muted">Write exactly what you would say. Drafts are kept on this device until you send.</span>
      </div>
    </section>
  );
}

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
  const queued = running && !run.callStartedAt;
  const elapsed = running ? Math.max(0, Math.round((serverNow - new Date(run.callStartedAt || run.startedAt).getTime()) / 1000)) : 0;
  const overdue = running && serverNow > new Date(run.deadlineAt).getTime();
  const isOwn = attempt.learner.id === user.id;
  const againLink = attempt.assignment
    ? `/practice/assigned/${attempt.assignment.itemId}`
    : `/practice/drill/${attempt.drillId}?persona=${attempt.persona}&difficulty=${attempt.settings.difficulty}&skepticism=${attempt.settings.skepticism}&depth=${attempt.settings.depth}`;
  const conv = data.conversation;
  const multi = conv.repliesPlanned > 1;
  const finished = conv.next.state === 'finished';
  const canReply = isOwn && conv.isLatest && conv.next.state === 'reply' && Boolean(conv.next.buyerLine);
  const who = isOwn ? 'You' : attempt.learner.name;

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
            {multi ? `Reply ${attempt.turn} of ${conv.repliesPlanned}` : isOwn ? 'Your answer' : `${attempt.learner.name}’s answer`}
            {multi && !isOwn ? ` by ${attempt.learner.name}` : ''}, submitted {fmtDateTime(attempt.submittedAt)}. Buyer: {s.persona.label}. Difficulty {s.settings.difficulty}, skepticism{' '}
            {s.settings.skepticism}, product depth {s.settings.depth}.
          </p>
        </div>
        {isOwn && finished && !multi && (
          <Link className="btn btn-secondary" to={againLink}>
            Try this question again
          </Link>
        )}
      </div>

      {location.state?.resumed && !finished && (
        <div style={{ marginBottom: 18 }}>
          <Notice kind="info" title="Finish this conversation first">
            <p>You started this {s.stageLabel.toLowerCase()} conversation earlier. Finish it, and the stage serves your next question.</p>
          </Notice>
        </div>
      )}
      {!conv.isLatest && (
        <div style={{ marginBottom: 18 }}>
          <Notice kind="info" title="This conversation continued">
            <p>
              You are looking at reply {attempt.turn}. <Link to={`/attempts/${conv.latestAttemptId}`}>Go to the latest reply</Link>.
            </p>
          </Notice>
        </div>
      )}

      {location.state?.justSubmitted && attempt.mode === 'unscored' && (
        <div style={{ marginBottom: 18 }}>
          <Notice kind="ok" title="Your answer is saved">
            <p>It is recorded as unscored practice.</p>
          </Notice>
        </div>
      )}

      <div className="attempt-grid">
        <section className="stack attempt-answer" aria-labelledby="yours">
          {multi ? (
            <>
              <h2 id="yours" className="section-title">
                The conversation
              </h2>
              <Transcript conversation={conv} currentId={attempt.id} persona={s.persona.label} who={who} />
            </>
          ) : (
            <>
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
            </>
          )}
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
                Drill version {s.drillVersion}. Scored against{' '}
                {attempt.sourceVersions.length
                  ? new Intl.ListFormat('en', { type: 'conjunction' }).format(
                      attempt.sourceVersions.map((v) => `${v.collectionName ? `${v.collectionName}: ` : ''}${v.title} (v${v.version})`),
                    )
                  : 'no approved source'}
                .
              </p>
            </div>
          </details>
          {data.siblings.length > 1 && (
            <div className="panel panel-tight">
              <h2 className="section-title">All attempts at this question with this buyer</h2>
              <ul className="feedback-list small">
                {data.siblings.map((x) => (
                  <li key={x.id}>
                    {x.id === attempt.conversationId ? <strong>This conversation</strong> : <Link to={`/attempts/${x.latest_turn_id || x.id}`}>{attemptLabel(x)}</Link>}
                    {x.id === attempt.conversationId && ` (${attemptLabel(x).toLowerCase()})`}
                    <span className="muted">
                      {' '}
                      {fmtDateTime(x.submitted_at)}.{' '}
                      {x.mode === 'unscored' ? 'No score' : scoreText(x) === '—' ? 'No score yet' : /^\d+$/.test(scoreText(x)) ? `Score ${scoreText(x)}` : scoreText(x)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <section className="stack attempt-coaching" aria-label="Coaching">
          {multi && finished && <ConversationSummary conversation={conv} scenario={s} isOwn={isOwn} againLink={againLink} assigned={Boolean(attempt.assignment)} />}
          {canReply && attempt.mode === 'coached' && evaluation && (
            <Notice kind="info" title="The buyer pushes back">
              <p>
                Read your coaching, then <a href="#reply">answer the buyer’s next objection</a> below.
              </p>
            </Notice>
          )}
          {attempt.mode === 'unscored' && <UnscoredPanel attempt={attempt} />}

          {attempt.mode === 'coached' && !evaluation && (
            <CoachingStatus
              run={run}
              queued={queued}
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

          {user.isManager && evaluation?.reviewStatus === 'provisional' && (
            <Notice kind="warn" title="This evaluation needs your review" action={<a className="btn btn-small" href="#review-title">Go to the review</a>}>
              <p>Flagged items stay out of reports until you decide them.</p>
            </Notice>
          )}
          {evaluation && <CoachingResult attempt={attempt} evaluation={evaluation} next={data.next} conversation={conv} replyBelow={canReply} />}
          {canReply && <ReplyBox key={conv.next.afterAttemptId} conversation={conv} attempt={attempt} persona={s.persona.label} userId={user.id} />}

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

function CoachingStatus({ run, queued, running, elapsed, overdue, stopped, coaching, onStop, onResume, onRetry, retrying }) {
  if (running && !stopped) {
    const pct = queued ? 3 : Math.min(95, Math.round((elapsed / EXPECTED_SECONDS) * 100));
    return (
      <div className="panel stack" role="status" aria-live="polite">
        <div className="row">
          <CheckIcon style={{ color: 'var(--green)' }} />
          <strong>Answer saved.</strong>
          <span className="muted">{queued ? 'Waiting for a free coaching slot; other answers are being coached.' : `Coaching is running (${elapsed}s).`}</span>
        </div>
        <div className="progress-line" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Coaching usually takes 15 to 45 seconds once it starts. It stops on its own after {coaching.timeoutSeconds} seconds.
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
            ? 'Coaching was retried several times in the last hour. Try again later, or ask your manager to restart it.'
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
          No AI coaching ran for this answer{attempt.unscoredReason === 'ai_not_configured' ? ' because AI coaching is not set up' : attempt.unscoredReason === 'no_approved_sources' ? ' because this question has no approved source material' : ''}. It has no score
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

const CF_TYPES = [
  ['unauthorized_guarantee', 'Unauthorized guarantee'],
  ['invented_capability', 'Invented capability'],
  ['contradicts_approved_fact', 'Contradicts approved material'],
];

// Current decisions, so a review can be reopened and changed.
function initialDecisions(ev) {
  const cf = {};
  for (const c of ev?.criticalFailures || []) if (c.status === 'confirmed' || c.status === 'rejected') cf[c.id] = c.status === 'confirmed' ? 'confirm' : 'reject';
  const flags = {};
  for (const f of ev?.reviewFlags || []) if (f.status === 'dismissed' || f.status === 'made_critical') flags[f.id] = f.status === 'made_critical' ? 'critical' : 'dismiss';
  return { cf, flags, flagTypes: {} };
}

function Choice({ name, value, current, onChange, children }) {
  return (
    <label className="checkbox small">
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => onChange(value)} />
      {children}
    </label>
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
  const [decisions, setDecisions] = useState(() => initialDecisions(ev));
  const [reviewNote, setReviewNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState({ type: 'unauthorized_guarantee', claimQuote: '', explanation: '' });
  const [reviewError, setReviewError] = useState(null);

  useEffect(() => {
    setDecisions(initialDecisions(ev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev?.id, ev?.reviewedAt]);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      await onChange();
      return true;
    } catch (e) {
      toast(e.message, { error: true });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const cfs = (ev?.criticalFailures || []).filter((c) => c.status !== 'rejected' || c.origin === 'coach');
  const flags = ev?.reviewFlags || [];
  const coachCfs = cfs.filter((c) => !c.fromFlag);
  const undecided = coachCfs.filter((c) => !decisions.cf[c.id]).length + flags.filter((f) => !decisions.flags[f.id]).length;
  const itemCount = coachCfs.length + flags.length;
  const addReady = !adding || (added.claimQuote.trim().length >= 3 && added.explanation.trim().length >= 3);

  const saveReview = async () => {
    setReviewError(null);
    const body = {
      criticalFailures: Object.fromEntries(coachCfs.filter((c) => decisions.cf[c.id]).map((c) => [c.id, decisions.cf[c.id]])),
      flags: decisions.flags,
      flagTypes: decisions.flagTypes,
      added: adding ? [{ type: added.type, claimQuote: added.claimQuote.trim(), explanation: added.explanation.trim() }] : [],
      note: reviewNote.trim(),
    };
    setBusy(true);
    try {
      const r = await post(`/evaluations/${ev.id}/review`, body);
      toast(itemCount === 0 && !adding ? 'Evaluation confirmed' : r.overallScore === 0 ? 'Review saved: critical failure confirmed' : 'Review saved');
      setAdding(false);
      setAdded({ type: 'unauthorized_guarantee', claimQuote: '', explanation: '' });
      setReviewNote('');
      await onChange();
    } catch (e) {
      setReviewError(e.message);
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
            {itemCount > 0
              ? 'Decide each flagged item. A confirmed critical failure sets the score to 0; anything you set aside does not count against the rep.'
              : 'Confirming counts this evaluation in reports. Disputing removes it from averages and records your reason.'}
            {ev.reviewedAt ? ` Last reviewed by ${ev.reviewedByName} on ${fmtDateTime(ev.reviewedAt)}.` : ''}
          </p>

          {coachCfs.map((c) => (
            <fieldset key={c.id} className="review-item">
              <legend>
                {CF_LABEL[c.type] || c.type}
                <span className="tiny muted"> {c.origin === 'manager' ? 'added in review' : 'found by coaching'}</span>
              </legend>
              <p className="small" style={{ margin: 0 }}>{c.explanation}</p>
              <span className="evidence">“{c.claimQuote}”</span>
              {c.sourceQuote && <span className="quote-source">{c.sourceTitle ? `${c.sourceTitle}: ` : 'Approved material: '}“{c.sourceQuote}”</span>}
              <div className="row">
                <Choice name={`cf-${c.id}`} value="confirm" current={decisions.cf[c.id]} onChange={(v) => setDecisions((d) => ({ ...d, cf: { ...d.cf, [c.id]: v } }))}>
                  Confirm critical failure (score 0)
                </Choice>
                <Choice name={`cf-${c.id}`} value="reject" current={decisions.cf[c.id]} onChange={(v) => setDecisions((d) => ({ ...d, cf: { ...d.cf, [c.id]: v } }))}>
                  Not a critical failure
                </Choice>
              </div>
            </fieldset>
          ))}

          {flags.map((f) => (
            <fieldset key={f.id} className="review-item">
              <legend>{FLAG_LABEL[f.kind] || 'Flag'}</legend>
              <p className="small" style={{ margin: 0 }}>{f.note}</p>
              {f.claimQuote && <span className="evidence">“{f.claimQuote}”</span>}
              {f.sourceQuote && <span className="quote-source">Approved material: “{f.sourceQuote}”</span>}
              <div className="row">
                <Choice name={`f-${f.id}`} value="dismiss" current={decisions.flags[f.id]} onChange={(v) => setDecisions((d) => ({ ...d, flags: { ...d.flags, [f.id]: v } }))}>
                  No action needed
                </Choice>
                {f.claimQuote && (
                  <Choice name={`f-${f.id}`} value="critical" current={decisions.flags[f.id]} onChange={(v) => setDecisions((d) => ({ ...d, flags: { ...d.flags, [f.id]: v } }))}>
                    Make it a critical failure
                  </Choice>
                )}
              </div>
              {decisions.flags[f.id] === 'critical' && f.status !== 'made_critical' && (
                <div className="field" style={{ maxWidth: 320 }}>
                  <label htmlFor={`ft-${f.id}`}>Type of critical failure</label>
                  <select
                    id={`ft-${f.id}`}
                    value={decisions.flagTypes[f.id] || (f.kind === 'possible_guarantee' ? 'unauthorized_guarantee' : f.type || 'contradicts_approved_fact')}
                    onChange={(e) => setDecisions((d) => ({ ...d, flagTypes: { ...d.flagTypes, [f.id]: e.target.value } }))}
                  >
                    {CF_TYPES.map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </fieldset>
          ))}

          {adding ? (
            <fieldset className="review-item">
              <legend>Add a critical failure the coaching missed</legend>
              <div className="field">
                <label htmlFor="add-type">Type</label>
                <select id="add-type" value={added.type} onChange={(e) => setAdded({ ...added, type: e.target.value })}>
                  {CF_TYPES.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="add-quote">The rep’s exact words</label>
                <input id="add-quote" type="text" value={added.claimQuote} onChange={(e) => setAdded({ ...added, claimQuote: e.target.value })} />
                <span className="hint">Copy them from the answer; the quote is checked against it.</span>
              </div>
              <div className="field">
                <label htmlFor="add-why">Why it is a critical failure</label>
                <textarea id="add-why" rows={2} value={added.explanation} onChange={(e) => setAdded({ ...added, explanation: e.target.value })} />
              </div>
              <div>
                <button type="button" className="btn btn-quiet btn-small" onClick={() => setAdding(false)}>
                  Remove
                </button>
              </div>
            </fieldset>
          ) : (
            <div>
              <button type="button" className="btn btn-quiet btn-small" onClick={() => setAdding(true)}>
                Add a critical failure the coaching missed
              </button>
            </div>
          )}

          <div className="field">
            <label htmlFor="review-note">Review note (optional, kept with the review)</label>
            <input id="review-note" type="text" value={reviewNote} maxLength={2000} onChange={(e) => setReviewNote(e.target.value)} />
          </div>
          {reviewError && <Notice kind="critical">{reviewError}</Notice>}
          <div className="row">
            <button className="btn btn-small" disabled={busy || undecided > 0 || !addReady} onClick={saveReview}>
              {itemCount > 0 || adding ? 'Save review' : ev.reviewStatus === 'confirmed' ? 'Confirm again' : 'Confirm evaluation'}
            </button>
            {undecided > 0 && <span className="small muted">{undecided} item{undecided === 1 ? '' : 's'} still need a decision.</span>}
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
        <p className="small">Disputed evaluations stay visible to the rep but have no score that counts and are excluded from performance averages.</p>
        <div className="field">
          <label htmlFor="dispute-note">Reason</label>
          <textarea id="dispute-note" rows={3} value={disputeNote} onChange={(e) => setDisputeNote(e.target.value)} />
        </div>
      </Modal>
    </section>
  );
}
