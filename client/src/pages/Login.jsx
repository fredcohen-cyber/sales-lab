import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Brand } from '../components/Brand.jsx';
import { Notice } from '../components/ui.jsx';
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
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand">
          <Brand to="/login" large />
        </div>
        <form className="auth-form stack" onSubmit={submit} noValidate>
          <h1>Sign in</h1>
          {params.get('expired') && !error && <Notice kind="info">Your session ended. Sign in again to continue.</Notice>}
          {params.get('signedout') && !error && <Notice kind="ok">You are signed out.</Notice>}
          {params.get('reset') && !error && <Notice kind="ok">Password saved. Sign in with your new password.</Notice>}
          {error && <Notice kind="critical">{error}</Notice>}
          <div className="field">
            <label htmlFor="email">Company email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@omnizant.com" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-block" type="submit" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-help">New here or locked out? Ask your manager for a private setup link.</p>
      </div>
    </div>
  );
}
