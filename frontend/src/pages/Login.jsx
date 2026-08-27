import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useUser } from '../context/UserContext';

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
    } catch (error) {
      setError(error.detail || error.message || 'Gagal masuk. Periksa kembali username dan password.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-crest">
            <img src="/logo_au.png" alt="TNI AU Crest" />
          </div>
          <h1 className="auth-title">SIMKO - TNI AU</h1>
          <p className="auth-subtitle">Sistem Analisa Prediktif Operasi Udara</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-intro">
            <strong>Masuk ke sistem</strong>
            <span>Gunakan username atau NIP yang telah terdaftar.</span>
          </div>
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

          {error && <div className="error-box">{error}</div>}

          {/* Submit Button */}
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          <NavLink to="/forgot-password">Lupa password?</NavLink>
          <span className="auth-footer-divider" />
          <NavLink to="/register">Ajukan registrasi akun baru</NavLink>
        </div>

        {/* Bottom Bar */}
        <div className="auth-bottom-bar"></div>
      </div>
    </div>
  );
}
