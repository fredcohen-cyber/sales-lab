import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, post, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);
const MetaContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null });

  const refresh = useCallback(async () => {
    try {
      const data = await api('/auth/me', { quiet401: true, timeoutMs: 15000 });
      setState({ loading: false, user: data.user });
      return data.user;
    } catch {
      setState({ loading: false, user: null });
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    // Any 401 means the session ended (expired, revoked, deactivated): go to the sign-in page.
    setUnauthorizedHandler(() => {
      setState({ loading: false, user: null });
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/set-password')) {
        window.location.assign('/login?expired=1');
      }
    });
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await post('/auth/login', { email, password }, { quiet401: true });
    setState({ loading: false, user: data.user });
    return data.user;
  }, []);

  // Sign-out never hangs: the server call is short and the browser leaves for /login whatever happens.
  const logout = useCallback(async () => {
    try {
      await post('/auth/logout', {}, { timeoutMs: 6000, quiet401: true });
    } catch {
      /* the cookie is cleared server-side when reachable; we leave either way */
    }
    setState({ loading: false, user: null });
    window.location.replace('/login?signedout=1');
  }, []);

  return <AuthContext.Provider value={{ ...state, refresh, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

export function MetaProvider({ children }) {
  const { user } = useAuth();
  const [meta, setMeta] = useState(null);
  const load = useCallback(async () => {
    if (!user) return;
    try {
      setMeta(await api('/meta'));
    } catch {
      setMeta(null);
    }
  }, [user]);
  useEffect(() => {
    load();
  }, [load]);
  return <MetaContext.Provider value={{ meta, reloadMeta: load }}>{children}</MetaContext.Provider>;
}
export const useMeta = () => useContext(MetaContext);
