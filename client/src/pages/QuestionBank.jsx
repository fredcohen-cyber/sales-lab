import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { del, get, put } from '../api.js';
import { useMeta } from '../state.jsx';
import { Empty, ErrorNotice, Loading, Modal, Notice, personaLabel, Stat, useLoad, useToast } from '../components/ui.jsx';
import { IdealAnswerView, IdealBadge } from '../components/IdealAnswer.jsx';
import { formFromDrill, idealBody, idealFromDrill, questionBody } from '../lib/drillForm.js';
import { PlusIcon, SparkIcon } from '../components/Icons.jsx';

// Products in the order the sales team thinks about them, then anything else the workspace has.
const PRODUCT_ORDER = ['ravenly', 'omnizant_ai_search', 'omnizant_web', 'general'];
const STATUS_LABEL = { active: 'Active', draft: 'Draft', archived: 'Archived' };
const roleText = (roles) => roles.map((r) => (r === 'am' ? 'AM' : 'AE')).join(' and ');

function matchesFilters(d, f) {
  const text = f.q.trim().toLowerCase();
  return (
    (!text || d.title.toLowerCase().includes(text) || d.buyerLine.toLowerCase().includes(text) || (d.concept || '').toLowerCase().includes(text)) &&
    (!f.stage || d.stage === f.stage) &&
    (!f.persona || d.personas.includes(f.persona)) &&
    (!f.role || d.roles.includes(f.role)) &&
    (!f.status || d.status === f.status) &&
    (!f.ideal || d.idealAnswer.status === f.ideal)
  );
}

