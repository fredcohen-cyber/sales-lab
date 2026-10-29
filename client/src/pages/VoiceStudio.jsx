// Practice Studio-Voice: practice phone calls out loud. The rep picks what they sell and, if they like,
// who picks up; everything else they find out on the call. The transcript is coached in writing.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get, post } from '../api.js';
import { useAuth } from '../state.jsx';
import { Empty, ErrorNotice, fmtDateTime, Loading, Notice, Segmented, useLoad } from '../components/ui.jsx';
import { HeadsetIcon, PhoneIcon } from '../components/Icons.jsx';
import { clock } from '../lib/voice/callState.js';

const CHOICE_KEY = (userId) => `${userId}:voice-choice`;
function savedChoice(userId) {
  try {
    const v = JSON.parse(localStorage.getItem(CHOICE_KEY(userId)) || '{}');
    return { product: typeof v.product === 'string' ? v.product : '', persona: typeof v.persona === 'string' ? v.persona : '' };
  } catch {
    return { product: '', persona: '' };
  }
}
function saveChoice(userId, choice) {
  try {
    localStorage.setItem(CHOICE_KEY(userId), JSON.stringify(choice));
  } catch {
    /* storage unavailable: the choice still works for this visit */
  }
}

export const NEXT_STEP = {
  booked: { label: 'Next step booked', className: 'badge-ok' },
  soft: { label: 'Vague next step', className: 'badge-warn' },
  none: { label: 'No next step', className: 'badge-neutral' },
};

function CallStatus({ c }) {
  if (c.status === 'live') return <span className="badge badge-info">On the call</span>;
  if (c.status === 'failed') return <span className="badge badge-neutral">Did not connect</span>;
  if (c.coachingStatus === 'running') return <span className="badge badge-info">Coaching…</span>;
  if (c.coachingStatus === 'failed') return <span className="badge badge-warn">Coaching stopped</span>;
  if (c.coachingStatus === 'skipped') return <span className="badge badge-neutral">Not coached</span>;
  if (c.nextStep) return <span className={`badge ${NEXT_STEP[c.nextStep].className}`}>{NEXT_STEP[c.nextStep].label}</span>;
  return null;
}

