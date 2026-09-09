import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const UserContext = createContext(null);

/* Sliding session: token diperpanjang otomatis selama user aktif — tidak logout saat dipakai */
const REFRESH_THRESHOLD_MIN = 60 // refresh jika sisa < 60 menit
const REFRESH_POLL_MS = 5 * 60 * 1000 // cek tiap 5 menit
const IDLE_LOGOUT_MIN = 120 // logout hanya jika benar-benar idle 2 jam (bukan 15 menit)
const IDLE_MS = IDLE_LOGOUT_MIN * 60 * 1000

function getExpMs(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : 0;
  } catch { return 0; }
}

async function tryRefresh() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const expMs = getExpMs(token);
  const remainingMin = expMs ? (expMs - Date.now()) / 60000 : 999;
  if (remainingMin > REFRESH_THRESHOLD_MIN) return;
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.access_token) {
      localStorage.setItem('token', data.access_token);
      if (data?.user) localStorage.setItem('user', JSON.stringify(data.user));
    }
  } catch {}
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const idleTimer = useRef(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (storedUser && token) {
        const expMs = getExpMs(token);
        if (expMs && expMs < Date.now()) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } else {
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (err) {
      console.error('Failed to load user from storage:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sliding refresh polling — selama tab terbuka & user login, token diperpanjang otomatis
  useEffect(() => {
    if (!user) return;
    tryRefresh();
    const id = setInterval(tryRefresh, REFRESH_POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') tryRefresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [user]);

  // Idle logout — hanya jika benar-benar tidak ada aktivitas lama (2 jam), bukan 15 menit
  useEffect(() => {
    if (!user) return;
    const reset = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch {}
        setUser(null);
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }, IDLE_MS);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(idleTimer.current); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, [user]);

  const login = useCallback((userData, token) => {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error('Failed to save user data:', err);
      setError('Failed to save user data');
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  }, []);

  const updateUser = useCallback((userData) => {
    try {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (err) {
      console.error('Failed to update user:', err);
      setError('Failed to update user data');
    }
  }, []);

  const hasRole = useCallback((role) => user?.role === role || (role === 'Admin' && user?.role === 'Administrator') || (role === 'Operator' && user?.role === 'Analyst') || (role === 'Pimpinan' && user?.role === 'Executive'), [user]);
  const hasAnyRole = useCallback((roles) => roles.includes(user?.role), [user]);
  const isApproved = useCallback(() => user?.is_approved === true, [user]);
  const getDisplayName = useCallback(() => user?.full_name || 'User', [user]);
  const getInitials = useCallback(() => {
    if (!user?.full_name) return 'U';
    return user.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }, [user]);

  const value = { user, loading, error, login, logout, updateUser, hasRole, hasAnyRole, isApproved, getDisplayName, getInitials, isAuthenticated: !!user };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
}
