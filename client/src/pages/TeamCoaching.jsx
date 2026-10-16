import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { BrandChip, Empty, ErrorNotice, fmtDateTime, Loading, ReviewBadge, useLoad, attemptLabel, scoreText } from '../components/ui.jsx';

const FILTERS = [
  ['pending', 'Pending review'],
  ['critical', 'Critical failures'],
  ['disputed', 'Disputed'],
  ['reviewed', 'Reviewed'],
  ['all', 'All coached answers'],
];

export function TeamCoaching() {
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') || 'pending';
  const { data, error, loading, reload } = useLoad(() => get(`/reviews?filter=${filter}`), [filter]);
  useEffect(() => {
    document.title = 'Team Coaching · Sales Lab';
  }, []);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Team Coaching</h1>
          <p className="sub">
            Review flagged evaluations, confirm or dispute them, and leave coaching notes. Pending and disputed evaluations are left out of performance reports until they are resolved.
          </p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {FILTERS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setParams({ filter: k }, { replace: true })}>
            {label}
            {data && k === 'pending' && data.counts.pending > 0 ? ` (${data.counts.pending})` : ''}
            {data && k === 'critical' && data.counts.critical > 0 ? ` (${data.counts.critical})` : ''}
            {data && k === 'disputed' && data.counts.disputed > 0 ? ` (${data.counts.disputed})` : ''}
          </button>
        ))}
      </div>
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && (
        <Empty title={filter === 'pending' ? 'Nothing waiting for review' : 'Nothing here'}>
          {filter === 'pending' ? 'Evaluations with critical failures or flagged claims appear here.' : 'Try another tab.'}
        </Empty>
      )}
      {data && data.items.length > 0 && (
        <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Rep</th>
                <th>Drill</th>
                <th className="num">Score</th>
                <th>Needs attention</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.attempt_id}>
                  <td>{fmtDateTime(i.submitted_at)}</td>
                  <td>
                    <Link to={`/manager/reps/${i.learner_id}`}>{i.learner_name}</Link>
                    <div className="tiny muted">{i.learner_role === 'am' ? 'AM' : i.learner_role === 'ae' ? 'AE' : 'Manager'}</div>
                  </td>
                  <td>
                    <Link className="row-link" to={`/attempts/${i.attempt_id}`}>
                      {i.drill_title}
                    </Link>
                    <div className="row tiny" style={{ gap: 6, marginTop: 4 }}>
                      <BrandChip brand={i.brand} />
                      <span className="muted">
                        {i.persona_label}, level {i.difficulty}, {attemptLabel(i).toLowerCase()}
                      </span>
                    </div>
                  </td>
                  <td className="num">{scoreText(i)}</td>
                  <td className="small">
                    {i.pending_critical_count > 0 && (
                      <div style={{ color: 'var(--red)', fontWeight: 600 }}>
                        {i.pending_critical_count} possible critical failure{i.pending_critical_count === 1 ? '' : 's'} to decide
                      </div>
                    )}
                    {i.critical_count - i.pending_critical_count > 0 && (
                      <div style={{ color: 'var(--red)' }}>
                        {i.critical_count - i.pending_critical_count} confirmed critical failure{i.critical_count - i.pending_critical_count === 1 ? '' : 's'}
                      </div>
                    )}
                    {i.flag_count > 0 && <div>{i.flag_count} flagged item{i.flag_count === 1 ? '' : 's'} to decide</div>}
                    {i.note_count > 0 && <div className="muted">{i.note_count} note{i.note_count === 1 ? '' : 's'}</div>}
                  </td>
                  <td>
                    <ReviewBadge status={i.review_status} />
                    {i.reviewed_by_name && <div className="tiny muted">by {i.reviewed_by_name}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
