import { NavLink } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useMemo } from 'react';

const menuItems = [
  { path: '/', icon: 'dashboard', label: 'Dashboard Utama', section: 'OPERASI' },
  { path: '/pesawat', icon: 'flight', label: 'Inventaris Pesawat', section: 'DATA OPERASI' },
  { path: '/tipe-pesawat', icon: 'category', label: 'Tipe Pesawat', section: 'DATA OPERASI' },
  { path: '/pangkalan', icon: 'location_on', label: 'Pangkalan & Logistik', section: 'DATA OPERASI' },
  { path: '/misi-penerbangan', icon: 'flight_takeoff', label: 'Prediksi ETA & Misi', section: 'OPERASI' },
  { path: '/situational-overview', icon: 'map', label: 'Situational Overview', section: 'OPERASI' },
  { path: '/audit-trail', icon: 'receipt_long', label: 'Audit Trail', section: 'ADMINISTRASI' },
  { path: '/users', icon: 'manage_accounts', label: 'Manajemen Pengguna', section: 'ADMINISTRASI' },
];

const permissionByPath = {
  '/': 'dashboard',
  '/pesawat': 'aircraft',
  '/tipe-pesawat': 'aircraft',
  '/pangkalan': 'airbase',
  '/misi-penerbangan': 'missions',
  '/situational-overview': 'dashboard',
  '/users': 'users',
};

function isAdmin(user) {
  return ['Admin', 'Administrator'].includes(user?.role);
}

export default function Sidebar({ open = false, onClose }) {
  const { user } = useUser();
  const visibleItems = useMemo(() => menuItems.filter((item) => {
    if (isAdmin(user)) return true;
    if (user?.permissions?.length) return user.permissions.includes(permissionByPath[item.path]);
    return user?.role !== 'Executive' || !['/pesawat', '/pangkalan'].includes(item.path);
  }), [user]);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const it of visibleItems) {
      if (!m.has(it.section)) m.set(it.section, []);
      m.get(it.section).push(it);
    }
    return [...m.entries()];
  }, [visibleItems]);

  const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Navigasi utama">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-emblem">
            <img src="/logo_au.png" alt="TNI AU Crest" />
          </div>
          <div>
            <div className="logo-text-main">SIMOPSUD</div>
            <div className="logo-text-sub">TNI Angkatan Udara</div>
          </div>
        </div>
        {onClose && (
          <button type="button" aria-label="Tutup menu" onClick={onClose} className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Menu">
        {grouped.map(([section, items]) => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="server-status">
          <span className="status-dot" aria-hidden="true"></span>
          <span>Server Backend: Aktif</span>
        </div>
        <div className="footer-meta" title={apiUrl}>API: {apiUrl}</div>
      </div>
    </aside>
  );
}
