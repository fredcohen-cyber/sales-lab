import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get, post, put } from '../api.js';
import { useAuth, useMeta } from '../state.jsx';
import { Empty, ErrorNotice, Field, fmtDate, Loading, Modal, Notice, nyToday, useLoad, useToast } from '../components/ui.jsx';
import { CheckIcon, LockIcon } from '../components/Icons.jsx';
import { ItemsBuilder } from '../components/ItemsBuilder.jsx';
import { NextUpCard } from './Home.jsx';

function ItemRow({ item, learnerView }) {
  // An exercise is a conversation: one that is under way is continued, not started again.
  const replies = item.lastAttempt?.replies;
  const inProgress = item.state !== 'completed' && replies && replies.done < replies.planned;
  return (
    <li className="row-between" style={{ alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>
          {item.position}. {item.title}
        </div>
        <div className="tiny muted">
          {item.stageLabel}. Buyer: {item.personaLabel}. Levels {item.settings.difficulty}/{item.settings.skepticism}/{item.settings.depth} (difficulty, skepticism, depth).
        </div>
        {item.lastAttempt && item.state !== 'completed' && (
          <div className="tiny" style={{ marginTop: 4 }}>
            {inProgress && item.lastAttempt.runStatus !== 'running' && !['failed', 'timed_out'].includes(item.lastAttempt.runStatus) ? (
              <span className="badge badge-info">
                Conversation under way: {replies.done} of {replies.planned} replies
              </span>
            ) : item.lastAttempt.runStatus === 'running' ? (
              <span className="badge badge-info">Coaching running</span>
            ) : ['failed', 'timed_out'].includes(item.lastAttempt.runStatus) ? (
              <Link to={`/attempts/${item.lastAttempt.id}`}>Coaching did not finish: open to retry</Link>
            ) : null}
          </div>
        )}
      </div>
      <div className="row" style={{ flex: 'none' }}>
        {item.state === 'completed' && (
          <>
            <span className="badge badge-ok">
              <CheckIcon />
              Completed
            </span>
            {item.proficiency &&
              (item.proficiency.reviewStatus === 'provisional' ? (
                <span className="badge badge-warn">Waiting for manager review</span>
              ) : item.proficiency.reviewStatus === 'disputed' ? (
                <span className="badge badge-neutral">Evaluation disputed</span>
              ) : item.proficiency.metTarget ? (
                <span className="badge badge-ok">Met target ({item.proficiency.score})</span>
              ) : (
                <span className="badge badge-neutral">Not yet at target ({item.proficiency.score})</span>
              ))}
            <Link className="small" to={`/attempts/${item.completedAttemptId}`}>
              Feedback
            </Link>
          </>
        )}
        {item.state === 'available' &&
          (learnerView ? (
            inProgress ? (
              <Link className="btn btn-small" to={`/attempts/${item.lastAttempt.id}`}>
                Continue
              </Link>
            ) : (
              <Link className="btn btn-small" to={`/practice/assigned/${item.id}`}>
                Start
              </Link>
            )
          ) : (
            <span className="badge badge-info">Up next</span>
          ))}
        {item.state === 'locked' && (
          <span className="badge badge-neutral">
            <LockIcon />
            After step {item.position - 1}
          </span>
        )}
        {item.state === 'closed' && <span className="badge badge-neutral">Closed</span>}
      </div>
    </li>
  );
}

export function AssignmentCard({ a, learnerView, onCancel }) {
  return (
    <section className="panel stack-sm" aria-label={a.title}>
      <div className="row-between">
        <div>
          <h3>{a.title}</h3>
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            {!learnerView && (
              <>
                <Link to={`/manager/reps/${a.learnerId}`}>{a.learnerName}</Link>.{' '}
              </>
            )}
            {a.progress.done} of {a.progress.total} done.
            {a.dueDate ? ` Due ${fmtDate(a.dueDate)}.` : ' No due date.'}
            {a.kind === 'targeted' ? ' Targeted practice.' : ''} Assigned by {a.assignedByName} on {fmtDate(a.assignedAt)}.
          </p>
        </div>
        <div className="row">
          {a.overdue && <span className="badge badge-critical">Overdue</span>}
          {a.status === 'completed' && <span className="badge badge-ok">Completed</span>}
          {a.status === 'cancelled' && <span className="badge badge-neutral">Cancelled</span>}
          {onCancel && a.status === 'active' && (
            <button className="btn btn-secondary btn-small" onClick={() => onCancel(a)}>
              Cancel assignment
            </button>
          )}
        </div>
      </div>
      {a.note && <p className="small prewrap" style={{ margin: 0 }}>{a.note}</p>}
      {a.status === 'cancelled' && a.cancelReason && <p className="small muted">Reason: {a.cancelReason}</p>}
      <ul className="feedback-list">
        {a.items.map((it) => (
          <ItemRow key={it.id} item={it} learnerView={learnerView} />
        ))}
      </ul>
    </section>
  );
}

function MyCurriculum() {
  const { data, error, loading, reload } = useLoad(() => get('/curriculum/mine'), []);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorNotice error={error} retry={reload} />;
  const upcoming = data.active.filter((a) => !a.overdue);
  return (
    <div className="stack-lg">
      {data.next ? <NextUpCard next={data.next} /> : <Empty title="Nothing to do right now">When your manager assigns exercises, the next one appears here.</Empty>}
      {data.overdue.length > 0 && (
        <section className="stack">
          <h2>Overdue</h2>
          {data.overdue.map((a) => (
            <AssignmentCard key={a.id} a={a} learnerView />
          ))}
        </section>
      )}
      {upcoming.length > 0 && (
        <section className="stack">
          <h2>Upcoming</h2>
          {upcoming.map((a) => (
            <AssignmentCard key={a.id} a={a} learnerView />
          ))}
        </section>
      )}
      {data.completed.length > 0 && (
        <section className="stack">
          <h2>Completed</h2>
          <p className="small muted">Completing an exercise means you received coaching on it. “Met target” is shown separately.</p>
          {data.completed.map((a) => (
            <AssignmentCard key={a.id} a={a} learnerView />
          ))}
        </section>
      )}
      {data.cancelled.length > 0 && (
        <details>
          <summary className="small" style={{ cursor: 'pointer' }}>
            Cancelled assignments ({data.cancelled.length})
          </summary>
          <div className="stack" style={{ marginTop: 12 }}>
            {data.cancelled.map((a) => (
              <AssignmentCard key={a.id} a={a} learnerView />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TeamAssignments() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'active';
  const learnerId = params.get('learner') || '';
  const users = useLoad(() => get('/users'), []);
  const { data, error, loading, reload } = useLoad(() => get(`/assignments?status=${status}${learnerId ? `&learnerId=${learnerId}` : ''}`), [status, learnerId]);
  const [cancel, setCancel] = useState(null);
  const [reason, setReason] = useState('');
  const set = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  const reps = (users.data?.users || []).filter((u) => u.role !== 'manager');
  return (
    <div className="stack">
      <div className="filters">
        <div className="field">
          <label htmlFor="as-status">Status</label>
          <select id="as-status" value={status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="as-rep">Rep</label>
          <select id="as-rep" value={learnerId} onChange={(e) => set('learner', e.target.value)}>
            <option value="">Everyone</option>
            {reps.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && data.assignments.length === 0 && <Empty title="No assignments here">Use the Assign tab to give reps an ordered set of drills.</Empty>}
      {data?.assignments.map((a) => (
        <AssignmentCard key={a.id} a={a} onCancel={(x) => setCancel(x)} />
      ))}
      <Modal
        open={Boolean(cancel)}
        onClose={() => setCancel(null)}
        title="Cancel this assignment?"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCancel(null)}>
              Keep it
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                try {
                  await post(`/assignments/${cancel.id}/cancel`, { reason });
                  toast('Assignment cancelled');
                  setCancel(null);
                  setReason('');
                  reload();
                } catch (e) {
                  toast(e.message, { error: true });
                }
              }}
            >
              Cancel assignment
            </button>
          </>
        }
      >
        <p>
          “{cancel?.title}” for {cancel?.learnerName} will be closed. Completed work and coaching stay in their history.
        </p>
        <Field label="Reason (optional)" id="cancel-reason">
          <input id="cancel-reason" type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}

export const PATH_AUDIENCE_LABELS = {
  all: 'Everyone',
  new_hire: 'New hires (AEs and AMs)',
  experienced: 'Experienced reps (AEs and AMs)',
  ae: 'Account executives',
  am: 'Account managers',
  new_hire_ae: 'New-hire AEs',
  experienced_ae: 'Experienced AEs',
  new_hire_am: 'New-hire AMs',
  experienced_am: 'Experienced AMs',
};

function AssignForm({ onDone }) {
  const { meta } = useMeta();
  const toast = useToast();
  const [params] = useSearchParams();
  const users = useLoad(() => get('/users?status=active'), []);
  const drills = useLoad(() => get('/drills?status=active'), []);
  const paths = useLoad(() => get('/paths'), []);
  const targetDim = params.get('dimension') || '';
  const preLearner = params.get('learner') || '';
  const [learnerIds, setLearnerIds] = useState(preLearner ? [preLearner] : []);
  const dimLabel = meta.dimensions.find((d) => d.key === targetDim)?.label;
  const [title, setTitle] = useState(targetDim ? `Targeted practice: ${dimLabel?.toLowerCase()}` : '');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reps = (users.data?.users || []).filter((u) => u.role !== 'manager' && u.status === 'active');
  const toggle = (id) => setLearnerIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const selectRole = (role) => setLearnerIds(reps.filter((u) => u.role === role).map((u) => u.id));
  const usePath = (id) => {
    const p = paths.data.paths.find((x) => x.id === id);
    if (!p) return;
    setItems(p.items.filter((it) => it.drillStatus === 'active').map(({ drillId, persona, difficulty, skepticism, depth }) => ({ drillId, persona, difficulty, skepticism, depth })));
    if (!title) setTitle(p.name);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await post('/assignments', {
        learnerIds,
        title,
        note,
        dueDate: dueDate || null,
        kind: targetDim ? 'targeted' : 'curriculum',
        targetDimension: targetDim || null,
        items,
      });
      toast(`Assigned to ${learnerIds.length} ${learnerIds.length === 1 ? 'person' : 'people'}`);
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const failed = [users, drills, paths].find((x) => x.error && !x.data);
  if (failed) {
    return (
      <ErrorNotice
        error={failed.error}
        retry={() => {
          users.reload();
          drills.reload();
          paths.reload();
        }}
      />
    );
  }
  if (!users.data || !drills.data || !paths.data) return <Loading />;
  return (
    <form className="stack-lg" onSubmit={submit}>
      {targetDim && (
        <Notice kind="info" title={`Targeted practice for ${dimLabel?.toLowerCase()}`}>
          <p>Drills that score this dimension are listed first in the drill menus.</p>
        </Notice>
      )}
      <section className="panel stack">
        <h2 className="section-title">Who</h2>
        <div className="row">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => selectRole('ae')}>
            All AEs
          </button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => selectRole('am')}>
            All AMs
          </button>
          <button type="button" className="btn btn-quiet btn-small" onClick={() => setLearnerIds([])}>
            Clear
          </button>
        </div>
        <div className="grid-3">
          {reps.map((u) => (
            <label key={u.id} className="checkbox">
              <input type="checkbox" checked={learnerIds.includes(u.id)} onChange={() => toggle(u.id)} />
              {u.name} <span className="muted tiny">({u.role.toUpperCase()}, {u.experience === 'new_hire' ? 'new hire' : 'experienced'})</span>
            </label>
          ))}
        </div>
        {reps.length === 0 && <p className="muted small">Add AEs or AMs in User Management first.</p>}
      </section>

      <section className="panel stack">
        <h2 className="section-title">What</h2>
        <div className="form-row">
          <Field label="Title" id="as-title">
            <input id="as-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={140} />
          </Field>
          <Field label="Due date (optional)" id="as-due" hint="Overdue is judged by New York calendar days.">
            <input id="as-due" type="date" value={dueDate} min={nyToday()} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Start from a learning path" id="as-path">
            <select id="as-path" defaultValue="" onChange={(e) => usePath(e.target.value)}>
              <option value="">Choose a path…</option>
              {paths.data.paths.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Note to the rep (optional)" id="as-note">
          <textarea id="as-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
        </Field>
        <h3 className="section-title">Drills, in the order reps must complete them</h3>
        <ItemsBuilder items={items} onChange={setItems} drills={drills.data.drills} highlightDimension={targetDim} />
      </section>
      {error && <ErrorNotice error={error} />}
      <div className="row">
        <button className="btn" type="submit" disabled={busy || learnerIds.length === 0 || items.length === 0 || !title.trim()}>
          {busy ? 'Assigning…' : `Assign to ${learnerIds.length || 'selected'} ${learnerIds.length === 1 ? 'person' : 'people'}`}
        </button>
      </div>
    </form>
  );
}

function Paths() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => get('/paths'), []);
  const drills = useLoad(() => get('/drills?status=active'), []);
  const [editing, setEditing] = useState(null);
  const save = async () => {
    try {
      const body = { name: editing.name, description: editing.description, audience: editing.audience, items: editing.items };
      if (editing.id) await put(`/paths/${editing.id}`, body);
      else await post('/paths', body);
      toast('Learning path saved');
      setEditing(null);
      reload();
    } catch (e) {
      toast(e.message, { error: true });
    }
  };
  const AUD = PATH_AUDIENCE_LABELS;
  if (loading && !data) return <Loading />;
  if (error) return <ErrorNotice error={error} retry={reload} />;
  if (editing) {
    return (
      <div className="stack">
        <div className="form-row">
          <Field label="Name" id="p-name">
            <input id="p-name" type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </Field>
          <Field label="Meant for" id="p-aud">
            <select id="p-aud" value={editing.audience} onChange={(e) => setEditing({ ...editing, audience: e.target.value })}>
              {Object.entries(AUD).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description" id="p-desc">
          <textarea id="p-desc" rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
        </Field>
        {drills.error && !drills.data && <ErrorNotice error={drills.error} retry={drills.reload} />}
        {drills.data && <ItemsBuilder items={editing.items} onChange={(items) => setEditing({ ...editing, items })} drills={drills.data.drills} />}
        <div className="row">
          <button className="btn" onClick={save} disabled={!editing.name.trim() || editing.items.length === 0}>
            Save learning path
          </button>
          <button className="btn btn-secondary" onClick={() => setEditing(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="stack">
      <p className="muted">Learning paths are reusable starting points. Assigning one copies its drills, so later edits never change work already assigned.</p>
      <div>
        <button className="btn btn-secondary" onClick={() => setEditing({ name: '', description: '', audience: 'all', items: [] })}>
          New learning path
        </button>
      </div>
      {data.paths.map((p) => (
        <section key={p.id} className="panel stack-sm">
          <div className="row-between">
            <h3>{p.name}</h3>
            <div className="row">
              <span className="chip">{AUD[p.audience] || p.audience}</span>
              <button className="btn btn-quiet btn-small" onClick={() => setEditing({ ...p, items: p.items.map(({ drillId, persona, difficulty, skepticism, depth }) => ({ drillId, persona, difficulty, skepticism, depth })) })}>
                Edit
              </button>
            </div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>{p.description}</p>
          <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>
            {p.items.map((it, i) => (
              <li key={i}>
                {it.title} <span className="muted">(levels {it.difficulty}/{it.skepticism}/{it.depth})</span>
                {it.drillStatus !== 'active' && <span className="badge badge-warn" style={{ marginLeft: 6 }}>Drill not active</span>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function Curriculum() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = user.isManager ? params.get('tab') || (params.get('dimension') || params.get('learner') ? 'assign' : 'team') : 'mine';
  useEffect(() => {
    document.title = 'Curriculum · Sales Lab';
  }, []);
  const go = (t) => setParams({ tab: t }, { replace: true });
  const tabs = useMemo(
    () =>
      user.isManager
        ? [
            ['team', 'Team assignments'],
            ['assign', 'Assign'],
            ['paths', 'Learning paths'],
            ['mine', 'My curriculum'],
          ]
        : [],
    [user.isManager],
  );
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Curriculum</h1>
          <p className="sub">
            {user.isManager ? 'Assign ordered practice to reps, follow their progress, and keep reusable learning paths.' : 'Exercises your manager assigned, in order. Each one completes when you receive coaching on it.'}
          </p>
        </div>
      </div>
      {tabs.length > 0 && (
        <div className="tabs" role="tablist">
          {tabs.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k)}>
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === 'mine' && <MyCurriculum />}
      {tab === 'team' && <TeamAssignments />}
      {tab === 'assign' && <AssignForm onDone={() => go('team')} />}
      {tab === 'paths' && <Paths />}
    </div>
  );
}
