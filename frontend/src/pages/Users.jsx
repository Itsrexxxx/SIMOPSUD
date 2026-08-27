import { useEffect, useState } from 'react';
import { userAdminService } from '../services/authService';

const roles = ['Admin', 'Operator', 'Pimpinan'];
const permissionOptions = [
  ['dashboard', 'Dashboard'], ['aircraft', 'Data Pesawat'], ['airbase', 'Data Pangkalan'],
  ['scenarios', 'Skenario'], ['ai', 'Analisis AI'], ['users', 'Manajemen Pengguna'],
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draftServiceUnit, setDraftServiceUnit] = useState('');
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', full_name: '', nip: '', email: '', service_unit: '', password: '', role: 'Operator', permissions: ['dashboard'] });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userAdminService.getAllUsers();
      setUsers(response || []);
      setError('');
    } catch (requestError) {
      setError(requestError.detail || requestError.message || 'Data pengguna gagal dimuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const updateUser = async (user, changes) => {
    try {
      await userAdminService.approveUser(user.id, changes);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.detail || requestError.message || 'Perubahan pengguna gagal disimpan.');
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setDraftServiceUnit(user.service_unit || '');
    setDraftPermissions(user.permissions || []);
  };

  const saveServiceUnit = async (user) => {
    if (!draftServiceUnit.trim()) return;
    await updateUser(user, { service_unit: draftServiceUnit.trim(), permissions: draftPermissions });
    setEditingId(null);
  };

  const createUser = async (event) => {
    event.preventDefault();
    try {
      await userAdminService.createUser(newUser);
      setShowCreate(false);
      setNewUser({ username: '', full_name: '', nip: '', email: '', service_unit: '', password: '', role: 'Operator', permissions: ['dashboard'] });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.detail || requestError.message || 'User gagal dibuat.');
    }
  };

  const togglePermission = (permission, target = newUser, setter = setNewUser) => {
    const permissions = target.permissions.includes(permission) ? target.permissions.filter((item) => item !== permission) : [...target.permissions, permission];
    setter({ ...target, permissions });
  };

  const rejectUser = async (user) => {
    if (!window.confirm(`Tolak dan hapus registrasi ${user.full_name}?`)) return;
    try {
      await userAdminService.rejectUser(user.id);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.detail || requestError.message || 'Registrasi gagal ditolak.');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-accent">MANAJEMEN</span> PENGGUNA</h1>
          <p className="page-subtitle">Persetujuan akun dan pengaturan hak akses pengguna SIMKO.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Tambah Personel</button>
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Daftar Personel Terdaftar</div>
              <div className="text-muted text-sm">Administrator mengendalikan status akun, role, dan penempatan satuan kerja.</div>
            </div>
            <span className="badge badge-aman">Total: {users.length}</span>
          </div>
        {loading ? <div className="empty-center">Memuat data pengguna...</div> : users.length === 0 ? <div className="empty-center">Belum ada pengguna.</div> : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Identitas Personel</th><th>NIP</th><th>Satuan Kerja</th><th>Role</th><th>Status Akun</th><th>Aksi Administratif</th></tr></thead>
              <tbody>{users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.full_name}</strong><div className="text-muted text-sm">{user.username}</div></td>
                  <td className="text-mono">{user.nip}</td>
                  <td>{editingId === user.id ? <input className="form-control" value={draftServiceUnit} onChange={(event) => setDraftServiceUnit(event.target.value)} /> : user.service_unit}</td>
                  <td>{editingId === user.id ? <select className="form-control" value={user.role} onChange={(event) => updateUser(user, { role: event.target.value })}>{roles.map((role) => <option key={role}>{role}</option>)}</select> : <span className="badge badge-grounding">{user.role}</span>}</td>
                  <td><span className={`badge ${user.is_approved ? 'badge-aman' : 'badge-waspada'}`}>{user.is_approved ? 'Disetujui' : 'Menunggu'}</span></td>
                  <td><div className="action-cell">
                    {editingId === user.id ? <>
                      <div className="permission-checks">{permissionOptions.map(([value, label]) => <label key={value}><input type="checkbox" checked={draftPermissions.includes(value)} onChange={() => setDraftPermissions(draftPermissions.includes(value) ? draftPermissions.filter((item) => item !== value) : [...draftPermissions, value])} /> {label}</label>)}</div>
                      <button className="btn btn-primary btn-sm" onClick={() => saveServiceUnit(user)}>Simpan</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Batal</button>
                    </> : <button className="btn btn-secondary btn-sm" onClick={() => startEdit(user)}>Edit</button>}
                    {!user.is_approved && <button className="btn btn-primary btn-sm" onClick={() => updateUser(user, { is_approved: true })}>Setujui</button>}
                    {user.is_approved && <button className="btn btn-danger btn-sm" onClick={() => updateUser(user, { is_approved: false })}>Nonaktifkan</button>}
                    {!user.is_approved && <button className="btn btn-danger btn-sm" onClick={() => rejectUser(user)}>Tolak</button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {showCreate && <div className="modal-backdrop"><form className="card user-create-modal" onSubmit={createUser}>
        <div className="card-header"><div><div className="card-title">Registrasi Personel Baru</div><div className="text-muted text-sm">Dibuat dan disetujui langsung oleh Superadmin.</div></div></div>
        <div className="form-grid">{[['full_name', 'Nama Lengkap'], ['username', 'Username'], ['nip', 'NIP'], ['email', 'Email'], ['service_unit', 'Satuan Kerja'], ['password', 'Password']].map(([key, label]) => <div className="form-group" key={key}><label className="form-label">{label}</label><input className="form-control" type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'} value={newUser[key]} onChange={(event) => setNewUser({ ...newUser, [key]: event.target.value })} minLength={key === 'password' ? 8 : undefined} required /></div>)}</div>
        <div className="form-group"><label className="form-label">Role</label><select className="form-control" value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Hak Akses</label><div className="permission-checks">{permissionOptions.map(([value, label]) => <label key={value}><input type="checkbox" checked={newUser.permissions.includes(value)} onChange={() => togglePermission(value)} /> {label}</label>)}</div></div>
        <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Batal</button><button className="btn btn-primary" type="submit">Buat User</button></div>
      </form></div>}
    </div>
  );
}
