import { useCallback, useEffect, useMemo, useState } from 'react';

const AUTH_KEY = 'kriedko_admin_auth';

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth) {
  try {
    if (!auth) {
      localStorage.removeItem(AUTH_KEY);
      return;
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  } catch {}
}

export const useAuth = () => {
  const [auth, setAuth] = useState(() => getStoredAuth());

  useEffect(() => {
    // keep state in sync with storage (basic)
    const handle = () => setAuth(getStoredAuth());
    window.addEventListener('storage', handle);
    return () => window.removeEventListener('storage', handle);
  }, []);

  const isAuthenticated = useMemo(() => !!auth?.isAuthenticated, [auth]);

  const login = useCallback(async (username, password) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: String(username || '').trim(), password: String(password || '').trim() })
      });
      if (!res.ok) return { success: false };
      const payload = {
        isAuthenticated: true,
        username: String(username || '').trim(),
        loginAt: new Date().toISOString(),
      };
      setStoredAuth(payload);
      setAuth(payload);
      return { success: true };
    } catch (_) {
      return { success: false };
    }
  }, []);

  const logout = useCallback(async () => {
    try { await fetch('/api/logout', { method: 'POST' }).catch(() => {}); } catch {}
    setStoredAuth(null);
    setAuth(null);
  }, []);

  return {
    auth,
    isAuthenticated,
    login,
    logout,
  };
};

export const requireAuth = () => !!getStoredAuth()?.isAuthenticated;
