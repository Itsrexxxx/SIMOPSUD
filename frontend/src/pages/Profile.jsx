import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { authService } from '../services/authService';

export default function Profile() {
  const { user, updateUser } = useUser();
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    service_unit: user?.service_unit || '',
  });
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await authService.updateProfile(profile);
      updateUser(updated);
      setMessage('Profil berhasil diperbarui.');
    } catch (requestError) {
      setError(requestError.detail || requestError.message || 'Profil gagal diperbarui.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await authService.changePassword(passwords.old_password, passwords.new_password);
      setPasswords({ old_password: '', new_password: '' });
      setMessage(response.message || 'Password berhasil diperbarui.');
    } catch (requestError) {
      setError(requestError.detail || requestError.message || 'Password gagal diperbarui.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-accent">PENGATURAN</span> PROFIL</h1>
          <p className="page-subtitle">Kelola identitas personel, satuan kerja, dan keamanan akun.</p>
        </div>
        <span className="badge badge-aman">{user?.role || 'User'}</span>
      </div>
      {message && <div className="success-box">{message}</div>}
      {error && <div className="error-box">{error}</div>}
      <div className="profile-settings-grid">
        <form className="card" onSubmit={saveProfile}>
          <div className="card-header"><div><div className="card-title">Identitas Personel</div><div className="text-muted text-sm">Informasi ini digunakan pada profil dan administrasi sistem.</div></div></div>
          <div className="form-group"><label className="form-label">Nama Lengkap</label><input className="form-control" value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Username</label><input className="form-control" value={user?.username || ''} disabled /></div>
          <div className="form-group"><label className="form-label">NIP</label><input className="form-control" value={user?.nip || ''} disabled /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></div>
          <div className="form-group"><label className="form-label">Satuan Kerja</label><input className="form-control" value={profile.service_unit} onChange={(event) => setProfile({ ...profile, service_unit: event.target.value })} required /></div>
          <button className="btn btn-primary" disabled={saving}>Simpan Profil</button>
        </form>
        <form className="card" onSubmit={changePassword}>
          <div className="card-header"><div><div className="card-title">Keamanan Akun</div><div className="text-muted text-sm">Ganti password secara berkala untuk menjaga akses sistem.</div></div></div>
          <div className="form-group"><label className="form-label">Password Lama</label><input className="form-control" type="password" value={passwords.old_password} onChange={(event) => setPasswords({ ...passwords, old_password: event.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Password Baru</label><input className="form-control" type="password" minLength={8} value={passwords.new_password} onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })} required /></div>
          <button className="btn btn-secondary" disabled={saving}>Perbarui Password</button>
        </form>
      </div>
    </div>
  );
}