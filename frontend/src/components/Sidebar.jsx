import { NavLink } from 'react-router-dom';

const menuItems = [
  { path: '/', icon: 'dashboard', label: 'Dashboard Utama', section: 'OPERASI' },
  { path: '/pesawat', icon: 'flight', label: 'Inventaris Pesawat', section: 'DATA OPERASI' },
  { path: '/pangkalan', icon: 'location_on', label: 'Pangkalan & Logistik', section: 'DATA OPERASI' },
  { path: '/skenario', icon: 'timeline', label: 'Skenario Operasi', section: 'ANALISIS' },
  { path: '/simulasi', icon: 'psychology', label: 'AI Prediksi Otomatis', section: 'ANALISIS' },
  { path: '/laporan', icon: 'report_problem', label: 'Laporan Mitigasi', section: 'LAPORAN' },
];

export default function Sidebar() {
  let lastSection = '';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-emblem">
            <img src="/logo_au.png" alt="TNI AU Crest" />
          </div>
          <div>
            <div className="logo-text-main">SIMKO</div>
            <div className="logo-text-sub">TNI Angkatan Udara</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const showSection = item.section !== lastSection;
          if (showSection) lastSection = item.section;
          return (
            <div key={item.path}>
              {showSection && <div className="nav-section-label">{item.section}</div>}
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="server-status">
          <span className="status-dot"></span>
          <span>Server Backend: Aktif</span>
        </div>
        <div className="footer-meta">API: http://localhost:8000</div>
      </div>
    </aside>
  );
}
