import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { CopyField, Empty, ErrorNotice, Field, fmtDate, fmtRelative, fmtUntil, Loading, Modal, Notice, useLoad } from '../components/ui.jsx';
import { PlusIcon } from '../components/Icons.jsx';

export const SETUP_LABEL = {
  active: ['badge-ok', 'Password set'],
  invited: ['badge-info', 'Setup link sent'],
  link_expired: ['badge-warn', 'Setup link expired'],
  not_invited: ['badge-warn', 'No setup link'],
  reset_pending: ['badge-info', 'Reset link pending'],
  deactivated: ['badge-neutral', 'Deactivated'],
};
export const ROLE_LABEL = { ae: 'Account executive', am: 'Account manager', manager: 'Manager' };

export function SetupBadge({ status }) {
  const [cls, label] = SETUP_LABEL[status] || ['badge-neutral', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function LinkResult({ link, name }) {
  const expires = new Date(link.expiresAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div className="stack-sm">
      <Notice kind="ok" title={link.purpose === 'reset' ? 'Password reset link ready' : 'Setup link ready'}>
        <p>
          Send this private link to {name} yourself, by text or email. It works once and expires {expires} (New York time). Sales Lab does not email it, and you never see their password.
        </p>
      </Notice>
      <CopyField value={link.url} label="Password link" />
      <p className="tiny muted" style={{ margin: 0 }}>
        This link is shown only now. If it gets lost, create a new one; that cancels this one.
      </p>
    </div>
  );
}

function AddPerson({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'ae', experience: 'new_hire' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const close = () => {
    setForm({ name: '', email: '', role: 'ae', experience: 'new_hire' });
    setResult(null);
    setError(null);
    onClose();
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await post('/users', form);
      setResult(r);
      onCreated();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={result ? `${result.user.name} was added` : 'Add a person'}
      footer={
        result ? (
          <button className="btn" onClick={close}>
            Done
          </button>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
            <button className="btn" form="add-person" type="submit" disabled={busy}>
              {busy ? 'Adding…' : 'Add and create setup link'}
            </button>
          </>
        )
      }
    >
      {result ? (
        <LinkResult link={result.link} name={result.user.name} />
      ) : (
        <form id="add-person" className="stack" onSubmit={submit}>
          {error && <Notice kind="critical">{error.message}</Notice>}
          <Field label="Full name" id="ap-name">
            <input id="ap-name" type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Company email" id="ap-email" hint="Must end in @omnizant.com or @ravenly.com.">
            <input id="ap-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <div className="form-row">
            <Field label="Role" id="ap-role">
              <select id="ap-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ae">Account executive</option>
                <option value="am">Account manager</option>
                <option value="manager">Manager</option>
              </select>
            </Field>
            <Field label="Experience" id="ap-exp">
              <select id="ap-exp" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })}>
                <option value="new_hire">New hire</option>
                <option value="experienced">Experienced</option>
              </select>
            </Field>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function Users() {
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useLoad(() => get('/users'), []);
  useEffect(() => {
    document.title = 'User Management · Sales Lab';
  }, []);
  const f = (k) => params.get(k) || '';
  const set = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  const users = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.users || []).filter(
      (u) =>
        (!t || u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t)) &&
        (!f('role') || u.role === f('role')) &&
        (!f('status') || u.status === f('status')) &&
        (!f('setup') || u.setupStatus === f('setup')),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, params]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>User Management</h1>
          <p className="sub">Only people you add here can sign in, and only with an omnizant.com or ravenly.com address. New people choose their own password from a private link you send them.</p>
        </div>
        <button className="btn" onClick={() => setAdding(true)}>
          <PlusIcon />
          Add a person
        </button>
      </div>
      <div className="filters" role="search">
        <div className="field">
          <label htmlFor="u-q">Search</label>
          <input id="u-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" />
        </div>
        <div className="field">
          <label htmlFor="u-role">Role</label>
          <select id="u-role" value={f('role')} onChange={(e) => set('role', e.target.value)}>
            <option value="">All roles</option>
            <option value="ae">Account executives</option>
            <option value="am">Account managers</option>
            <option value="manager">Managers</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="u-status">Account</label>
          <select id="u-status" value={f('status')} onChange={(e) => set('status', e.target.value)}>
            <option value="">Active and deactivated</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="u-setup">Setup</label>
          <select id="u-setup" value={f('setup')} onChange={(e) => set('setup', e.target.value)}>
            <option value="">Any</option>
            {Object.entries(SETUP_LABEL).map(([k, [, label]]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && users.length === 0 && <Empty title="No one matches">Change the search or filters.</Empty>}
      {data && users.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Setup</th>
                <th>Last sign-in</th>
                <th>Last practice</th>
                <th className="num">Active sessions</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link className="row-link" to={`/users/${u.id}`}>
                      {u.name}
                    </Link>
                    {u.isOwner && <span className="chip" style={{ marginLeft: 6 }}>Owner</span>}
                    <div className="tiny muted">{u.email}</div>
                  </td>
                  <td>
                    {ROLE_LABEL[u.role]}
                    <div className="tiny muted">{u.experience === 'new_hire' ? 'New hire' : 'Experienced'}</div>
                  </td>
                  <td>
                    <SetupBadge status={u.setupStatus} />
                    {u.pendingLink && <div className="tiny muted">Expires {fmtUntil(u.pendingLink.expiresAt)}</div>}
                  </td>
                  <td>{fmtRelative(u.lastLoginAt)}</td>
                  <td>{fmtRelative(u.lastPracticeAt)}</td>
                  <td className="num">{u.activeSessions}</td>
                  <td>{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AddPerson open={adding} onClose={() => setAdding(false)} onCreated={reload} />
    </div>
  );
}
