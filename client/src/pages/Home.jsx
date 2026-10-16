import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth } from '../state.jsx';
import { Empty, ErrorNotice, fmtDate, fmtRelative, Loading, Notice, ReviewBadge, RunBadge, Stat, useLoad } from '../components/ui.jsx';

export function NextUpCard({ next }) {
  if (!next) return null;
  return (
    <section className="next-up stack-sm" aria-labelledby="next-up-title">
      <div className="row-between">
        <span className="small muted">
          Next in “{next.assignmentTitle}”
          {next.dueDate ? `, due ${fmtDate(next.dueDate)}` : ''}
        </span>
        {next.overdue && <span className="badge badge-critical">Overdue</span>}
      </div>
      <h2 id="next-up-title">{next.title}</h2>
      <p className="small muted" style={{ marginBottom: 6 }}>
        {next.stageLabel}. Buyer: {next.personaLabel}. Difficulty {next.settings.difficulty}, skepticism {next.settings.skepticism}, product depth {next.settings.depth}.
      </p>
      <div>
        <Link className="btn" to={`/practice/assigned/${next.id}`}>
          Start exercise
        </Link>
      </div>
    </section>
  );
}

export function Home() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad(() => get('/home'), []);
  useEffect(() => {
    document.title = 'Home · Sales Lab';
  }, []);

  const first = user.name.split(' ')[0];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Welcome back, {first}</h1>
          <p className="sub">Practice one moment at a time, get coaching on what you actually wrote, and try it again.</p>
        </div>
        <Link className="btn btn-secondary" to="/practice">
          Open Practice Studio
        </Link>
      </div>
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && (
        <div className="stack-lg">
          {data.next ? (
            <NextUpCard next={data.next} />
          ) : (
            <Empty title="No assigned exercises right now" action={<Link className="btn" to="/practice">Choose a drill</Link>}>
              Your manager’s assignments will appear here. Meanwhile, pick any drill to practice.
            </Empty>
          )}
          {data.overdueAssignments > 0 && (
            <Notice kind="warn" title={`${data.overdueAssignments} overdue assignment${data.overdueAssignments === 1 ? '' : 's'}`}>
              <p>
                See them in <Link to="/curriculum">Curriculum</Link>.
              </p>
            </Notice>
          )}

          {user.isManager && data.manager && <ManagerSnapshot m={data.manager} />}

          <section>
            <div className="panel-head">
              <h2>Your recent answers</h2>
              <Link to="/progress" className="small">
                See all progress
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <Empty title="Nothing submitted yet">Your answers and coaching will show up here.</Empty>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Drill</th>
                      <th>Submitted</th>
                      <th>Attempt</th>
                      <th className="num">Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link className="row-link" to={`/attempts/${r.id}`}>
                            {r.drill_title}
                          </Link>
                        </td>
                        <td>{fmtRelative(r.submitted_at)}</td>
                        <td className="num">{r.attempt_number === 1 ? 'First' : `Retry ${r.attempt_number - 1}`}</td>
                        <td className="num">{r.mode === 'unscored' ? '—' : r.overall_score ?? '—'}</td>
                        <td>{r.mode === 'unscored' ? <span className="badge badge-neutral">Unscored practice</span> : r.review_status ? <ReviewBadge status={r.review_status} /> : <RunBadge status={r.run_status} />}</td>
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

function ManagerSnapshot({ m }) {
  const t = m.team;
  return (
    <section className="stack">
      <div className="panel-head">
        <h2>Team this week</h2>
        <Link className="small" to="/manager">
          Open Manager Dashboard
        </Link>
      </div>
      <div className="stats">
        <Stat label="First-attempt average" value={t.performance.firstAttemptAverage ?? '—'} note={`${t.performance.scoredFirstAttempts} scored first attempts`} />
        <Stat label="Reps practicing" value={`${t.participants} of ${t.activeReps}`} note="Based on submitted answers" />
        <Stat label="Answers submitted" value={t.engagement.submitted} note={`${t.engagement.retries} retries`} />
        <Stat label="Pending reviews" value={m.pendingReviews} note={<Link to="/coaching">Review now</Link>} />
      </div>
      {m.awaitingSetup > 0 && (
        <Notice kind="info">
          {m.awaitingSetup} {m.awaitingSetup === 1 ? 'person has' : 'people have'} not set a password yet. <Link to="/users?setup=invited">Check setup links</Link>
        </Notice>
      )}
      {m.followUp.length > 0 && (
        <div className="panel">
          <h3 className="section-title">Reps who may need follow-up</h3>
          <ul className="feedback-list">
            {m.followUp.map((r) => (
              <li key={r.id}>
                <Link to={`/manager/reps/${r.id}`} style={{ fontWeight: 600 }}>
                  {r.name}
                </Link>
                <span className="muted small"> {r.reasons.map((x) => x.text).join('. ')}.</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
