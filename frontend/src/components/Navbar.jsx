import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { NavLink } from 'react-router-dom';
import { Modal } from './UI';

export default function Navbar({ onMenuToggle }) {
  const { user, getInitials, logout } = useUser();
  const [clock, setClock] = useState({ time: '--:--', date: '' });
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const wib = now.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'Asia/Jakarta',
      });
      const date = now.toLocaleDateString('id-ID', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });
      setClock({ time: wib, date });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleDisplay = (role) => {
    const roleMap = {
      'Admin': 'Administrator Sistem',
      'Administrator': 'Administrator Sistem',
      'Operator': 'Operator Sistem',
      'Analyst': 'Operator Sistem',
      'Pimpinan': 'Pimpinan / Commander',
      'Executive': 'Pimpinan / Commander',
    };
    return roleMap[role] || role || 'Officer';
  };

  return (
    <>
      <nav className="navbar" aria-label="Bar atas">
        <div className="navbar-left">
          {onMenuToggle && (
            <button type="button" aria-label="Buka menu" onClick={onMenuToggle} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden">
              <span className="material-symbols-outlined" aria-hidden="true">menu</span>
            </button>
          )}
          <div className="min-w-0">
            <div className="navbar-title">SIMOPSUD</div>
            <div className="navbar-subtitle hidden sm:block truncate max-w-[28ch] lg:max-w-none">Predictive Operations Intelligence | TNI AU Command Center</div>
          </div>
          <div className="navbar-clock-panel hidden md:block">
            <div className="navbar-clock">{clock.time} WIB</div>
            <div className="navbar-clock-date">{clock.date}</div>
          </div>
        </div>

        <div className="navbar-right">
          <button type="button" className="icon-button" aria-label="Notifikasi">
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
            <span className="notification-dot" aria-hidden="true" />
          </button>
          <div className="profile-card">
            <div className="profile-meta">
              <p className="profile-name">{user?.full_name || 'User'}</p>
              <p className="profile-role">{getRoleDisplay(user?.role)}</p>
            </div>
            <div className="profile-avatar">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} />
              ) : (
                <div className="avatar-initials">
                  {getInitials()}
                </div>
              )}
            </div>
          </div>
          <NavLink className="navbar-link" to="/profile">Profil</NavLink>
          <button type="button" className="navbar-link" onClick={() => setShowLogout(true)}>Keluar</button>
        </div>
      </nav>

      {showLogout && (
        <Modal
          title="Keluar dari SIMOPSUD?"
          onClose={() => setShowLogout(false)}
          footer={
            <>
              <button type="button" className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => setShowLogout(false)}>Batal</button>
              <button type="button" className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onClick={() => { setShowLogout(false); logout(); }}>Keluar</button>
            </>
          }
        >
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <span className="material-symbols-outlined" aria-hidden="true">logout</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Sesi akan diakhiri</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Anda akan keluar dari SIMOPSUD dan perlu masuk kembali untuk melanjutkan operasi. Pastikan pekerjaan tersimpan.</p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
