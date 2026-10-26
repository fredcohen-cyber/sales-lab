import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth, useMeta } from '../state.jsx';
import { BrandChip, Empty, ErrorNotice, Loading, Notice, useLoad } from '../components/ui.jsx';
import { PlusIcon } from '../components/Icons.jsx';
import { NextUpCard } from './Home.jsx';

const TRACK_TITLE = { ae: 'Account executive stages', am: 'Account manager stages' };

function StageTile({ stage }) {
  const status = stage.openAttemptId ? 'Conversation in progress' : stage.waiting ? 'Question waiting' : null;
  const progress = stage.answered
    ? `You have answered ${stage.answered} of ${stage.questions} question${stage.questions === 1 ? '' : 's'}`
    : `${stage.questions} question${stage.questions === 1 ? '' : 's'}`;
  if (!stage.questions) {
    return (
      <div className="drill stage-tile stage-tile-empty" aria-disabled="true">
        <h3>{stage.label}</h3>
        <p className="drill-line">{stage.description}</p>
        <div className="drill-foot">
          <span className="tiny muted">No questions for your role yet.</span>
        </div>
      </div>
    );
  }
  return (
    <Link to={`/practice/stage/${stage.key}`} className="drill stage-tile" aria-describedby={`stage-${stage.key}-progress`}>
      <h3>{stage.label}</h3>
      <p className="drill-line">{stage.description}</p>
      <div className="drill-foot">
        <span id={`stage-${stage.key}-progress`} className="tiny muted">
          {progress}
        </span>
        {status && <span className="badge badge-info">{status}</span>}
        {stage.coachable === 0 && <span className="badge badge-warn">Unscored only</span>}
      </div>
    </Link>
  );
}

function StageGrid({ user }) {
  const { data, error, loading, reload } = useLoad(() => get('/practice/stages'), []);
  if (error) return <ErrorNotice error={error} retry={reload} />;
  if (loading && !data) return <Loading />;
  const stages = data.stages;
  // The person's own role first.
  const order = user.role === 'am' ? ['am', 'ae'] : ['ae', 'am'];
  return order
    .map((track) => ({ track, stages: stages.filter((s) => s.track === track) }))
    .filter((g) => g.stages.length)
    .map((g) => (
      <section key={g.track} className="stage-group" aria-labelledby={`track-${g.track}`}>
        <h2 id={`track-${g.track}`}>{TRACK_TITLE[g.track]}</h2>
        <div className="drill-list">
          {g.stages.map((s) => (
            <StageTile key={s.key} stage={s} />
          ))}
        </div>
      </section>
    ));
}

