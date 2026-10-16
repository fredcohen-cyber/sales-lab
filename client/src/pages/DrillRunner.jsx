import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { newRequestId, post } from '../api.js';
import { DRAFT_PREFIX, useAuth, useMeta } from '../state.jsx';
import { BrandChip, ErrorNotice, fmtDate, LevelPicker, Loading, Notice } from '../components/ui.jsx';
import { LockIcon } from '../components/Icons.jsx';

const MAX = 6000;

// Drafts are stored per person and cleared on sign-out (see clearDrafts in state.jsx).
function draftKey(scope) {
  return `${DRAFT_PREFIX}${scope}`;
}
function readDraft(scope) {
  try {
    return window.localStorage.getItem(draftKey(scope)) || '';
  } catch {
    return '';
  }
}
function writeDraft(scope, text) {
  try {
    if (text) window.localStorage.setItem(draftKey(scope), text);
    else window.localStorage.removeItem(draftKey(scope));
  } catch {
    /* storage unavailable: the draft simply is not remembered */
  }
}

const SOURCE_REASON = {
  brand: 'covers a different brand',
  subject: 'does not cover this subject',
  persona: 'is for other buyer personas',
  not_approved: 'not approved yet',
  archived: 'archived',
  missing: 'deleted',
  sections_missing: 'its chosen sections are no longer in the approved version',
};

function levelsFromQuery(params) {
  const n = (k) => {
    const v = Number(params.get(k));
    return Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
  };
  const d = n('difficulty');
  const s = n('skepticism');
  const p = n('depth');
  return d && s && p ? { difficulty: d, skepticism: s, depth: p } : null;
}

