import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { get, post } from '../api.js';
import { useAuth, useMeta } from '../state.jsx';
import { BrandChip, ErrorNotice, fmtDate, fmtDateTime, Loading, Modal, Notice, useLoad, useToast } from '../components/ui.jsx';

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
function textOf(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (children?.props) return textOf(children.props.children);
  return '';
}
// The page title is the h1, so document headings move down one level (styled by their markdown level).
const components = {
  h1: ({ children }) => <h2 className="md-h1">{children}</h2>,
  h2: ({ children }) => (
    <h3 className="md-h2" id={`sec-${slug(textOf(children))}`}>
      {children}
    </h3>
  ),
  h3: ({ children }) => <h4 className="md-h3">{children}</h4>,
  h4: ({ children }) => <h5 className="md-h4">{children}</h5>,
  a: ({ href, children }) => (
    <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener">
      {children}
    </a>
  ),
};

// Before approving: drills that point at sections this version drops or retitles.
function DrillImpact({ sourceId, versionId, open }) {
  const [state, setState] = useState({ loading: false, drills: null, error: null });
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setState({ loading: true, drills: null, error: null });
    get(`/knowledge/${sourceId}/drill-impact?versionId=${versionId}`)
      .then((d) => alive && setState({ loading: false, drills: d.drills, error: null }))
      .catch((e) => alive && setState({ loading: false, drills: null, error: e }));
    return () => {
      alive = false;
    };
  }, [open, sourceId, versionId]);
  if (state.loading) return <Loading label="Checking drills that use this source…" />;
  if (state.error) return <p className="small muted">Could not check which drills use this source: {state.error.message}</p>;
  if (!state.drills || state.drills.length === 0) return <p className="small muted">Every drill that uses this source still finds its sections in this version.</p>;
  return (
    <Notice kind="warn" title={`${state.drills.length} drill${state.drills.length === 1 ? '' : 's'} would lose or change their source sections`}>
      <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
        {state.drills.map((d) => (
          <li key={d.drillId}>
            <Link to={`/drills/${d.drillId}/edit`}>{d.title}</Link>:{' '}
            {d.missing.map((m) => (m.why === 'retitled' ? `“${m.title}” is now titled “${m.nowTitle}”` : `“${m.title}” is gone`)).join('; ')}
            {d.allMissing ? '. This drill would run as unscored practice.' : '.'}
          </li>
        ))}
      </ul>
      <p className="small" style={{ marginTop: 8 }}>
        Sections are matched by title, so renumbering alone is fine. Missing or retitled sections are not used for coaching until you update the drill.
      </p>
    </Notice>
  );
}

