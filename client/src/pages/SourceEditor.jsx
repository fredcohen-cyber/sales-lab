import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { useMeta } from '../state.jsx';
import { ErrorNotice, Field, Loading, Notice, useToast } from '../components/ui.jsx';

const EMPTY = { title: '', brand: 'ravenly', subjects: ['product'], personas: [], asOfDate: '', caveats: '', evidenceBasis: 'documented', content: '', changeNote: '', importedFrom: '' };

export function SourceEditor() {
  const { id } = useParams();
  const { meta } = useMeta();
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState(id ? null : EMPTY);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `${id ? 'Edit source' : 'Add source'} · Sales Lab`;
    if (!id) return;
    get(`/knowledge/${id}`)
      .then((d) =>
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
        }),
      )
      .catch(setLoadError);
  }, [id]);

  if (loadError) return <div className="page"><ErrorNotice error={loadError} /></div>;
  if (!form) return <div className="page"><Loading /></div>;

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
        const r = await post('/knowledge', body);
        toast(approve ? 'Source saved and approved' : 'Draft saved');
        navigate(`/knowledge/${r.id}`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-narrow">
      <Link className="crumb" to={id ? `/knowledge/${id}` : '/knowledge'}>
        Back
      </Link>
      <div className="page-head">
        <div>
          <h1>{id ? `New version of “${form.title}”` : 'Add a source'}</h1>
          <p className="sub">
            {id
              ? `Edits are saved as version ${form.baseVersion + 1}. The approved version keeps supporting coaching until you approve the new one.`
              : 'Paste text or import a Markdown or text file. Only approved sources support coaching.'}
          </p>
        </div>
      </div>
      <div className="stack-lg">
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
          <Field label="Caveats" id="s-caveats" hint="What is unverified, time-sensitive, or a public claim rather than a tested capability. Shown with the source and given to coaching.">
            <textarea id="s-caveats" rows={3} value={form.caveats} maxLength={4000} onChange={(e) => setForm({ ...form, caveats: e.target.value })} />
          </Field>
        </section>

        <section className="panel stack">
          <div className="row-between">
            <h2 className="section-title" style={{ margin: 0 }}>
              Source text
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
            Markdown works best. Start major sections with “## ” so drills can point coaching at the right section. Label claims as observed, public claim, or to confirm where it matters.
          </p>
          <textarea
            aria-label="Source text"
            rows={22}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13.5 }}
          />
          <span className="tiny muted">{form.content.length.toLocaleString()} characters</span>
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
