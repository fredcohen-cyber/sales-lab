import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { get, patch, post } from '../api.js';
import { useAuth, useMeta } from '../state.jsx';
import { BrandChip, ErrorNotice, Field, fmtDate, fmtDateTime, Loading, Modal, Notice, useLoad, useToast } from '../components/ui.jsx';
import { Markdown, slugText } from '../components/KnowledgeParts.jsx';

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
  if (!state.drills || state.drills.length === 0) return null;
  return (
    <Notice kind="warn" title={`${state.drills.length} drill${state.drills.length === 1 ? '' : 's'} would lose or change their source sections`}>
      <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
        {state.drills.map((d) => (
          <li key={d.drillId}>
            <Link to={`/drills/${d.drillId}/edit`}>{d.title}</Link>:{' '}
            {d.missing.map((m) => (m.why === 'retitled' ? `“${m.title}” not found (its old number now holds “${m.nowTitle}”)` : `“${m.title}” is gone`)).join('; ')}
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

// Move a section to another collection or group (structure only; no new version).
function MoveModal({ open, onClose, source, onDone }) {
  const toast = useToast();
  const [collections, setCollections] = useState(null);
  const [form, setForm] = useState({ collectionId: source.collection?.id || '', group: source.group || '' });
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!open) return;
    setForm({ collectionId: source.collection?.id || '', group: source.group || '' });
    get('/knowledge/collections')
      .then((d) => setCollections(d.collections))
      .catch(setError);
  }, [open, source]);
  const save = async () => {
    try {
      await patch(`/knowledge/${source.id}/placement`, { collectionId: form.collectionId || null, group: form.collectionId ? form.group : '' });
      toast(form.collectionId ? 'Section moved' : 'Moved out of collections');
      onDone();
    } catch (e) {
      setError(e);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move this section"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={save} disabled={!collections}>
            Move
          </button>
        </>
      }
    >
      <p className="small">Moving changes where the section is listed. Its text, versions, approval, and the drills that use it stay the same.</p>
      {!collections && !error && <Loading />}
      {collections && (
        <>
          <Field label="Collection" id="mv-col">
            <select id="mv-col" value={form.collectionId} onChange={(e) => setForm({ ...form, collectionId: e.target.value })}>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="">Not in a collection (a standalone document)</option>
            </select>
          </Field>
          {form.collectionId && (
            <Field label="Group" id="mv-group" hint="Optional. Sections with the same group are listed together.">
              <input id="mv-group" type="text" maxLength={80} value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} />
            </Field>
          )}
        </>
      )}
      {error && <ErrorNotice error={{ message: error.message }} />}
    </Modal>
  );
}

