import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Brand, Wordmark } from './Brand.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { useAuth, useMeta } from '../state.jsx';
import { api } from '../api.js';
import {
  BookIcon,
  ChevronRightIcon,
  ClipboardIcon,
  CoachIcon,
  DashboardIcon,
  HomeIcon,
  ListIcon,
  LogoutIcon,
  MenuIcon,
  PadIcon,
  PhoneIcon,
  ProgressIcon,
  SettingsIcon,
  UsersIcon,
} from './Icons.jsx';

const ROLE = { ae: 'Account executive', am: 'Account manager', manager: 'Manager' };

// Where the person is, for the top bar.
const SECTIONS = [
  ['/practice', 'Practice Studio'],
  ['/attempts', 'Practice Studio'],
  ['/voice', 'Practice Studio-Voice'],
  ['/drills', 'Question Bank'],
  ['/questions', 'Question Bank'],
  ['/curriculum', 'Curriculum'],
  ['/progress', 'My Progress'],
  ['/knowledge', 'Knowledge Library'],
  ['/manager', 'Manager Dashboard'],
  ['/coaching', 'Team Coaching'],
  ['/users', 'User Management'],
  ['/settings', 'Workspace Settings'],
];
function sectionOf(pathname) {
  if (pathname === '/') return 'Home';
  return SECTIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] || 'Sales Lab';
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export function Shell() {
  const { user, logout } = useAuth();
  const { meta } = useMeta();
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

  // Closing on click as well covers a link to the page already open, which changes no path.
  const link = (to, label, Icon, extra = null, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : undefined)} onClick={() => setOpen(false)}>
      <Icon />
      <span>{label}</span>
      {extra}
    </NavLink>
  );
  const coachingOn = Boolean(meta?.coaching?.configured);

  return (
    <div className={`shell${open ? ' nav-open' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className="sidebar" id="sidebar">
        <div className="sidebar-brand">
          <Brand />
        </div>
        <nav className="nav" aria-label="Main">
          <div className="nav-caption">Practice</div>
          {link('/', 'Home', HomeIcon, null, true)}
          {link('/practice', 'Practice Studio', PadIcon)}
          {link('/voice', 'Practice Studio-Voice', PhoneIcon)}
          {link('/curriculum', 'Curriculum', ListIcon)}
          {link('/progress', 'My Progress', ProgressIcon)}
          {link('/knowledge', 'Knowledge Library', BookIcon)}
          {user?.isManager && (
            <>
              <div className="nav-group-label">Managing</div>
              {link('/manager', 'Manager Dashboard', DashboardIcon)}
              {link('/coaching', 'Team Coaching', CoachIcon, pending ? <span className="count" aria-label={`${pending} pending reviews`}>{pending}</span> : null)}
              {link('/questions', 'Question Bank', ClipboardIcon)}
              {link('/users', 'User Management', UsersIcon)}
              {link('/settings', 'Workspace Settings', SettingsIcon)}
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="avatar small" aria-hidden="true">
              {initials(user?.name)}
            </span>
            <div>
              <strong>{user?.name}</strong>
              <span>{ROLE[user?.role]}</span>
              <span>{user?.email}</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn btn-secondary btn-small menu-btn" aria-expanded={open} aria-controls="sidebar" onClick={() => setOpen((v) => !v)}>
            <MenuIcon />
            Menu
          </button>
          <Link to="/" className="topbar-brand" aria-label="Sales Lab home">
            <Wordmark />
          </Link>
          <div className="topbar-location">
            <span>Sales Lab</span>
            <ChevronRightIcon />
            <strong>{sectionOf(location.pathname)}</strong>
          </div>
          <div className="topbar-actions">
            <span className="coach-status" title={coachingOn ? 'Answers are coached and scored.' : 'No AI key is set up, so answers are saved as unscored practice.'}>
              <span className={`status-dot ${coachingOn ? 'on' : 'off'}`} aria-hidden="true" />
              <span className="status-text">{coachingOn ? 'AI coaching on' : 'Unscored practice only'}</span>
            </span>
            <button className="btn btn-secondary btn-small" onClick={signOut} disabled={signingOut}>
              <LogoutIcon />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>
        <main className="content" id="main" tabIndex={-1}>
          {/* Keyed by page so moving to another page clears a rendering error; the menu stays usable. */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