export function DrillRunner() {
  const { drillId, itemId } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { meta } = useMeta();
  const navigate = useNavigate();
  const assigned = Boolean(itemId);

  const [persona, setPersona] = useState(() => (assigned ? null : params.get('persona')));
  const [levels, setLevels] = useState(() => (assigned ? null : levelsFromQuery(params)));
  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const requestId = useRef(null);
  const loadSeq = useRef(0);

  const scope = `${user.id}:${assigned ? `item:${itemId}` : `drill:${drillId}:${persona || ''}`}`;

  // Load the scenario. Free practice reloads when persona or levels change.
  useEffect(() => {
    const mine = ++loadSeq.current;
    const body = assigned ? { assignmentItemId: itemId } : { drillId, ...(persona ? { persona } : {}), ...(levels || {}) };
    post('/practice/preview', body)
      .then((d) => {
        if (mine !== loadSeq.current) return;
        setPreview(d);
        setLoadError(null);
        if (!persona) setPersona(d.scenario.persona.key);
        if (!levels) setLevels(d.scenario.settings);
      })
      .catch((e) => mine === loadSeq.current && setLoadError(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillId, itemId, persona, levels?.difficulty, levels?.skepticism, levels?.depth]);

  useEffect(() => {
    if (preview) document.title = `${preview.scenario.title} · Sales Lab`;
  }, [preview]);

  // Restore an unsent draft for this exercise. Drafts are written only when the person types,
  // so restoring can never race with an empty initial value.
  useEffect(() => {
    if (!persona && !assigned) return;
    const saved = readDraft(scope);
    if (saved) setAnswer((a) => a || saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
  // A different buyer or challenge level is a different submission.
  useEffect(() => {
    requestId.current = null;
  }, [persona, levels?.difficulty, levels?.skepticism, levels?.depth]);
  const changeAnswer = (text) => {
    setAnswer(text);
    writeDraft(scope, text);
    requestId.current = null; // a changed answer is a new submission
  };

  const s = preview?.scenario;
  const coaching = preview?.coaching;
  const words = useMemo(() => (answer.trim() ? answer.trim().split(/\s+/).length : 0), [answer]);

  const submit = async (mode) => {
    setSubmitError(null);
    if (answer.trim().length < 15) {
      setSubmitError({ message: 'Write a fuller answer before submitting.' });
      return;
    }
    if (!requestId.current) requestId.current = newRequestId();
    setSubmitting(true);
    try {
      const body = {
        clientRequestId: requestId.current,
        mode,
        answer,
        ...(assigned
          ? { assignmentItemId: itemId }
          : { drillId: preview.drill.id, drillVersionId: preview.drill.versionId, persona, ...levels }),
      };
      const r = await post('/practice/attempts', body, { timeoutMs: 25000 });
      writeDraft(scope, '');
      navigate(`/attempts/${r.attempt.id}`, { state: { justSubmitted: true } });
    } catch (e) {
      if (e.code === 'timeout' || e.code === 'network') {
        setSubmitError({ message: 'Sales Lab could not confirm your answer was saved. Your text is still here; submit again. It will not be saved twice.' });
      } else {
        setSubmitError(e);
        requestId.current = null;
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="page">
        <Link className="crumb" to={assigned ? '/curriculum' : '/practice'}>
          Back to {assigned ? 'Curriculum' : 'Practice Studio'}
        </Link>
        <ErrorNotice error={loadError} />
      </div>
    );
  }
  if (!s) return <div className="page"><Loading /></div>;

  const personaOptions = preview.drill.personas;
  return (
    <div className="page">
      <Link className="crumb" to={assigned ? '/curriculum' : '/practice'}>
        Back to {assigned ? 'Curriculum' : 'Practice Studio'}
      </Link>
      <div className="split">
        <section className="stack" aria-labelledby="drill-title">
          <div className="row">
            <span className="chip">{s.stageLabel}</span>
            <BrandChip brand={s.brand} />
            <span className="chip">{meta.subjects[s.subject]}</span>
          </div>
          <h1 id="drill-title">{s.title}</h1>
          {preview.assigned && (
            <Notice kind="info">
              Assigned in “{preview.assigned.title}”{preview.assigned.dueDate ? `, due ${fmtDate(preview.assigned.dueDate)}` : ''}. Your manager set the buyer and challenge levels.
            </Notice>
          )}
          <p>{s.situation}</p>
          <div className="buyer">
            <div className="who-says">{s.persona.label} says</div>
            <blockquote>{s.buyerLine}</blockquote>
          </div>
          <div className="panel panel-tight stack-sm">
            <h2 className="section-title">Your goal</h2>
            <p style={{ marginBottom: 0 }}>{s.objective}</p>
          </div>

          <details className="panel panel-tight">
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>About this buyer: {s.persona.label}</summary>
            <dl className="kv" style={{ marginTop: 10 }}>
              <dt>Responsible for</dt>
              <dd>{s.persona.responsibilities}</dd>
              <dt>Cares about</dt>
              <dd>{s.persona.concerns}</dd>
            </dl>
          </details>

          <div className="panel stack">
            <div className="row-between">
              <h2 className="section-title" style={{ margin: 0 }}>
                Challenge
              </h2>
              {assigned && (
                <span className="badge badge-neutral">
                  <LockIcon />
                  Set by your manager
                </span>
              )}
            </div>
            {!assigned && personaOptions.length > 1 && (
              <div className="field">
                <label htmlFor="persona">Buyer persona</label>
                <select id="persona" value={persona || ''} onChange={(e) => setPersona(e.target.value)}>
                  {personaOptions.map((k) => (
                    <option key={k} value={k}>
                      {meta.personas.find((p) => p.key === k)?.label || k}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <LevelPicker label="Overall difficulty" value={s.settings.difficulty} locked={assigned} texts={meta.levels.difficulty} onChange={(v) => setLevels((l) => ({ ...l, difficulty: v }))} />
            <LevelPicker label="Buyer skepticism" value={s.settings.skepticism} locked={assigned} texts={meta.levels.skepticism} onChange={(v) => setLevels((l) => ({ ...l, skepticism: v }))} />
            <LevelPicker label="Product depth" value={s.settings.depth} locked={assigned} texts={meta.levels.depth} onChange={(v) => setLevels((l) => ({ ...l, depth: v }))} />
          </div>

          <div className="stack-sm">
            <h2 className="section-title">What this drill scores</h2>
            <div className="row">
              {s.assessedDimensions.map((d) => (
                <span key={d.key} className="chip" title={d.description}>
                  {d.label}
                </span>
              ))}
            </div>
            <p className="tiny muted">Other dimensions are not assessed in this drill, so they do not count toward your score.</p>
          </div>
          {s.sources.length > 0 && (
            <div className="stack-sm">
              <h2 className="section-title">Coaching is grounded in</h2>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {s.sources.map((src) => (
                  <li key={src.sourceId}>
                    {src.available ? (
                      <Link to={`/knowledge/${src.sourceId}`}>{src.title}</Link>
                    ) : (
                      <span className="muted">
                        {src.title || 'A source awaiting approval'} (not used: {SOURCE_REASON[src.reason] || 'not approved yet'})
                      </span>
                    )}
                    {src.available && src.asOfDate && <span className="muted">, as of {fmtDate(src.asOfDate)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {user.isManager && (preview.sourceDetails || []).some((d) => d.reason || d.missingSections?.length) && (
            <Notice kind="warn" title="Source material needs attention (managers only)">
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {preview.sourceDetails
                  .filter((d) => d.reason || d.missingSections?.length)
                  .map((d) => (
                    <li key={d.sourceId}>
                      {d.title}: {d.reason ? `not used, ${d.reasonText}.` : ''}
                      {d.missingSections?.length ? ` Sections ${d.missingSections.join(', ')} are not in the approved version.` : ''}
                    </li>
                  ))}
              </ul>
            </Notice>
          )}
          {user.isManager && (
            <Link className="small" to={`/drills/${preview.drill.id}/edit`}>
              Edit this drill
            </Link>
          )}
        </section>

        <section className="stack answer-col" aria-labelledby="answer-title">
          <h2 id="answer-title">Your answer</h2>
          <p className="muted small" style={{ marginBottom: 0 }}>
            Write exactly what you would say or send. Coaching appears after you submit, never before.
          </p>
          <div className="pad">
            <div className="pad-top" aria-hidden="true" />
            <label htmlFor="answer" className="visually-hidden">
              Your answer
            </label>
            <textarea id="answer" value={answer} maxLength={MAX} onChange={(e) => changeAnswer(e.target.value)} spellCheck="true" disabled={submitting} />
          </div>
          <div className="pad-meta">
            <span>{words} words</span>
            <span>Drafts are kept on this device until you submit.</span>
          </div>
          {submitError && <ErrorNotice error={{ message: submitError.message, status: submitError.status }} />}
          {coaching.available ? (
            <button className="btn" onClick={() => submit('coached')} disabled={submitting || !answer.trim()}>
              {submitting ? 'Saving your answer…' : 'Submit for coaching'}
            </button>
          ) : (
            <div className="stack-sm">
              <Notice kind="warn" title="Coaching is not available for this drill">
                <p>{coaching.message}</p>
                {assigned ? (
                  <p>Unscored practice cannot complete an assigned exercise, so this one stays open until coaching is available.</p>
                ) : (
                  <p>You can still practice. Your answer is saved and labeled as unscored practice, with no score.</p>
                )}
              </Notice>
              {!assigned && (
                <button className="btn btn-secondary" onClick={() => submit('unscored')} disabled={submitting || !answer.trim()}>
                  {submitting ? 'Saving…' : 'Save as unscored practice'}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
