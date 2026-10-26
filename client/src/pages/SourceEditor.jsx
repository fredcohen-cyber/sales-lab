import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { useMeta } from '../state.jsx';
import { ErrorNotice, Field, Loading, Notice, useToast } from '../components/ui.jsx';

const EMPTY = { title: '', brand: 'ravenly', subjects: ['product'], personas: [], asOfDate: '', caveats: '', evidenceBasis: 'documented', content: '', changeNote: '', importedFrom: '' };
const KIND_SUBJECTS = { playbook: ['sales_technique'], product: ['product'] };

// A new section starts with its collection's brand and the subjects its kind usually covers.
function startFor(collection) {
  if (!collection) return { ...EMPTY, collectionId: '', group: '' };
  return { ...EMPTY, brand: collection.brand, subjects: KIND_SUBJECTS[collection.kind] || ['product'], collectionId: collection.id, group: '' };
}

export function SourceEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { meta } = useMeta();
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState(null);
  const [library, setLibrary] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) {
      get(`/knowledge/${id}`)
        .then((d) => {
          document.title = `Edit ${d.source.collection ? 'section' : 'source'} · Sales Lab`;
          setPlacement(d.source.collection ? { collection: d.source.collection, group: d.source.group } : null);
          setForm({
            title: d.version.title,
            brand: d.version.brand,
            subjects: d.version.subjects,
            personas: d.version.personas,
            asOfDate: d.version.asOfDate || '',
            caveats: d.version.caveats || '',
            evidenceBasis: d.version.evidenceBasis || 'documented',
            content: d.version.content,
            changeNote: '',
            importedFrom: '',
            baseVersion: d.version.version,
          });
        })
        .catch(setLoadError);
      return;
    }
    // New: a section of a collection (from ?collection=) or a standalone document.
    get('/knowledge')
      .then((d) => {
        setLibrary(d);
        const chosen = d.collections.find((c) => c.id === params.get('collection'));
        document.title = `${chosen ? 'Add section' : 'Add document'} · Sales Lab`;
        setForm(startFor(chosen));
      })
      .catch(setLoadError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loadError) return <div className="page"><ErrorNotice error={loadError} /></div>;
  if (!form) return <div className="page"><Loading /></div>;

  const collections = library?.collections || [];
  const chosen = collections.find((c) => c.id === form.collectionId) || null;
  const isSection = id ? Boolean(placement) : Boolean(chosen);
  const groups = chosen ? [...new Set(library.sources.filter((s) => s.collectionId === chosen.id).map((s) => s.group).filter(Boolean))] : [];
  const pickCollection = (cid) => {
    const c = collections.find((x) => x.id === cid) || null;
    setForm((f) => ({ ...f, collectionId: cid, group: '', ...(c ? { brand: c.brand, subjects: KIND_SUBJECTS[c.kind] || f.subjects } : {}) }));
  };

  const toggle = (key, value) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value] }));

  const importFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      setError({ message: 'Import a .md, .markdown, or .txt file.' });
      return;
    }
    if (file.size > 1_000_000) {
      setError({ message: 'That file is larger than 1 MB. Split it into smaller sources.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      setForm((f) => ({
        ...f,
        content: String(reader.result || ''),
        importedFrom: file.name,
        title: f.title || file.name.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]+/g, ' '),
      }));
    };
    reader.onerror = () => setError({ message: 'That file could not be read.' });
    reader.readAsText(file);
  };

  const save = async (approve) => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        title: form.title,
        brand: form.brand,
        subjects: form.subjects,
        personas: form.personas,
        asOfDate: form.asOfDate || null,
        caveats: form.caveats,
        evidenceBasis: form.evidenceBasis,
        content: form.content,
        changeNote: form.changeNote,
        approve,
        ...(form.importedFrom ? { importedFrom: form.importedFrom } : {}),
      };
      if (id) {
        await post(`/knowledge/${id}/versions`, body);
        toast(approve ? 'New version saved and approved' : 'New draft version saved');
        navigate(`/knowledge/${id}`);
      } else {
        const r = await post('/knowledge', { ...body, collectionId: form.collectionId || null, group: form.collectionId ? form.group : '' });
        toast(approve ? `${isSection ? 'Section' : 'Document'} saved and approved` : 'Draft saved');
        navigate(`/knowledge/${r.id}`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const back = id ? `/knowledge/${id}` : chosen ? `/knowledge/collections/${chosen.id}` : '/knowledge';
  return (
    <div className="page page-narrow">
      <Link className="crumb" to={back}>
        Back
      </Link>
      <div className="page-head">
        <div>
          <h1>{id ? `New version of “${form.title}”` : chosen ? `Add a section to ${chosen.name}` : 'Add a document'}</h1>
          <p className="sub">
            {id
              ? `Edits are saved as version ${form.baseVersion + 1}. The approved version keeps supporting coaching until you approve the new one.`
              : chosen
                ? 'Write or paste one section. It is edited and approved on its own; only approved sections support coaching.'
                : 'Paste text or import a Markdown or text file. A long document can be split into sections later. Only approved material supports coaching.'}
          </p>
          {id && placement && (
            <p className="small muted" style={{ margin: '6px 0 0' }}>
              A section of {placement.collection.name}
              {placement.group ? `, in ${placement.group}` : ''}. To move it, use Move on the section’s page.
            </p>
          )}
        </div>
      </div>
      <div className="stack-lg">
        {!id && (
          <section className="panel stack" aria-label="Where it goes">
            <div className="form-row">
              <Field label="Collection" id="s-collection">
                <select id="s-collection" value={form.collectionId} onChange={(e) => pickCollection(e.target.value)}>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="">Not in a collection (a standalone document)</option>
                </select>
              </Field>
              {chosen && (
                <Field label="Group" id="s-group" hint="Optional. Sections with the same group are listed together.">
                  <input id="s-group" type="text" list="s-groups" maxLength={80} value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} />
                  <datalist id="s-groups">
                    {groups.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </Field>
              )}
            </div>
          </section>
        )}
        <section className="panel stack">
          <Field label="Title" id="s-title">
            <input id="s-title" type="text" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <div className="form-row">
            <Field label="Brand" id="s-brand">
              <select id="s-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
                <option value="ravenly">Ravenly</option>
                <option value="omnizant">Omnizant</option>
                <option value="both">Both brands</option>
              </select>
            </Field>
            <Field label="Accurate as of" id="s-asof" hint="The date the facts were checked.">
              <input id="s-asof" type="date" value={form.asOfDate} onChange={(e) => setForm({ ...form, asOfDate: e.target.value })} />
            </Field>
          </div>
          <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="section-title">Subjects</legend>
            <div className="row">
              {Object.entries(meta.subjects).map(([k, v]) => (
                <label key={k} className="checkbox">
                  <input type="checkbox" checked={form.subjects.includes(k)} onChange={() => toggle('subjects', k)} />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="section-title">Buyer personas</legend>
            <div className="row">
              {meta.personas.map((p) => (
                <label key={p.key} className="checkbox">
                  <input type="checkbox" checked={form.personas.includes(p.key)} onChange={() => toggle('personas', p.key)} />
                  {p.label}
                </label>
              ))}
            </div>
            <span className="hint tiny muted">Leave all unchecked if the source applies to every persona.</span>
          </fieldset>
          <Field
            label="What kind of evidence is this?"
            id="s-evidence"
            hint="Coaching treats documented facts as established, public claims as what a vendor says, and observations as things to confirm."
          >
            <select id="s-evidence" value={form.evidenceBasis} onChange={(e) => setForm({ ...form, evidenceBasis: e.target.value })}>
              {Object.entries(meta.evidenceBasis).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Caveats" id="s-caveats" hint={`What is unverified, time-sensitive, or a public claim rather than a tested capability. Shown with the ${isSection ? 'section' : 'source'} and given to coaching.`}>
            <textarea id="s-caveats" rows={3} value={form.caveats} maxLength={4000} onChange={(e) => setForm({ ...form, caveats: e.target.value })} />
          </Field>
        </section>

        <section className="panel stack">
          <div className="row-between">
            <h2 className="section-title" style={{ margin: 0 }}>
              {isSection ? 'Section text' : 'Source text'}
            </h2>
            <div className="row">
              <input ref={fileRef} type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={importFile} hidden />
              <button type="button" className="btn btn-secondary btn-small" onClick={() => fileRef.current?.click()}>
                Import .md or .txt file
              </button>
            </div>
          </div>
          {form.importedFrom && <Notice kind="ok">Imported {form.importedFrom}. Review the text before saving.</Notice>}
          <p className="small muted" style={{ margin: 0 }}>
            {isSection
              ? 'Markdown works best. The title above is the section’s heading, so start the text directly and use “### ” for sub-headings. Label claims as observed, public claim, or to confirm where it matters.'
              : 'Markdown works best. Start major sections with “## ” so drills can point coaching at the right section, or so the document can be split into sections later. Label claims as observed, public claim, or to confirm where it matters.'}
          </p>
          <textarea
            aria-label={isSection ? 'Section text' : 'Source text'}
            rows={22}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13.5 }}
          />
          <span className="tiny muted">{form.content.length.toLocaleString()} characters</span>
          {isSection && (form.content.match(/^## /gm) || []).length >= 2 && (
            <Notice kind="info">
              This text has several “## ” headings. A section works best when it covers one topic: add a long text as a document instead, then split it into sections from its page.
            </Notice>
          )}
          <Field label="Change note" id="s-note">
            <input id="s-note" type="text" value={form.changeNote} maxLength={500} onChange={(e) => setForm({ ...form, changeNote: e.target.value })} placeholder="What changed in this version" />
          </Field>
        </section>
        {error && <ErrorNotice error={{ message: error.message }} />}
        <div className="row">
          <button className="btn" disabled={busy || !form.title.trim() || !form.content.trim() || form.subjects.length === 0} onClick={() => save(true)}>
            Save and approve
          </button>
          <button className="btn btn-secondary" disabled={busy || !form.title.trim() || !form.content.trim() || form.subjects.length === 0} onClick={() => save(false)}>
            Save as draft
          </button>
        </div>
      </div>
    </div>
  );
}