// Everything about a question, to review it without opening the editor.
function QuestionReview({ d, meta, onApproved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ideal = idealFromDrill(d);
  const status = d.idealAnswer.status;
  // Approving saves a new version of the question with the answer marked approved, as the editor would.
  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      const { drill } = await get(`/drills/${d.id}`);
      const current = idealFromDrill(drill);
      await put(`/drills/${d.id}`, { ...questionBody(formFromDrill(drill)), changeNote: 'Ideal answer approved.', idealAnswer: idealBody({ ...current, approved: true }) });
      toast('Ideal answer approved');
      onApproved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const lines = Object.entries(d.personaLines || {}).filter(([, v]) => v);
  return (
    <div className="qb-review" id={`review-${d.id}`}>
      <div className="qb-review-grid">
        <div className="stack">
          <section className="stack-sm">
            <h4 className="mini-label">The moment</h4>
            <p style={{ margin: 0 }}>{d.situation}</p>
            <div className="buyer">
              <div className="who-says">{d.personas.map((k) => personaLabel(meta, k)).join(', ')}</div>
              <blockquote>{d.buyerLine}</blockquote>
            </div>
            {lines.map(([k, v]) => (
              <p key={k} className="small" style={{ margin: 0 }}>
                <strong>{personaLabel(meta, k)}:</strong> {v}
              </p>
            ))}
            <p className="small" style={{ margin: 0 }}>
              <strong>Objective:</strong> {d.objective}
            </p>
          </section>
          <section className="stack-sm">
            <h4 className="mini-label">What a good answer does</h4>
            <div className="prewrap small">{d.goodLooksLike}</div>
            {Object.entries(d.roleGuidance || {}).map(([role, text]) => (
              <div key={role} className="small">
                <strong>For an {role === 'am' ? 'account manager' : 'account executive'}:</strong>
                <div className="prewrap">{text}</div>
              </div>
            ))}
          </section>
          {d.pushbacks?.length > 0 && (
            <section className="stack-sm">
              <h4 className="mini-label">The buyer’s pushbacks</h4>
              <ol className="small qb-pushbacks">
                {d.pushbacks.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </section>
          )}
          <section className="stack-sm">
            <h4 className="mini-label">Scoring and sources</h4>
            <div className="row" style={{ gap: 6 }}>
              {d.assessedDimensions.map((k) => (
                <span key={k} className="chip">
                  {meta.dimensions.find((x) => x.key === k)?.label || k}
                </span>
              ))}
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              Difficulty {d.defaults.difficulty}, skepticism {d.defaults.skepticism}, product depth {d.defaults.depth}.{' '}
              {d.coaching.available ? 'Coached and scored.' : d.coaching.message}
            </p>
            {d.sources.length > 0 && (
              <ul className="small qb-sources">
                {d.sources.map((s) => (
                  <li key={s.sourceId}>
                    {s.title || 'A source awaiting approval'}
                    {s.reason && <span className="muted"> (not used: {s.reasonText || s.reason})</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <section className="stack-sm qb-ideal" aria-label={`Ideal answer for ${d.title}`}>
          <div className="row-between">
            <h4 className="mini-label">Ideal answer</h4>
            <IdealBadge status={status} />
          </div>
          <IdealAnswerView ideal={ideal} status={status} />
          {error && <ErrorNotice error={{ message: error.message }} />}
          <div className="row">
            {status === 'proposed' && (
              <button type="button" className="btn btn-small" onClick={approve} disabled={busy}>
                {busy ? 'Approving…' : 'Approve this answer'}
              </button>
            )}
            {status === 'none' ? (
              <Link className="btn btn-small" to={`/drills/${d.id}/edit?propose=1#ideal-answer`}>
                <SparkIcon size={15} />
                Propose an ideal answer
              </Link>
            ) : (
              <Link className="btn btn-secondary btn-small" to={`/drills/${d.id}/edit#ideal-answer`}>
                {status === 'proposed' ? 'Edit before approving' : 'Edit the ideal answer'}
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function QuestionRow({ d, meta, open, onToggle, onDelete, onChanged }) {
  return (
    <li id={`row-${d.id}`} className={`qb-row${open ? ' open' : ''}${d.status !== 'active' ? ' inactive' : ''}`}>
      <div className="qb-row-head">
        <div className="qb-row-main">
          <button type="button" className="qb-title" aria-expanded={open} aria-controls={`review-${d.id}`} onClick={onToggle}>
            {d.title}
          </button>
          <p className="qb-line">{d.buyerLine}</p>
          <div className="qb-meta">
            <span className="chip">{d.stageLabel}</span>
            <span className="chip">{roleText(d.roles)}</span>
            <span className="chip">Level {d.defaults.difficulty}</span>
            {d.status !== 'active' && <span className="badge badge-neutral">{STATUS_LABEL[d.status]}</span>}
            <IdealBadge status={d.idealAnswer.status} />
            <span className="tiny muted">{d.answers ? `${d.answers} ${d.answers === 1 ? 'conversation' : 'conversations'}` : 'Not answered yet'}</span>
          </div>
        </div>
        <div className="qb-actions">
          <Link className="btn btn-secondary btn-small" to={`/drills/${d.id}/edit`} aria-label={`Edit ${d.title}`}>
            Edit
          </Link>
          <button type="button" className="btn btn-quiet btn-small qb-delete" onClick={onDelete} aria-label={`Delete ${d.title}`}>
            Delete
          </button>
        </div>
      </div>
      {open && <QuestionReview d={d} meta={meta} onApproved={onChanged} />}
    </li>
  );
}

export function QuestionBank() {
  const { meta } = useMeta();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload } = useLoad(() => get('/drills'), []);
  const [open, setOpen] = useState(() => new Set(params.get('review') ? [params.get('review')] : []));
  const [doomed, setDoomed] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const filters = {
    q: params.get('q') || '',
    stage: params.get('stage') || '',
    persona: params.get('persona') || '',
    role: params.get('role') || '',
    status: params.get('status') || '',
    ideal: params.get('ideal') || '',
  };
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('review');
    setParams(next, { replace: true });
  };
  const clearFilters = () => setParams(new URLSearchParams(), { replace: true });

  useEffect(() => {
    document.title = 'Question Bank · Sales Lab';
  }, []);
  // A question just added or edited opens for review, in view.
  const reviewId = params.get('review');
  useEffect(() => {
    if (!reviewId || !data) return;
    setOpen((s) => new Set([...s, reviewId]));
    setTimeout(() => document.getElementById(`row-${reviewId}`)?.scrollIntoView({ block: 'start' }), 60);
  }, [reviewId, data]);

  const all = data?.drills || [];
  const shown = useMemo(() => all.filter((d) => matchesFilters(d, filters)), [all, params]); // eslint-disable-line react-hooks/exhaustive-deps
  const narrowed = Object.values(filters).some(Boolean);
  const products = [...PRODUCT_ORDER, ...Object.keys(meta.productLines || {}).filter((k) => !PRODUCT_ORDER.includes(k))].filter((k) => meta.productLines?.[k]);
  const subjects = Object.keys(meta.subjects);
  const groups = products
    .map((p) => ({
      key: p,
      label: meta.productLines[p].label,
      subjects: subjects.map((s) => ({ key: s, label: meta.subjects[s], items: shown.filter((d) => d.productLine === p && d.subject === s) })).filter((g) => g.items.length),
    }))
    .filter((g) => g.subjects.length);
  const count = (fn) => all.filter(fn).length;
  const toggle = (id) => setOpen((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await del(`/drills/${doomed.id}`);
      toast(`Deleted “${doomed.title}”`);
      setDoomed(null);
      await reload({ quiet: true });
    } catch (err) {
      setDeleteError(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Question Bank</h1>
          <p className="sub">
            Every question reps can be served, grouped by product and subject. Open a question to review it and its ideal answer, or edit and delete it. When you add a
            question, Sales Lab proposes an ideal answer for you to review.
          </p>
        </div>
        <Link className="btn" to="/questions/new">
          <PlusIcon />
          Add a question
        </Link>
      </div>

      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="stats" style={{ marginBottom: 24 }}>
            <Stat label="Questions" value={all.length} note={`${count((d) => d.status === 'active')} active, ${count((d) => d.status === 'draft')} drafts, ${count((d) => d.status === 'archived')} archived`} />
            <Stat label="Ideal answers approved" value={count((d) => d.idealAnswer.status === 'approved')} note="Shown to reps after they answer" />
            <Stat
              label="Waiting for your review"
              value={count((d) => d.idealAnswer.status === 'proposed')}
              note={count((d) => d.idealAnswer.status === 'proposed') ? <button type="button" className="link-btn" onClick={() => setFilter('ideal', 'proposed')}>Show them</button> : 'Proposed answers you have not approved'}
            />
            <Stat label="Without an ideal answer" value={count((d) => d.idealAnswer.status === 'none')} note="Open one to propose an answer" />
          </div>

          <div className="filters qb-filters" role="search" aria-label="Narrow the questions">
            <div className="field">
              <label htmlFor="qb-q">Search</label>
              <input id="qb-q" type="search" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} placeholder="Title, buyer line, or concept" />
            </div>
            <div className="field">
              <label htmlFor="qb-stage">Stage</label>
              <select id="qb-stage" value={filters.stage} onChange={(e) => setFilter('stage', e.target.value)}>
                <option value="">All stages</option>
                {meta.stages.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="qb-persona">Buyer</label>
              <select id="qb-persona" value={filters.persona} onChange={(e) => setFilter('persona', e.target.value)}>
                <option value="">All buyers</option>
                {meta.personas.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="qb-role">For</label>
              <select id="qb-role" value={filters.role} onChange={(e) => setFilter('role', e.target.value)}>
                <option value="">AEs and AMs</option>
                <option value="ae">Account executives</option>
                <option value="am">Account managers</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="qb-status">Status</label>
              <select id="qb-status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
                <option value="">Any status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="qb-ideal">Ideal answer</label>
              <select id="qb-ideal" value={filters.ideal} onChange={(e) => setFilter('ideal', e.target.value)}>
                <option value="">Any</option>
                <option value="approved">Approved</option>
                <option value="proposed">Waiting for review</option>
                <option value="none">None yet</option>
              </select>
            </div>
          </div>

          {shown.length === 0 && (
            <Empty
              title={narrowed ? 'No questions match these filters' : 'No questions yet'}
              action={
                narrowed ? (
                  <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : (
                  <Link className="btn" to="/questions/new">
                    Add a question
                  </Link>
                )
              }
            >
              {narrowed ? 'Clear the filters to see every question.' : 'Add the first question, and Sales Lab proposes an ideal answer for you to review.'}
            </Empty>
          )}
          {narrowed && shown.length > 0 && (
            <p className="small muted" style={{ marginTop: -8 }}>
              {shown.length} of {all.length} questions match.{' '}
              <button type="button" className="link-btn" onClick={clearFilters}>
                Clear filters
              </button>
            </p>
          )}

          {groups.map((g) => (
            <section key={g.key} className="qb-product" aria-labelledby={`qb-${g.key}`}>
              <h2 id={`qb-${g.key}`}>
                {g.label} <span className="qb-count">{g.subjects.reduce((n, s) => n + s.items.length, 0)}</span>
              </h2>
              {g.subjects.map((s) => {
                const approved = s.items.filter((d) => d.idealAnswer.status === 'approved').length;
                const hasReview = s.items.some((d) => open.has(d.id));
                return (
                  <details key={s.key} className="qb-group" open={narrowed || hasReview || shown.length <= 40}>
                    <summary>
                      <span className="qb-group-title">{s.label}</span>
                      <span className="tiny muted">
                        {s.items.length} {s.items.length === 1 ? 'question' : 'questions'}, {approved} with an approved ideal answer
                      </span>
                    </summary>
                    <ul className="qb-list">
                      {s.items.map((d) => (
                        <QuestionRow
                          key={d.id}
                          d={d}
                          meta={meta}
                          open={open.has(d.id)}
                          onToggle={() => toggle(d.id)}
                          onDelete={() => {
                            setDeleteError(null);
                            setDoomed(d);
                          }}
                          onChanged={() => reload({ quiet: true })}
                        />
                      ))}
                    </ul>
                  </details>
                );
              })}
            </section>
          ))}
        </>
      )}

      <Modal
        open={Boolean(doomed)}
        onClose={() => !deleting && setDoomed(null)}
        title={doomed ? `Delete “${doomed.title}”?` : ''}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDoomed(null)} disabled={deleting}>
              Keep it
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete the question'}
            </button>
          </>
        }
      >
        {doomed && (
          <>
            <p style={{ margin: 0 }}>It leaves the Question Bank and practice for good, and no stage serves it again.</p>
            <p className="small muted" style={{ margin: 0 }}>
              {doomed.answers
                ? `Reps started ${doomed.answers} ${doomed.answers === 1 ? 'conversation' : 'conversations'} on it. Those answers stay in their history and reports, and an open conversation can still be finished.`
                : 'No rep has answered it yet.'}{' '}
              To hide it for now instead, set its status to Archived in the editor.
            </p>
            {deleteError && <Notice kind="critical">{deleteError.message}</Notice>}
          </>
        )}
      </Modal>
    </div>
  );
}
