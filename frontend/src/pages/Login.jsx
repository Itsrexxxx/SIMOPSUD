import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useUser } from '../context/UserContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useUser();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authService.login(form.username, form.password);
      login(response.user, response.access_token);
      navigate('/');
    } catch (e) {
      setError(e.detail || e.message || 'Gagal masuk. Periksa kembali username dan password.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page auth-page--ultra">
      <div className="auth-minimal">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <div className="auth-minimal__brand" aria-label="SIMOPSUD">
          <div className="auth-minimal__crest"><img src="/logo_au.png" alt="TNI AU" /></div>
          <div className="auth-minimal__word">
            <div className="auth-minimal__kicker">TNI ANGKATAN UDARA</div>
            <div className="auth-minimal__logo">SIMOPSUD</div>
            <div className="auth-minimal__sub">Operasi Penerbangan Udara</div>
          </div>
        </div>

        <div className="auth-card" role="main" aria-labelledby="login-title">
          <div className="auth-card__header">
            <h1 id="login-title" className="auth-card__title">Masuk</h1>
            <p className="auth-card__subtitle">Gunakan username atau NIP terdaftar.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-user">Username / NIP</label>
              <div className="auth-input-group">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">person</span>
                <input id="login-user" type="text" placeholder="Username / NIP" autoComplete="username" autoFocus value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label" htmlFor="login-pass">Password</label>
                <NavLink to="/forgot-password" className="auth-link-inline">Lupa password?</NavLink>
              </div>
              <div className="auth-input-group">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">lock</span>
                <input id="login-pass" type={showPassword ? 'text' : 'password'} placeholder="Password" autoComplete="current-password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
                <button type="button" className="auth-input-icon-right" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'} tabIndex={-1}>
                  <span className="material-symbols-outlined" aria-hidden="true">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && <div className="auth-alert auth-alert--error" role="alert"><span className="material-symbols-outlined" aria-hidden="true">error</span><span>{error}</span></div>}

            <button type="submit" className="auth-submit-btn" disabled={loading} aria-busy={loading}>
              {loading ? <><span className="auth-spinner" aria-hidden="true" /><span>Memproses…</span></> : 'Masuk'}
            </button>

            <div className="auth-footer-inline">
              <span>Belum punya akun?</span>
              <NavLink to="/register" className="auth-link">Daftar</NavLink>
            </div>
          </form>
        </div>

        <div className="auth-minimal__foot">© Mabesau · Predictive Operations Intelligence</div>
      </div>
    </div>
  );
}
