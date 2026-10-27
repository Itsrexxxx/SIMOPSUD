import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { aircraftAPI, airbaseAPI, extractTotal } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Pagination from '../components/Pagination';
import { PageShell } from '../components/PageShell';

const DEFAULT_TBO = 4000;

const statusStyle = (value) => {
  const t = value === 'U/S' ? 'kritis' : 'aman';
  return {
    color: `var(--status-${t})`,
    background: `color-mix(in srgb, var(--status-${t}) 14%, transparent)`,
    borderColor: `color-mix(in srgb, var(--status-${t}) 42%, transparent)`,
  };
};
const statusLabel = (value) => (value === 'U/S' ? 'U/S' : 'S');
const barTone = (pct) => (pct >= 80 ? 'kritis' : pct >= 60 ? 'waspada' : 'aman');

const inputStyle = { borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' };
const INPUT = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2';

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

function HoursBar({ hours, tbo, pct, compact = false }) {
  return (
    <div className={compact ? '' : 'min-w-[190px]'}>
      <div className="mb-2 flex justify-between gap-3 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        <span>{hours.toLocaleString('en-US')} jam</span>
        <span>{pct.toFixed(0)}% dari TBO {tbo.toLocaleString('en-US')}</span>
      </div>
      <div className={`w-full overflow-hidden rounded-full ${compact ? 'h-2' : 'h-2.5'}`} style={{ background: 'var(--surface-container-highest)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `var(--status-${barTone(pct)})` }} />
      </div>
    </div>
  );
}

export default function Pesawat() {
  const [units, setUnits] = useState([]);
  const [types, setTypes] = useState([]);
  const [airbases, setAirbases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setUnitForm(unit ? {
      id: unit.id,
      tail_number: unit.tail_number || '',
      aircraft_type_id: String(unit.aircraft_type_id ?? ''),
      status: unit.status === 'U/S' ? 'U/S' : 'S',
      accumulated_flight_hours: unit.accumulated_flight_hours != null ? String(unit.accumulated_flight_hours) : '',
      airbase_id: unit.airbase_id ? String(unit.airbase_id) : '',
      last_service_hours: unit.last_service_hours != null ? String(unit.last_service_hours) : '',
      last_service_date: unit.last_service_date ? String(unit.last_service_date).slice(0, 10) : '',
    } : { ...defaultForm });
    setShowModal(true);
  };

  const closeForm = () => { setShowModal(false); setUnitForm(defaultForm); };

  const saveUnit = async () => {
    if (!unitForm.tail_number.trim()) return;
    if (!unitForm.aircraft_type_id) { alert('Pilih tipe pesawat terlebih dahulu.'); return; }
    setSaving(true);
    try {
      // angka kosong = tidak diisi → omit, jangan kirim 0
      const num = (v) => (String(v).trim() === '' ? undefined : Number(v));
      const payload = {
        tail_number: unitForm.tail_number.trim(),
        aircraft_type_id: Number(unitForm.aircraft_type_id),
        status: unitForm.status,
        airbase_id: unitForm.airbase_id ? Number(unitForm.airbase_id) : null,
      };
      const hours = num(unitForm.accumulated_flight_hours);
      const serviceHours = num(unitForm.last_service_hours);
      if (hours !== undefined) payload.accumulated_flight_hours = hours;
      if (serviceHours !== undefined) payload.last_service_hours = serviceHours;
      if (unitForm.last_service_date) payload.last_service_date = new Date(`${unitForm.last_service_date}T00:00:00`).toISOString();
      if (unitForm.id) await aircraftAPI.updateUnitStatus(unitForm.id, payload);
      else await aircraftAPI.createUnit(payload);
      closeForm();
      await refresh();
    } catch (error) { alert(`Gagal menyimpan: ${error?.response?.data?.detail || error.message}`); } finally { setSaving(false); }
  };

  const deleteUnit = async (id) => {
    if (!window.confirm('Hapus data pesawat ini?')) return;
    try { await aircraftAPI.deleteUnit(id); await refresh(); } catch (error) { alert(`Gagal menghapus: ${error?.response?.data?.detail || error.message}`); }
  };

  const typeById = useMemo(() => new Map(types.map((t) => [String(t.id), t])), [types]);
  const typeName = (unit) => unit.aircraft_type?.name || typeById.get(String(unit.aircraft_type_id))?.name || 'Belum dikategorikan';
  const hoursInfo = (unit) => {
    const hours = Number(unit.accumulated_flight_hours || 0);
    const tbo = Number(typeById.get(String(unit.aircraft_type_id))?.tbo_hours) || DEFAULT_TBO;
    return { hours, tbo, pct: Math.min((hours / tbo) * 100, 100) };
  };

  const perCategoryData = stats.per_category?.length ? stats.per_category : [];
  const activeCategoryName = categoryFilter ? typeById.get(String(categoryFilter))?.name || '' : '';
  const totalAlutsista = stats.total;
  const totalUnserviceable = stats.unserviceable;
  const usShare = totalAlutsista ? ((totalUnserviceable / totalAlutsista) * 100).toFixed(1) : '0.0';

  return (
    <div>
      <PageShell
        title="Data Pesawat & Jam Terbang"
        subtitle="Monitoring kondisi operasional dan kategori alutsista — status S/U/S real-time"
        actions={<button onClick={() => prepareForm()} className="rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>Tambah pesawat</button>}
      >
        <div>
          <div className="mb-6 overflow-hidden rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }}>
            <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--card-border)' }}>
              <div className="p-4 sm:p-5">
                <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">flight</span>Total alutsista
                </p>
                <div className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>{totalAlutsista}</div>
                <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{stats.serviceable} S · {stats.unserviceable} U/S</p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">warning</span>Alutsista U/S
                </p>
                <div className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>{totalUnserviceable}</div>
                <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{usShare}% alutsista · {stats.nearing_phase ?? 0} mendekati phase</p>
              </div>
            </div>
          </div>

          <div className="mb-6 overflow-hidden rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }}>
            <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--card-border)' }}>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Alutsista per kategori</h3>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>Klik bar untuk filter tabel, klik lagi untuk lepas filter</p>
              </div>
              <div className="flex items-center gap-2">
                {categoryFilter && (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>Filter: {activeCategoryName || categoryFilter}</span>
                    <button onClick={() => setCategoryFilter('')} className="text-xs font-semibold underline" style={{ color: 'var(--text-secondary)' }}>Reset</button>
                  </>
                )}
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{perCategoryData.length} kategori</span>
              </div>
            </div>
            {perCategoryData.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Belum ada data kategori.</div>
            ) : (
              <div className="p-4 pt-2 sm:p-5 sm:pt-2"><div className="h-[240px] sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perCategoryData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval={0} angle={-18} textAnchor="end" height={56} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
                    <Bar dataKey="count" name="Pesawat" radius={[4, 4, 0, 0]} barSize={20} cursor="pointer" onClick={(d) => {
                      if (!d?.payload?.id) return;
                      setCategoryFilter((prev) => (String(prev) === String(d.payload.id) ? '' : String(d.payload.id)));
                    }}>
                      {perCategoryData.map((d) => {
                        const active = String(categoryFilter) === String(d.id);
                        return <Cell key={d.name} fill="var(--primary)" fillOpacity={active || !categoryFilter ? 1 : 0.38} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div></div>
            )}
          </div>

          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px]" style={{ color: 'var(--text-muted)' }} aria-hidden="true">search</span>
              <input
                type="text"
                aria-label="Cari pesawat"
                placeholder="Cari tail number atau tipe pesawat…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
            <select
              aria-label="Filter kategori"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={inputStyle}
            >
              <option value="">Semua kategori</option>
              {types.map((type) => (<option key={type.id} value={type.id}>{type.name}</option>))}
            </select>
          </div>

          {categoryFilter && (
            <div className="mb-4 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              Menampilkan {total} pesawat — kategori <span className="font-semibold" style={{ color: 'var(--primary)' }}>{activeCategoryName || categoryFilter}</span> · halaman {page}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="mr-3 h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--primary)' }} />
                Memuat data pesawat…
              </div>
            ) : units.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Belum ada data pesawat yang sesuai filter.</div>
            ) : (
              <>
                <div className="table-wrap hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[880px]">
                    <thead className="border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-muted)' }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tail number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Kategori</th>
                        <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Jam terbang</th>
                        <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Lanud saat ini</th>
                        <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((unit) => {
                        const { hours, tbo, pct } = hoursInfo(unit);
                        return (
                          <tr key={unit.id} className="border-t" style={{ borderColor: 'var(--card-border)' }}>
                            <td className="px-4 py-3"><span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{unit.tail_number}</span></td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{typeName(unit)}</td>
                            <td className="px-4 py-3"><HoursBar hours={hours} tbo={tbo} pct={pct} /></td>
                            <td className="px-4 py-3"><span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold" style={statusStyle(unit.status)}>{statusLabel(unit.status)}</span></td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{unit.airbase?.name || 'Belum ditempatkan'}</div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{unit.airbase?.location || 'Lokasi belum diisi'}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button aria-label="Edit pesawat" onClick={() => prepareForm(unit)} className="rounded-md border px-2.5 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>Edit</button>
                                <button aria-label="Hapus pesawat" onClick={() => deleteUnit(unit.id)} className="rounded-md border px-2.5 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'color-mix(in srgb, var(--status-kritis) 85%, #ffffff)' }}>Hapus</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y md:hidden" style={{ borderColor: 'var(--card-border)' }}>
                  {units.map((unit) => {
                    const { hours, tbo, pct } = hoursInfo(unit);
                    return (
                      <div key={unit.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{unit.tail_number}</div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{typeName(unit)}</div>
                          </div>
                          <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold" style={statusStyle(unit.status)}>{statusLabel(unit.status)}</span>
                        </div>
                        <HoursBar hours={hours} tbo={tbo} pct={pct} compact />
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Lanud: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{unit.airbase?.name || 'Belum ditempatkan'}</span> · {unit.airbase?.location || '—'}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button aria-label="Edit pesawat" onClick={() => prepareForm(unit)} className="rounded-md border px-2.5 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>Edit</button>
                          <button aria-label="Hapus pesawat" onClick={() => deleteUnit(unit.id)} className="rounded-md border px-2.5 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'color-mix(in srgb, var(--status-kritis) 85%, #ffffff)' }}>Hapus</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
              </>
            )}
          </div>
        </div>
      </PageShell>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pesawat-modal-title" onClick={closeForm}>
          <div className="w-full max-w-lg rounded-xl border p-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }} onClick={(e) => e.stopPropagation()}>
            <h2 id="pesawat-modal-title" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{unitForm.id ? 'Edit data pesawat' : 'Tambah data pesawat'}</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Tail number</label>
                <input value={unitForm.tail_number} onChange={(e) => setUnitForm({ ...unitForm, tail_number: e.target.value })} className={INPUT} style={inputStyle} placeholder="Contoh: TS-1601" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Kategori pesawat</label>
                <div className="flex gap-2">
                  <select value={unitForm.aircraft_type_id} onChange={(e) => setUnitForm({ ...unitForm, aircraft_type_id: e.target.value })} className={INPUT} style={inputStyle}>
                    <option value="">Pilih kategori</option>
                    {types.map((type) => (<option key={type.id} value={type.id}>{type.name}</option>))}
                  </select>
                  <Link to="/tipe-pesawat" className="shrink-0 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--primary)' }}>Kelola tipe</Link>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Status (hint awal)</label>
                <select value={unitForm.status} onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })} className={INPUT} style={inputStyle}>
                  <option value="S">S — Serviceable</option>
                  <option value="U/S">U/S — Unserviceable</option>
                </select>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Nilai akhir dihitung backend dari TBO/Phase/Kalender tipe — pilihan di sini hanya hint awal.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Pangkalan udara saat ini</label>
                <select value={unitForm.airbase_id} onChange={(e) => setUnitForm({ ...unitForm, airbase_id: e.target.value })} className={INPUT} style={inputStyle}>
                  <option value="">Belum ditempatkan</option>
                  {airbases.map((base) => (<option key={base.id} value={base.id}>{base.name} — {base.location || 'Lokasi tidak tersedia'}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Jam saat servis terakhir</label>
                  <input type="number" min="0" value={unitForm.last_service_hours} onChange={(e) => setUnitForm({ ...unitForm, last_service_hours: e.target.value })} className={INPUT} style={inputStyle} placeholder="belum diisi" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Tanggal servis terakhir</label>
                  <input type="date" value={unitForm.last_service_date} onChange={(e) => setUnitForm({ ...unitForm, last_service_date: e.target.value })} className={INPUT} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Jam terbang terkumpul</label>
                <input type="number" min="0" value={unitForm.accumulated_flight_hours} onChange={(e) => setUnitForm({ ...unitForm, accumulated_flight_hours: e.target.value })} className={INPUT} style={inputStyle} placeholder="belum diisi" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={closeForm} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: 'var(--surface-container-high)', color: 'var(--text-primary)' }}>Batal</button>
              <button disabled={saving} onClick={saveUnit} className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>{saving ? 'Menyimpan…' : unitForm.id ? 'Simpan perubahan' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
