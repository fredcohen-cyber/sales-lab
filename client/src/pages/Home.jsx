import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth } from '../state.jsx';
import { Empty, ErrorNotice, fmtDate, fmtRelative, Loading, Notice, ReviewBadge, RunBadge, Stat, useLoad, attemptLabel, scoreText } from '../components/ui.jsx';
import { ArrowRightIcon, ClipboardIcon, SparkIcon, TargetIcon } from '../components/Icons.jsx';

export function NextUpCard({ next }) {
  if (!next) return null;
  // An exercise already under way is continued from its latest reply.
  const replies = next.lastAttempt?.replies;
  const underWay = replies && replies.done < replies.planned;
  return (
    <section className="next-up" aria-labelledby="next-up-title">
      <div className="hero-top">
        <div>
          <span className="hero-label">Assigned exercise</span>
          <div className="hero-meta">
            Next in “{next.assignmentTitle}”
            {next.dueDate ? `, due ${fmtDate(next.dueDate)}` : ''}
          </div>
        </div>
        {next.overdue ? (
          <span className="badge badge-critical">Overdue</span>
        ) : (
          <span className="hero-symbol" aria-hidden="true">
            <ClipboardIcon />
          </span>
        )}
      </div>
      <h2 id="next-up-title">{next.title}</h2>
      <p className="hero-text">
        {next.stageLabel}. Buyer: {next.personaLabel}. Difficulty {next.settings.difficulty}, skepticism {next.settings.skepticism}, product depth {next.settings.depth}.
      </p>
      <div className="hero-actions">
        {underWay ? (
          <Link className="btn" to={`/attempts/${next.lastAttempt.id}`}>
            Continue the conversation ({replies.done} of {replies.planned} replies)
            <ArrowRightIcon size={16} />
          </Link>
        ) : (
          <Link className="btn" to={`/practice/assigned/${next.id}`}>
            Start exercise
            <ArrowRightIcon size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}

// No assignment waiting: the stages are where the next question comes from.
function PracticeHero() {
  return (
    <section className="hero-card" aria-labelledby="practice-hero-title">
      <div className="hero-top">
        <div>
          <span className="hero-label">Practice</span>
          <div className="hero-meta">No assigned exercises right now</div>
        </div>
        <span className="hero-symbol" aria-hidden="true">
          <TargetIcon />
        </span>
      </div>
      <h2 id="practice-hero-title">Choose a stage and answer the buyer in your own words.</h2>
      <p className="hero-text">Your manager’s assignments will appear here. Meanwhile, each stage serves you a question with its buyer and challenge levels set.</p>
      <div className="hero-actions">
        <Link className="btn" to="/practice">
          Choose a stage
          <ArrowRightIcon size={16} />
        </Link>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="panel focus-card" aria-labelledby="how-title">
      <div className="row">
        <span className="icon-tile" aria-hidden="true">
          <SparkIcon />
        </span>
        <div>
          <h2 id="how-title" className="section-title" style={{ margin: 0 }}>
            How a practice conversation works
          </h2>
          <p className="tiny muted" style={{ margin: 0 }}>
            Up to five replies, depending on the question’s difficulty.
          </p>
        </div>
      </div>
      <ol className="steps">
        <li>
          <strong>Choose a stage</strong>
          <p>Each stage serves one question, with its buyer and levels set.</p>
        </li>
        <li>
          <strong>Answer in your own words</strong>
          <p>Write exactly what you would say or send.</p>
        </li>
        <li>
          <strong>Read your coaching</strong>
          <p>A score, what worked, what to improve, and a stronger answer.</p>
        </li>
        <li>
          <strong>Handle the pushback</strong>
          <p>The buyer answers what you actually wrote, and you reply again.</p>
        </li>
      </ol>
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
          <p className="sub">Answer the buyer, get coaching on what you actually wrote, then handle the next objection.</p>
        </div>
      </div>
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && (
        <div className="stack-lg">
          <div className="hero-grid">
            {data.next ? <NextUpCard next={data.next} /> : <PracticeHero />}
            <HowItWorks />
          </div>
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
                      <th>Question</th>
                      <th>Last reply</th>
                      <th>Attempt</th>
                      <th className="num">Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link className="row-link" to={`/attempts/${r.latest_turn_id || r.id}`}>
                            {r.drill_title}
                          </Link>
                        </td>
                        <td>{fmtRelative(r.last_reply_at || r.submitted_at)}</td>
                        <td>{attemptLabel(r, { short: true })}</td>
                        <td className="num">{scoreText(r)}</td>
                        <td>
                          {r.mode === 'unscored' ? (
                            <span className="badge badge-neutral">Unscored practice</span>
                          ) : r.conversation_state === 'unfinished' ? (
                            <span className="badge badge-info">In progress</span>
                          ) : r.replies_awaiting > 0 ? (
                            <RunBadge status={r.latest_run_status} />
                          ) : (
                            <ReviewBadge status={r.conversation_review_status} />
                          )}
                        </td>
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
        <Stat label="First-attempt average" value={t.performance.firstAttemptAverage ?? '—'} note={`${t.performance.scoredFirstAttempts} scored first attempt${t.performance.scoredFirstAttempts === 1 ? '' : 's'}`} />
        <Stat label="Reps practicing" value={`${t.participants} of ${t.activeReps}`} note="Based on submitted answers" />
        <Stat label="Questions answered" value={t.engagement.submitted} note={`${t.engagement.replies} replies, ${t.engagement.retries} retries`} />
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
