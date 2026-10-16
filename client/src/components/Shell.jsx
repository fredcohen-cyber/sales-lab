import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Brand } from './Brand.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { useAuth } from '../state.jsx';
import { api } from '../api.js';
import {
  BookIcon,
  CoachIcon,
  DashboardIcon,
  HomeIcon,
  ListIcon,
  LogoutIcon,
  MenuIcon,
  PadIcon,
  ProgressIcon,
  SettingsIcon,
  UsersIcon,
} from './Icons.jsx';

const ROLE = { ae: 'Account executive', am: 'Account manager', manager: 'Manager' };

export function Shell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!user?.isManager) return;
    let alive = true;
    api('/reviews?filter=pending')
      .then((d) => alive && setPending(d.counts.pending))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, location.pathname]);

  const signOut = async () => {
    setSigningOut(true);
    await logout();
  };

  const link = (to, label, Icon, extra = null, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
      <Icon />
      <span>{label}</span>
      {extra}
    </NavLink>
  );

  return (
    <div className={`shell${open ? ' nav-open' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Brand />
        <button className="btn btn-secondary btn-small" aria-expanded={open} aria-controls="sidebar" onClick={() => setOpen((v) => !v)}>
          <MenuIcon />
          Menu
        </button>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className="sidebar" id="sidebar">
        <Brand />
        <nav className="nav" aria-label="Main">
          {link('/', 'Home', HomeIcon, null, true)}
          {link('/practice', 'Practice Studio', PadIcon)}
          {link('/curriculum', 'Curriculum', ListIcon)}
          {link('/progress', 'My Progress', ProgressIcon)}
          {link('/knowledge', 'Knowledge Library', BookIcon)}
          {user?.isManager && (
            <>
              <div className="nav-group-label">Managing</div>
              {link('/manager', 'Manager Dashboard', DashboardIcon)}
              {link('/coaching', 'Team Coaching', CoachIcon, pending ? <span className="count" aria-label={`${pending} pending reviews`}>{pending}</span> : null)}
              {link('/users', 'User Management', UsersIcon)}
              {link('/settings', 'Workspace Settings', SettingsIcon)}
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <strong>{user?.name}</strong>
            <span>{ROLE[user?.role]}</span>
            <br />
            <span>{user?.email}</span>
          </div>
          <button className="btn btn-secondary btn-block" onClick={signOut} disabled={signingOut}>
            <LogoutIcon />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
      <main className="main" id="main" tabIndex={-1}>
        {/* Keyed by page so moving to another page clears a rendering error; the menu stays usable. */}
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
