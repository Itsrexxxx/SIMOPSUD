import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const { user, getInitials, logout } = useUser();
  const [clock, setClock] = useState({ time: '--:--', date: '' });

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

  // Get role display name
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
    <nav className="navbar">
      <div className="navbar-left">
        <div>
          <div className="navbar-title">SIMKO</div>
          <div className="navbar-subtitle">Predictive Operations Intelligence | TNI AU Command Center</div>
        </div>
        <div className="navbar-clock-panel">
          <div className="navbar-clock">{clock.time} WIB</div>
          <div className="navbar-clock-date">{clock.date}</div>
        </div>
      </div>

      <div className="navbar-right">
        <button type="button" className="icon-button" aria-label="Notifikasi">
          <span className="material-symbols-outlined">notifications</span>
          <span className="notification-dot" />
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
        <button type="button" className="navbar-link" onClick={logout}>Keluar</button>
      </div>
    </nav>
  );
}
