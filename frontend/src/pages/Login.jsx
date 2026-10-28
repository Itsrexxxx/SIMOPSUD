import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useUser } from '../context/UserContext';
import AuthShell, { AuthField, AuthReveal } from '../components/AuthShell';

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
      setError(e.detail || e.message || 'Gagal masuk. Periksa username/NRP dan password.');
    }
    setLoading(false);
  };

  return (
    <AuthShell title="Masuk ke SIMOPSUD" note="Gunakan username atau NRP yang terdaftar.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="login-user"
          label="Username atau NRP"
          placeholder="Username atau NRP"
          autoComplete="username"
          required
          value={form.username}
          onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
        />

        <AuthField
          id="login-pass"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Masukkan password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          action={<NavLink to="/forgot-password" className="auth-link">Lupa password?</NavLink>}
          trailing={<AuthReveal shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
        />

        {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}

        <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading}>
          {loading ? <><span className="auth-spinner" aria-hidden="true" />Memproses…</> : 'Masuk'}
        </button>

        <p className="auth-swap">
          Belum punya akun?
          <NavLink to="/register" className="auth-link">Ajukan akun</NavLink>
        </p>
      </form>
    </AuthShell>
  );
}
