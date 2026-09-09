import { useState, useEffect } from 'react';
import { airbaseAPI, aircraftAPI, extractTotal } from '../api';
import { PageShell } from '../components/PageShell';
import Pagination from '../components/Pagination';

const emptyForm = {
  id: null,
  name: '',
  location: '',
  kodau: 'Kodau I',
  code: '',
  icao: '',
  tipe: 'A',
  latitude: '',
  longitude: '',
  runway_m: '',
  elev_m: '',
  status: 'optimal',
  avtur_capacity_liters: '',
  avtur_stock_liters: '',
  special_lube_stock_liters: '',
  refueler_trucks_count: '',
  refueler_trucks_active: '',
  forklifts_count: '',
  apron_capacity_aircraft: '',
  apron_used: 0,
};

const KODAU_OPTIONS = ['Kodau I', 'Kodau II', 'Kodau III'];

function toDMS(lat, lon) {
  if (lat == null || lon == null) return '—';
  const latD = Math.abs(lat), lonD = Math.abs(lon);
  const latDeg = Math.floor(latD), lonDeg = Math.floor(lonD);
  const latMin = Math.floor((latD - latDeg) * 60), lonMin = Math.floor((lonD - lonDeg) * 60);
  const latSec = Math.round(((latD - latDeg) * 60 - latMin) * 60);
  const lonSec = Math.round(((lonD - lonDeg) * 60 - lonMin) * 60);
  return `${latDeg}°${latMin}'${latSec}" ${lat >= 0 ? 'N' : 'S'}, ${lonDeg}°${lonMin}'${lonSec}" ${lon >= 0 ? 'E' : 'W'}`;
}

