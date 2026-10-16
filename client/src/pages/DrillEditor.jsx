import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post, put } from '../api.js';
import { useMeta } from '../state.jsx';
import { ErrorNotice, Field, Loading, Notice, useToast } from '../components/ui.jsx';

const BLANK = {
  title: '',
  brand: 'ravenly',
  subject: 'product',
  stage: 'cold_outreach',
  roles: ['ae'],
  personas: ['managing_partner', 'solo_attorney', 'marketing_manager'],
  situation: '',
  buyerLine: '',
  personaLines: {},
  objective: '',
  goodLooksLike: '',
  assessedDimensions: ['objection_handling', 'persuasion', 'advancing'],
  defaults: { difficulty: 3, skepticism: 3, depth: 3 },
  sourceRefs: [],
  changeNote: '',
  status: 'active',
};

function SourcePicker({ value, onChange }) {
  const [sources, setSources] = useState(null);
  const [sections, setSections] = useState({});
  useEffect(() => {
    get('/knowledge').then((d) => setSources(d.sources.filter((s) => s.status !== 'archived')));
  }, []);
  useEffect(() => {
    for (const ref of value) {
      if (sections[ref.sourceId]) continue;
      get(`/knowledge/${ref.sourceId}`)
        .then((d) => setSections((m) => ({ ...m, [ref.sourceId]: d.version.sections.filter((s) => s.key !== 'intro') })))
        .catch(() => setSections((m) => ({ ...m, [ref.sourceId]: [] })));
    }
  }, [value, sections]);
  if (!sources) return <Loading />;
  const selected = new Map(value.map((r) => [r.sourceId, r]));
  const toggleSource = (id) => onChange(selected.has(id) ? value.filter((r) => r.sourceId !== id) : [...value, { sourceId: id, sections: [] }]);
  const toggleSection = (id, key) =>
    onChange(value.map((r) => (r.sourceId !== id ? r : { ...r, sections: r.sections.includes(key) ? r.sections.filter((k) => k !== key) : [...r.sections, key] })));
  return (
    <div className="stack-sm">
      {sources.map((s) => (
        <div key={s.id} className="panel panel-tight stack-sm">
          <label className="checkbox">
            <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSource(s.id)} />
            <strong>{s.title}</strong>
            {s.status !== 'approved' && <span className="badge badge-warn">Draft: not used for coaching until approved</span>}
          </label>
          {selected.has(s.id) && (
            <div className="stack-sm" style={{ paddingLeft: 26 }}>
              <span className="tiny muted">Choose the sections coaching should use. None selected means the whole source (long sources are trimmed).</span>
              <div className="grid-2">
                {(sections[s.id] || []).map((sec) => (
                  <label key={sec.key} className="checkbox small">
                    <input type="checkbox" checked={selected.get(s.id).sections.includes(sec.key)} onChange={() => toggleSection(s.id, sec.key)} />
                    {sec.title}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function DrillEditor() {
  const { id } = useParams();
  const { meta } = useMeta();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(id ? null : BLANK);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `${id ? 'Edit drill' : 'New drill'} · Sales Lab`;
    if (!id) return;
    get(`/drills/${id}`)
      .then(({ drill: d }) =>
        setForm({
          title: d.title,
          brand: d.brand,
          subject: d.subject,
          stage: d.stage,
          roles: d.roles,
          personas: d.personas,
          situation: d.situation,
          buyerLine: d.buyerLine,
          personaLines: d.personaLines || {},
          objective: d.objective,
          goodLooksLike: d.goodLooksLike,
          assessedDimensions: d.assessedDimensions,
          defaults: d.defaults,
          sourceRefs: d.sourceRefs || [],
          changeNote: '',
          status: d.status,
          version: d.version,
        }),
      )
      .catch(setLoadError);
  }, [id]);

  if (loadError) return <div className="page"><ErrorNotice error={loadError} /></div>;
  if (!form) return <div className="page"><Loading /></div>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k, v) => setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { version, ...body } = form;
      if (id) {
        await put(`/drills/${id}`, body);
        toast('Drill saved as a new version');
        navigate(`/practice/drill/${id}`);
      } else {
        const r = await post('/drills', body);
        toast('Drill created');
        navigate(`/practice/drill/${r.id}`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-narrow">
      <Link className="crumb" to={id ? `/practice/drill/${id}` : '/practice'}>
        Back
      </Link>
      <div className="page-head">
        <div>
          <h1>{id ? `Edit “${form.title}”` : 'New drill'}</h1>
          <p className="sub">{id ? `Saving creates version ${form.version + 1}. Past answers keep the version they were written against.` : 'One focused buyer moment, scored on the dimensions it actually tests.'}</p>
        </div>
      </div>
      <div className="stack-lg">
        <section className="panel stack">
          <Field label="Title" id="d-title">
            <input id="d-title" type="text" value={form.title} maxLength={140} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <div className="form-row">
            <Field label="Brand" id="d-brand">
              <select id="d-brand" value={form.brand} onChange={(e) => set('brand', e.target.value)}>
                <option value="ravenly">Ravenly</option>
                <option value="omnizant">Omnizant</option>
                <option value="both">Both brands</option>
              </select>
            </Field>
            <Field label="Subject" id="d-subject">
              <select id="d-subject" value={form.subject} onChange={(e) => set('subject', e.target.value)}>
                {Object.entries(meta.subjects).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sales stage" id="d-stage">
              <select id="d-stage" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                {meta.stages.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status" id="d-status">
              <select id="d-status" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="draft">Draft (hidden from reps)</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </div>
          <div className="row">
            <span className="section-title" style={{ margin: 0 }}>
              For
            </span>
            <label className="checkbox">
              <input type="checkbox" checked={form.roles.includes('ae')} onChange={() => toggle('roles', 'ae')} />
              Account executives
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={form.roles.includes('am')} onChange={() => toggle('roles', 'am')} />
              Account managers
            </label>
          </div>
          <div className="row">
            <span className="section-title" style={{ margin: 0 }}>
              Buyer personas
            </span>
            {meta.personas.map((p) => (
              <label key={p.key} className="checkbox">
                <input type="checkbox" checked={form.personas.includes(p.key)} onChange={() => toggle('personas', p.key)} />
                {p.label}
              </label>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <Field label="Situation" id="d-sit" hint="What the rep knows going in.">
            <textarea id="d-sit" rows={3} value={form.situation} onChange={(e) => set('situation', e.target.value)} />
          </Field>
          <Field label="What the buyer says" id="d-line">
            <textarea id="d-line" rows={2} value={form.buyerLine} onChange={(e) => set('buyerLine', e.target.value)} />
          </Field>
          {form.personas.length > 1 && (
            <details>
              <summary className="small" style={{ cursor: 'pointer' }}>
                Different wording for a specific persona (optional)
              </summary>
              <div className="stack-sm" style={{ marginTop: 10 }}>
                {form.personas.map((k) => (
                  <Field key={k} label={meta.personas.find((p) => p.key === k)?.label} id={`d-pl-${k}`}>
                    <textarea id={`d-pl-${k}`} rows={2} value={form.personaLines[k] || ''} onChange={(e) => set('personaLines', { ...form.personaLines, [k]: e.target.value })} placeholder="Leave empty to use the main line" />
                  </Field>
                ))}
              </div>
            </details>
          )}
          <Field label="The rep’s objective" id="d-obj">
            <textarea id="d-obj" rows={2} value={form.objective} onChange={(e) => set('objective', e.target.value)} />
          </Field>
          <Field label="What a good answer does" id="d-good" hint="Shown to the rep after they submit, and given to coaching as your criteria. One point per line works well.">
            <textarea id="d-good" rows={6} value={form.goodLooksLike} onChange={(e) => set('goodLooksLike', e.target.value)} />
          </Field>
        </section>

        <section className="panel stack">
          <h2 className="section-title">Scoring</h2>
          <p className="small muted" style={{ margin: 0 }}>
            Choose only the dimensions this moment tests. The rest are marked not assessed and their weight is left out.
          </p>
          <div className="grid-2">
            {meta.dimensions.map((d) => (
              <label key={d.key} className="checkbox">
                <input type="checkbox" checked={form.assessedDimensions.includes(d.key)} onChange={() => toggle('assessedDimensions', d.key)} />
                {d.label} <span className="muted tiny">({d.weight}%)</span>
              </label>
            ))}
          </div>
          <div className="form-row">
            {['difficulty', 'skepticism', 'depth'].map((k) => (
              <Field key={k} label={`Default ${k === 'depth' ? 'product depth' : k}`} id={`d-def-${k}`}>
                <select id={`d-def-${k}`} value={form.defaults[k]} onChange={(e) => set('defaults', { ...form.defaults, [k]: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <h2 className="section-title">Source material for coaching</h2>
          {form.sourceRefs.length === 0 && <Notice kind="warn">Without an approved source, this drill runs as unscored practice only.</Notice>}
          <SourcePicker value={form.sourceRefs} onChange={(v) => set('sourceRefs', v)} />
        </section>

        {id && (
          <Field label="Change note" id="d-note">
            <input id="d-note" type="text" value={form.changeNote} maxLength={500} onChange={(e) => set('changeNote', e.target.value)} />
          </Field>
        )}
        {error && <ErrorNotice error={{ message: error.message }} />}
        <div className="row">
          <button className="btn" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : id ? 'Save new version' : 'Create drill'}
          </button>
        </div>
      </div>
    </div>
  );
}
