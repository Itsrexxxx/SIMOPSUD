import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function Register() {
  const [form, setForm] = useState({ nip: '', username: '', email: '', full_name: '', service_unit: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Kata sandi tidak cocok.'); return; }
    setLoading(true);
    setError('');
    try {
      await authService.register({ nip: form.nip, username: form.username, email: form.email, full_name: form.full_name, service_unit: form.service_unit, password: form.password });
      navigate('/login');
    } catch (e) { setError(e.detail || e.message || 'Gagal membuat akun.'); }
    setLoading(false);
  };

  return (
    <div className="auth-page auth-page--ultra">
      <div className="auth-minimal auth-minimal--wide">
        <div className="auth-minimal__brand">
          <div className="auth-minimal__crest"><img src="/logo_au.png" alt="TNI AU" /></div>
          <div className="auth-minimal__word">
            <div className="auth-minimal__kicker">TNI ANGKATAN UDARA</div>
            <div className="auth-minimal__logo">SIMOPSUD</div>
            <div className="auth-minimal__sub">Operasi Penerbangan Udara</div>
          </div>
        </div>

        <div className="auth-card" role="main" aria-labelledby="register-title">
          <div className="auth-card__header">
            <h1 id="register-title" className="auth-card__title">Buat akun</h1>
            <p className="auth-card__subtitle">Akun menunggu persetujuan Admin.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-grid-2">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-nip">NIP</label>
                <div className="auth-input-group">
                  <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">badge</span>
                  <input id="reg-nip" type="text" placeholder="NIP Perwira" value={form.nip} onChange={(e) => setForm((p) => ({ ...p, nip: e.target.value }))} required />
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-user">Username</label>
                <div className="auth-input-group">
                  <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">person</span>
                  <input id="reg-user" type="text" placeholder="Username" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-name">Nama lengkap</label>
              <div className="auth-input-group">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">badge</span>
                <input id="reg-name" type="text" placeholder="Nama Lengkap" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} required />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-unit">Satuan kerja</label>
              <div className="auth-input-group">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">account_balance</span>
                <input id="reg-unit" type="text" placeholder="Skadron 11 / Lanud Halim" value={form.service_unit} onChange={(e) => setForm((p) => ({ ...p, service_unit: e.target.value }))} required />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-email">Email</label>
              <div className="auth-input-group">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">mail</span>
                <input id="reg-email" type="email" placeholder="nama@tni-au.mil.id" autoComplete="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-pass">Kata sandi</label>
              <div className="auth-input-group">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">lock</span>
                <input id="reg-pass" type={showPassword ? 'text' : 'password'} placeholder="Minimal 8 karakter" autoComplete="new-password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
                <button type="button" className="auth-input-icon-right" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'} tabIndex={-1}><span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-confirm">Konfirmasi</label>
              <div className="auth-input-group">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">lock_check</span>
                <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} placeholder="Ulangi kata sandi" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} required />
                <button type="button" className="auth-input-icon-right" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Sembunyikan' : 'Tampilkan'} tabIndex={-1}><span className="material-symbols-outlined">{showConfirm ? 'visibility_off' : 'visibility'}</span></button>
              </div>
            </div>

            {error && <div className="auth-alert auth-alert--error" role="alert"><span className="material-symbols-outlined">error</span><span>{error}</span></div>}

            <button type="submit" className="auth-submit-btn" disabled={loading} aria-busy={loading}>
              {loading ? <><span className="auth-spinner" aria-hidden="true" /><span>Memproses…</span></> : 'Daftar'}
            </button>

            <div className="auth-footer-inline"><span>Sudah punya akun?</span><NavLink to="/login" className="auth-link">Masuk</NavLink></div>
          </form>
        </div>

        <div className="auth-minimal__foot">© Mabesau</div>
      </div>
    </div>
  );
}
