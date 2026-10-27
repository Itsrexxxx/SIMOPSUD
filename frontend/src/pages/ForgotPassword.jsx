import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { authService } from '../services/authService';
import ThemeToggle from '../components/ThemeToggle';

export default function ForgotPassword() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await authService.forgotPassword(usernameOrEmail);
      setResetToken(response.reset_token || '');
      setMessage(response.message);
    } catch (e) {
      setError(e.detail || e.message || 'Permintaan reset gagal.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authService.resetPassword(resetToken, newPassword);
      setMessage(response.message);
      setResetToken('');
      setNewPassword('');
    } catch (e) {
      setError(e.detail || e.message || 'Password gagal diubah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--ultra">
      <div className="auth-minimal">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <div className="auth-minimal__brand">
          <div className="auth-minimal__crest"><img src="/logo_au.png" alt="TNI AU" /></div>
          <div className="auth-minimal__word">
            <div className="auth-minimal__kicker">TNI ANGKATAN UDARA</div>
            <div className="auth-minimal__logo">SIMOPSUD</div>
            <div className="auth-minimal__sub">Operasi Penerbangan Udara</div>
          </div>
        </div>

        <div className="auth-card" role="main" aria-labelledby="forgot-title">
          <div className="auth-card__header">
            <h1 id="forgot-title" className="auth-card__title">Lupa password</h1>
            <p className="auth-card__subtitle">Masukkan username atau email terdaftar untuk buat token reset.</p>
          </div>

          <form className="auth-form" onSubmit={requestReset} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="fp-user">Username atau email</label>
              <div className="auth-input-group">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">person</span>
                <input id="fp-user" type="text" placeholder="Username atau email" value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} required />
              </div>
            </div>

            {message && <div className="auth-alert auth-alert--success" role="status"><span className="material-symbols-outlined" aria-hidden="true">check_circle</span><span>{message}</span></div>}
            {error && <div className="auth-alert auth-alert--error" role="alert"><span className="material-symbols-outlined" aria-hidden="true">error</span><span>{error}</span></div>}

            <button type="submit" className="auth-submit-btn" disabled={loading} aria-busy={loading}>
              {loading ? <><span className="auth-spinner" aria-hidden="true" /><span>Memproses…</span></> : 'Buat token reset'}
            </button>
          </form>

          {resetToken && (
            <form className="auth-form" onSubmit={resetPassword} style={{ paddingTop: 0 }} noValidate>
              <div className="auth-divider"><span>atur password baru</span></div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="fp-token">Token reset</label>
                <div className="auth-input-group">
                  <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">vpn_key</span>
                  <input id="fp-token" type="text" placeholder="Token reset" value={resetToken} onChange={(e) => setResetToken(e.target.value)} required />
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="fp-new">Password baru</label>
                <div className="auth-input-group">
                  <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">lock</span>
                  <input id="fp-new" type="password" placeholder="Minimal 8 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
                </div>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>Simpan password baru</button>
            </form>
          )}

          <div className="auth-footer-inline" style={{ padding: '0 28px 24px' }}>
            <NavLink to="/login" className="auth-link">Kembali ke login</NavLink>
          </div>
        </div>

        <div className="auth-minimal__foot">© Mabesau</div>
      </div>
    </div>
  );
}
