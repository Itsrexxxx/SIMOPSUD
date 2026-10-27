import { useEffect, useState } from 'react';
import Pagination from '../components/Pagination';
import { PageShell } from '../components/PageShell';
import { userAdminService } from '../services/authService';

const roles = ['Admin', 'Operator', 'Pimpinan'];
const permissionOptions = [
  ['dashboard', 'Dashboard'],
  ['aircraft', 'Data Pesawat'],
  ['airbase', 'Data Pangkalan'],
  ['missions', 'Prediksi ETA & Misi'],
  ['users', 'Manajemen Pengguna'],
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draftServiceUnit, setDraftServiceUnit] = useState('');
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', full_name: '', nip: '', email: '', service_unit: '', password: '', role: 'Operator', permissions: ['dashboard'] });

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = { skip: (page - 1) * pageSize, limit: pageSize };
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      const result = await userAdminService.getAllUsers(params);
      // result may be {data,total} or array
      const data = Array.isArray(result) ? result : (result.data ?? result.pending_users ?? []);
      const t = result?.total ?? result?.data?._total ?? (Array.isArray(data) ? data.length : 0);
      // also try header fallback via data._total
      const headerTotal = Array.isArray(result) ? result._total : result.total;
      setUsers(Array.isArray(data) ? data : []);
      setTotal(headerTotal != null ? headerTotal : t);
      setError('');
    } catch (requestError) {
      setError(requestError.detail || requestError.message || 'Data pengguna gagal dimuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); /* eslint-disable-next-line */ }, [page, pageSize, debouncedSearch]);

  const updateUser = async (user, changes) => {
    try {
      await userAdminService.approveUser(user.id, changes);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.detail || requestError.message || 'Perubahan pengguna gagal disimpan.');
    }
  };

function UsersCard({ user, editingId, draftServiceUnit, setDraftServiceUnit, draftPermissions, setDraftPermissions, permissionOptions, roles, onStartEdit, onSave, onCancel, onUpdateUser, onReject }) {
  const isEditing = editingId === user.id;
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div><div className="font-bold text-slate-900">{user.full_name}</div><div className="text-xs text-slate-500">{user.username} · {user.nip}</div></div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${user.is_approved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{user.is_approved ? 'Disetujui' : 'Menunggu'}</span>
      </div>
      <div className="text-xs text-slate-600">Satuan: {isEditing ? <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={draftServiceUnit} onChange={(e) => setDraftServiceUnit(e.target.value)} placeholder="Satuan kerja" /> : (user.service_unit || '—')} · <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">{user.role}</span></div>
      {isEditing && <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">{permissionOptions.map(([v,l]) => <label key={v} className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={draftPermissions.includes(v)} onChange={() => setDraftPermissions(draftPermissions.includes(v) ? draftPermissions.filter((x)=>x!==v):[...draftPermissions,v])} />{l}</label>)}</div>}
      <div className="flex flex-wrap justify-end gap-2">
        {isEditing ? <><button type="button" onClick={() => onSave(user)} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white focus-visible:ring-2 focus-visible:ring-blue-500">Simpan</button><button type="button" onClick={onCancel} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500">Batal</button></> : <button type="button" onClick={() => onStartEdit(user)} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500">Edit</button>}
        {!user.is_approved && <button type="button" onClick={() => onUpdateUser(user,{is_approved:true})} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Setujui</button>}
        {user.is_approved && <button type="button" onClick={() => onUpdateUser(user,{is_approved:false})} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">Nonaktifkan</button>}
        {!user.is_approved && <button type="button" onClick={() => onReject(user)} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 focus-visible:ring-2 focus-visible:ring-red-400">Tolak</button>}
      </div>
    </div>
  );
}

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
    <div>
      <PageShell title="Manajemen Pengguna" subtitle="Persetujuan akun dan pengaturan hak akses pengguna SIMOPSUD" actions={<button type="button" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700" onClick={() => setShowCreate(true)}>+ Tambah Personel</button>}>
      <div>
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mb-4 relative max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / username / NIP…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div>
              <div className="text-sm font-bold text-slate-900">Daftar Personel Terdaftar</div>
              <div className="text-xs text-slate-500 mt-1">Administrator mengendalikan status akun, role, dan penempatan satuan kerja.</div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Total: {total}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-600"><span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" /> Memuat data pengguna…</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">Belum ada pengguna.</div>
          ) : (
            <>
            <div className="hidden md:block overflow-x-auto table-wrap">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Identitas Personel</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">NIP</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Satuan Kerja</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Status Akun</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4"><div className="font-bold text-slate-900">{user.full_name}</div><div className="text-xs text-slate-500">{user.username}</div></td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">{user.nip}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {editingId === user.id ? (
                          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={draftServiceUnit} onChange={(e) => setDraftServiceUnit(e.target.value)} placeholder="Satuan kerja" />
                        ) : (
                          user.service_unit || <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === user.id ? (
                          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={user.role} onChange={(e) => updateUser(user, { role: e.target.value })}>
                            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                          </select>
                        ) : (
                          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">{user.role}</span>
                        )}
                      </td>
                      <td className="px-6 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${user.is_approved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{user.is_approved ? 'Disetujui' : 'Menunggu'}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {editingId === user.id ? (
                            <>
                              <button type="button" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => saveServiceUnit(user)}>Simpan</button>
                              <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => setEditingId(null)}>Batal</button>
                            </>
                          ) : (
                            <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={() => startEdit(user)}>Edit</button>
                          )}
                          {!user.is_approved && <button type="button" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700" onClick={() => updateUser(user, { is_approved: true })}>Setujui</button>}
                          {user.is_approved && <button type="button" className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-200" onClick={() => updateUser(user, { is_approved: false })}>Nonaktifkan</button>}
                          {!user.is_approved && <button type="button" className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100" onClick={() => rejectUser(user)}>Tolak</button>}
                        </div>
                        {editingId === user.id && (
                          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            {permissionOptions.map(([value, label]) => (
                              <label key={value} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <input type="checkbox" checked={draftPermissions.includes(value)} onChange={() => setDraftPermissions(draftPermissions.includes(value) ? draftPermissions.filter((item) => item !== value) : [...draftPermissions, value])} />
                                {label}
                              </label>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-200">
              {users.map((user) => <UsersCard key={user.id} user={user} editingId={editingId} draftServiceUnit={draftServiceUnit} setDraftServiceUnit={setDraftServiceUnit} draftPermissions={draftPermissions} setDraftPermissions={setDraftPermissions} permissionOptions={permissionOptions} roles={roles} onStartEdit={startEdit} onSave={saveServiceUnit} onCancel={() => setEditingId(null)} onUpdateUser={updateUser} onReject={rejectUser} />)}
            </div>
            </>
          )}
          {!loading && users.length > 0 && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
        </div>
      </div>
    </PageShell>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="users-create-title" onClick={() => setShowCreate(false)}>
          <form className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} onSubmit={createUser} aria-labelledby="users-create-title">
            <div className="border-b border-slate-200 px-6 py-4">
              <div id="users-create-title" className="text-base font-bold text-slate-900">Registrasi Personel Baru</div>
              <div className="text-xs text-slate-500 mt-1">Dibuat dan disetujui langsung oleh Superadmin.</div>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['full_name', 'Nama Lengkap', 'text'],
                  ['username', 'Username', 'text'],
                  ['nip', 'NIP', 'text'],
                  ['email', 'Email', 'email'],
                  ['service_unit', 'Satuan Kerja', 'text'],
                  ['password', 'Password', 'password'],
                ].map(([key, label, type]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
                    <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" type={type} value={newUser[key]} onChange={(e) => setNewUser({ ...newUser, [key]: e.target.value })} minLength={key === 'password' ? 8 : undefined} required />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Role</label>
                <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Hak Akses</label>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {permissionOptions.map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input type="checkbox" checked={newUser.permissions.includes(value)} onChange={() => togglePermission(value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-2xl">
              <button type="button" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => setShowCreate(false)}>Batal</button>
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Buat User</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
