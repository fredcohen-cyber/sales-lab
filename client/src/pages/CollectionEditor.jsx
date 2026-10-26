import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post, put } from '../api.js';
import { useMeta } from '../state.jsx';
import { ErrorNotice, Field, Loading, useToast } from '../components/ui.jsx';
import { SectionStatus } from '../components/KnowledgeParts.jsx';

const BLANK = { name: '', kind: 'product', brand: 'ravenly', description: '' };

// Order and group a collection's sections. Moving a section changes structure only, never its versions.
function Arrange({ collectionId, initial, onSaved }) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const groups = [...new Set(items.map((s) => s.group).filter(Boolean))];
  const move = (i, by) =>
    setItems((list) => {
      const next = [...list];
      const [x] = next.splice(i, 1);
      next.splice(i + by, 0, x);
      return next;
    });
  const setGroup = (i, group) => setItems((list) => list.map((s, j) => (j === i ? { ...s, group } : s)));
  const changed = items.some((s, i) => s.id !== initial[i]?.id || s.group !== initial[i]?.group);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await post(`/knowledge/collections/${collectionId}/arrange`, { sections: items.map((s) => ({ id: s.id, group: s.group })) });
      toast('Order and groups saved');
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  if (items.length === 0) return <p className="small muted">This collection has no sections yet.</p>;
  return (
    <div className="stack">
      <p className="small muted" style={{ margin: 0 }}>
        Move sections up or down, and give sections the same group name to list them together under it. Saving takes effect right away and does not need approval.
      </p>
      <datalist id="group-names">
        {groups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <ol className="arrange">
        {items.map((s, i) => (
          <li key={s.id} className="arrange-row">
            <span className="arrange-num num" aria-hidden="true">
              {i + 1}
            </span>
            <div className="arrange-title">
              <strong>{s.title}</strong>
              <SectionStatus section={s} />
            </div>
            <label className="visually-hidden" htmlFor={`grp-${s.id}`}>
              Group for “{s.title}”
            </label>
            <input id={`grp-${s.id}`} type="text" list="group-names" placeholder="No group" value={s.group} maxLength={80} onChange={(e) => setGroup(i, e.target.value)} />
            <div className="arrange-moves">
              <button type="button" className="btn btn-quiet btn-small" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move “${s.title}” up`}>
                Up
              </button>
              <button type="button" className="btn btn-quiet btn-small" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move “${s.title}” down`}>
                Down
              </button>
            </div>
          </li>
        ))}
      </ol>
      {error && <ErrorNotice error={{ message: error.message }} />}
      <div className="row">
        <button className="btn" onClick={save} disabled={busy || !changed}>
          {busy ? 'Saving…' : 'Save order and groups'}
        </button>
        {changed && (
          <button className="btn btn-quiet" onClick={() => setItems(initial)} disabled={busy}>
            Undo changes
          </button>
        )}
      </div>
    </div>
  );
}

export function CollectionEditor() {
  const { cid } = useParams();
  const { meta } = useMeta();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(cid ? null : BLANK);
  const [sections, setSections] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    get(`/knowledge/collections/${cid}`)
      .then((d) => {
        setForm({ name: d.collection.name, kind: d.collection.kind, brand: d.collection.brand, description: d.collection.description });
        setSections(d.sections.map((s) => ({ id: s.id, title: s.title, group: s.group || '', status: s.status, isApproved: s.isApproved, hasPendingDraft: s.hasPendingDraft })));
      })
      .catch(setLoadError);
  useEffect(() => {
    document.title = `${cid ? 'Edit collection' : 'New collection'} · Sales Lab`;
    if (cid) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  if (loadError) return <div className="page"><ErrorNotice error={loadError} /></div>;
  if (!form) return <div className="page"><Loading /></div>;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (cid) {
        await put(`/knowledge/collections/${cid}`, form);
        toast('Collection saved');
        navigate(`/knowledge/collections/${cid}`);
      } else {
        const r = await post('/knowledge/collections', form);
        toast('Collection created');
        navigate(`/knowledge/collections/${r.id}`);
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-narrow">
      <Link className="crumb" to={cid ? `/knowledge/collections/${cid}` : '/knowledge'}>
        Back
      </Link>
      <div className="page-head">
        <div>
          <h1>{cid ? `Edit ${form.name || 'collection'}` : 'New collection'}</h1>
          <p className="sub">
            {cid
              ? 'Rename the collection, change its description, or reorder and group its sections.'
              : 'A collection holds sections that are written, edited, and approved one at a time, such as a playbook or one brand’s product knowledge.'}
          </p>
        </div>
      </div>
      <div className="stack-lg">
        <section className="panel stack" aria-labelledby="details-title">
          <h2 id="details-title" className="section-title">
            Details
          </h2>
          <Field label="Name" id="c-name">
            <input id="c-name" type="text" value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="form-row">
            <Field label="Kind" id="c-kind" hint="A playbook holds sales technique; product knowledge holds facts about what a brand sells.">
              <select id="c-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {Object.entries(meta.collectionKinds || {}).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand" id="c-brand" hint="New sections start with this brand.">
              <select id="c-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
                <option value="ravenly">Ravenly</option>
                <option value="omnizant">Omnizant</option>
                <option value="both">Both brands</option>
              </select>
            </Field>
          </div>
          <Field label="Description" id="c-desc" hint="Shown at the top of the collection. Markdown works.">
            <textarea id="c-desc" rows={4} maxLength={4000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          {error && <ErrorNotice error={{ message: error.message }} />}
          <div className="row">
            <button className="btn" onClick={save} disabled={busy || form.name.trim().length < 2}>
              {busy ? 'Saving…' : cid ? 'Save details' : 'Create collection'}
            </button>
          </div>
        </section>
        {cid && sections && (
          <section className="panel stack" aria-labelledby="arrange-title">
            <h2 id="arrange-title" className="section-title">
              Order and groups
            </h2>
            <Arrange key={sections.map((s) => s.id + s.group).join()} collectionId={cid} initial={sections} onSaved={load} />
          </section>
        )}
      </div>
    </div>
  );
}
