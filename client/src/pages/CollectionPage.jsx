import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth, useMeta } from '../state.jsx';
import { BrandChip, ErrorNotice, fmtDate, Loading, Notice, useLoad } from '../components/ui.jsx';
import { groupSections, KIND_LABEL, Markdown, SectionStatus } from '../components/KnowledgeParts.jsx';
import { PlusIcon } from '../components/Icons.jsx';

// A whole collection, read top to bottom: the playbook as one document, or a brand's product knowledge.
export function CollectionPage() {
  const { cid } = useParams();
  const { user } = useAuth();
  const { meta } = useMeta();
  const { data, error, reload } = useLoad(() => get(`/knowledge/collections/${cid}`), [cid]);
  useEffect(() => {
    if (data) document.title = `${data.collection.name} · Sales Lab`;
  }, [data]);

  if (error && !data) return <div className="page"><ErrorNotice error={error} retry={reload} /></div>;
  if (!data) return <div className="page"><Loading /></div>;
  const c = data.collection;
  const sections = data.sections;
  const groups = groupSections(sections);
  // A caveat that every section shares is shown once, at the top.
  const caveats = [...new Set(sections.map((s) => s.caveats).filter(Boolean))];
  const sharedCaveat = caveats.length === 1 && sections.every((s) => s.caveats === caveats[0]) ? caveats[0] : null;
  const dates = [...new Set(sections.map((s) => s.asOfDate).filter(Boolean))];
  const drafts = sections.filter((s) => !s.isApproved).length;

  return (
    <div className="page">
      <Link className="crumb" to="/knowledge">
        Knowledge Library
      </Link>
      <div className="page-head">
        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <span className="chip">{KIND_LABEL[c.kind]}</span>
            <BrandChip brand={c.brand} />
          </div>
          <h1>{c.name}</h1>
          <p className="sub">
            {sections.length} section{sections.length === 1 ? '' : 's'}
            {dates.length === 1 ? `, accurate as of ${fmtDate(dates[0])}` : ''}.
            {user.isManager && drafts ? ` ${drafts === sections.length ? 'All are drafts' : `${drafts} ${drafts === 1 ? 'is a draft' : 'are drafts'}`}: shown to managers only, and not used for coaching until approved.` : ''}
          </p>
        </div>
        {user.isManager && (
          <div className="row">
            <Link className="btn btn-secondary" to={`/knowledge/new?collection=${c.id}`}>
              <PlusIcon />
              Add section
            </Link>
            <Link className="btn btn-quiet" to={`/knowledge/collections/${c.id}/edit`}>
              Edit or reorder
            </Link>
          </div>
        )}
      </div>

      {c.description && (
        <div className="collection-intro prose">
          <Markdown>{c.description}</Markdown>
        </div>
      )}
      {sharedCaveat && (
        <div style={{ marginBottom: 20, maxWidth: '80ch' }}>
          <Notice kind="warn" title="Caveats for every section">
            <p className="prewrap">{sharedCaveat}</p>
          </Notice>
        </div>
      )}

      <div className="doc-grid doc-grid-wide">
        <div className="stack-lg">
          {sections.length === 0 && <p className="muted">No sections yet.</p>}
          {sections.map((s) => (
            <article key={s.id} id={`section-${s.id}`} className="panel prose reader-section" aria-labelledby={`h-${s.id}`}>
              <div className="row" style={{ marginBottom: 6 }}>
                {user.isManager && <SectionStatus section={s} />}
                {s.group && <span className="tiny muted">{s.group}</span>}
              </div>
              <h2 id={`h-${s.id}`} className="reader-title">
                <Link to={`/knowledge/${s.id}`}>{s.title}</Link>
              </h2>
              <p className="tiny muted" style={{ marginTop: 4 }}>
                {s.isApproved ? `Version ${s.version}` : `Draft version ${s.version}, not used for coaching`}
                {s.asOfDate && dates.length > 1 ? `, as of ${fmtDate(s.asOfDate)}` : ''}. {meta.evidenceBasis[s.evidenceBasis]}.
              </p>
              {!sharedCaveat && s.caveats && (
                <Notice kind="warn" title="Caveats">
                  <p className="prewrap">{s.caveats}</p>
                </Notice>
              )}
              <Markdown shift={2}>{s.content}</Markdown>
            </article>
          ))}
        </div>
        <aside className="reader-toc">
          <nav className="panel panel-tight" aria-label="Contents">
            <h2 className="section-title">Contents</h2>
            {groups.map((g, i) => (
              <div key={`${g.group}-${i}`} className="toc-group">
                {g.group && <div className="toc-group-label">{g.group}</div>}
                <ul className="toc">
                  {g.items.map((s) => (
                    <li key={s.id}>
                      <a href={`#section-${s.id}`}>{s.title}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
