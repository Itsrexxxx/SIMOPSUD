import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { NavLink } from 'react-router-dom';
import { Modal } from './UI';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ onMenuToggle }) {
  const { user, getInitials, logout } = useUser();
  const [clock, setClock] = useState({ time: '--:--', date: '' });
  const [showLogout, setShowLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const wib = now.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });
      const date = now.toLocaleDateString('id-ID', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });
      setClock({ time: wib, date });
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, []);

  const roleDisplay = {
    Admin: 'Administrator Sistem',
    Administrator: 'Administrator Sistem',
    Operator: 'Operator Sistem',
    Analyst: 'Operator Sistem',
    Pimpinan: 'Pimpinan',
    Executive: 'Pimpinan',
  }[user?.role] || user?.role || 'Officer';

  return (
    <>
      <nav className="navbar" aria-label="Bar atas">
        <div className="navbar-left">
          {onMenuToggle && (
            <button type="button" aria-label="Buka menu" onClick={onMenuToggle} className="navbar-menu">
              <span className="material-symbols-outlined" aria-hidden="true">menu</span>
            </button>
          )}
          <span className="navbar-clock">{clock.time} WIB</span>
          <span className="navbar-date">{clock.date}</span>
        </div>

        <div className="navbar-right">
          <ThemeToggle />
          <div className="user-menu">
            <button
              type="button"
              className="user-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="user-avatar" aria-hidden="true">{getInitials()}</span>
              <span className="user-name">{user?.full_name || 'User'}</span>
              <span className="material-symbols-outlined user-chevron" aria-hidden="true">expand_more</span>
            </button>

            {menuOpen && (
              <>
                <button type="button" className="user-menu-scrim" aria-label="Tutup menu pengguna" onClick={() => setMenuOpen(false)} />
                <div className="user-popover" role="menu">
                  <p className="user-popover-head">
                    {user?.full_name || 'User'}
                    <span>{roleDisplay}</span>
                  </p>
                  <NavLink to="/profile" role="menuitem" onClick={() => setMenuOpen(false)}>Profil</NavLink>
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setShowLogout(true); }}>Keluar</button>
                </div>
              </>
            )}
          </div>
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
