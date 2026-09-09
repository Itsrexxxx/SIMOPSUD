import { useState, useEffect, useMemo } from 'react';
import { aircraftAPI, airbaseAPI, extractTotal } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Pagination from '../components/Pagination';
import { PageShell } from '../components/PageShell';
import { Spinner } from '../components/UI';

const STATUS_STYLES = {
  S: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'U/S': 'bg-red-100 text-red-700 border border-red-200',
  // legacy
  Ready: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Maintenance: 'bg-red-100 text-red-700 border border-red-200',
  'Mandatory Grounding': 'bg-red-100 text-red-700 border border-red-200',
};

const defaultForm = {
  id: null,
  tail_number: '',
  aircraft_type_id: '',
  status: 'S',
  accumulated_flight_hours: '',
  airbase_id: '',
  last_service_hours: '',
  last_service_date: '',
};

export default function Pesawat() {
  const [units, setUnits] = useState([]);
  const [types, setTypes] = useState([]);
  const [airbases, setAirbases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', description: '' });
  const [typeSaving, setTypeSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [unitForm, setUnitForm] = useState(defaultForm);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, serviceable: 0, unserviceable: 0, critical: 0, per_category: [] });

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => { setPage(1); }, [categoryFilter]);

  const loadTypes = async () => {
    try {
      const response = await aircraftAPI.getTypes();
      const data = response?.data ?? response ?? [];
      setTypes(Array.isArray(data) ? data : []);
    } catch { setTypes([]); }
  };

  const loadStats = async () => {
    try {
      const res = await aircraftAPI.getUnitStats();
      setStats(res.data);
    } catch { /* ignore */ }
  };

  const loadUnits = async () => {
    setLoading(true);
    try {
      const params = { skip: (page - 1) * pageSize, limit: pageSize };
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      if (categoryFilter) params.aircraft_type_id = Number(categoryFilter);
      const response = await aircraftAPI.getUnits(params);
      const data = response?.data ?? response ?? [];
      setUnits(Array.isArray(data) ? data : []);
      setTotal(extractTotal(response, data));
    } catch {
      setUnits([]); setTotal(0);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadTypes();
    airbaseAPI.getAll({ limit: 100 }).then((r) => setAirbases(r.data || [])).catch(() => setAirbases([]));
    loadStats();
  }, []);

  useEffect(() => { loadUnits(); /* eslint-disable-next-line */ }, [page, pageSize, debouncedSearch, categoryFilter]);

  const refresh = async () => { await Promise.all([loadUnits(), loadStats()]); };

  const prepareForm = (unit = null) => {
    setUnitForm(unit ? { id: unit.id, tail_number: unit.tail_number || '', aircraft_type_id: String(unit.aircraft_type_id ?? ''), status: unit.status === 'U/S' ? 'U/S' : 'S', accumulated_flight_hours: unit.accumulated_flight_hours != null ? String(unit.accumulated_flight_hours) : '', airbase_id: unit.airbase_id ? String(unit.airbase_id) : '', last_service_hours: unit.last_service_hours != null ? String(unit.last_service_hours) : '', last_service_date: unit.last_service_date ? String(unit.last_service_date).slice(0,10) : '' } : { ...defaultForm, last_service_hours: '', last_service_date: '' });
    setShowModal(true);
  };

  const saveUnit = async () => {
    if (!unitForm.tail_number.trim()) return;
    if (!unitForm.aircraft_type_id) { alert('Pilih tipe pesawat terlebih dahulu.'); return; }
    setSaving(true);
    try {
      const payload = { tail_number: unitForm.tail_number, aircraft_type_id: Number(unitForm.aircraft_type_id), status: unitForm.status, accumulated_flight_hours: Number(unitForm.accumulated_flight_hours || 0), airbase_id: unitForm.airbase_id ? Number(unitForm.airbase_id) : null, last_service_hours: Number(unitForm.last_service_hours || 0), last_service_date: unitForm.last_service_date ? new Date(unitForm.last_service_date).toISOString() : null };
      if (unitForm.id) await aircraftAPI.updateUnitStatus(unitForm.id, payload);
      else await aircraftAPI.createUnit(payload);
      setShowModal(false); setUnitForm(defaultForm); await refresh();
    } catch (error) { alert(`Gagal menyimpan: ${error?.response?.data?.detail || error.message}`); } finally { setSaving(false); }
  };

  const deleteUnit = async (id) => {
    if (!window.confirm('Hapus data pesawat ini?')) return;
    try { await aircraftAPI.deleteUnit(id); await refresh(); } catch (error) { alert(`Gagal menghapus: ${error?.response?.data?.detail || error.message}`); }
  };

  const createTypeFromPesawat = async () => {
    if (!typeForm.name.trim()) { alert('Nama tipe wajib diisi.'); return; }
    setTypeSaving(true);
    try {
      const r = await aircraftAPI.createType({ name: typeForm.name.trim(), description: typeForm.description.trim() || null });
      await loadTypes();
      setUnitForm((p) => ({ ...p, aircraft_type_id: String(r.data.id) }));
      setShowTypeModal(false); setTypeForm({ name: '', description: '' });
    } catch (e) { alert(`Gagal: ${e?.response?.data?.detail || e.message}`); } finally { setTypeSaving(false); }
  };

  const getStatusLabel = (value) => value === 'U/S' ? 'U/S' : 'S';

