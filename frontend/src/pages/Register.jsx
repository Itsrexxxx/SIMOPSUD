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
    if (form.password !== form.confirmPassword) {
      alert('Kata sandi tidak cocok.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.register({
        nip: form.nip,
        username: form.username,
        email: form.email,
        full_name: form.full_name,
        service_unit: form.service_unit,
        password: form.password,
      });
      navigate('/login');
    } catch (error) {
      setError(error.detail || error.message || 'Gagal membuat akun.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-register">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-crest">
            <img src="/tni-au-logo.svg" alt="TNI AU Crest" />
          </div>
          <h1 className="auth-title">Registrasi SIMKO</h1>
          <p className="auth-subtitle">Daftarkan akun perwira untuk sistem operasional TNI AU</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* NIP Input */}
          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">badge</span>
            <input
              type="text"
              placeholder="NIP Perwira"
              value={form.nip}
              onChange={(e) => setForm((prev) => ({ ...prev, nip: e.target.value }))}
              required
            />
          </div>

          {/* Username Input */}
          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">person</span>
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
          </div>

          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">badge</span>
            <input type="text" placeholder="Nama Lengkap" value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} required />
          </div>

          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">account_balance</span>
            <input type="text" placeholder="Satuan Kerja" value={form.service_unit} onChange={(e) => setForm((prev) => ({ ...prev, service_unit: e.target.value }))} required />
          </div>

          {/* Email Input */}
          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">mail</span>
            <input
              type="email"
              placeholder="Email Resmi"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          {/* Password Input */}
          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">lock</span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Kata Sandi"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
            <button
              type="button"
              className="auth-input-icon-right"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              <span className="material-symbols-outlined">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {/* Confirm Password Input */}
          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">lock_check</span>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Konfirmasi Kata Sandi"
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              required
            />
            <button
              type="button"
              className="auth-input-icon-right"
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex={-1}
            >
              <span className="material-symbols-outlined">
                {showConfirm ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}

          {/* Submit Button */}
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Memproses...' : 'Daftar Akun'}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          <NavLink to="/login">Sudah punya akun? Masuk sekarang</NavLink>
        </div>

        {/* Bottom Bar */}
        <div className="auth-bottom-bar"></div>
      </div>
    </div>
  );
}
