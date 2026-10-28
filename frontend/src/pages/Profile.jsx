import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { authService } from '../services/authService';
import { PageShell } from '../components/PageShell';

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
    } catch (e) {
      setError(e.detail || e.message || 'Profil gagal diperbarui.');
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
    } catch (e) {
      setError(e.detail || e.message || 'Password gagal diperbarui.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageShell title="Pengaturan Profil" subtitle="Kelola identitas personel, satuan kerja, dan keamanan akun." actions={<span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-bold tracking-wide text-sky-700">{user?.role || 'User'}</span>}>
      <div>
        {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-2">
          <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={saveProfile}>
            <div className="mb-5">
              <div className="text-sm font-bold uppercase tracking-wide text-blue-900">Identitas Personel</div>
              <div className="text-xs text-slate-500 mt-1">Informasi ini digunakan pada profil dan administrasi sistem.</div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Lengkap</label>
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Username</label>
                <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600" value={user?.username || ''} disabled />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">NRP</label>
                <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600" value={user?.nip || ''} disabled />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Satuan Kerja</label>
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={profile.service_unit} onChange={(e) => setProfile({ ...profile, service_unit: e.target.value })} required />
              </div>
            </div>
            <button type="submit" disabled={saving} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan Profil'}</button>
          </form>

          <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={changePassword}>
            <div className="mb-5">
              <div className="text-sm font-bold uppercase tracking-wide text-blue-900">Keamanan Akun</div>
              <div className="text-xs text-slate-500 mt-1">Ganti password secara berkala untuk menjaga akses sistem.</div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password Lama</label>
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" type="password" value={passwords.old_password} onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password Baru</label>
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" type="password" minLength={8} value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} required />
              </div>
              <p className="text-xs text-slate-500">Minimal 8 karakter. Gunakan kombinasi huruf, angka, dan simbol.</p>
            </div>
            <button type="submit" disabled={saving} className="mt-6 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{saving ? 'Memproses…' : 'Perbarui Password'}</button>
          </form>
        </div>
      </div>
    </PageShell>
    </div>
  );
}
