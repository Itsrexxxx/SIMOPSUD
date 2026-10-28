import { NavLink } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useMemo } from 'react';

const menuItems = [
  { path: '/', icon: 'dashboard', label: 'Dashboard', section: 'Operasi' },
  { path: '/misi-penerbangan', icon: 'flight_takeoff', label: 'Prediksi ETA & Misi', section: 'Operasi' },
  { path: '/situational-overview', icon: 'map', label: 'Situational Overview', section: 'Operasi' },
  { path: '/pesawat', icon: 'flight', label: 'Pesawat', section: 'Data' },
  { path: '/tipe-pesawat', icon: 'category', label: 'Tipe Pesawat', section: 'Data' },
  { path: '/pangkalan', icon: 'location_on', label: 'Pangkalan & Logistik', section: 'Data' },
  { path: '/audit-trail', icon: 'receipt_long', label: 'Audit Trail', section: 'Administrasi' },
  { path: '/users', icon: 'manage_accounts', label: 'Pengguna', section: 'Administrasi' },
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

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Navigasi utama">
      <div className="sidebar-brand">
        <img className="brand-mark" src="/logo_au.png" alt="Lambang TNI AU" />
        <div className="brand-text">
          <div className="brand-name">SIMOPSUD</div>
          <div className="brand-sub">TNI Angkatan Udara</div>
        </div>
        {onClose && (
          <button type="button" aria-label="Tutup menu" onClick={onClose} className="sidebar-close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Menu">
        {grouped.map(([section, items]) => (
          <div className="nav-group" key={section}>
            <p className="nav-group-label">{section}</p>
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
