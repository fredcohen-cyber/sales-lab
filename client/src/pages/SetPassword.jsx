import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Brand } from '../components/Brand.jsx';
import { Loading, Notice } from '../components/ui.jsx';
import { api, post } from '../api.js';

export function SetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState(null);
  const [linkError, setLinkError] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Set your password · Sales Lab';
    api(`/auth/link/${encodeURIComponent(token)}`, { quiet401: true })
      .then((d) => setLink(d.link))
      .catch((e) => setLinkError(e));
  }, [token]);

  const tooShort = password.length > 0 && password.length < 10;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError('Use at least 10 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      const r = await post(`/auth/link/${encodeURIComponent(token)}`, { password }, { quiet401: true });
      navigate(`/login?reset=1&email=${encodeURIComponent(r.email)}`, { replace: true });
    } catch (err) {
      setError(err.message);
      if (err.status === 410) setLinkError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand">
          <Brand to="/login" large />
        </div>
        <div className="auth-form stack">
          {!link && !linkError && <Loading label="Checking your link…" />}
          {linkError && (
            <>
              <h1>This link can’t be used</h1>
              <Notice kind="warn">{linkError.message}</Notice>
              <Link className="btn btn-secondary btn-block" to="/login">
                Go to sign in
              </Link>
            </>
          )}
          {link && !linkError && (
            <form className="stack" onSubmit={submit} noValidate>
              <h1>{link.purpose === 'reset' ? 'Choose a new password' : 'Set your password'}</h1>
              <p className="muted small">
                For {link.name} ({link.email}). This private link works once.
              </p>
              {error && <Notice kind="critical">{error}</Notice>}
              <input type="email" autoComplete="username" value={link.email} readOnly hidden />
              <div className="field">
                <label htmlFor="pw">New password</label>
                <input id="pw" type="password" autoComplete="new-password" value={password} aria-invalid={tooShort} onChange={(e) => setPassword(e.target.value)} />
                <span className={tooShort ? 'error-text' : 'hint'}>At least 10 characters. A short phrase works well.</span>
              </div>
              <div className="field">
                <label htmlFor="pw2">Confirm password</label>
                <input id="pw2" type="password" autoComplete="new-password" value={confirm} aria-invalid={mismatch} onChange={(e) => setConfirm(e.target.value)} />
                {mismatch && <span className="error-text">The passwords do not match yet.</span>}
              </div>
              <button className="btn btn-block" type="submit" disabled={busy || !password || !confirm}>
                {busy ? 'Saving…' : 'Save password'}
              </button>
              <p className="tiny muted">Saving signs this account out of any other open sessions.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
