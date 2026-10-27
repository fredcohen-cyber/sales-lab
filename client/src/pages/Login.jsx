import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Brand } from '../components/Brand.jsx';
import { Notice, PasswordInput } from '../components/ui.jsx';
import { ArrowRightIcon, CheckIcon, LockIcon } from '../components/Icons.jsx';
import { useAuth } from '../state.jsx';

export function Login() {
  const { user, loading, login } = useAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Sign in · Sales Lab';
  }, []);

  if (!loading && user) {
    const next = params.get('next');
    return <Navigate to={next && next.startsWith('/') && !next.startsWith('//') ? next : '/'} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <Brand to="/login" large />
      <div className="auth-card">
        <section className="auth-form" aria-labelledby="signin-title">
          <span className="login-lock" aria-hidden="true">
            <LockIcon />
          </span>
          <h1 id="signin-title">Welcome to Sales Lab.</h1>
          <p className="auth-lead">Sign in with your company email and password.</p>
          <form onSubmit={submit} noValidate>
            {params.get('expired') && !error && <Notice kind="info">Your session ended. Sign in again to continue.</Notice>}
            {params.get('signedout') && !error && <Notice kind="ok">You are signed out.</Notice>}
            {params.get('reset') && !error && <Notice kind="ok">Password saved. Sign in with your new password.</Notice>}
            {error && <Notice kind="critical">{error}</Notice>}
            <div className="field">
              <label htmlFor="email">Company email</label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@omnizant.com"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-large btn-block" type="submit" disabled={busy || !email || !password}>
              {busy ? 'Signing in…' : 'Sign in'}
              {!busy && <ArrowRightIcon size={17} />}
            </button>
          </form>
          <p className="auth-note">
            First time here or forgot your password?
            <br />
            Ask your manager for a password setup link.
          </p>
          <div className="auth-private">
            <CheckIcon />
            <span>Your training history stays with your account.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
