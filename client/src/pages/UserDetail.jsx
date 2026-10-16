import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get, patch, post } from '../api.js';
import { useAuth } from '../state.jsx';
import { ErrorNotice, Field, fmtDateTime, fmtRelative, Loading, Modal, Notice, useLoad, useToast } from '../components/ui.jsx';
import { LinkResult, ROLE_LABEL, SetupBadge } from './Users.jsx';

function describe(e) {
  const d = e.details || {};
  if (d.changes) {
    return Object.entries(d.changes)
      .map(([k, v]) => `${k}: ${ROLE_LABEL[v.from] || v.from} to ${ROLE_LABEL[v.to] || v.to}`)
      .join('; ');
  }
  if (d.purpose) return `${d.purpose === 'reset' ? 'Password reset' : 'Setup'} link`;
  if (d.reason) return String(d.reason).replace(/_/g, ' ');
  if (typeof d.count === 'number') return `${d.count} affected`;
  if (d.title) return d.title;
  if (d.sessionsRevoked !== undefined) return `${d.sessionsRevoked} sessions and ${d.linksRevoked ?? 0} links revoked`;
  return '';
}

function device(ua) {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  return `${browser}${os ? ` on ${os}` : ''}`;
}

export function UserDetail() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => get(`/users/${id}`), [id]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [link, setLink] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({ name: data.user.name, email: data.user.email, role: data.user.role, experience: data.user.experience });
      document.title = `${data.user.name} · Sales Lab`;
    }
  }, [data]);

  if (error && !data) return <div className="page"><ErrorNotice error={error} retry={reload} /></div>;
  if (!data || !form) return <div className="page"><Loading /></div>;
  const u = data.user;
  const isSelf = u.id === me.id;
  const ownerLocked = u.isOwner && !isSelf;
  const dirty = form.name !== u.name || form.email !== u.email || form.role !== u.role || form.experience !== u.experience;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = {};
      for (const k of ['name', 'email', 'role', 'experience']) if (form[k] !== u[k]) body[k] = form[k];
      await patch(`/users/${u.id}`, body);
      toast('Changes saved');
      reload({ quiet: true });
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn, message) => {
    setBusy(true);
    try {
      const r = await fn();
      if (message) toast(message);
      await reload({ quiet: true });
      return r;
    } catch (err) {
      toast(err.message, { error: true });
      return null;
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const createLink = async () => {
    const r = await act(() => post(`/users/${u.id}/links`, {}), null);
    if (r) setLink(r.link);
  };

  return (
    <div className="page page-narrow">
      <Link className="crumb" to="/users">
        Back to User Management
      </Link>
      <div className="page-head">
        <div>
          <h1>{u.name}</h1>
          <p className="sub">
            {u.email}. {ROLE_LABEL[u.role]}
            {u.isOwner ? ', workspace owner' : ''}. Added {fmtDateTime(u.createdAt)}.
          </p>
        </div>
        <div className="row">
          <SetupBadge status={u.setupStatus} />
          {u.role !== 'manager' && (
            <Link className="btn btn-secondary btn-small" to={`/manager/reps/${u.id}`}>
              Performance
            </Link>
          )}
        </div>
      </div>

      <div className="stack-lg">
        <section className="panel">
          <form className="stack" onSubmit={save}>
            <h2 className="section-title">Profile</h2>
            {ownerLocked && <Notice kind="info">Only the owner can change the owner account.</Notice>}
            {formError && <Notice kind="critical">{formError.message}</Notice>}
            <div className="form-row">
              <Field label="Full name" id="ud-name">
                <input id="ud-name" type="text" value={form.name} disabled={ownerLocked} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Company email" id="ud-email" hint="Changing it keeps all history. They sign in with the new address.">
                <input id="ud-email" type="email" value={form.email} disabled={ownerLocked} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Role" id="ud-role" hint={u.isOwner ? 'The owner is always a manager.' : isSelf ? 'Another manager must change your role.' : undefined}>
                <select id="ud-role" value={form.role} disabled={u.isOwner || isSelf} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="ae">Account executive</option>
                  <option value="am">Account manager</option>
                  <option value="manager">Manager</option>
                </select>
              </Field>
              <Field label="Experience" id="ud-exp">
                <select id="ud-exp" value={form.experience} disabled={ownerLocked} onChange={(e) => setForm({ ...form, experience: e.target.value })}>
                  <option value="new_hire">New hire</option>
                  <option value="experienced">Experienced</option>
                </select>
              </Field>
            </div>
            <div>
              <button className="btn" type="submit" disabled={!dirty || saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel stack">
          <h2 className="section-title">Sign-in access</h2>
          <dl className="kv">
            <dt>Status</dt>
            <dd>{u.status === 'active' ? 'Active' : `Deactivated ${fmtDateTime(u.deactivatedAt)}`}</dd>
            <dt>Password</dt>
            <dd>{u.hasPassword ? 'Set by them' : 'Not set yet'}</dd>
            <dt>Pending link</dt>
            <dd>{u.pendingLink ? `${u.pendingLink.purpose === 'reset' ? 'Reset' : 'Setup'} link, expires ${fmtDateTime(u.pendingLink.expiresAt)}` : 'None'}</dd>
            <dt>Last sign-in</dt>
            <dd>{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Never'}</dd>
            <dt>Active sessions</dt>
            <dd>{u.activeSessions}</dd>
          </dl>
          {data.signIn?.paused && (
            <Notice kind="warn" title="Sign-in is paused after failed attempts">
              <p>
                {data.signIn.recentFailures} failed sign-in attempt{data.signIn.recentFailures === 1 ? '' : 's'} in the last 15 minutes. If these were their own typos, or
                someone else guessing at the account, you can allow sign-in again now. A new password from a reset link also lifts the pause.
              </p>
              <button className="btn btn-small" disabled={busy} onClick={() => act(() => post(`/users/${u.id}/sign-in/clear`, {}), 'Sign-in allowed again')}>
                Allow sign-in now
              </button>
            </Notice>
          )}
          {link && <LinkResult link={link} name={u.name} />}
          <div className="row">
            {u.status === 'active' && !ownerLocked && (
              <button className="btn btn-secondary" disabled={busy} onClick={createLink}>
                {u.hasPassword ? 'Create password reset link' : u.pendingLink ? 'Create a new setup link' : 'Create setup link'}
              </button>
            )}
            {u.pendingLink && !ownerLocked && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => act(() => post(`/users/${u.id}/links/revoke`, {}), 'Unused links revoked').then(() => setLink(null))}>
                Revoke unused link
              </button>
            )}
            {u.activeSessions > 0 && !ownerLocked && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => setConfirm('signout')}>
                Sign out of all sessions
              </button>
            )}
            {u.status === 'active' && !u.isOwner && !isSelf && (
              <button className="btn btn-danger" disabled={busy} onClick={() => setConfirm('deactivate')}>
                Deactivate
              </button>
            )}
            {u.status === 'deactivated' && (
              <button className="btn" disabled={busy} onClick={() => act(() => post(`/users/${u.id}/reactivate`, {}), 'Account reactivated')}>
                Reactivate
              </button>
            )}
          </div>
          {(u.isOwner || isSelf) && u.status === 'active' && (
            <p className="tiny muted" style={{ margin: 0 }}>
              {u.isOwner ? 'The owner account cannot be deactivated.' : 'You cannot deactivate your own account.'}
            </p>
          )}
          {u.status === 'deactivated' && (
            <p className="tiny muted" style={{ margin: 0 }}>
              Reactivating does not restore old sessions or links. They sign in with their existing password, or you can create a reset link.
            </p>
          )}
        </section>

        <section className="stack-sm">
          <h2 className="section-title">Active sessions</h2>
          {data.sessions.length === 0 ? (
            <p className="muted small">No active sessions.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Signed in</th>
                    <th>Last active</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {device(s.user_agent)}
                        <div className="tiny muted">{s.ip}</div>
                      </td>
                      <td>{fmtDateTime(s.created_at)}</td>
                      <td>{fmtRelative(s.last_seen_at)}</td>
                      <td>{fmtDateTime(s.expires_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="stack-sm">
          <h2 className="section-title">Password links</h2>
          {data.links.length === 0 ? (
            <p className="muted small">No links created yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Kind</th>
                    <th>State</th>
                    <th>Created by</th>
                  </tr>
                </thead>
                <tbody>
                  {data.links.map((l) => (
                    <tr key={l.id}>
                      <td>{fmtDateTime(l.created_at)}</td>
                      <td>{l.purpose === 'reset' ? 'Password reset' : 'Setup'}</td>
                      <td>
                        {l.state === 'used' && `Used ${fmtDateTime(l.used_at)}`}
                        {l.state === 'pending' && `Unused, expires ${fmtDateTime(l.expires_at)}`}
                        {l.state === 'expired' && 'Expired unused'}
                        {l.state === 'revoked' && `Revoked (${l.revoked_reason})`}
                      </td>
                      <td>{l.created_by_name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="stack-sm">
          <h2 className="section-title">Recent account activity</h2>
          {data.activity.length === 0 ? (
            <p className="muted small">No activity yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>What</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activity.map((e) => (
                    <tr key={e.id}>
                      <td>{fmtDateTime(e.created_at)}</td>
                      <td>
                        {e.label}
                        {describe(e) && <div className="tiny muted">{describe(e)}</div>}
                      </td>
                      <td>{e.actor_name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Modal
        open={confirm === 'deactivate'}
        onClose={() => setConfirm(null)}
        title={`Deactivate ${u.name}?`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={() => act(() => post(`/users/${u.id}/deactivate`, {}), 'Account deactivated')}>
              Deactivate
            </button>
          </>
        }
      >
        <p>They are signed out everywhere immediately and any unused password link stops working. Their training history is kept, and you can reactivate the account later.</p>
      </Modal>
      <Modal
        open={confirm === 'signout'}
        onClose={() => setConfirm(null)}
        title="Sign out of all sessions?"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className="btn" disabled={busy} onClick={() => act(() => post(`/users/${u.id}/sessions/revoke`, {}), 'Signed out of all sessions')}>
              Sign out everywhere
            </button>
          </>
        }
      >
        <p>
          {isSelf ? 'Your other sessions end now; this one stays signed in.' : `${u.name} is signed out on every device and needs to sign in again.`}
        </p>
      </Modal>
    </div>
  );
}
