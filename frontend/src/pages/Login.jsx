import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '', role: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      // TODO: panggil API login jika backend auth tersedia
      navigate('/');
    } catch (error) {
      alert('Gagal masuk. Periksa kembali username dan password.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-crest">
            <img src="/tni-au-logo.svg" alt="TNI AU Crest" />
          </div>
          <h1 className="auth-title">SIMKO - TNI AU</h1>
          <p className="auth-subtitle">Sistem Analisa Prediktif Titik Kritis Operasi Udara</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Username Input */}
          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">person</span>
            <input
              type="text"
              placeholder="Username / NIP"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
          </div>

          {/* Password Input */}
          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">lock</span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
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

          {/* Role Dropdown */}
          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">admin_panel_settings</span>
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              required
            >
              <option value="">Pilih Hak Akses</option>
              <option value="administrator">Administrator</option>
              <option value="analyst">Analyst</option>
              <option value="executive">Executive</option>
            </select>
            <span className="auth-input-icon-right dropdown-arrow">
              <span className="material-symbols-outlined">arrow_drop_down</span>
            </span>
          </div>

          {/* Submit Button */}
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          <NavLink to="/register">Belum terdaftar? Ajukan Registrasi Perwira Baru</NavLink>
        </div>

        {/* Bottom Bar */}
        <div className="auth-bottom-bar"></div>
      </div>
    </div>
  );
}
