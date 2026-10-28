import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { NavLink } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ onMenuToggle }) {
  const { user, getInitials, logout } = useUser();
  const [clock, setClock] = useState({ time: '--:--', date: '' });
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
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); logout(); }}>Keluar</button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

    </>
  );
}
