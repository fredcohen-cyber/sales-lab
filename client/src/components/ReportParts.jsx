import { Link } from 'react-router-dom';
import { fmtDate, Notice, ScoreBar, VerdictBadge } from './ui.jsx';

export function Disclosures({ items }) {
  if (!items?.length) return null;
  return (
    <Notice kind="info" title="About these numbers">
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    </Notice>
  );
}

export function DimensionTable({ dims, thresholds, learnerId }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Dimension</th>
            <th className="num">Weight</th>
            <th style={{ minWidth: 160 }}>First-attempt average</th>
            <th className="num">Scored examples</th>
            <th>Read</th>
            {learnerId && <th />}
          </tr>
        </thead>
        <tbody>
          {dims.map((d) => (
            <tr key={d.key}>
              <td style={{ fontWeight: 600 }}>{d.label}</td>
              <td className="num">{d.weight}%</td>
              <td>
                {d.average === null ? (
                  <span className="muted small">No scored examples</span>
                ) : (
                  <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                    <span className="num" style={{ width: 34, fontWeight: 650 }}>
                      {d.average}
                    </span>
                    <div className="grow">
                      <ScoreBar value={d.average} label={d.label} />
                    </div>
                  </div>
                )}
              </td>
              <td className="num">{d.n}</td>
              <td>
                <VerdictBadge verdict={d.verdict} />
              </td>
              {learnerId && (
                <td>
                  {d.verdict === 'weakness' && (
                    <Link className="small" to={`/curriculum?tab=assign&learner=${learnerId}&dimension=${d.key}`}>
                      Assign targeted practice
                    </Link>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tiny muted" style={{ padding: '8px 12px', margin: 0, borderTop: '1px solid var(--line-2)' }}>
        A strength needs an average of {thresholds.strength} or more, and “needs work” means below {thresholds.weakness}, each across at least {thresholds.minEvidence} scored first attempts. Retries, unscored practice, pending reviews, and disputed
        evaluations are excluded.
      </p>
    </div>
  );
}

export function SampleList({ dims }) {
  const withSamples = dims.filter((d) => d.samples?.length);
  if (!withSamples.length) return null;
  return (
    <details>
      <summary className="small" style={{ cursor: 'pointer' }}>
        Evidence behind each dimension
      </summary>
      <div className="stack-sm" style={{ marginTop: 10 }}>
        {withSamples.map((d) => (
          <div key={d.key} className="small">
            <strong>{d.label}:</strong>{' '}
            {d.samples.map((s, i) => (
              <span key={s.attemptId}>
                {i > 0 && ', '}
                <Link to={`/attempts/${s.attemptId}`}>
                  {s.score} on {s.drillTitle} ({fmtDate(s.day, { year: false })})
                </Link>
              </span>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

export function FilterBar({ filters, setFilter, meta, reps, showRole = true, showRep = true, children }) {
  return (
    <div className="filters">
      <div className="field">
        <span className="label" style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
          Period
        </span>
        <div className="segmented" role="group" aria-label="Period">
          {[7, 30, 90].map((p) => (
            <button key={p} type="button" aria-pressed={filters.period === p} onClick={() => setFilter('period', String(p))}>
              {p} days
            </button>
          ))}
        </div>
      </div>
      {showRole && (
        <div className="field">
          <label htmlFor="r-role">Role</label>
          <select id="r-role" value={filters.role || ''} onChange={(e) => setFilter('role', e.target.value)}>
            <option value="">AEs and AMs</option>
            <option value="ae">Account executives</option>
            <option value="am">Account managers</option>
          </select>
        </div>
      )}
      {showRep && reps && (
        <div className="field">
          <label htmlFor="r-rep">Rep</label>
          <select id="r-rep" value={filters.learnerId || ''} onChange={(e) => setFilter('learnerId', e.target.value)}>
            <option value="">Everyone</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="r-brand">Brand</label>
        <select id="r-brand" value={filters.brand || ''} onChange={(e) => setFilter('brand', e.target.value)}>
          <option value="">All</option>
          <option value="ravenly">Ravenly</option>
          <option value="omnizant">Omnizant</option>
          <option value="both">Both-brand drills</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="r-persona">Buyer persona</label>
        <select id="r-persona" value={filters.persona || ''} onChange={(e) => setFilter('persona', e.target.value)}>
          <option value="">All</option>
          {meta.personas.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="r-diff">Challenge level</label>
        <select id="r-diff" value={filters.difficulty || ''} onChange={(e) => setFilter('difficulty', e.target.value)}>
          <option value="">All levels</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              Difficulty {n}
            </option>
          ))}
        </select>
      </div>
      {children}
    </div>
  );
}

export function filtersFromParams(params) {
  const period = [7, 30, 90].includes(Number(params.get('period'))) ? Number(params.get('period')) : 30;
  return {
    period,
    role: params.get('role') || '',
    learnerId: params.get('learnerId') || '',
    brand: params.get('brand') || '',
    persona: params.get('persona') || '',
    difficulty: params.get('difficulty') || '',
  };
}

export function queryFrom(filters, extra = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, ...extra })) if (v) q.set(k, String(v));
  return q.toString();
}

export function TrendNotes({ statement, retry }) {
  return (
    <div className="trend-notes">
      <p>{statement.text}</p>
      <p>
        Improvement through retries, on the same drill and buyer: <RetryLine retry={retry} />
      </p>
    </div>
  );
}

export function RetryLine({ retry }) {
  if (!retry || retry.exercises === 0) return <span className="muted">No retried exercises yet</span>;
  return (
    <span>
      <strong className="num">{retry.averageGain > 0 ? `+${retry.averageGain}` : retry.averageGain}</strong> average gain across {retry.exercises} retried exercise{retry.exercises === 1 ? '' : 's'}
    </span>
  );
}
