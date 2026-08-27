import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { authService } from '../services/authService';

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
    } catch (requestError) {
      setError(requestError.detail || requestError.message || 'Permintaan reset gagal.');
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
    } catch (resetError) {
      setError(resetError.detail || resetError.message || 'Password gagal diubah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-crest"><img src="/tni-au-logo.svg" alt="TNI AU Crest" /></div>
          <h1 className="auth-title">Pemulihan Password</h1>
          <p className="auth-subtitle">Dapatkan token reset untuk mengatur password baru</p>
        </div>
        <form className="auth-form" onSubmit={requestReset}>
          <div className="auth-input-group">
            <span className="material-symbols-outlined auth-input-icon">person</span>
            <input type="text" placeholder="Username atau Email" value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} required />
          </div>
          {message && <div className="success-box">{message}</div>}
          {error && <div className="error-box">{error}</div>}
          <button type="submit" className="auth-submit-btn" disabled={loading}>{loading ? 'Memproses...' : 'Buat Token Reset'}</button>
        </form>
        {resetToken && (
          <form className="auth-form" onSubmit={resetPassword}>
            <div className="auth-input-group"><input type="text" placeholder="Token Reset" value={resetToken} onChange={(e) => setResetToken(e.target.value)} required /></div>
            <div className="auth-input-group"><input type="password" placeholder="Password Baru" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required /></div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>Simpan Password Baru</button>
          </form>
        )}
        <div className="auth-footer"><NavLink to="/login">Kembali ke halaman login</NavLink></div>
        <div className="auth-bottom-bar"></div>
      </div>
    </div>
  );
}
