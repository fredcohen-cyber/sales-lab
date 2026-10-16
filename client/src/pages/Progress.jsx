import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { useMeta } from '../state.jsx';
import { Empty, ErrorNotice, fmtDateTime, Loading, ReviewBadge, RunBadge, Stat, useLoad } from '../components/ui.jsx';
import { TrendChart } from '../components/TrendChart.jsx';
import { DimensionTable, Disclosures, FilterBar, filtersFromParams, queryFrom, SampleList, TrendNotes } from '../components/ReportParts.jsx';

export function AttemptTable({ attempts, showRep = false }) {
  if (!attempts.length) return <Empty title="No answers in this period">Answers you submit appear here with their coaching.</Empty>;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Submitted</th>
            {showRep && <th>Rep</th>}
            <th>Drill</th>
            <th>Buyer</th>
            <th className="num">Level</th>
            <th>Attempt</th>
            <th className="num">Score</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => (
            <tr key={a.id}>
              <td>{fmtDateTime(a.submittedAt)}</td>
              {showRep && <td>{a.learnerName}</td>}
              <td>
                <Link className="row-link" to={`/attempts/${a.id}`}>
                  {a.drillTitle}
                </Link>
                <div className="tiny muted">{a.stageLabel}</div>
              </td>
              <td>{a.personaLabel}</td>
              <td className="num">{a.difficulty}</td>
              <td>{a.attemptNumber === 1 ? 'First' : `Retry ${a.attemptNumber - 1}`}</td>
              <td className="num">{a.mode === 'unscored' ? '—' : a.overallScore ?? '—'}</td>
              <td>
                {a.mode === 'unscored' ? (
                  <span className="badge badge-neutral">Unscored practice</span>
                ) : a.reviewStatus ? (
                  <ReviewBadge status={a.reviewStatus} />
                ) : (
                  <RunBadge status={a.runStatus} />
                )}
                {a.criticalFailures > 0 && <span className="badge badge-critical" style={{ marginLeft: 6 }}>Critical failure</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Progress() {
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const q = queryFrom({ period: filters.period, brand: filters.brand, persona: filters.persona, difficulty: filters.difficulty });
  const { data, error, loading, reload } = useLoad(() => get(`/progress/me?${q}`), [q]);
  useEffect(() => {
    document.title = 'My Progress · Sales Lab';
  }, []);
  const setFilter = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  const me = data?.reps?.[0];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>My Progress</h1>
          <p className="sub">Your coaching results and practice activity. Scores are for coaching and development, not rankings.</p>
        </div>
      </div>
      <FilterBar filters={filters} setFilter={setFilter} meta={meta} showRole={false} showRep={false} />
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && me && (
        <div className="stack-lg" style={{ opacity: loading ? 0.6 : 1 }}>
          <Disclosures items={data.disclosures} />
          <div className="stats">
            <Stat label="First-attempt average" value={me.performance.firstAttemptAverage ?? '—'} note={`${me.performance.scoredFirstAttempts} scored first attempts`} />
            <Stat label="Met target on first try" value={me.performance.scoredFirstAttempts ? `${me.performance.metTarget} of ${me.performance.scoredFirstAttempts}` : '—'} note={`Target ${data.thresholds.proficiency}`} />
            <Stat label="Answers submitted" value={me.engagement.submitted} note={`${me.engagement.retries} retries, ${me.engagement.unscored} unscored`} />
            <Stat label="Practice days" value={me.engagement.practiceDays} note={`In the last ${data.period.days} days`} />
          </div>
          <section className="panel stack">
            <div className="panel-head">
              <h2>First attempts over time</h2>
            </div>
            <TrendChart series={data.team.trend.series} minEvidence={data.thresholds.minEvidence} />
            <TrendNotes statement={data.team.trend.statement} retry={me.retry} />
          </section>
          <section className="stack">
            <h2>Strengths and areas to work on</h2>
            <DimensionTable dims={me.dimensions} thresholds={data.thresholds} />
            <SampleList dims={me.dimensions} />
          </section>
          <section className="stack">
            <h2>Your answers</h2>
            <AttemptTable attempts={data.attempts} />
          </section>
        </div>
      )}
    </div>
  );
}
