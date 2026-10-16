import { useEffect, useState } from 'react';
import { get, post, put } from '../api.js';
import { useMeta } from '../state.jsx';
import { ErrorNotice, Field, fmtDateTime, Loading, Notice, useLoad, useToast } from '../components/ui.jsx';

function AiPanel({ ai }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const test = async () => {
    setBusy(true);
    setResult(null);
    try {
      setResult(await post('/settings/ai-test', {}, { timeoutMs: 30000 }));
    } catch (e) {
      setResult({ ok: false, message: e.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel stack">
      <h2 className="section-title">AI coaching</h2>
      {ai.configured ? (
        <dl className="kv">
          <dt>Provider</dt>
          <dd>{ai.provider === 'anthropic' ? 'Anthropic (Claude)' : ai.provider === 'openai' ? 'OpenAI' : ai.provider}</dd>
          <dt>Model</dt>
          <dd>{ai.model}</dd>
          <dt>Time limit</dt>
          <dd>{ai.timeoutSeconds} seconds per coaching request</dd>
        </dl>
      ) : (
        <Notice kind="warn" title="AI coaching is not configured">
          <p>Add ANTHROPIC_API_KEY (or OPENAI_API_KEY) as a server variable in Railway. Keys stay on the server and are never shown in Sales Lab. Until then, drills run as clearly labeled unscored practice.</p>
        </Notice>
      )}
      <div className="row">
        <button className="btn btn-secondary" onClick={test} disabled={busy}>
          {busy ? 'Testing…' : 'Test the connection'}
        </button>
        <span className="tiny muted">Sends a one-word test request with no rep data.</span>
      </div>
      {result && <Notice kind={result.ok ? 'ok' : 'critical'}>{result.message}</Notice>}
    </section>
  );
}

function RubricPanel({ settings, onSaved }) {
  const toast = useToast();
  const [weights, setWeights] = useState(() => Object.fromEntries(settings.rubric.dimensions.map((d) => [d.key, d.weight])));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const total = Object.values(weights).reduce((a, b) => a + (Number(b) || 0), 0);
  const changed = settings.rubric.dimensions.some((d) => Number(weights[d.key]) !== d.weight);
  const save = async () => {
    setBusy(true);
    try {
      const r = await put('/settings/rubric', { weights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Number(v) || 0])), note });
      toast(`Saved as scoring version ${r.version}`);
      setNote('');
      onSaved();
    } catch (e) {
      toast(e.message, { error: true });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel stack">
      <div className="panel-head">
        <h2 className="section-title" style={{ margin: 0 }}>
          Scoring weights
        </h2>
        <span className="tiny muted">
          Version {settings.rubric.version}, saved {fmtDateTime(settings.rubric.createdAt)}
          {settings.rubric.createdByName ? ` by ${settings.rubric.createdByName}` : ''}
        </span>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Starting defaults to calibrate against real answers. Each answer is scored with the version in force when it was submitted, so changes never rewrite past results. Weights are relative; dimensions a drill does not assess are left out.
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Dimension</th>
              <th className="num">Weight</th>
              <th className="num">Share</th>
            </tr>
          </thead>
          <tbody>
            {settings.rubric.dimensions.map((d) => (
              <tr key={d.key}>
                <td>
                  <strong>{d.label}</strong>
                  <div className="tiny muted">{d.description}</div>
                </td>
                <td className="num">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[d.key]}
                    onChange={(e) => setWeights({ ...weights, [d.key]: e.target.value })}
                    aria-label={`${d.label} weight`}
                    style={{ width: 80, textAlign: 'right' }}
                  />
                </td>
                <td className="num">{total ? `${Math.round(((Number(weights[d.key]) || 0) / total) * 100)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Field label="What changed and why (optional)" id="rubric-note">
        <input id="rubric-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </Field>
      <div>
        <button className="btn" onClick={save} disabled={!changed || busy || total <= 0}>
          Save as a new scoring version
        </button>
      </div>
      {settings.rubricHistory.length > 1 && (
        <details>
          <summary className="small" style={{ cursor: 'pointer' }}>
            Earlier versions
          </summary>
          <ul className="small">
            {settings.rubricHistory.map((r) => (
              <li key={r.id}>
                Version {r.version}, {fmtDateTime(r.created_at)}
                {r.created_by_name ? ` by ${r.created_by_name}` : ''}: {r.dimensions.map((d) => `${d.label} ${d.weight}`).join(', ')}
                {r.note ? `. ${r.note}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ThresholdPanel({ settings, onSaved }) {
  const toast = useToast();
  const [t, setT] = useState(settings.thresholds);
  const save = async () => {
    try {
      await put('/settings/thresholds', { proficiency: Number(t.proficiency), strength: Number(t.strength), weakness: Number(t.weakness), minEvidence: Number(t.minEvidence) });
      toast('Thresholds saved');
      onSaved();
    } catch (e) {
      toast(e.message, { error: true });
    }
  };
  return (
    <section className="panel stack">
      <h2 className="section-title">Targets and evidence rules</h2>
      <div className="form-row">
        <Field label="Target score" id="t-prof" hint="An answer at or above this, with no critical failure, meets target.">
          <input id="t-prof" type="number" min={1} max={100} value={t.proficiency} onChange={(e) => setT({ ...t, proficiency: e.target.value })} />
        </Field>
        <Field label="Strength at or above" id="t-str">
          <input id="t-str" type="number" min={1} max={100} value={t.strength} onChange={(e) => setT({ ...t, strength: e.target.value })} />
        </Field>
        <Field label="Needs work below" id="t-weak">
          <input id="t-weak" type="number" min={1} max={100} value={t.weakness} onChange={(e) => setT({ ...t, weakness: e.target.value })} />
        </Field>
        <Field label="Scored examples required" id="t-min" hint="At least 3.">
          <input id="t-min" type="number" min={3} max={50} value={t.minEvidence} onChange={(e) => setT({ ...t, minEvidence: e.target.value })} />
        </Field>
      </div>
      <div>
        <button className="btn btn-secondary" onClick={save}>
          Save thresholds
        </button>
      </div>
    </section>
  );
}

function PersonaPanel({ personas, onSaved }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const save = async () => {
    try {
      await put(`/personas/${editing.key}`, { label: editing.label, responsibilities: editing.responsibilities, concerns: editing.concerns });
      toast('Persona saved');
      setEditing(null);
      onSaved();
    } catch (e) {
      toast(e.message, { error: true });
    }
  };
  return (
    <section className="panel stack">
      <h2 className="section-title">Buyer personas</h2>
      <p className="small muted" style={{ margin: 0 }}>
        Coaching adapts objections, reactions, and evaluation to these descriptions. Each answer keeps the description it was written against.
      </p>
      {personas.map((p) =>
        editing?.key === p.key ? (
          <div key={p.key} className="stack-sm">
            <Field label="Name" id={`p-${p.key}-label`}>
              <input id={`p-${p.key}-label`} type="text" value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
            </Field>
            <Field label="Responsible for" id={`p-${p.key}-resp`}>
              <textarea id={`p-${p.key}-resp`} rows={3} value={editing.responsibilities} onChange={(e) => setEditing({ ...editing, responsibilities: e.target.value })} />
            </Field>
            <Field label="Cares about" id={`p-${p.key}-conc`}>
              <textarea id={`p-${p.key}-conc`} rows={3} value={editing.concerns} onChange={(e) => setEditing({ ...editing, concerns: e.target.value })} />
            </Field>
            <div className="row">
              <button className="btn btn-small" onClick={save}>
                Save persona
              </button>
              <button className="btn btn-secondary btn-small" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div key={p.key} className="stack-sm" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 12 }}>
            <div className="row-between">
              <strong>{p.label}</strong>
              <button className="btn btn-quiet btn-small" onClick={() => setEditing({ ...p })}>
                Edit
              </button>
            </div>
            <p className="small" style={{ margin: 0 }}>
              <span className="muted">Responsible for:</span> {p.responsibilities}
            </p>
            <p className="small" style={{ margin: 0 }}>
              <span className="muted">Cares about:</span> {p.concerns}
            </p>
          </div>
        ),
      )}
    </section>
  );
}

export function Settings() {
  const { reloadMeta } = useMeta();
  const { data, error, loading, reload } = useLoad(() => get('/settings'), []);
  useEffect(() => {
    document.title = 'Workspace Settings · Sales Lab';
  }, []);
  const saved = () => {
    reload({ quiet: true });
    reloadMeta();
  };
  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>Workspace Settings</h1>
          <p className="sub">Coaching setup, scoring weights, targets, and buyer personas.</p>
        </div>
      </div>
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && (
        <div className="stack-lg">
          <AiPanel ai={data.ai} />
          <RubricPanel key={`r${data.rubric.version}`} settings={data} onSaved={saved} />
          <ThresholdPanel key={JSON.stringify(data.thresholds)} settings={data} onSaved={saved} />
          <PersonaPanel personas={data.personas} onSaved={saved} />
          <section className="panel stack-sm">
            <h2 className="section-title">Workspace</h2>
            <dl className="kv">
              <dt>Owner</dt>
              <dd>
                {data.owner.name} ({data.owner.email})
              </dd>
              <dt>Allowed email domains</dt>
              <dd>{data.allowedDomains.join(' and ')}, for people a manager adds</dd>
              <dt>Report calendar</dt>
              <dd>America/New_York</dd>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