// Split a long document at its "## " headings into sections of a collection.
function SplitModal({ open, onClose, source, version, preview, onDone }) {
  const { meta } = useMeta();
  const [collections, setCollections] = useState(null);
  const [mode, setMode] = useState('new');
  const [target, setTarget] = useState('');
  const [fresh, setFresh] = useState({ name: version.title, kind: version.subjects.includes('product') ? 'product' : 'playbook', brand: version.brand });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!open) return;
    get('/knowledge/collections')
      .then((d) => {
        setCollections(d.collections);
        setTarget(d.collections[0]?.id || '');
      })
      .catch(setError);
  }, [open]);
  // The introduction becomes the collection's description, unless the collection already has one.
  const chosen = mode === 'existing' ? collections?.find((c) => c.id === target) : null;
  const introAsSection = preview.hasIntro && mode === 'existing' && Boolean(chosen?.description?.trim());
  const count = preview.sections + (introAsSection ? 1 : 0);
  const blocked = Boolean(preview.pendingDraftVersion);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await post(`/knowledge/${source.id}/split`, mode === 'new' ? { newCollection: { ...fresh, description: '' } } : { collectionId: target });
      onDone(r);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Split into sections"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={save} disabled={blocked || busy || (mode === 'new' ? fresh.name.trim().length < 2 : !target)}>
            {busy ? 'Splitting…' : `Split into ${count} sections`}
          </button>
        </>
      }
    >
      {blocked && (
        <Notice kind="warn" title={`Version ${preview.pendingDraftVersion} is not approved yet`}>
          <p className="small">Approve it, or save the approved text again as the newest version, before splitting, so no edit is left behind.</p>
        </Notice>
      )}
      <p className="small">
        This splits version {preview.version}. Each “## ” heading becomes its own section, with the same text, dates, caveats, and evidence basis, so each can be edited and
        approved on its own.
        {source.status === 'approved' ? ' The sections start approved, since their text is already approved.' : ' The sections start as drafts.'}
        {preview.hasIntro &&
          (introAsSection ? ' The text before the first heading becomes a section named Introduction.' : ' The text before the first heading becomes the collection’s description.')}{' '}
        Drills that use this document move to the matching sections, and the document is archived.
      </p>
      <div className="row">
        <label className="checkbox small">
          <input type="radio" name="split-mode" checked={mode === 'new'} onChange={() => setMode('new')} />
          New collection
        </label>
        <label className="checkbox small">
          <input type="radio" name="split-mode" checked={mode === 'existing'} onChange={() => setMode('existing')} disabled={!collections?.length} />
          Add to an existing collection
        </label>
      </div>
      {mode === 'new' ? (
        <div className="stack-sm">
          <Field label="Collection name" id="sp-name">
            <input id="sp-name" type="text" maxLength={120} value={fresh.name} onChange={(e) => setFresh({ ...fresh, name: e.target.value })} />
          </Field>
          <div className="form-row">
            <Field label="Kind" id="sp-kind">
              <select id="sp-kind" value={fresh.kind} onChange={(e) => setFresh({ ...fresh, kind: e.target.value })}>
                {Object.entries(meta.collectionKinds || {}).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand" id="sp-brand">
              <select id="sp-brand" value={fresh.brand} onChange={(e) => setFresh({ ...fresh, brand: e.target.value })}>
                <option value="ravenly">Ravenly</option>
                <option value="omnizant">Omnizant</option>
                <option value="both">Both brands</option>
              </select>
            </Field>
          </div>
        </div>
      ) : (
        collections && (
          <Field label="Collection" id="sp-col">
            <select id="sp-col" value={target} onChange={(e) => setTarget(e.target.value)}>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )
      )}
      {error && <ErrorNotice error={{ message: error.message }} />}
    </Modal>
  );
}