// Managers browse and edit every question; reps never pick one.
function QuestionBank({ user, meta }) {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'active';
  const { data, error, loading, reload } = useLoad(() => get(`/drills?status=${status}`), [status]);
  const [q, setQ] = useState('');

  const filter = (key) => params.get(key) || '';
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const drills = useMemo(() => {
    const list = data?.drills || [];
    const brand = filter('brand');
    const persona = filter('persona');
    const role = filter('role');
    const subject = filter('subject');
    const text = q.trim().toLowerCase();
    return list.filter(
      (d) =>
        (!brand || d.brand === brand) &&
        (!persona || d.personas.includes(persona)) &&
        (!role || d.roles.includes(role)) &&
        (!subject || d.subject === subject) &&
        (!text || d.title.toLowerCase().includes(text) || d.buyerLine.toLowerCase().includes(text)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params, q]);

  const byStage = meta.stages.map((s) => ({ ...s, drills: drills.filter((d) => d.stage === s.key) })).filter((s) => s.drills.length);

  return (
    <>
      <div className="filters" role="search">
        <div className="field">
          <label htmlFor="f-q">Search</label>
          <input id="f-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Objection or topic" />
        </div>
        <div className="field">
          <label htmlFor="f-brand">Brand</label>
          <select id="f-brand" value={filter('brand')} onChange={(e) => setFilter('brand', e.target.value)}>
            <option value="">All</option>
            <option value="ravenly">Ravenly</option>
            <option value="omnizant">Omnizant</option>
            <option value="both">Both brands</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-subject">Subject</label>
          <select id="f-subject" value={filter('subject')} onChange={(e) => setFilter('subject', e.target.value)}>
            <option value="">All</option>
            {Object.entries(meta.subjects).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-persona">Buyer</label>
          <select id="f-persona" value={filter('persona')} onChange={(e) => setFilter('persona', e.target.value)}>
            <option value="">All personas</option>
            {meta.personas.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-role">For</label>
          <select id="f-role" value={filter('role')} onChange={(e) => setFilter('role', e.target.value)}>
            <option value="">AEs and AMs</option>
            <option value="ae">Account executives</option>
            <option value="am">Account managers</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={status} onChange={(e) => setFilter('status', e.target.value === 'active' ? '' : e.target.value)}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && drills.length === 0 && <Empty title="No questions match these filters">Clear a filter to see more questions.</Empty>}
      {byStage.map((stage) => (
        <section key={stage.key} className="stage-group" aria-labelledby={`stage-${stage.key}`}>
          <h2 id={`stage-${stage.key}`}>
            {stage.label} <span className="tiny muted">{stage.drills.length}</span>
          </h2>
          <div className="drill-list">
            {stage.drills.map((d) => (
              <Link key={d.id} to={`/practice/drill/${d.id}`} className="drill">
                <h3>{d.title}</h3>
                <p className="drill-line">{d.buyerLine}</p>
                <div className="drill-foot">
                  <BrandChip brand={d.brand} />
                  <span className="chip">{meta.subjects[d.subject]}</span>
                  <span className="chip">{d.roles.map((r) => (r === 'am' ? 'AM' : 'AE')).join(' and ')}</span>
                  <span className="chip">Level {d.defaults.difficulty}</span>
                  {!d.coaching.available && <span className="badge badge-warn">Unscored only</span>}
                  {d.status !== 'active' && <span className="badge badge-neutral">{d.status === 'draft' ? 'Draft' : 'Archived'}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function PracticeStudio() {
  const { user } = useAuth();
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const view = user.isManager && params.get('view') === 'bank' ? 'bank' : 'practice';
  const cur = useLoad(() => get('/curriculum/mine'), []);
  useEffect(() => {
    document.title = `${view === 'bank' ? 'Question bank' : 'Practice Studio'} · Sales Lab`;
  }, [view]);
  const show = (v) => setParams(v === 'bank' ? { view: 'bank' } : {}, { replace: true });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Practice Studio</h1>
          <p className="sub">
            {view === 'bank'
              ? 'Every question reps can be served, by stage. Each one sets its buyer and challenge levels, and lists the pushbacks the buyer may raise.'
              : 'Choose a stage and answer the buyer’s question. Each reply is coached, then the buyer pushes back, so you practice handling one objection after another.'}
          </p>
        </div>
        {user.isManager && view === 'bank' && (
          <Link className="btn btn-secondary" to="/drills/new">
            <PlusIcon />
            New question
          </Link>
        )}
      </div>

      {user.isManager && (
        <div className="tabs" role="tablist" aria-label="Practice Studio view">
          <button role="tab" aria-selected={view === 'practice'} className={view === 'practice' ? 'active' : ''} onClick={() => show('practice')}>
            Practice
          </button>
          <button role="tab" aria-selected={view === 'bank'} className={view === 'bank' ? 'active' : ''} onClick={() => show('bank')}>
            Question bank
          </button>
        </div>
      )}

      {!meta.coaching.configured && (
        <div style={{ marginBottom: 20 }}>
          <Notice kind="warn" title="AI coaching is not set up yet">
            <p>Questions run as clearly labeled unscored practice until a manager adds an AI key on the server. The buyer still pushes back where the question lists its pushbacks.</p>
          </Notice>
        </div>
      )}

      {view === 'practice' ? (
        <>
          {cur.data?.next && (
            <div style={{ marginBottom: 24 }}>
              <NextUpCard next={cur.data.next} />
            </div>
          )}
          <StageGrid user={user} />
        </>
      ) : (
        <QuestionBank user={user} meta={meta} />
      )}
    </div>
  );
}
