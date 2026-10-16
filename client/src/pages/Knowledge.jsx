import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth, useMeta } from '../state.jsx';
import { BrandChip, Empty, ErrorNotice, fmtDate, Loading, Notice, useLoad } from '../components/ui.jsx';
import { PlusIcon } from '../components/Icons.jsx';

const STATUS = { draft: ['badge-warn', 'Draft'], approved: ['badge-ok', 'Approved'], archived: ['badge-neutral', 'Archived'] };

export function Knowledge() {
  const { user } = useAuth();
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useLoad(() => get('/knowledge'), []);
  useEffect(() => {
    document.title = 'Knowledge Library · Sales Lab';
  }, []);
  const f = (k) => params.get(k) || '';
  const set = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  const sources = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.sources || []).filter(
      (s) =>
        (!f('brand') || s.brand === f('brand')) &&
        (!f('subject') || s.subjects.includes(f('subject'))) &&
        (!f('persona') || s.personas.length === 0 || s.personas.includes(f('persona'))) &&
        (!f('status') || s.status === f('status')) &&
        (!t || s.title.toLowerCase().includes(t)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params, q]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Knowledge Library</h1>
          <p className="sub">The approved product, competitive, and sales-technique material that coaching is checked against. Dates and caveats travel with every source.</p>
        </div>
        {user.isManager && (
          <Link className="btn" to="/knowledge/new">
            <PlusIcon />
            Add source
          </Link>
        )}
      </div>
      {data?.coverage?.missing?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Notice kind="warn" title="Missing approved material">
            <p>
              No approved source covers: {data.coverage.missing.map((m) => m.label).join(', ')}. Drills on these topics run as unscored practice, and coaching will not invent facts about them.
              {user.isManager ? ' Add and approve a source to enable coaching.' : ''}
            </p>
          </Notice>
        </div>
      )}
      <div className="filters" role="search">
        <div className="field">
          <label htmlFor="k-q">Search titles</label>
          <input id="k-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="k-brand">Brand</label>
          <select id="k-brand" value={f('brand')} onChange={(e) => set('brand', e.target.value)}>
            <option value="">All</option>
            <option value="ravenly">Ravenly</option>
            <option value="omnizant">Omnizant</option>
            <option value="both">Both brands</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="k-subject">Subject</label>
          <select id="k-subject" value={f('subject')} onChange={(e) => set('subject', e.target.value)}>
            <option value="">All</option>
            {Object.entries(meta.subjects).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="k-persona">Buyer persona</label>
          <select id="k-persona" value={f('persona')} onChange={(e) => set('persona', e.target.value)}>
            <option value="">All</option>
            {meta.personas.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {user.isManager && (
          <div className="field">
            <label htmlFor="k-status">Approval</label>
            <select id="k-status" value={f('status')} onChange={(e) => set('status', e.target.value)}>
              <option value="">All</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && sources.length === 0 && <Empty title="No sources match">Change the filters{user.isManager ? ', or add a source' : ''}.</Empty>}
      {sources.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Source</th>
                <th>Brand</th>
                <th>Subjects</th>
                <th>Personas</th>
                <th>As of</th>
                {user.isManager && <th>Approval</th>}
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link className="row-link" to={`/knowledge/${s.id}`}>
                      {s.title}
                    </Link>
                  </td>
                  <td>
                    <BrandChip brand={s.brand} />
                  </td>
                  <td className="small">{s.subjects.map((x) => meta.subjects[x]).join(', ')}</td>
                  <td className="small">{s.personas.length ? s.personas.map((p) => meta.personas.find((x) => x.key === p)?.label || p).join(', ') : 'All'}</td>
                  <td className="nowrap">{s.asOfDate ? fmtDate(s.asOfDate) : <span className="muted">Not dated</span>}</td>
                  {user.isManager && (
                    <td>
                      <span className={`badge ${STATUS[s.status][0]}`}>{STATUS[s.status][1]}</span>
                      {s.hasPendingDraft && <div className="tiny muted">Newer draft waiting</div>}
                    </td>
                  )}
                  <td className="num nowrap">{user.isManager
                      ? s.approved && s.approved.version !== s.latest.version
                        ? `v${s.latest.version} (v${s.approved.version} approved)`
                        : `v${s.latest.version}`
                      : `v${s.approved?.version}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