export default function Pangkalan() {
  const [airbases, setAirbases] = useState([]);
  const [aircraftUnits, setAircraftUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [detailBase, setDetailBase] = useState(null);
  const [avturLogs, setAvturLogs] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refillLiters, setRefillLiters] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [kodau, setKodau] = useState('');

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [debouncedQ, kodau]);

  const loadAirbases = async () => {
    try {
      setError(null);
      const params = { skip: (page - 1) * pageSize, limit: pageSize };
      if (debouncedQ) params.q = debouncedQ;
      if (kodau) params.kodau = kodau;
      const [airbaseResponse, aircraftResponse] = await Promise.all([
        airbaseAPI.getAll(params),
        aircraftAPI.getUnits({ limit: 100 }),
      ]);
      const data = airbaseResponse?.data ?? [];
      setAirbases(Array.isArray(data) ? data : []);
      setTotal(extractTotal(airbaseResponse, data));
      setAircraftUnits(Array.isArray(aircraftResponse?.data) ? aircraftResponse.data : []);
    } catch (err) {
      console.error('Error loading airbases:', err);
      setError('Gagal memuat data pangkalan. Pastikan backend sudah berjalan di port 8000.');
      setAirbases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); loadAirbases(); /* eslint-disable-next-line */ }, [page, pageSize, debouncedQ, kodau]);

  const getStatusBadge = (status) => {
    if (status === 'critical') return { color: 'bg-red-100 text-red-800 border-red-300', text: 'Kritis' };
    if (status === 'warning') return { color: 'bg-orange-100 text-orange-800 border-orange-300', text: 'Waspada' };
    return { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'Optimal' };
  };

  const openForm = (base = null) => {
    setForm(
      base
        ? {
            id: base.id,
            name: base.name || '',
            location: base.location || '',
            kodau: base.kodau || 'Kodau I',
            code: base.code || '',
            icao: base.icao || '',
            tipe: base.tipe || 'A',
            latitude: base.latitude != null && base.latitude !== '' ? String(base.latitude) : '',
            longitude: base.longitude != null && base.longitude !== '' ? String(base.longitude) : '',
            runway_m: base.runway_m != null && base.runway_m !== '' ? String(base.runway_m) : '',
            elev_m: base.elev_m != null && base.elev_m !== '' ? String(base.elev_m) : '',
            status: base.status || 'optimal',
            avtur_capacity_liters: base.avtur_capacity_liters != null && base.avtur_capacity_liters !== '' ? String(base.avtur_capacity_liters) : '',
            avtur_stock_liters: base.avtur_stock_liters != null && base.avtur_stock_liters !== '' ? String(base.avtur_stock_liters) : '',
            special_lube_stock_liters: base.special_lube_stock_liters != null && base.special_lube_stock_liters !== '' ? String(base.special_lube_stock_liters) : '',
            refueler_trucks_count: base.refueler_trucks_count != null && base.refueler_trucks_count !== '' ? String(base.refueler_trucks_count) : '',
            refueler_trucks_active: base.refueler_trucks_active != null && base.refueler_trucks_active !== '' ? String(base.refueler_trucks_active) : '',
            forklifts_count: base.forklifts_count != null && base.forklifts_count !== '' ? String(base.forklifts_count) : '',
            apron_capacity_aircraft: base.apron_capacity_aircraft != null && base.apron_capacity_aircraft !== '' ? String(base.apron_capacity_aircraft) : '',
            apron_used: Number(base.apron_used || 0),
          }
        : { ...emptyForm }
    );
    setShowModal(true);
  };

  const saveBase = async () => {
    if (!form.name.trim()) { alert('Nama pangkalan wajib diisi.'); return; }
    if (form.latitude < -90 || form.latitude > 90 || form.longitude < -180 || form.longitude > 180) { alert('Koordinat tidak valid.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        latitude: Number(form.latitude || 0),
        longitude: Number(form.longitude || 0),
        runway_m: form.runway_m ? Number(form.runway_m) : null,
        elev_m: form.elev_m ? Number(form.elev_m) : null,
        avtur_capacity_liters: Number(form.avtur_capacity_liters || 0),
        avtur_stock_liters: Number(form.avtur_stock_liters || 0),
        special_lube_stock_liters: Number(form.special_lube_stock_liters || 0),
        refueler_trucks_count: Number(form.refueler_trucks_count || 0),
        refueler_trucks_active: Number(form.refueler_trucks_active || 0),
        forklifts_count: Number(form.forklifts_count || 0),
        apron_capacity_aircraft: Number(form.apron_capacity_aircraft || 0),
        apron_used: Number(form.apron_used || 0),
      };
      if (form.id) await airbaseAPI.update(form.id, payload);
      else await airbaseAPI.create(payload);
      setShowModal(false);
      setForm(emptyForm);
      await loadAirbases();
    } catch (err) {
      alert(`Gagal menyimpan data pangkalan: ${err?.response?.data?.detail || err.message}`);
    } finally { setSaving(false); }
  };

  const deleteBase = async (id) => {
    if (!window.confirm('Hapus data pangkalan ini?')) return;
    try { await airbaseAPI.delete(id); await loadAirbases(); } catch (err) { alert(`Gagal menghapus pangkalan: ${err?.response?.data?.detail || err.message}`); }
  };
  const openDetail = async (base) => {
    setDetailBase(base); setDetailLoading(true);
    try {
      const res = await airbaseAPI.getAvturLogs(base.id, { limit: 20 });
      setAvturLogs(Array.isArray(res.data) ? res.data : []);
      const fresh = await airbaseAPI.getById(base.id);
      if (fresh?.data) setDetailBase(fresh.data);
    } catch { setAvturLogs([]); } finally { setDetailLoading(false); }
  };
  const doRefill = async () => {
    const v = Number(refillLiters);
    if (!v || v <= 0) { alert('Isi liter >0'); return; }
    try { await airbaseAPI.refillAvtur(detailBase.id, v); setRefillLiters(''); await openDetail(detailBase); await loadAirbases(); } catch (e) { alert(e?.response?.data?.detail || e.message); }
  };

  const totalOperational = airbases.filter((b) => (b.status || 'optimal') === 'optimal').length;
  const totalWarning = airbases.filter((b) => (b.status || 'optimal') === 'warning').length;
  const totalCritical = airbases.filter((b) => (b.status || 'optimal') === 'critical').length;
  const totalAvturCapacity = airbases.reduce((s, b) => s + Number(b.avtur_capacity_liters || 0), 0);
  const totalAvturStock = airbases.reduce((s, b) => s + Number(b.avtur_stock_liters || 0), 0);
  const avgAvtur = totalAvturCapacity > 0 ? Math.round((totalAvturStock / totalAvturCapacity) * 100) : 0;
  const totalRefuelingTrucks = airbases.reduce((s, b) => s + Number(b.refueler_trucks_count || 0), 0);
  const activeRefuelingTrucks = airbases.reduce((s, b) => s + Number(b.refueler_trucks_active || 0), 0);
  const truckReadiness = totalRefuelingTrucks > 0 ? Math.round((activeRefuelingTrucks / totalRefuelingTrucks) * 100) : 0;
  const totalApronCapacity = airbases.reduce((s, b) => s + Number(b.apron_capacity_aircraft || 0), 0);
  const totalApronUsed = airbases.reduce((s, b) => s + Number(b.apron_used || 0), 0);
  const apronUtilization = totalApronCapacity > 0 ? Math.round((totalApronUsed / totalApronCapacity) * 100) : 0;
  const totalStationedAircraft = aircraftUnits.filter((u) => u.airbase_id != null).length;

  return (
    <div>
      <PageShell title="Data Pangkalan Udara" subtitle="Monitoring kapasitas logistik, operasional, dan fasilitas tiap lanud — Avtur & apron live" actions={<button onClick={() => openForm()} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">+ Tambah Pangkalan</button>}>
      <div>
        {(airbases.some(b => b.alert_below_15) || airbases.some(b => b.needs_reorder)) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {airbases.filter(b => b.alert_below_15).length > 0 && <span className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white">⚠ {airbases.filter(b=>b.alert_below_15).length} lanud {'<'}15% Avtur</span>}
            {airbases.filter(b => b.needs_reorder).length > 0 && <span className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">↻ {airbases.filter(b=>b.needs_reorder).length} butuh reorder (15% kap)</span>}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-5 text-white"><div className="flex justify-between items-start"><div><div className="text-sm opacity-90">Total Pangkalan</div><div className="text-3xl font-bold mt-2">{total || airbases.length}</div><div className="text-xs opacity-75 mt-2">{totalStationedAircraft} pesawat memiliki penempatan</div></div></div></div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-sm p-5 text-white"><div className="flex justify-between items-start"><div><div className="text-sm opacity-90">Status Operasional</div><div className="text-3xl font-bold mt-2">{totalOperational}</div><div className="text-xs opacity-75 mt-2">{airbases.length > 0 ? Math.round((totalOperational/airbases.length)*100) : 0}% optimal</div></div><div className="text-4xl opacity-30">✓</div></div></div>
          <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-sm p-5 text-white"><div className="flex justify-between items-start"><div><div className="text-sm opacity-90">Stok Avtur</div><div className="text-3xl font-bold mt-2">{avgAvtur}%</div><div className="text-xs opacity-75 mt-2">{(totalAvturStock/1000).toFixed(0)}K / {(totalAvturCapacity/1000).toFixed(0)}K Liter</div></div></div></div>
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-sm p-5 text-white"><div className="flex justify-between items-start"><div><div className="text-sm opacity-90">Kesiapan Kendaraan</div><div className="text-3xl font-bold mt-2">{truckReadiness}%</div><div className="text-xs opacity-75 mt-2">{activeRefuelingTrucks}/{totalRefuelingTrucks} truk aktif</div></div></div></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Distribusi Status Pangkalan</h3>
            <div className="space-y-3">
              <div><div className="flex justify-between text-sm mb-2"><span className="text-emerald-700 font-medium">Optimal</span><span className="font-bold text-emerald-700">{totalOperational}</span></div><div className="h-2.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{width: airbases.length > 0 ? `${(totalOperational/airbases.length)*100}%` : '0%'}}></div></div></div>
              <div><div className="flex justify-between text-sm mb-2"><span className="text-orange-700 font-medium">Waspada</span><span className="font-bold text-orange-700">{totalWarning}</span></div><div className="h-2.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-orange-500" style={{width: airbases.length > 0 ? `${(totalWarning/airbases.length)*100}%` : '0%'}}></div></div></div>
              <div><div className="flex justify-between text-sm mb-2"><span className="text-red-700 font-medium">Kritis</span><span className="font-bold text-red-700">{totalCritical}</span></div><div className="h-2.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{width: airbases.length > 0 ? `${(totalCritical/airbases.length)*100}%` : '0%'}}></div></div></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Metrik Penggunaan Fasilitas</h3>
            <div className="space-y-4">
              <div><div className="flex justify-between text-sm font-medium text-slate-700 mb-2"><span>Penggunaan Apron</span><span>{apronUtilization}%</span></div><div className="h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{width: `${Math.min(apronUtilization, 100)}%`}}></div></div><div className="text-xs text-slate-500 mt-1">{totalApronUsed}/{totalApronCapacity} bay terpakai</div></div>
              <div><div className="flex justify-between text-sm font-medium text-slate-700 mb-2"><span>Kapasitas Bahan Bakar</span><span>{avgAvtur}%</span></div><div className="h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{width: `${Math.min(avgAvtur, 100)}%`}}></div></div><div className="text-xs text-slate-500 mt-1">{(totalAvturStock/1000).toFixed(0)}K Liter tersimpan</div></div>
            </div>
          </div>
        </div>

        {/* Filter + Search */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / lokasi / code / ICAO…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
          <select value={kodau} onChange={(e) => setKodau(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option value="">Semua Kodau</option>{KODAU_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}</select>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-600"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>Memuat data pangkalan...</div>
        ) : airbases.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Belum ada data pangkalan. Klik tombol tambah untuk membuat data baru.</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Pangkalan</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Kodau</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Koordinat</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Stok Avtur</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Apron</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {airbases.map((base) => {
                    const avturPercent = Number(base.avtur_capacity_liters || 0) ? (Number(base.avtur_stock_liters || 0) / Number(base.avtur_capacity_liters || 1)) * 100 : 0;
                    const badge = getStatusBadge(base.status || 'optimal');
                    return (
                      <tr key={base.id} className="hover:bg-blue-50/40 transition">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{base.name}</div>
                          <div className="text-xs text-slate-500">{base.location || '—'} {base.code ? `· ${base.code}` : ''} {base.icao ? `· ${base.icao}` : ''} · {base.tipe ? `Tipe ${base.tipe}` : ''} {base.runway_m ? `· ${base.runway_m}m` : ''}</div>
                        </td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${base.kodau === 'Kodau I' ? 'border-sky-200 bg-sky-50 text-sky-700' : base.kodau === 'Kodau II' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{base.kodau || '—'}</span></td>
                        <td className="px-4 py-3"><div className="font-mono text-xs text-slate-700">{base.latitude != null && base.longitude != null ? `${Number(base.latitude).toFixed(4)}, ${Number(base.longitude).toFixed(4)}` : '—'}</div><div className="text-[11px] text-slate-500">{base.latitude != null ? toDMS(base.latitude, base.longitude) : ''}</div></td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${badge.color}`}>{badge.text}</span></td>
                        <td className="px-4 py-3 min-w-[170px]"><div className="flex justify-between text-sm text-slate-700 mb-1"><span>{avturPercent.toFixed(0)}%</span><span>{(Number(base.avtur_stock_liters || 0) / 1000).toFixed(0)}K L</span></div><div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full ${base.alert_below_15 ? 'bg-red-500' : base.needs_reorder ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(avturPercent, 100)}%` }} /></div><div className="mt-1 flex gap-1 text-[10px] leading-none">{base.alert_below_15 && <span className="rounded bg-red-100 px-1.5 py-0.5 font-bold text-red-700">{'<'}15%!</span>}{base.needs_reorder && !base.alert_below_15 && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700">reorder</span>}</div></td>
                        <td className="px-4 py-3 text-sm text-slate-700">{base.apron_used_live ?? base.apron_used ?? 0} / {base.apron_capacity_aircraft || 0}</td>
                        <td className="px-4 py-3"><div className="flex justify-end gap-1"><button onClick={() => openDetail(base)} className="px-2.5 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200">Detail</button><button onClick={() => openForm(base)} className="px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">Edit</button><button onClick={() => deleteBase(base.id)} className="px-2.5 py-1.5 text-xs bg-red-50 text-red-700 rounded-md hover:bg-red-100">Hapus</button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          </div>
        )}
      </div>
    </PageShell>

      {detailBase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setDetailBase(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-900">{detailBase.name}</h3><p className="text-xs text-slate-500">{detailBase.kodau || '—'} · {detailBase.code || '-'} · {detailBase.icao || '-'} · {detailBase.latitude != null ? `${Number(detailBase.latitude).toFixed(4)}, ${Number(detailBase.longitude).toFixed(4)}` : '—'} · {detailBase.avtur_percent ?? '-'}% Avtur · {detailBase.apron_used_live ?? detailBase.apron_used ?? 0}/{detailBase.apron_capacity_aircraft ?? 0} apron</p><p className="text-xs text-slate-500">{detailBase.location || '—'}</p></div><button onClick={()=>setDetailBase(null)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm">Tutup</button></div>
            <div className="mt-4 flex gap-2"><input type="number" placeholder="Refill liter" value={refillLiters} onChange={(e)=>setRefillLiters(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2" /><button onClick={doRefill} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">+ Refill</button></div>
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Log Avtur — konsumsi per misi = total_fuel_liters atau predicted/60×2200L</div>
              {detailLoading ? <div className="py-6 text-center text-sm text-slate-500">Memuat log…</div> : avturLogs.length===0 ? <div className="py-6 text-center text-sm text-slate-500">Belum ada log.</div> : (
                <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left text-xs">Waktu</th><th className="px-3 py-2 text-right text-xs">Δ (L)</th><th className="px-3 py-2 text-right text-xs">Sisa</th><th className="px-3 py-2 text-left text-xs">Alasan / Misi</th></tr></thead><tbody className="divide-y">{avturLogs.map(r=>(<tr key={r.id}><td className="px-3 py-2 text-xs">{r.created_at ? new Date(r.created_at).toLocaleString('id-ID') : '-'}</td><td className={`px-3 py-2 text-right font-mono text-xs ${Number(r.delta_liters)<0?'text-red-600':'text-emerald-600'}`}>{Number(r.delta_liters)>0?'+':''}{Number(r.delta_liters).toFixed(0)}</td><td className="px-3 py-2 text-right font-mono text-xs">{Number(r.stock_after_liters).toFixed(0)}</td><td className="px-3 py-2 text-xs">{r.reason}{r.mission_id?` #${r.mission_id}`:''}</td></tr>))}</tbody></table></div>
              )}
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-blue-900 mb-5">{form.id ? 'Edit Pangkalan' : 'Tambah Pangkalan'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Pangkalan</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Contoh: Lanud Iswahjudi" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Contoh: Madiun, Jawa Timur" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kodau</label>
                <select value={form.kodau} onChange={(e) => setForm({ ...form, kodau: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  {KODAU_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipe</label>
                <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Code (3 huruf)</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().slice(0,4) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" placeholder="HLM" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ICAO</label>
                <input value={form.icao} onChange={(e) => setForm({ ...form, icao: e.target.value.toUpperCase().slice(0,5) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" placeholder="WIHH" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude</label>
                <input type="number" step="0.0001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="-6.2644" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude</label>
                <input type="number" step="0.0001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="106.8958" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Runway (m)</label>
                <input type="number" value={form.runway_m} onChange={(e) => setForm({ ...form, runway_m: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Elevasi (m)</label>
                <input type="number" value={form.elev_m} onChange={(e) => setForm({ ...form, elev_m: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="optimal">Optimal</option><option value="warning">Waspada</option><option value="critical">Kritis</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kapasitas Avtur (L)</label>
                <input type="number" value={form.avtur_capacity_liters} onChange={(e) => setForm({ ...form, avtur_capacity_liters: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stok Avtur (L)</label>
                <input type="number" value={form.avtur_stock_liters} onChange={(e) => setForm({ ...form, avtur_stock_liters: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stok Oli Khusus (L)</label>
                <input type="number" value={form.special_lube_stock_liters} onChange={(e) => setForm({ ...form, special_lube_stock_liters: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Truk</label>
                <input type="number" value={form.refueler_trucks_count} onChange={(e) => setForm({ ...form, refueler_trucks_count: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Truk Aktif</label>
                <input type="number" value={form.refueler_trucks_active} onChange={(e) => setForm({ ...form, refueler_trucks_active: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Forklift</label>
                <input type="number" value={form.forklifts_count} onChange={(e) => setForm({ ...form, forklifts_count: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kapasitas Apron</label>
                <input type="number" value={form.apron_capacity_aircraft} onChange={(e) => setForm({ ...form, apron_capacity_aircraft: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Apron Terpakai <span className="text-xs font-normal text-slate-500">(otomatis)</span></label>
                <input type="number" value={form.apron_used} disabled className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500" />
                <p className="mt-1 text-xs text-slate-500">Live dari aircraft_units.airbase_id.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300">Batal</button>
              <button disabled={saving} onClick={saveBase} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60">{saving ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