function PesawatCard({ unit, typeName, statusLabel, statusStyle, onEdit, onDelete }) {
  const currentHours = Number(unit.accumulated_flight_hours || 0);
  const usagePercent = Math.min((currentHours / 3000) * 100, 100);
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div><div className="font-bold text-slate-900">{unit.tail_number}</div><div className="text-xs text-slate-600">{typeName}</div></div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle}`}>{statusLabel}</span>
      </div>
      <div className="flex justify-between text-xs text-slate-600"><span>{currentHours.toLocaleString()} jam</span><span>{usagePercent.toFixed(0)}%</span></div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full rounded-full ${usagePercent >= 80 ? 'bg-red-500' : usagePercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usagePercent}%` }} /></div>
      <div className="text-xs text-slate-600">Lanud: <span className="font-semibold text-slate-800">{unit.airbase?.name || 'Belum ditempatkan'}</span> · {unit.airbase?.location || '—'}</div>
      <div className="flex justify-end gap-2">
        <button aria-label="Edit pesawat" onClick={() => onEdit(unit)} className="inline-flex min-h-9 items-center justify-center rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">Edit</button>
        <button aria-label="Hapus pesawat" onClick={() => onDelete(unit.id)} className="inline-flex min-h-9 items-center justify-center rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 focus-visible:ring-2 focus-visible:ring-red-400">Hapus</button>
      </div>
    </div>
  );
}

  const typeById = useMemo(() => new Map(types.map((t) => [String(t.id), t.name])), [types]);
  const perCategoryData = stats.per_category?.length ? stats.per_category : [];
  const activeCategoryName = categoryFilter ? typeById.get(String(categoryFilter)) || '' : '';

  const totalReady = stats.serviceable;
  const totalUnserviceable = stats.unserviceable;
  const totalCritical = stats.critical;
  const totalAlutsista = stats.total;

  return (
    <div>
      <PageShell title="Data Pesawat & Jam Terbang" subtitle="Monitoring kondisi operasional dan kategori alutsista — status S/U/S real-time" actions={<button onClick={() => prepareForm()} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">+ Tambah Pesawat</button>}>
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
            <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Total Alutsista</div>
            <div className="text-4xl font-bold text-blue-900 mt-2">{totalAlutsista}</div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-600">{totalReady} S</span>
              <span className="font-semibold text-red-600">{totalUnserviceable} U/S</span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="bg-emerald-500" style={{ width: `${totalAlutsista ? (totalReady / totalAlutsista) * 100 : 0}%` }} />
              <div className="bg-red-500" style={{ width: `${totalAlutsista ? (totalUnserviceable / totalAlutsista) * 100 : 0}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{totalAlutsista ? ((totalReady / totalAlutsista) * 100).toFixed(1) : '0.0'}% S</span>
              <span>{totalAlutsista ? ((totalUnserviceable / totalAlutsista) * 100).toFixed(1) : '0.0'}% U/S</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5 hover:shadow-md transition">
            <div className="text-xs uppercase tracking-widest text-red-700 font-semibold">Jam Terbang Kritis</div>
            <div className="text-4xl font-bold text-red-600 mt-2">{totalCritical}</div>
            <div className="text-xs text-slate-500 mt-2">Pesawat ≥ 2500 jam — butuh evaluasi</div>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${totalAlutsista ? (totalCritical / totalAlutsista) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-600 font-semibold">Analisis Armada</p>
              <h3 className="text-lg font-bold text-slate-900">Alutsista per Kategori</h3>
              <p className="text-xs text-slate-500 mt-1">Klik bar untuk filter tabel · klik lagi untuk lepas filter</p>
            </div>
            <div className="flex items-center gap-2">
              {categoryFilter && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">Filter: {activeCategoryName || categoryFilter}</span>
                  <button onClick={() => setCategoryFilter('')} className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline">Reset</button>
                </>
              )}
              <span className="text-xs text-slate-500">{perCategoryData.length} kategori</span>
            </div>
          </div>
          {perCategoryData.length === 0 ? (
            <div className="mt-6 py-10 text-center text-sm text-slate-500">Belum ada data kategori.</div>
          ) : (
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perCategoryData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={56} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Pesawat" radius={[8, 8, 0, 0]} cursor="pointer" onClick={(d) => {
                    if (!d?.payload?.id) return;
                    setCategoryFilter((prev) => (String(prev) === String(d.payload.id) ? '' : String(d.payload.id)));
                  }}>
                    {perCategoryData.map((d) => (
                      <Cell key={d.name} fill={String(categoryFilter) === String(d.id) ? '#1e40af' : '#0ea5e9'} stroke={String(categoryFilter) === String(d.id) ? '#1e3a8a' : 'none'} strokeWidth={String(categoryFilter) === String(d.id) ? 2 : 0} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input type="text" placeholder="Cari tail number atau tipe pesawat..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500">
            <option value="">Semua Kategori</option>
            {types.map((type) => (<option key={type.id} value={type.id}>{type.name}</option>))}
          </select>
        </div>
        {categoryFilter && (<div className="mb-4 text-xs text-slate-600">Menampilkan {total} pesawat — kategori <span className="font-semibold text-blue-700">{activeCategoryName || categoryFilter}</span> · halaman {page}</div>)}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-600"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>Memuat data pesawat...</div>
          ) : units.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Belum ada data pesawat yang sesuai filter.</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase">Tail Number</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase">Kategori</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase">Jam Terbang</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase">Lanud Saat Ini</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-blue-900 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit) => {
                      const currentHours = Number(unit.accumulated_flight_hours || 0);
                      const usagePercent = Math.min((currentHours / 3000) * 100, 100);
                      const statusStyle = STATUS_STYLES[unit.status] || 'bg-slate-100 text-slate-700 border border-slate-200';
                      return (
                        <tr key={unit.id} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-6 py-4"><div className="font-bold text-slate-900">{unit.tail_number}</div></td>
                          <td className="px-6 py-4 text-slate-700">{unit.aircraft_type?.name || typeById.get(String(unit.aircraft_type_id)) || 'Belum dikategorikan'}</td>
                          <td className="px-6 py-4 min-w-[220px]">
                            <div className="flex justify-between text-sm text-slate-600 mb-2"><span>{currentHours.toLocaleString()} jam</span><span>{usagePercent.toFixed(0)}%</span></div>
                            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full rounded-full ${usagePercent >= 80 ? 'bg-red-500' : usagePercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usagePercent}%` }}></div></div>
                          </td>
                          <td className="px-6 py-4"><span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusStyle}`}>{getStatusLabel(unit.status)}</span></td>
                          <td className="px-6 py-4 text-sm text-slate-700"><div className="font-semibold">{unit.airbase?.name || 'Belum ditempatkan'}</div><div className="text-xs text-slate-500">Pangkalan udara · {unit.airbase?.location || 'Lokasi belum diisi'}</div></td>
                          <td className="px-6 py-4"><div className="flex justify-end gap-2"><button aria-label="Edit pesawat" onClick={() => prepareForm(unit)} className="inline-flex min-h-9 items-center justify-center rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Edit</button><button aria-label="Hapus pesawat" onClick={() => deleteUnit(unit.id)} className="inline-flex min-h-9 items-center justify-center rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">Hapus</button></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-slate-200">
                {units.map((unit) => {
                  const currentHours = Number(unit.accumulated_flight_hours || 0);
                  const usagePercent = Math.min((currentHours / 3000) * 100, 100);
                  const statusStyle = STATUS_STYLES[unit.status] || 'bg-slate-100 text-slate-700 border border-slate-200';
                  const typeName = unit.aircraft_type?.name || typeById.get(String(unit.aircraft_type_id)) || 'Belum dikategorikan';
                  return <PesawatCard key={unit.id} unit={unit} typeName={typeName} statusLabel={getStatusLabel(unit.status)} statusStyle={statusStyle} onEdit={prepareForm} onDelete={deleteUnit} />;
                })}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            </>
          )}
        </div>
      </div>
    </PageShell>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pesawat-modal-title" onClick={() => { setShowModal(false); setUnitForm(defaultForm); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 id="pesawat-modal-title" className="text-2xl font-bold text-blue-900 mb-5">{unitForm.id ? 'Edit Data Pesawat' : 'Tambah Data Pesawat'}</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Tail Number</label><input value={unitForm.tail_number} onChange={(e) => setUnitForm({ ...unitForm, tail_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Contoh: TS-1601" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Kategori Pesawat</label><div className="flex gap-2"><select value={unitForm.aircraft_type_id} onChange={(e) => setUnitForm({ ...unitForm, aircraft_type_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Pilih kategori</option>{types.map((type) => (<option key={type.id} value={type.id}>{type.name}</option>))}</select><button type="button" onClick={() => { setTypeForm({ name: '', description: '' }); setShowTypeModal(true); }} className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 whitespace-nowrap">+ Tipe Baru</button></div></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Status (otomatis S/U/S dari harwat)</label><select value={unitForm.status} onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="S">S — Serviceable</option><option value="U/S">U/S — Unserviceable</option></select><p className="mt-1 text-xs text-slate-500">Nilai akhir dihitung backend dari TBO/Phase/Kalender tipe — pilihan di sini hanya hint awal.</p></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Pangkalan Udara Saat Ini</label><select value={unitForm.airbase_id} onChange={(e) => setUnitForm({ ...unitForm, airbase_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Belum ditempatkan</option>{airbases.map((base) => (<option key={base.id} value={base.id}>{base.name} - {base.location || 'Lokasi tidak tersedia'}</option>))}</select></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-semibold text-gray-700 mb-2">Jam saat servis terakhir</label><input type="number" min="0" value={unitForm.last_service_hours} onChange={(e) => setUnitForm({ ...unitForm, last_service_hours: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="0" /></div><div><label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal servis terakhir</label><input type="date" value={unitForm.last_service_date} onChange={(e) => setUnitForm({ ...unitForm, last_service_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Jam Terbang Terkumpul</label><input type="number" min="0" value={unitForm.accumulated_flight_hours} onChange={(e) => setUnitForm({ ...unitForm, accumulated_flight_hours: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => { setShowModal(false); setUnitForm(defaultForm); }} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300">Batal</button><button disabled={saving} onClick={saveUnit} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60">{saving ? 'Menyimpan...' : unitForm.id ? 'Simpan Perubahan' : 'Simpan'}</button></div>
          </div>
        </div>
      )}
      {showTypeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setShowTypeModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-blue-900">Tambah Tipe Pesawat</h3>
            <p className="mt-1 text-xs text-slate-500">Tipe baru langsung terpilih di form pesawat setelah disimpan.</p>
            <div className="mt-4 space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Nama Tipe <span className="text-red-500">*</span></label><input autoFocus value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Contoh: Rafale / F-15EX / CN-235" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi</label><input value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Peran, skadron, catatan" /></div>
            </div>
            <div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowTypeModal(false)} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300">Batal</button><button disabled={typeSaving} onClick={createTypeFromPesawat} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{typeSaving ? 'Menyimpan…' : 'Simpan Tipe'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
