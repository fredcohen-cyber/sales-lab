import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { useMeta } from '../state.jsx';
import { Empty, ErrorNotice, fmtRelative, Loading, useLoad } from '../components/ui.jsx';
import { DownloadIcon } from '../components/Icons.jsx';
import { TrendChart } from '../components/TrendChart.jsx';
import { DimensionTable, Disclosures, FilterBar, filtersFromParams, queryFrom, TrendNotes } from '../components/ReportParts.jsx';

function GroupTable({ groups }) {
  const cols = [
    ['all', 'All reps'],
    ['ae', 'Account executives'],
    ['am', 'Account managers'],
  ];
  const rows = [
    ['First-attempt coaching average', (g) => (g.performance.firstAttemptAverage === null ? '—' : g.performance.firstAttemptAverage)],
    ['Scored first attempts', (g) => g.performance.scoredFirstAttempts],
    ['Met target on first attempt', (g) => g.performance.metTarget],
    ['Critical failures (confirmed / pending)', (g) => `${g.performance.criticalFailures.confirmed} / ${g.performance.criticalFailures.pending}`],
    ['Evaluations pending review', (g) => g.performance.pendingReviews],
    ['Reps practicing', (g) => `${g.participants} of ${g.activeReps}${g.participationRate !== null ? ` (${g.participationRate}%)` : ''}`],
    ['Answers submitted', (g) => g.engagement.submitted],
    ['Retries', (g) => g.engagement.retries],
    ['Unscored practice', (g) => g.engagement.unscored],
    ['Practice days (all reps)', (g) => g.engagement.practiceDays],
    ['Curriculum completion', (g) => (g.curriculum.completionRate === null ? '—' : `${g.curriculum.completionRate}% (${g.curriculum.completed} of ${g.curriculum.items})`)],
    ['Overdue exercises', (g) => g.overdueItems],
    ['Reps needing follow-up', (g) => g.needFollowUp],
  ];
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Measure</th>
            {cols.map(([k, l]) => (
              <th key={k} className="num">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, fn]) => (
            <tr key={label}>
              <td>{label}</td>
              {cols.map(([k]) => (
                <td key={k} className="num">
                  {fn(groups[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ManagerDashboard() {
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const q = queryFrom(filters);
  const { data, error, loading, reload } = useLoad(() => get(`/reports/summary?${q}`), [q]);
  const reps = useLoad(() => get('/reports/summary?period=90'), []);
  useEffect(() => {
    document.title = 'Manager Dashboard · Sales Lab';
  }, []);
  const setFilter = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  const repOptions = (reps.data?.reps || []).map((r) => ({ id: r.id, name: r.name }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Manager Dashboard</h1>
          <p className="sub">Coaching performance and practice engagement for AEs and AMs. Calendar days follow New York time.</p>
        </div>
        <div className="row">
          <a className="btn btn-secondary btn-small" href={`/api/reports/export.csv?${queryFrom(filters, { type: 'reps' })}`}>
            <DownloadIcon />
            Export reps (CSV)
          </a>
          <a className="btn btn-secondary btn-small" href={`/api/reports/export.csv?${queryFrom(filters, { type: 'attempts' })}`}>
            <DownloadIcon />
            Export answers (CSV)
          </a>
        </div>
      </div>
      <FilterBar filters={filters} setFilter={setFilter} meta={meta} reps={repOptions} />
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && (
        <div className="stack-lg" style={{ opacity: loading ? 0.6 : 1 }}>
          <Disclosures items={data.disclosures} />
          <section className="stack">
            <h2>AEs and AMs, separately and together</h2>
            <GroupTable groups={data.groups} />
            <p className="tiny muted">The comparison columns ignore the role and rep filters so you can compare groups side by side. Everything else on this page follows all filters.</p>
          </section>

          <section className="panel stack">
            <div className="panel-head">
              <h2>First-attempt coaching average by week</h2>
            </div>
            <TrendChart series={data.team.trend.series} minEvidence={data.thresholds.minEvidence} />
            <TrendNotes statement={data.team.trend.statement} retry={data.team.retry} />
          </section>

          <section className="stack">
            <h2>Dimensions</h2>
            <DimensionTable dims={data.team.dimensions} thresholds={data.thresholds} />
          </section>

          <section className="stack">
            <h2>Reps</h2>
            {data.reps.length === 0 ? (
              <Empty title="No reps match these filters" action={<Link className="btn btn-secondary" to="/users">Add people</Link>}>
                Add AEs and AMs in User Management.
              </Empty>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Rep</th>
                      <th>Last practice</th>
                      <th className="num">Answers</th>
                      <th className="num">Practice days</th>
                      <th className="num">First-attempt avg (n)</th>
                      <th className="num">Pending reviews</th>
                      <th className="num">Curriculum</th>
                      <th>Strengths and needs</th>
                      <th>Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reps.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link className="row-link" to={`/manager/reps/${r.id}?period=${filters.period}`}>
                            {r.name}
                          </Link>
                          <div className="tiny muted">
                            {r.role === 'ae' ? 'AE' : r.role === 'am' ? 'AM' : 'Now a manager'}
                            {(r.rolesPracticed || []).some((x) => x !== r.role) &&
                              `, practiced as ${r.rolesPracticed.map((x) => x.toUpperCase()).join(' and ')}`}
                            {r.status !== 'active' ? ', deactivated' : ''}
                          </div>
                        </td>
                        <td>{fmtRelative(r.lastPracticeAt)}</td>
                        <td className="num">{r.engagement.submitted}</td>
                        <td className="num">{r.engagement.practiceDays}</td>
                        <td className="num">
                          {r.performance.firstAttemptAverage === null ? '—' : r.performance.firstAttemptAverage} ({r.performance.scoredFirstAttempts})
                        </td>
                        <td className="num">{r.performance.pendingReviews}</td>
                        <td className="num">
                          {r.assignments.completionRate === null ? '—' : `${r.assignments.completionRate}%`}
                          {r.assignments.overdueItems > 0 && <div className="tiny" style={{ color: 'var(--red)' }}>{r.assignments.overdueItems} overdue</div>}
                        </td>
                        <td className="small">
                          {r.strengths.map((s) => (
                            <div key={s.key}>Strength: {s.label.toLowerCase()}</div>
                          ))}
                          {r.weaknesses.map((s) => (
                            <div key={s.key} style={{ color: 'var(--red)' }}>
                              Needs work: {s.label.toLowerCase()}
                            </div>
                          ))}
                          {!r.strengths.length && !r.weaknesses.length && <span className="muted">Not enough evidence yet</span>}
                        </td>
                        <td className="small">{r.followUp.length ? r.followUp.map((f) => <div key={f.text}>{f.text}</div>) : <span className="muted">None</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
