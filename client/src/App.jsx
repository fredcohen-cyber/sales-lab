import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth, useMeta } from './state.jsx';
import { Shell } from './components/Shell.jsx';
import { Loading, Notice } from './components/ui.jsx';
import { Login } from './pages/Login.jsx';
import { SetPassword } from './pages/SetPassword.jsx';
import { Home } from './pages/Home.jsx';
import { PracticeStudio } from './pages/PracticeStudio.jsx';
import { DrillRunner } from './pages/DrillRunner.jsx';
import { AttemptPage } from './pages/AttemptPage.jsx';
import { Curriculum } from './pages/Curriculum.jsx';
import { Progress } from './pages/Progress.jsx';
import { Knowledge } from './pages/Knowledge.jsx';
import { SourcePage } from './pages/SourcePage.jsx';
import { SourceEditor } from './pages/SourceEditor.jsx';
import { ManagerDashboard } from './pages/ManagerDashboard.jsx';
import { RepReport } from './pages/RepReport.jsx';
import { TeamCoaching } from './pages/TeamCoaching.jsx';
import { Users } from './pages/Users.jsx';
import { UserDetail } from './pages/UserDetail.jsx';
import { Settings } from './pages/Settings.jsx';
import { DrillEditor } from './pages/DrillEditor.jsx';

function RequireAuth({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page"><Loading /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}

function ManagerOnly({ children }) {
  const { user } = useAuth();
  if (!user?.isManager) {
    return (
      <div className="page">
        <h1>Managers only</h1>
        <p className="lede">This page is for managers. Your own practice and progress are in the menu.</p>
      </div>
    );
  }
  return children;
}

// Never a dead end: if the app's settings cannot load, say so and offer a retry and a way out.
function MetaGate({ children }) {
  const { meta, metaError, reloadMeta } = useMeta();
  const { logout } = useAuth();
  if (meta) return children;
  if (metaError) {
    return (
      <div className="auth">
        <div className="auth-card stack">
          <Notice kind="critical" title="Sales Lab could not load">
            <p>{metaError.message || 'The server did not respond.'} Your saved work is not affected.</p>
          </Notice>
          <div className="row">
            <button className="btn" onClick={() => reloadMeta()}>
              Try again
            </button>
            <button className="btn btn-secondary" onClick={() => logout()}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }
  return <div className="page"><Loading /></div>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password/:token" element={<SetPassword />} />
      <Route
        element={
          <RequireAuth>
            <MetaGate>
              <Shell />
            </MetaGate>
          </RequireAuth>
        }
      >
        <Route index element={<Home />} />
        <Route path="practice" element={<PracticeStudio />} />
        <Route path="practice/drill/:drillId" element={<DrillRunner />} />
        <Route path="practice/assigned/:itemId" element={<DrillRunner />} />
        <Route path="attempts/:id" element={<AttemptPage />} />
        <Route path="curriculum" element={<Curriculum />} />
        <Route path="progress" element={<Progress />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="knowledge/new" element={<ManagerOnly><SourceEditor /></ManagerOnly>} />
        <Route path="knowledge/:id" element={<SourcePage />} />
        <Route path="knowledge/:id/edit" element={<ManagerOnly><SourceEditor /></ManagerOnly>} />
        <Route path="manager" element={<ManagerOnly><ManagerDashboard /></ManagerOnly>} />
        <Route path="manager/reps/:id" element={<ManagerOnly><RepReport /></ManagerOnly>} />
        <Route path="coaching" element={<ManagerOnly><TeamCoaching /></ManagerOnly>} />
        <Route path="users" element={<ManagerOnly><Users /></ManagerOnly>} />
        <Route path="users/:id" element={<ManagerOnly><UserDetail /></ManagerOnly>} />
        <Route path="settings" element={<ManagerOnly><Settings /></ManagerOnly>} />
        <Route path="drills/new" element={<ManagerOnly><DrillEditor /></ManagerOnly>} />
        <Route path="drills/:id/edit" element={<ManagerOnly><DrillEditor /></ManagerOnly>} />
        <Route
          path="*"
          element={
            <div className="page">
              <h1>Page not found</h1>
              <p className="lede">That address does not match a page in Sales Lab.</p>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
