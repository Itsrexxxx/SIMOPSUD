import { useState, useEffect, useCallback } from 'react';
import { aircraftAPI, extractTotal } from '../api';
import Pagination from '../components/Pagination';
import { PageShell } from '../components/PageShell';

export default function TipePesawat() {
  const [types, setTypes] = useState([]);
  const [q, setQ] = useState(''); const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(10); const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ id: null, name: '', description: '', cruise_speed_kmh: '650', tbo_hours: '4000', phase_interval_hours: '300', calendar_interval_days: '60', fuel_burn_lph: '2200', max_range_km: '2000', payload_capacity_kg: '5000' });

  useEffect(() => { const t = setTimeout(() => { setDebounced(q); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aircraftAPI.getTypes({ skip: (page - 1) * pageSize, limit: pageSize, ...(debounced.trim() ? { q: debounced.trim() } : {}) });
      const data = res?.data ?? [];
      setTypes(Array.isArray(data) ? data : []);
      setTotal(extractTotal(res, data));
    } catch { setTypes([]); setTotal(0); } finally { setLoading(false); }
  }, [page, pageSize, debounced]);

  useEffect(() => { load(); }, [load]);

  const open = (row = null) => {
    setForm(row ? { id: row.id, name: row.name || '', description: row.description || '', cruise_speed_kmh: row.cruise_speed_kmh != null ? String(row.cruise_speed_kmh) : '650', tbo_hours: row.tbo_hours != null ? String(row.tbo_hours) : '4000', phase_interval_hours: row.phase_interval_hours != null ? String(row.phase_interval_hours) : '300', calendar_interval_days: row.calendar_interval_days != null ? String(row.calendar_interval_days) : '60', fuel_burn_lph: row.fuel_burn_lph != null ? String(row.fuel_burn_lph) : '2200', max_range_km: row.max_range_km != null ? String(row.max_range_km) : '2000', payload_capacity_kg: row.payload_capacity_kg != null ? String(row.payload_capacity_kg) : '5000' } : { id: null, name: '', description: '', cruise_speed_kmh: '650', tbo_hours: '4000', phase_interval_hours: '300', calendar_interval_days: '60', fuel_burn_lph: '2200', max_range_km: '2000', payload_capacity_kg: '5000' });
    setShowModal(true);
  };
  const save = async () => {
    if (!form.name.trim()) { alert('Nama tipe wajib diisi.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null, cruise_speed_kmh: Number(form.cruise_speed_kmh || 0), tbo_hours: Number(form.tbo_hours || 0), phase_interval_hours: Number(form.phase_interval_hours || 0), calendar_interval_days: Number(form.calendar_interval_days || 0), fuel_burn_lph: Number(form.fuel_burn_lph || 0), max_range_km: Number(form.max_range_km || 0), payload_capacity_kg: Number(form.payload_capacity_kg || 0) };
      if (form.id) await aircraftAPI.updateType(form.id, payload);
      else await aircraftAPI.createType(payload);
      setShowModal(false); setForm({ id: null, name: '', description: '', cruise_speed_kmh: '650', tbo_hours: '4000', phase_interval_hours: '300', calendar_interval_days: '60', fuel_burn_lph: '2200', max_range_km: '2000', payload_capacity_kg: '5000' }); await load();
    } catch (e) { alert(`Gagal: ${e?.response?.data?.detail || e.message}`); } finally { setSaving(false); }
  };
  const del = async (id) => {
    if (!window.confirm('Hapus tipe ini? Gagal jika masih dipakai pesawat.')) return;
    try { await aircraftAPI.deleteType(id); await load(); } catch (e) { alert(`Gagal: ${e?.response?.data?.detail || e.message}`); }
  };

  return (
    <div>
      <PageShell title="Tipe Pesawat" subtitle="Kelola tipe + spek real (Skatek/TBO) — dipakai Pesawat & rumus ETA/S-U/S" actions={<button onClick={() => open()} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">+ Tambah Tipe</button>}>
      <div>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:max-w-sm"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari tipe / deskripsi…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
          <span className="text-xs text-slate-500">{total} tipe</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? <div className="flex items-center justify-center py-12 text-slate-600"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />Memuat…</div>
            : types.length === 0 ? <div className="text-center py-12 text-slate-500">Belum ada tipe. <button onClick={() => open()} className="ml-2 text-blue-600 font-semibold hover:underline">Tambah pertama</button></div>
            : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Tipe</th><th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-600">Jelajah</th><th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-600">TBO</th><th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-600">Phase</th><th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-600">Kalender</th><th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-600">Payload</th><th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-600">Aksi</th></tr></thead>
                    <tbody className="divide-y divide-slate-200">
                      {types.map((t) => (
                        <tr key={t.id} className="hover:bg-blue-50/40">
                          <td className="px-4 py-3"><div className="font-bold text-slate-900">{t.name}</div><div className="text-xs text-slate-500">{t.description || '—'}</div></td>
                          <td className="px-4 py-3 text-center text-sm">{t.cruise_speed_kmh} km/h</td>
                          <td className="px-4 py-3 text-center text-sm">{t.tbo_hours} j</td>
                          <td className="px-4 py-3 text-center text-sm">{t.phase_interval_hours} j</td>
                          <td className="px-4 py-3 text-center text-sm">{t.calendar_interval_days} hr</td>
                          <td className="px-4 py-3 text-center text-sm">{t.payload_capacity_kg ?? '—'} kg</td>
                          <td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => open(t)} className="inline-flex min-h-9 items-center rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">Edit</button><button onClick={() => del(t.id)} className="inline-flex min-h-9 items-center rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">Hapus</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden divide-y divide-slate-200">
                  {types.map((t) => (
                    <div key={t.id} className="p-4 space-y-1"><div className="font-bold text-slate-900">{t.name}</div><div className="text-xs text-slate-500">{t.description || '—'}</div><div className="text-xs text-slate-600">{t.cruise_speed_kmh} km/h · TBO {t.tbo_hours}j · Phase {t.phase_interval_hours}j · {t.calendar_interval_days}hr</div><div className="flex justify-end gap-2 pt-2"><button onClick={() => open(t)} className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">Edit</button><button onClick={() => del(t.id)} className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Hapus</button></div></div>
                  ))}
                </div>
                <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
              </>
            )}
        </div>
      </div>
    </PageShell>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-blue-900">{form.id ? 'Edit Tipe' : 'Tambah Tipe'}</h2>
            <p className="mt-1 text-xs text-slate-500">Spek real ikut rumus harwat (S/U/S) & ETA. Nilai default dari AFM/Skatek — ubah sesuai manual pesawat.</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-700 mb-2">Nama Tipe *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Contoh: F-16C Block 52 / Rafale" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Peran, skadron, catatan" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Jelajah (km/h)</label><input type="number" value={form.cruise_speed_kmh} onChange={(e) => setForm({ ...form, cruise_speed_kmh: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">TBO (jam)</label><input type="number" value={form.tbo_hours} onChange={(e) => setForm({ ...form, tbo_hours: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Phase (jam)</label><input type="number" value={form.phase_interval_hours} onChange={(e) => setForm({ ...form, phase_interval_hours: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Kalender (hari)</label><input type="number" value={form.calendar_interval_days} onChange={(e) => setForm({ ...form, calendar_interval_days: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Fuel burn (L/jam)</label><input type="number" value={form.fuel_burn_lph} onChange={(e) => setForm({ ...form, fuel_burn_lph: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Max range (km)</label><input type="number" value={form.max_range_km} onChange={(e) => setForm({ ...form, max_range_km: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Payload max (kg)</label><input type="number" value={form.payload_capacity_kg} onChange={(e) => setForm({ ...form, payload_capacity_kg: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            </div>
            <div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowModal(false)} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300">Batal</button><button disabled={saving} onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Menyimpan…' : form.id ? 'Simpan' : 'Tambah'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
