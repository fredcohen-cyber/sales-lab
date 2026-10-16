import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { useMeta } from '../state.jsx';
import { ErrorNotice, fmtRelative, Loading, Stat, useLoad } from '../components/ui.jsx';
import { TrendChart } from '../components/TrendChart.jsx';
import { DimensionTable, Disclosures, FilterBar, filtersFromParams, queryFrom, SampleList, TrendNotes } from '../components/ReportParts.jsx';
import { AttemptTable } from './Progress.jsx';
import { AssignmentCard } from './Curriculum.jsx';

export function RepReport() {
  const { id } = useParams();
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const q = queryFrom({ period: filters.period, brand: filters.brand, persona: filters.persona, difficulty: filters.difficulty });
  const { data, error, loading, reload } = useLoad(() => get(`/reports/rep/${id}?${q}`), [id, q]);
  const assignments = useLoad(() => get(`/assignments?learnerId=${id}&status=active`), [id]);
  useEffect(() => {
    if (data) document.title = `${data.user.name} · Sales Lab`;
  }, [data]);
  const setFilter = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  if (error && !data) return <div className="page"><ErrorNotice error={error} retry={reload} /></div>;
  if (!data) return <div className="page"><Loading /></div>;
  const r = data.reps[0];
  return (
    <div className="page">
      <Link className="crumb" to="/manager">
        Back to Manager Dashboard
      </Link>
      <div className="page-head">
        <div>
          <h1>{data.user.name}</h1>
          <p className="sub">
            {data.user.role === 'ae' ? 'Account executive' : data.user.role === 'am' ? 'Account manager' : 'Manager'}, {data.user.experience === 'new_hire' ? 'new hire' : 'experienced'}. Last practice {fmtRelative(r.lastPracticeAt).toLowerCase()}.
            {data.user.status !== 'active' ? ' This account is deactivated; its history is kept.' : ''}
          </p>
        </div>
        <div className="row">
          <Link className="btn btn-secondary" to={`/curriculum?tab=assign&learner=${data.user.id}`}>
            Assign practice
          </Link>
          <Link className="btn btn-quiet" to={`/users/${data.user.id}`}>
            Account
          </Link>
        </div>
      </div>
      <FilterBar filters={filters} setFilter={setFilter} meta={meta} showRole={false} showRep={false} />
      <div className="stack-lg" style={{ opacity: loading ? 0.6 : 1 }}>
        <Disclosures items={data.disclosures} />
        {r.followUp.length > 0 && (
          <div className="panel panel-tight">
            <h2 className="section-title">Needs follow-up</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
              {r.followUp.map((f) => (
                <li key={f.text}>{f.text}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="stats">
          <Stat label="First-attempt average" value={r.performance.firstAttemptAverage ?? '—'} note={`${r.performance.scoredFirstAttempts} scored first attempts`} />
          <Stat label="Met target" value={r.performance.scoredFirstAttempts ? `${r.performance.metTarget} of ${r.performance.scoredFirstAttempts}` : '—'} note={`Target ${data.thresholds.proficiency}`} />
          <Stat label="Critical failures" value={r.performance.criticalFailures.confirmed} note={`${r.performance.criticalFailures.pending} pending review`} />
          <Stat label="Answers submitted" value={r.engagement.submitted} note={`${r.engagement.retries} retries, ${r.engagement.unscored} unscored`} />
          <Stat label="Practice days" value={r.engagement.practiceDays} note={`In the last ${data.period.days} days`} />
          <Stat label="Curriculum" value={r.assignments.completionRate === null ? '—' : `${r.assignments.completionRate}%`} note={`${r.assignments.overdueItems} overdue`} />
        </div>
        <section className="panel stack">
          <h2>First attempts over time</h2>
          <TrendChart series={data.team.trend.series} minEvidence={data.thresholds.minEvidence} />
          <TrendNotes statement={data.team.trend.statement} retry={r.retry} />
        </section>
        <section className="stack">
          <h2>Dimensions</h2>
          <DimensionTable dims={r.dimensions} thresholds={data.thresholds} learnerId={data.user.id} />
          <SampleList dims={r.dimensions} />
        </section>
        {assignments.data?.assignments?.length > 0 && (
          <section className="stack">
            <h2>Active assignments</h2>
            {assignments.data.assignments.map((a) => (
              <AssignmentCard key={a.id} a={a} />
            ))}
          </section>
        )}
        <section className="stack">
          <h2>Answers in this period</h2>
          <AttemptTable attempts={data.attempts} />
        </section>
      </div>
    </div>
  );
}
