import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ nip: '', username: '', email: '', password: '', confirmPassword: '' });
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
    try {
      // TODO: panggil API registrasi jika backend auth tersedia
      navigate('/login');
    } catch (error) {
      alert('Gagal membuat akun. Periksa kembali data yang dimasukkan.');
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
