import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import AuthShell, { AuthField, AuthReveal } from '../components/AuthShell';

export default function Register() {
  const [form, setForm] = useState({ nrp: '', username: '', email: '', full_name: '', service_unit: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Kata sandi tidak cocok.'); return; }
    setLoading(true);
    setError('');
    try {
      // API masih menamai kolomnya `nip`; di sistem ini isinya NRP
      await authService.register({ nip: form.nrp, username: form.username, email: form.email || undefined, full_name: form.full_name, service_unit: form.service_unit, password: form.password });
      navigate('/login');
    } catch (e) { setError(e.detail || e.message || 'Gagal membuat akun.'); }
    setLoading(false);
  };

  return (
    <AuthShell title="Ajukan akun" note="Akun aktif setelah disetujui Admin.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-grid-2">
          <AuthField id="reg-nrp" label="NRP" placeholder="Nomor NRP" inputMode="numeric" required value={form.nrp} onChange={set('nrp')} />
          <AuthField id="reg-user" label="Username" placeholder="username" autoComplete="username" required value={form.username} onChange={set('username')} />
        </div>

        <AuthField id="reg-name" label="Nama lengkap" placeholder="Nama lengkap" autoComplete="name" required value={form.full_name} onChange={set('full_name')} />
        <AuthField id="reg-unit" label="Satuan kerja" placeholder="Contoh: Lanud Halim Perdanakusuma" required value={form.service_unit} onChange={set('service_unit')} />
        <AuthField id="reg-email" label="Email (opsional)" type="email" placeholder="nama@tni-au.mil.id" autoComplete="email" value={form.email} onChange={set('email')} />

        <AuthField
          id="reg-pass"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Buat password"
          autoComplete="new-password"
          hint="Min. 12 karakter, huruf besar + angka + simbol."
          required
          value={form.password}
          onChange={set('password')}
          trailing={<AuthReveal shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
        />
        <AuthField
          id="reg-confirm"
          label="Ulangi password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Ulangi password"
          autoComplete="new-password"
          required
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
        />

        {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}

        <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading}>
          {loading ? <><span className="auth-spinner" aria-hidden="true" />Memproses…</> : 'Daftar'}
        </button>

        <p className="auth-swap">
          Sudah punya akun?
          <NavLink to="/login" className="auth-link">Masuk</NavLink>
        </p>
      </form>
    </AuthShell>
  );
}