function CallTable({ calls, showRep = false }) {
  return (
    <div className="table-wrap">
      <table className="data voice-calls">
        <thead>
          <tr>
            <th>When</th>
            {showRep && <th>Rep</th>}
            <th>Selling</th>
            <th>Who picked up</th>
            <th className="num">Length</th>
            <th>Outcome</th>
            <th className="num">Score</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/voice/calls/${c.id}`}>{fmtDateTime(c.createdAt)}</Link>
              </td>
              {showRep && <td>{c.learner.name}</td>}
              <td>{c.productLabel}</td>
              <td>
                {c.personaLabel}
                {c.buyerName && <span className="tiny muted voice-firm">{`${c.buyerName}, ${c.firm}`}</span>}
              </td>
              <td className="num">{c.durationMs ? clock(c.durationMs) : '—'}</td>
              <td>
                <CallStatus c={c} />
              </td>
              <td className="num">{c.score ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VoiceStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad(() => get('/voice'), []);
  const saved = useMemo(() => savedChoice(user.id), [user.id]);
  const [callType, setCallType] = useState(null);
  const [product, setProduct] = useState(saved.product);
  const [persona, setPersona] = useState(saved.persona);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [teamRep, setTeamRep] = useState('');

  useEffect(() => {
    document.title = 'Practice Studio-Voice · Sales Lab';
  }, []);

  if (loading && !data) return <div className="page"><Loading /></div>;
  if (!data) return <div className="page"><ErrorNotice error={error} retry={reload} /></div>;

  const types = data.callTypes;
  const type = types.find((t) => t.key === callType) || types[0];
  const products = type.products;
  const prod = products.find((p) => p.key === product && p.calls > 0) || products.find((p) => p.calls > 0) || products[0];
  const who = prod.personas.find((p) => p.key === persona && p.calls > 0) ? persona : '';
  const atLimit = data.limits.usedToday >= data.limits.callsPerDay;
  const team = data.team || [];
  const reps = [...new Map(team.map((c) => [c.learner.id, c.learner.name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const teamShown = teamRep ? team.filter((c) => c.learner.id === teamRep) : team;

  const start = async () => {
    setStarting(true);
    setStartError(null);
    saveChoice(user.id, { product: prod.key, persona: who });
    try {
      const { call } = await post('/voice/calls', { productLine: prod.key, persona: who || null, callType: type.key });
      navigate(`/voice/calls/${call.id}`);
    } catch (err) {
      setStartError(err);
      setStarting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Practice Studio-Voice</h1>
          <p className="sub">
            Practice a call out loud. You know what you are selling and who picks up. Everything else, from the firm’s situation to what worries them, you find
            out on the call. When you hang up, Sales Lab coaches the transcript in writing.
          </p>
        </div>
      </div>

      {!data.configured &&
        (user.isManager ? (
          <Notice kind="warn" title="Voice practice needs an OpenAI API key">
            <p>
              Add <code>OPENAI_API_KEY</code> to the Sales Lab service’s variables in Railway. Calls are billed by the minute to that OpenAI account; nothing
              else needs to change.
            </p>
          </Notice>
        ) : (
          <Notice kind="info" title="Voice practice is not set up yet">
            <p>Your manager can turn it on. Until then, practice in writing in the Practice Studio.</p>
          </Notice>
        ))}
      {data.configured && !data.coachingConfigured && (
        <Notice kind="warn">Calls work, but AI coaching is not set up, so calls will not be coached until a manager adds an AI key.</Notice>
      )}

      <div className="voice-start-grid">
        <section className="panel stack" aria-labelledby="start-title">
          <h2 id="start-title" className="section-title" style={{ margin: 0 }}>
            Start a call
          </h2>
          {types.length > 1 && (
            <div className="field">
              <span className="label" id="calltype-label">
                Who you are calling
              </span>
              <Segmented
                label="Who you are calling"
                value={type.key}
                onChange={setCallType}
                options={types.map((t) => ({ value: t.key, label: t.key === 'prospect' ? 'A new prospect (AE)' : 'An existing client (AM)' }))}
              />
            </div>
          )}
          <fieldset className="voice-products">
            <legend className="label">What you are selling</legend>
            <div className="voice-product-list">
              {products.map((p) => (
                <label key={p.key} className={`voice-product${p.key === prod.key ? ' selected' : ''}${p.calls ? '' : ' empty'}`}>
                  <input type="radio" name="voice-product" value={p.key} checked={p.key === prod.key} disabled={!p.calls} onChange={() => setProduct(p.key)} />
                  <span className="voice-product-name">{p.label}</span>
                  <span className="tiny muted">{p.calls ? `${p.calls} ${p.calls === 1 ? 'call' : 'calls'}` : 'No calls yet'}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="voice-persona">Who picks up</label>
            <select id="voice-persona" value={who} onChange={(e) => setPersona(e.target.value)}>
              <option value="">Anyone at the firm</option>
              {prod.personas.map((p) => (
                <option key={p.key} value={p.key} disabled={!p.calls}>
                  {p.label}
                  {p.calls ? '' : ' (no calls yet)'}
                </option>
              ))}
            </select>
            <span className="hint">You will know their role before you dial, never their name or situation.</span>
          </div>
          {startError && <ErrorNotice error={startError} />}
          <div className="row voice-start-row">
            <button type="button" className="btn btn-large btn-call" onClick={start} disabled={!data.configured || starting || atLimit || !prod.calls}>
              <PhoneIcon />
              {starting ? 'Setting up the call…' : 'Go to the phone'}
            </button>
            <span className="small muted">
              {atLimit
                ? `You have made ${data.limits.callsPerDay} calls today, the daily limit.`
                : `${data.limits.usedToday} of ${data.limits.callsPerDay} calls today. Each call can run ${data.limits.maxCallMinutes} minutes.`}
            </span>
          </div>
        </section>

        <aside className="panel panel-tight stack-sm voice-tips" aria-labelledby="tips-title">
          <h2 id="tips-title" className="section-title with-icon" style={{ margin: 0 }}>
            <HeadsetIcon size={16} />
            Before you dial
          </h2>
          <ul className="voice-tip-list small">
            <li>Use Chrome or Edge on a computer, with a headset if you have one.</li>
            <li>Your browser asks once to use the microphone.</li>
            <li>The person who answers is played by an AI voice. Talk to them as you would on a real call: they can interrupt, and so can you.</li>
            <li>No audio is kept. Sales Lab saves the transcript and coaches it when you hang up.</li>
          </ul>
        </aside>
      </div>

      <section className="stack-sm voice-history" aria-labelledby="mine-title">
        <h2 id="mine-title" className="section-title">
          Your calls
        </h2>
        {data.calls.length ? <CallTable calls={data.calls} /> : <Empty title="No calls yet">Your calls and their coaching will show here.</Empty>}
      </section>

      {user.isManager && (
        <section className="stack-sm voice-history" aria-labelledby="team-title">
          <div className="row-between">
            <h2 id="team-title" className="section-title" style={{ margin: 0 }}>
              Team calls
            </h2>
            {reps.length > 1 && (
              <div className="voice-team-filter">
                <label htmlFor="voice-team-rep" className="visually-hidden">
                  Rep
                </label>
                <select id="voice-team-rep" value={teamRep} onChange={(e) => setTeamRep(e.target.value)}>
                  <option value="">Everyone</option>
                  {reps.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {teamShown.length ? <CallTable calls={teamShown} showRep /> : <Empty title="No team calls yet">Calls your reps make show here, with their coaching.</Empty>}
        </section>
      )}
    </div>
  );
}