export function SourcePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const version = params.get('version');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { meta } = useMeta();
  const toast = useToast();
  const { data, error, reload } = useLoad(() => get(`/knowledge/${id}${version ? `?version=${version}` : ''}`), [id, version]);
  const [confirm, setConfirm] = useState(null);
  useEffect(() => {
    if (data) document.title = `${data.version.title} · Sales Lab`;
  }, [data]);

  if (error && !data) return <div className="page"><ErrorNotice error={error} retry={reload} /></div>;
  if (!data) return <div className="page"><Loading /></div>;
  const v = data.version;
  const src = data.source;
  const isSection = Boolean(src.collection);
  const noun = isSection ? 'section' : 'source';
  const parts = v.sections.filter((s) => s.key !== 'intro');
  const canSplit = user.isManager && Boolean(src.splitPreview);

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
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/knowledge">Knowledge Library</Link>
        {isSection && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/knowledge/collections/${src.collection.id}`}>{src.collection.name}</Link>
          </>
        )}
      </nav>
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
            {isSection && src.neighbors?.index > 0 && `Section ${src.neighbors.index} of ${src.neighbors.count}${src.group ? `, in ${src.group}` : ''}. `}
            Version {v.version}
            {v.asOfDate ? `, accurate as of ${fmtDate(v.asOfDate)}` : ', no as-of date'}. For{' '}
            {v.personas.length ? v.personas.map((p) => meta.personas.find((x) => x.key === p)?.label || p).join(', ') : 'all buyer personas'}.
          </p>
        </div>
        {user.isManager && (
          <div className="row">
            {!src.splitInto && (
              <Link className="btn btn-secondary" to={`/knowledge/${src.id}/edit`}>
                Edit as new version
              </Link>
            )}
            {!v.isApproved && src.status !== 'archived' && (
              <button className="btn" onClick={() => setConfirm('approve')}>
                Approve this version
              </button>
            )}
            {canSplit && (
              <button className="btn btn-secondary" onClick={() => setConfirm('split')}>
                Split into sections
              </button>
            )}
            {!src.splitInto && (
              <button className="btn btn-quiet" onClick={() => setConfirm('move')}>
                Move
              </button>
            )}
            {src.status !== 'archived' ? (
              <button className="btn btn-quiet" onClick={() => setConfirm('archive')}>
                Archive
              </button>
            ) : (
              !src.splitInto && (
                <button className="btn btn-quiet" onClick={() => act(() => post(`/knowledge/${src.id}/restore`, {}), isSection ? 'Section restored' : 'Source restored')}>
                  Restore
                </button>
              )
            )}
          </div>
        )}
      </div>

      {src.splitInto && (
        <div style={{ marginBottom: 20 }}>
          <Notice kind="info" title="This document is now edited as sections">
            <p>
              It was split into sections of <Link to={`/knowledge/collections/${src.splitInto.id}`}>{src.splitInto.name}</Link>. Edit and approve the sections there. This copy is kept
              so past answers can show exactly what they were scored against.
            </p>
          </Notice>
        </div>
      )}
      {v.caveats && (
        <div style={{ marginBottom: 20 }}>
          <Notice kind="warn" title="Caveats">
            <p className="prewrap">{v.caveats}</p>
          </Notice>
        </div>
      )}

      <div className="doc-grid">
        <div className="stack">
          <article className="panel prose">
            <Markdown>{v.content}</Markdown>
          </article>
          {isSection && (src.neighbors?.prev || src.neighbors?.next) && (
            <nav className="pager" aria-label={`More of ${src.collection.name}`}>
              {src.neighbors.prev ? (
                <Link className="pager-link" to={`/knowledge/${src.neighbors.prev.id}`}>
                  <span className="tiny muted">Previous section</span>
                  <span>{src.neighbors.prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {src.neighbors.next && (
                <Link className="pager-link pager-next" to={`/knowledge/${src.neighbors.next.id}`}>
                  <span className="tiny muted">Next section</span>
                  <span>{src.neighbors.next.title}</span>
                </Link>
              )}
            </nav>
          )}
        </div>
        <aside className="stack doc-aside">
          {parts.length > 1 && (
            <nav className="panel panel-tight" aria-label="Sections">
              <h2 className="section-title">Sections</h2>
              <ul className="toc">
                {parts.map((s) => (
                  <li key={s.key}>
                    <a href={`#sec-${slugText(s.title)}`}>{s.title}</a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {user.isManager && src.usedBy && (
            <div className="panel panel-tight small stack-sm">
              <h2 className="section-title">Drills that use this {noun}</h2>
              {src.usedBy.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  None yet. Choose it in a drill’s source material to ground coaching in it.
                </p>
              ) : (
                <>
                  <ul className="toc">
                    {src.usedBy.map((d) => (
                      <li key={d.id}>
                        <Link to={`/practice/drill/${d.id}`}>{d.title}</Link>
                        {d.status === 'draft' && <span className="muted"> (draft)</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="tiny muted" style={{ margin: 0 }}>
                    Approving a new version changes their coaching from then on.
                  </p>
                </>
              )}
            </div>
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
        <p>
          New coaching will check answers against version {v.version}
          {src.usedBy?.length ? ` in the ${src.usedBy.length} drill${src.usedBy.length === 1 ? '' : 's'} that use this ${noun}` : ''}. Answers already scored keep the version they
          were scored with.
        </p>
        <DrillImpact sourceId={src.id} versionId={v.id} open={confirm === 'approve'} />
      </Modal>
      <Modal
        open={confirm === 'archive'}
        onClose={() => setConfirm(null)}
        title={`Archive this ${noun}?`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={() => act(() => post(`/knowledge/${src.id}/archive`, {}), isSection ? 'Section archived' : 'Source archived')}>
              Archive
            </button>
          </>
        }
      >
        <p>
          Archived {noun}s stop supporting coaching. Drills that rely only on this {noun} become unscored practice until another approved {noun} is attached. Past results are
          unchanged.
        </p>
      </Modal>
      {user.isManager && (
        <MoveModal
          open={confirm === 'move'}
          onClose={() => setConfirm(null)}
          source={src}
          onDone={() => {
            setConfirm(null);
            reload({ quiet: true });
          }}
        />
      )}
      {canSplit && (
        <SplitModal
          open={confirm === 'split'}
          onClose={() => setConfirm(null)}
          source={src}
          version={v}
          preview={src.splitPreview}
          onDone={(r) => {
            toast(
              r.unmatched
                ? `Split into ${r.sections} sections. ${r.unmatched} drill ${r.unmatched === 1 ? 'version still uses' : 'versions still use'} sections that could not be matched; edit those drills to choose new ones.`
                : `Split into ${r.sections} sections`,
            );
            navigate(`/knowledge/collections/${r.collectionId}`);
          }}
        />
      )}
    </div>
  );
}
