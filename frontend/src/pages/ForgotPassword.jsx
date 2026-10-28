import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { authService } from '../services/authService';
import AuthShell, { AuthField } from '../components/AuthShell';

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
    <AuthShell title="Atur ulang password" note="Masukkan username atau email terdaftar, lalu pakai token yang muncul untuk membuat password baru.">
      <form className="auth-form" onSubmit={requestReset} noValidate>
        <AuthField id="fp-user" label="Username atau email" placeholder="523819 atau nama@tni-au.mil.id" required value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} />

        {message && <div className="auth-alert auth-alert--success" role="status">{message}</div>}
        {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}

        <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading}>
          {loading ? <><span className="auth-spinner" aria-hidden="true" />Memproses…</> : 'Buat token reset'}
        </button>
      </form>

      {resetToken && (
        <form className="auth-form" onSubmit={resetPassword} noValidate>
          <AuthField id="fp-token" label="Token reset" required value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
          <AuthField id="fp-new" label="Password baru" type="password" placeholder="Minimal 8 karakter" hint="Minimal 8 karakter." minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button type="submit" className="auth-submit" disabled={loading}>Simpan password baru</button>
        </form>
      )}

      <p className="auth-swap"><NavLink to="/login" className="auth-link">Kembali ke login</NavLink></p>
    </AuthShell>
  );
}
