import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { get, post, put } from '../api.js';
import { useMeta } from '../state.jsx';
import { ErrorNotice, Field, Loading, Notice, useToast } from '../components/ui.jsx';
import { groupSections } from '../components/KnowledgeParts.jsx';
import { IdealAnswerEditor } from '../components/IdealAnswer.jsx';
import { formFromDrill, idealBody, idealFromDrill, questionBody } from '../lib/drillForm.js';
import { ArrowRightIcon } from '../components/Icons.jsx';

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
  roleGuidance: {},
  pushbacks: [],
  assessedDimensions: ['objection_handling', 'persuasion', 'advancing'],
  defaults: { difficulty: 3, skepticism: 3, depth: 3 },
  sourceRefs: [],
  changeNote: '',
  status: 'active',
  productLine: 'ravenly',
  concept: '',
};

// The product lines a brand's questions can sell (mirrors PRODUCT_LINES on the server).
const productLinesFor = (meta, brand) => Object.entries(meta.productLines || {}).filter(([, p]) => p.brand === brand);

// Product and competitive facts about a brand support each other's drills (as on the server).
const SUPPORTING_SUBJECTS = { product: ['competitive'], competitive: ['product'], sales_technique: [] };
export const MAX_SOURCE_REFS = 50;

// Mirrors the server's relevance rule (server/knowledge/service.js sourceFit) to explain each choice.
// kind 'warn' means the choice is never used for coaching.
function fitNote(source, form, meta) {
  if (!source) return null;
  const subjects = source.subjects || [];
  const subject = meta.subjects[form.subject].toLowerCase();
  if (!(source.brand === 'both' || form.brand === 'both' || source.brand === form.brand)) {
    return { kind: 'warn', text: `Not used for coaching: it covers ${source.brand === 'omnizant' ? 'Omnizant' : 'Ravenly'}, and this drill is for ${form.brand === 'omnizant' ? 'Omnizant' : 'Ravenly'}.` };
  }
  const related = (SUPPORTING_SUBJECTS[form.subject] || []).filter((x) => subjects.includes(x));
  if (!subjects.includes(form.subject) && !related.length && !subjects.includes('sales_technique')) {
    return { kind: 'warn', text: `Not used for coaching: it does not cover ${subject}, a related subject, or sales technique.` };
  }
  if (!subjects.includes(form.subject)) {
    const what = related.length ? meta.subjects[related[0]].toLowerCase() : 'sales technique';
    return { kind: 'info', text: `Supporting material (${what}). Coaching also needs a source that covers ${subject}.` };
  }
  const limited = (source.personas || []).length ? form.personas.filter((p) => !source.personas.includes(p)) : [];
  if (limited.length) {
    return { kind: 'info', text: `Not used for ${limited.map((k) => meta.personas.find((p) => p.key === k)?.label || k).join(', ').toLowerCase()}.` };
  }
  return null;
}

// One section of a collection: chosen whole, with a note on whether it can support this drill.
function SectionChoice({ s, checked, onToggle, form, meta }) {
  const note = checked ? fitNote(s, form, meta) : null;
  return (
    <li>
      <label className="checkbox small">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span>{s.title}</span>
        {s.status !== 'approved' && <span className="badge badge-warn">Draft</span>}
      </label>
      {note && (
        <div className={`tiny ${note.kind === 'warn' ? 'error-text' : 'muted'}`} style={{ paddingLeft: 26 }}>
          {note.text}
        </div>
      )}
    </li>
  );
}