export function SourcePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const version = params.get('version');
  const { user } = useAuth();
  const { meta } = useMeta();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => get(`/knowledge/${id}${version ? `?version=${version}` : ''}`), [id, version]);
  const [confirm, setConfirm] = useState(null);
  useEffect(() => {
    if (data) document.title = `${data.version.title} · Sales Lab`;
  }, [data]);

  if (error && !data) return <div className="page"><ErrorNotice error={error} retry={reload} /></div>;
  if (!data) return <div className="page"><Loading /></div>;
  const v = data.version;
  const src = data.source;

  const act = async (fn, msg) => {
    try {
      await fn();
      toast(msg);
      setConfirm(null);
      reload({ quiet: true });
    } catch (e) {
      toast(e.message, { error: true });
    }
  };

  return (
    <div className="page">
      <Link className="crumb" to="/knowledge">
        Back to Knowledge Library
      </Link>
      <div className="page-head">
        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <BrandChip brand={v.brand} />
            {v.subjects.map((s) => (
              <span key={s} className="chip">
                {meta.subjects[s]}
              </span>
            ))}
            {v.evidenceBasis && <span className="chip">{meta.evidenceBasis[v.evidenceBasis]}</span>}
            {src.status === 'archived' && <span className="badge badge-neutral">Archived</span>}
            {user.isManager && (v.isApproved ? <span className="badge badge-ok">Approved version</span> : <span className="badge badge-warn">Not the approved version</span>)}
          </div>
          <h1>{v.title}</h1>
          <p className="sub">
            Version {v.version}
            {v.asOfDate ? `, accurate as of ${fmtDate(v.asOfDate)}` : ', no as-of date'}. For {v.personas.length ? v.personas.map((p) => meta.personas.find((x) => x.key === p)?.label || p).join(', ') : 'all buyer personas'}.
          </p>
        </div>
        {user.isManager && (
          <div className="row">
            <Link className="btn btn-secondary" to={`/knowledge/${src.id}/edit`}>
              Edit as new version
            </Link>
            {!v.isApproved && src.status !== 'archived' && (
              <button className="btn" onClick={() => setConfirm('approve')}>
                Approve this version
              </button>
            )}
            {src.status !== 'archived' ? (
              <button className="btn btn-quiet" onClick={() => setConfirm('archive')}>
                Archive
              </button>
            ) : (
              <button className="btn btn-quiet" onClick={() => act(() => post(`/knowledge/${src.id}/restore`, {}), 'Source restored')}>
                Restore
              </button>
            )}
          </div>
        )}
      </div>

      {v.caveats && (
        <div style={{ marginBottom: 20 }}>
          <Notice kind="warn" title="Caveats">
            <p className="prewrap">{v.caveats}</p>
          </Notice>
        </div>
      )}

      <div className="split" style={{ gridTemplateColumns: 'minmax(0, 1fr) 260px' }}>
        <article className="panel prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
            {v.content}
          </ReactMarkdown>
        </article>
        <aside className="stack" style={{ position: 'sticky', top: 20 }}>
          {v.sections.length > 1 && (
            <nav className="panel panel-tight" aria-label="Sections">
              <h2 className="section-title">Sections</h2>
              <ul className="toc">
                {v.sections
                  .filter((s) => s.key !== 'intro')
                  .map((s) => (
                    <li key={s.key}>
                      <a href={`#sec-${slug(s.title)}`}>{s.title}</a>
                    </li>
                  ))}
              </ul>
            </nav>
          )}
          <div className="panel panel-tight small stack-sm">
            <h2 className="section-title">Record</h2>
            <p style={{ margin: 0 }}>
              Added by {v.createdByName || 'System'} on {fmtDateTime(v.createdAt)}.
            </p>
            {v.approvedAt && (
              <p style={{ margin: 0 }}>
                Approved by {v.approvedByName || 'System'} on {fmtDateTime(v.approvedAt)}.
              </p>
            )}
            {v.changeNote && <p style={{ margin: 0 }} className="muted">{v.changeNote}</p>}
          </div>
          {user.isManager && data.versions && (
            <div className="panel panel-tight small">
              <h2 className="section-title">Versions</h2>
              <ul className="toc">
                {data.versions.map((x) => (
                  <li key={x.id}>
                    <Link to={`/knowledge/${src.id}?version=${x.version}`}>
                      v{x.version}
                      {x.id === src.approvedVersionId ? ' (approved)' : ''}
                    </Link>{' '}
                    <span className="muted">{fmtDate(x.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={confirm === 'approve'}
        onClose={() => setConfirm(null)}
        title="Approve this version?"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className="btn" onClick={() => act(() => post(`/knowledge/${src.id}/approve`, { versionId: v.id }), 'Version approved')}>
              Approve version {v.version}
            </button>
          </>
        }
      >
        <p>New coaching will check answers against version {v.version}. Answers already scored keep the version they were scored with.</p>
        <DrillImpact sourceId={src.id} versionId={v.id} open={confirm === 'approve'} />
      </Modal>
      <Modal
        open={confirm === 'archive'}
        onClose={() => setConfirm(null)}
        title="Archive this source?"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={() => act(() => post(`/knowledge/${src.id}/archive`, {}), 'Source archived')}>
              Archive
            </button>
          </>
        }
      >
        <p>Archived sources stop supporting coaching. Drills that rely only on this source become unscored practice until another approved source is attached. Past results are unchanged.</p>
      </Modal>
    </div>
  );
}
