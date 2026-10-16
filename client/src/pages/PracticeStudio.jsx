import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth, useMeta } from '../state.jsx';
import { BrandChip, Empty, ErrorNotice, Loading, Notice, useLoad } from '../components/ui.jsx';
import { PlusIcon } from '../components/Icons.jsx';
import { NextUpCard } from './Home.jsx';

export function PracticeStudio() {
  const { user } = useAuth();
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const status = user.isManager ? params.get('status') || 'active' : 'active';
  const { data, error, loading, reload } = useLoad(() => get(`/drills${user.isManager ? `?status=${status}` : ''}`), [status]);
  const cur = useLoad(() => get('/curriculum/mine'), []);
  const [q, setQ] = useState('');
  useEffect(() => {
    document.title = 'Practice Studio · Sales Lab';
  }, []);

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
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Practice Studio</h1>
          <p className="sub">Each drill is one buyer moment. Read the situation, write what you would say, and get coaching on your actual words.</p>
        </div>
        {user.isManager && (
          <Link className="btn btn-secondary" to="/drills/new">
            <PlusIcon />
            New drill
          </Link>
        )}
      </div>

      {!meta.coaching.configured && (
        <div style={{ marginBottom: 20 }}>
          <Notice kind="warn" title="AI coaching is not set up yet">
            <p>Drills run as clearly labeled unscored practice until a manager adds an AI key on the server. Unscored practice is saved but does not complete assigned exercises.</p>
          </Notice>
        </div>
      )}

      {cur.data?.next && (
        <div style={{ marginBottom: 24 }}>
          <NextUpCard next={cur.data.next} />
        </div>
      )}

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
        {user.isManager && (
          <div className="field">
            <label htmlFor="f-status">Status</label>
            <select id="f-status" value={status} onChange={(e) => setFilter('status', e.target.value === 'active' ? '' : e.target.value)}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && drills.length === 0 && <Empty title="No drills match these filters">Clear a filter to see more drills.</Empty>}
      {byStage.map((stage) => (
        <section key={stage.key} className="stage-group" aria-labelledby={`stage-${stage.key}`}>
          <h2 id={`stage-${stage.key}`}>{stage.label}</h2>
          <div className="drill-list">
            {stage.drills.map((d) => (
              <Link key={d.id} to={`/practice/drill/${d.id}`} className="drill">
                <h3>{d.title}</h3>
                <p className="drill-line">{d.buyerLine}</p>
                <div className="drill-foot">
                  <BrandChip brand={d.brand} />
                  <span className="chip">{meta.subjects[d.subject]}</span>
                  {d.roles.length === 1 && <span className="chip">{d.roles[0] === 'am' ? 'AM' : 'AE'}</span>}
                  {!d.coaching.available && <span className="badge badge-warn">Unscored only</span>}
                  {d.status !== 'active' && <span className="badge badge-neutral">{d.status === 'draft' ? 'Draft' : 'Archived'}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