function SourcePicker({ value, onChange, form, meta }) {
  const [library, setLibrary] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [sections, setSections] = useState({});
  const [filter, setFilter] = useState('');
  const load = () => {
    setLoadError(null);
    get('/knowledge')
      .then((d) => setLibrary({ collections: d.collections, sources: d.sources.filter((s) => s.status !== 'archived'), all: d.sources }))
      .catch(setLoadError);
  };
  useEffect(load, []);
  const documentIds = new Set((library?.sources || []).filter((s) => !s.collectionId).map((s) => s.id));
  useEffect(() => {
    // Only long documents need their "## " sections listed; a collection section is always used whole.
    for (const ref of value) {
      if (sections[ref.sourceId] || !documentIds.has(ref.sourceId)) continue;
      get(`/knowledge/${ref.sourceId}`)
        .then((d) => setSections((m) => ({ ...m, [ref.sourceId]: d.version.sections.filter((s) => s.key !== 'intro') })))
        .catch(() => setSections((m) => ({ ...m, [ref.sourceId]: [] })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, sections, library]);
  if (loadError) return <ErrorNotice error={loadError} retry={load} />;
  if (!library) return <Loading />;
  const sources = library.sources;
  const selected = new Map(value.map((r) => [r.sourceId, r]));
  const toggleWhole = (id) =>
    onChange(selected.has(id) ? value.filter((r) => r.sourceId !== id) : [...value, { sourceId: id, sections: [], wholeSource: true, unmatched: [] }]);
  const toggleSource = (id) =>
    onChange(selected.has(id) ? value.filter((r) => r.sourceId !== id) : [...value, { sourceId: id, sections: [], wholeSource: false, unmatched: [] }]);
  const toggleSection = (id, key) =>
    onChange(value.map((r) => (r.sourceId !== id ? r : { ...r, sections: r.sections.includes(key) ? r.sections.filter((k) => k !== key) : [...r.sections, key] })));
  const setWhole = (id, whole) => onChange(value.map((r) => (r.sourceId !== id ? r : { ...r, wholeSource: whole })));
  const usable = value.some((ref) => {
    const s = sources.find((x) => x.id === ref.sourceId);
    return s && s.status === 'approved' && (s.subjects || []).includes(form.subject) && fitNote(s, form, meta)?.kind !== 'warn';
  });
  const t = filter.trim().toLowerCase();
  const matches = (s) => !t || s.title.toLowerCase().includes(t) || selected.has(s.id);
  const documents = sources.filter((s) => !s.collectionId && matches(s));
  const relevant = (c) => c.brand === 'both' || form.brand === 'both' || c.brand === form.brand;
  // Chosen material that was archived or removed since: listed so it can be taken out.
  const gone = value.filter((r) => !sources.some((s) => s.id === r.sourceId));
  return (
    <div className="stack-sm">
      {value.length > MAX_SOURCE_REFS && (
        <Notice kind="warn">
          {`A drill can use at most ${MAX_SOURCE_REFS} sections. Remove ${value.length - MAX_SOURCE_REFS} to save it.`}
        </Notice>
      )}
      {value.length > 0 && !usable && (
        <Notice kind="warn">None of the chosen sections is approved and covers this drill’s brand and subject, so the drill runs as unscored practice.</Notice>
      )}
      {gone.length > 0 && (
        <Notice kind="warn" title="Chosen material that is no longer available">
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {gone.map((r) => (
              <li key={r.sourceId}>
                {library.all.find((s) => s.id === r.sourceId)?.title || 'A removed source'} (archived; not used for coaching){' '}
                <button type="button" className="btn btn-quiet btn-small" onClick={() => onChange(value.filter((x) => x.sourceId !== r.sourceId))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </Notice>
      )}
      <div className="row-between">
        <span className="small">
          {value.length === 0 ? 'Nothing chosen yet.' : `${value.length} chosen. Coaching reads them in the order you chose them.`}
        </span>
        <div className="field" style={{ minWidth: 220 }}>
          <label htmlFor="src-filter" className="visually-hidden">
            Filter sections by title
          </label>
          <input id="src-filter" type="search" placeholder="Filter by title" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>
      {library.collections.map((c) => {
        const mine = sources.filter((s) => s.collectionId === c.id && matches(s));
        if (mine.length === 0) return null;
        const chosen = mine.filter((s) => selected.has(s.id)).length;
        return (
          <details key={c.id} className="picker-collection" open={Boolean(t) || chosen > 0 || relevant(c)}>
            <summary>
              <strong>{c.name}</strong>
              <span className="tiny muted">{chosen ? `${chosen} of ${mine.length} chosen` : `${mine.length} sections`}</span>
            </summary>
            {groupSections(mine).map((g, i) => (
              <div key={`${g.group}-${i}`} className="picker-group">
                {g.group && <div className="toc-group-label">{g.group}</div>}
                <ul className="picker-list">
                  {g.items.map((s) => (
                    <SectionChoice key={s.id} s={s} checked={selected.has(s.id)} onToggle={() => toggleWhole(s.id)} form={form} meta={meta} />
                  ))}
                </ul>
              </div>
            ))}
          </details>
        );
      })}
      {documents.length > 0 && <h3 className="section-title" style={{ marginTop: 14 }}>Other documents</h3>}
      {documents.map((s) => {
        const note = selected.has(s.id) ? fitNote(s, form, meta) : null;
        return (
          <div key={s.id} className="panel panel-tight stack-sm">
            <label className="checkbox">
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSource(s.id)} />
              <strong>{s.title}</strong>
              {s.status !== 'approved' && <span className="badge badge-warn">Draft: not used for coaching until approved</span>}
            </label>
            {note && (
              <div className={`tiny ${note.kind === 'warn' ? 'error-text' : 'muted'}`} style={{ paddingLeft: 26 }}>
                {note.text}
              </div>
            )}
            {selected.has(s.id) && (() => {
              const ref = selected.get(s.id);
              const whole = Boolean(ref.wholeSource);
              return (
                <div className="stack-sm" style={{ paddingLeft: 26 }}>
                  {ref.unmatched?.length > 0 && (
                    <Notice kind="warn" title="Some chosen sections are not in the latest version">
                      <p className="small">
                        {ref.unmatched
                          .map((m) => (m.why === 'retitled' ? `“${m.title}” (its old number now holds “${m.nowTitle}”)` : `“${m.title}”`))
                          .join(', ')}
                        . Choose replacements below, or leave them out. Saving keeps only the sections checked here.
                      </p>
                    </Notice>
                  )}
                  <div className="row">
                    <label className="checkbox small">
                      <input type="radio" name={`whole-${s.id}`} checked={!whole} onChange={() => setWhole(s.id, false)} />
                      Chosen sections
                    </label>
                    <label className="checkbox small">
                      <input type="radio" name={`whole-${s.id}`} checked={whole} onChange={() => setWhole(s.id, true)} />
                      The whole source (long sources are trimmed)
                    </label>
                  </div>
                  {!whole && (
                    <>
                      <div className="grid-2">
                        {(sections[s.id] || []).map((sec) => (
                          <label key={sec.key} className="checkbox small">
                            <input type="checkbox" checked={ref.sections.includes(sec.key)} onChange={() => toggleSection(s.id, sec.key)} />
                            {sec.title}
                          </label>
                        ))}
                      </div>
                      {ref.sections.length === 0 && <span className="tiny error-text">Choose at least one section, or use the whole source.</span>}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

export function DrillEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { meta } = useMeta();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(id ? null : BLANK);
  const [ideal, setIdeal] = useState(() => idealFromDrill(null));
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const proposeOnLoad = useRef(Boolean(id) && params.get('propose') === '1');

  useEffect(() => {
    document.title = `${id ? 'Edit question' : 'Add a question'} · Sales Lab`;
    if (!id) return;
    get(`/drills/${id}`)
      .then(({ drill: d }) => {
        setForm(formFromDrill(d));
        setIdeal(idealFromDrill(d));
      })
      .catch(setLoadError);
  }, [id]);

  // Asked for from the Question Bank: propose an ideal answer as soon as the question is loaded.
  useEffect(() => {
    if (form && proposeOnLoad.current) {
      proposeOnLoad.current = false;
      if (!ideal.text) propose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  if (loadError) return <div className="page"><ErrorNotice error={loadError} /></div>;
  if (!form) return <div className="page"><Loading /></div>;

  const showIdeal = () => setTimeout(() => document.getElementById('ideal-answer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  async function propose() {
    setProposeError(null);
    setProposing(true);
    showIdeal();
    try {
      const { proposal: p } = await post('/drills/ideal-answer', { ...questionBody(form), drillId: id || undefined }, { timeoutMs: 150000 });
      setIdeal({
        text: p.answer,
        approved: false,
        origin: 'ai',
        approach: p.approach,
        notes: p.notes,
        claims: p.claims,
        persona: p.persona,
        model: p.model,
        warnings: p.warnings,
        approvedByName: null,
        approvedAt: null,
      });
      showIdeal();
    } catch (err) {
      setProposeError(err);
    } finally {
      setProposing(false);
    }
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k, v) => setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
  // A drill for one role keeps all its criteria in “What a good answer does”: when one of two roles is
  // unticked, what the other role's own field said moves there, where it stays visible and editable.
  const toggleRole = (role) =>
    setForm((f) => {
      const roles = f.roles.includes(role) ? f.roles.filter((x) => x !== role) : [...f.roles, role];
      if (roles.length !== 1 || f.roles.length < 2) return { ...f, roles };
      const kept = (f.roleGuidance[roles[0]] || '').trim();
      return { ...f, roles, roleGuidance: {}, goodLooksLike: kept ? `${f.goodLooksLike.trim()}\n${kept}` : f.goodLooksLike };
    });

  const sectionsMissing = form.sourceRefs.some((r) => r.wholeSource === false && r.sections.length === 0);
  const save = async () => {
    if (sectionsMissing) {
      setError({ message: 'Choose at least one section for each document, or use the whole document.' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = { ...questionBody(form), idealAnswer: idealBody(ideal) };
      if (id) {
        await put(`/drills/${id}`, body);
        toast('Question saved as a new version');
        navigate(`/questions?review=${id}`);
      } else {
        const r = await post('/drills', body);
        toast('Question added');
        navigate(`/questions?review=${r.id}`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  // Adding a question: the ideal answer is proposed and reviewed before the question is created.
  const adding = !id;
  const idealShown = !adding || proposing || Boolean(ideal.text) || Boolean(proposeError);

  return (
    <div className="page page-narrow">
      <Link className="crumb" to={id ? `/questions?review=${id}` : '/questions'}>
        Back to the Question Bank
      </Link>
      <div className="page-head">
        <div>
          <h1>{id ? `Edit ${/^[“"]/.test(form.title) ? form.title : `“${form.title}”`}` : 'Add a question'}</h1>
          <p className="sub">
            {id
              ? `Saving creates version ${form.version + 1}. Past answers keep the version they were written against.`
              : 'One focused buyer moment, scored on the dimensions it actually tests. When the question is written, Sales Lab proposes an ideal answer for you to review.'}
          </p>
        </div>
      </div>
      <div className="stack-lg">
        <section className="panel stack">
          <Field label="Title" id="d-title">
            <input id="d-title" type="text" value={form.title} maxLength={140} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field
            label="Concept (optional)"
            id="d-concept"
            hint="Questions that test the same skill share a concept, for example “price-too-expensive”. The Practice Studio rotates through concepts, so reps meet each skill from several angles."
          >
            <input id="d-concept" type="text" value={form.concept} maxLength={120} onChange={(e) => set('concept', e.target.value)} />
          </Field>
          <div className="form-row">
            <Field label="Brand" id="d-brand">
              <select
                id="d-brand"
                value={form.brand}
                onChange={(e) => {
                  const brand = e.target.value;
                  // Keep the product when it belongs to the new brand; otherwise use the brand's first.
                  setForm((f) => ({ ...f, brand, productLine: productLinesFor(meta, brand).some(([k]) => k === f.productLine) ? f.productLine : productLinesFor(meta, brand)[0]?.[0] }));
                }}
              >
                <option value="ravenly">Ravenly</option>
                <option value="omnizant">Omnizant</option>
                <option value="both">Both brands</option>
              </select>
            </Field>
            <Field label="Product" id="d-product" hint="Reps can filter the Practice Studio by product.">
              <select id="d-product" value={form.productLine} onChange={(e) => set('productLine', e.target.value)}>
                {productLinesFor(meta, form.brand).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.label}
                  </option>
                ))}
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
              <input type="checkbox" checked={form.roles.includes('ae')} onChange={() => toggleRole('ae')} />
              Account executives
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={form.roles.includes('am')} onChange={() => toggleRole('am')} />
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
          <Field
            label="What a good answer does"
            id="d-good"
            hint={`Shown to the rep after they submit, and given to coaching as your criteria. One point per line works well.${form.roles.length > 1 ? ' Put what applies to both roles here, and what differs below.' : ''}`}
          >
            <textarea id="d-good" rows={6} value={form.goodLooksLike} onChange={(e) => set('goodLooksLike', e.target.value)} />
          </Field>
          {form.roles.length > 1 &&
            form.roles.map((role) => (
              <Field
                key={role}
                label={`What a good answer adds for an ${role === 'am' ? 'account manager' : 'account executive'}`}
                id={`d-rg-${role}`}
                hint={role === 'am' ? 'For example protecting and growing an existing client.' : 'For example earning a first commitment from a new firm.'}
              >
                <textarea id={`d-rg-${role}`} rows={3} value={form.roleGuidance[role] || ''} onChange={(e) => set('roleGuidance', { ...form.roleGuidance, [role]: e.target.value })} />
              </Field>
            ))}
        </section>

        <section className="panel stack">
          <h2 className="section-title">The buyer’s pushbacks</h2>
          <p className="small muted" style={{ margin: 0 }}>
            After each reply the buyer pushes back: once at difficulty 1, twice at 2, three times at 3, and four times at 4 or 5. Coaching writes each pushback from what the rep
            actually said and uses these as a guide; it raises a realistic concern of its own when the list runs out. Without coaching, they are used word for word, in order,
            and the conversation ends when they do.
          </p>
          {[0, 1, 2, 3].map((i) => (
            <Field key={i} label={`Pushback ${i + 1}${i === 0 ? '' : ` (difficulty ${i + 1} and up)`}`} id={`d-pb-${i}`}>
              <input
                id={`d-pb-${i}`}
                type="text"
                maxLength={600}
                value={form.pushbacks[i] || ''}
                placeholder={i === 0 ? 'What the buyer is most likely to say next' : ''}
                onChange={(e) => {
                  const next = [...form.pushbacks];
                  next[i] = e.target.value;
                  set('pushbacks', next);
                }}
              />
            </Field>
          ))}
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
              <Field key={k} label={`${k === 'depth' ? 'Product depth' : k === 'difficulty' ? 'Difficulty' : 'Skepticism'} (set for reps)`} id={`d-def-${k}`}>
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
          <p className="small muted" style={{ margin: 0 }}>
            Choose the playbook and product sections this moment depends on. Coaching checks facts only against approved sections, so pick the ones that hold the facts a good answer
            needs.
          </p>
          {form.sourceRefs.length === 0 && <Notice kind="warn">Without an approved section, this drill runs as unscored practice only.</Notice>}
          <SourcePicker value={form.sourceRefs} onChange={(v) => set('sourceRefs', v)} form={form} meta={meta} />
        </section>

        {idealShown && (
          <IdealAnswerEditor ideal={ideal} onChange={setIdeal} onPropose={propose} proposing={proposing} error={proposeError} adding={adding} />
        )}

        {id && (
          <Field label="Change note" id="d-note">
            <input id="d-note" type="text" value={form.changeNote} maxLength={500} onChange={(e) => set('changeNote', e.target.value)} />
          </Field>
        )}
        {error && <ErrorNotice error={{ message: error.message }} />}
        <div className="row">
          {adding && !ideal.text ? (
            <>
              <button className="btn" onClick={propose} disabled={busy || proposing}>
                {proposing ? 'Proposing an ideal answer…' : 'Next: propose the ideal answer'}
                {!proposing && <ArrowRightIcon size={16} />}
              </button>
              {(proposeError || !meta.coaching.configured) && (
                <button className="btn btn-quiet" onClick={save} disabled={busy || proposing}>
                  Add without an ideal answer
                </button>
              )}
            </>
          ) : (
            <>
              <button className="btn" onClick={save} disabled={busy || proposing}>
                {busy ? 'Saving…' : id ? 'Save new version' : ideal.approved ? 'Add the question' : 'Add the question; approve the answer later'}
              </button>
              {adding && !ideal.approved && ideal.text && <span className="tiny muted">Until you approve it, reps and coaching do not see the ideal answer.</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
