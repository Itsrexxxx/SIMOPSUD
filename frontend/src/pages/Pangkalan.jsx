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

const KODAU_OPTIONS = ['Kodau I', 'Kodau II', 'Kodau III', 'Kodiklatau'];

const STATUS_TONE = { optimal: 'var(--status-aman)', warning: 'var(--status-waspada)', critical: 'var(--status-kritis)' };
const STATUS_TEXT = { optimal: 'Optimal', warning: 'Waspada', critical: 'Kritis' };

const fmtNum = (v, suffix = '') => (v == null || v === '' ? '—' : `${Number(v).toLocaleString('id-ID')}${suffix}`);

const FacilityStat = ({ label, value, tone }) => (
  <div>
    <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
    <p className="mt-0.5 font-mono text-sm tabular-nums" style={{ color: tone || 'var(--text-primary)' }}>{value}</p>
  </div>
);

function Chip({ tone, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
      {tone && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: tone }} />}
      {children}
    </span>
  );
}

function Meter({ label, pct, display, tone, note }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>{label}</span>
        <span className="tabular-nums">{display}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-container)' }}>
        <div className="h-full" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: tone }} />
      </div>
      {note && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{note}</p>}
    </div>
  );
}

function formatStamp(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

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
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('nama');
  const [stats, setStats] = useState(null);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [debouncedQ, kodau, statusFilter]);

  const loadAirbases = async () => {
    try {
      setError(null);
      const params = { skip: (page - 1) * pageSize, limit: pageSize };
      if (debouncedQ) params.q = debouncedQ;
      if (kodau) params.kodau = kodau;
      if (statusFilter) params.status = statusFilter;
      const [airbaseResponse, aircraftResponse, statsResponse] = await Promise.all([
        airbaseAPI.getAll(params),
        aircraftAPI.getUnits({ limit: 100 }),
        airbaseAPI.getStats().catch(() => null),
      ]);
      setStats(statsResponse?.data ?? null);
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

  useEffect(() => { setLoading(true); loadAirbases(); /* eslint-disable-next-line */ }, [page, pageSize, debouncedQ, kodau, statusFilter]);

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
    const num = (v) => (v === '' || v == null ? null : Number(v));
    if (!form.name.trim()) { alert('Nama pangkalan wajib diisi.'); return; }
    const code = form.code.trim().toUpperCase();
    if (code.length < 3 || code.length > 4) { alert('Kode lanud wajib 3-4 huruf (dipakai marker Situational Overview).'); return; }
    const icao = form.icao.trim().toUpperCase();
    if (icao && icao.length !== 4) { alert('ICAO harus 4 huruf, atau kosongkan.'); return; }
    const lat = num(form.latitude), lon = num(form.longitude);
    if (lat == null || lon == null) { alert('Latitude dan longitude wajib diisi.'); return; }
    if (lat === 0 && lon === 0) { alert('Koordinat 0,0 bukan lokasi lanud. Isi koordinat sebenarnya.'); return; }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) { alert('Koordinat tidak valid.'); return; }
    const cap = num(form.avtur_capacity_liters), stock = num(form.avtur_stock_liters);
    if (!cap || cap <= 0) { alert('Kapasitas avtur wajib > 0.'); return; }
    if (stock == null || stock < 0 || stock > cap) { alert('Stok avtur harus antara 0 dan kapasitas.'); return; }
    const trucks = num(form.refueler_trucks_count) ?? 0, active = num(form.refueler_trucks_active) ?? 0;
    if (active > trucks) { alert('Truk aktif tidak boleh melebihi jumlah truk.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        code,
        icao: icao || null,
        latitude: lat,
        longitude: lon,
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

  // agregat dari /airbase/stats (seluruh armada), bukan slice halaman
  const st = stats || {};
  const countBy = (v) => airbases.filter((b) => (b.status || 'optimal') === v).length;
  const sumBy = (key) => airbases.reduce((acc, b) => acc + Number(b[key] || 0), 0);
  const totalBases = st.total ?? total ?? airbases.length;
  const totalOperational = st.optimal ?? countBy('optimal');
  const totalWarning = st.warning ?? countBy('warning');
  const totalCritical = st.critical ?? countBy('critical');
  const totalAvturCapacity = st.avtur_capacity ?? sumBy('avtur_capacity_liters');
  const totalAvturStock = st.avtur_stock ?? sumBy('avtur_stock_liters');
  const avgAvtur = totalAvturCapacity > 0 ? Math.round((totalAvturStock / totalAvturCapacity) * 100) : 0;
  const totalRefuelingTrucks = st.trucks ?? sumBy('refueler_trucks_count');
  const activeRefuelingTrucks = st.trucks_active ?? sumBy('refueler_trucks_active');
  const truckReadiness = totalRefuelingTrucks > 0 ? Math.round((activeRefuelingTrucks / totalRefuelingTrucks) * 100) : 0;
  const totalApronCapacity = st.apron_capacity ?? sumBy('apron_capacity_aircraft');
  const totalApronUsed = st.apron_used ?? sumBy('apron_used');
  const apronUtilization = totalApronCapacity > 0 ? Math.round((totalApronUsed / totalApronCapacity) * 100) : 0;
  const totalStationedAircraft = st.apron_used ?? aircraftUnits.filter((u) => u.airbase_id != null).length;
  const below15 = st.below_15 ?? airbases.filter((b) => b.alert_below_15).length;
  const reorderNeeded = st.reorder_needed ?? airbases.filter((b) => b.needs_reorder).length;
  const below15Count = st.below_15 ?? airbases.filter((b) => b.alert_below_15).length;

  // urut klien-side, hanya dalam halaman aktif (API sudah paginasi)
  const ratio = (a, b) => (Number(a || 0) / (Number(b || 0) || 1));
  const sortedBases = [...airbases].sort((a, b) => {
    if (sortBy === 'avtur') return ratio(a.avtur_stock_liters, a.avtur_capacity_liters) - ratio(b.avtur_stock_liters, b.avtur_capacity_liters);
    if (sortBy === 'apron') return ratio(b.apron_used_live ?? b.apron_used, b.apron_capacity_aircraft) - ratio(a.apron_used_live ?? a.apron_used, a.apron_capacity_aircraft);
    return (a.name || '').localeCompare(b.name || '', 'id');
  });

  // status derived, ambang sama dengan backend _compute_status
  const previewStatus = (() => {
    const cap = Number(form.avtur_capacity_liters || 0);
    const pct = cap > 0 ? (Number(form.avtur_stock_liters || 0) / cap) * 100 : 0;
    const trucks = Number(form.refueler_trucks_count || 0);
    const active = Number(form.refueler_trucks_active || 0);
    const apronCap = Number(form.apron_capacity_aircraft || 0);
    const apronUsed = Number(form.apron_used || 0);
    if (pct < 30 || (trucks > 0 && active === 0) || (apronCap > 0 && apronUsed >= apronCap)) return 'critical';
    if (pct < 60 || (trucks > 0 && active / trucks < 0.5) || (apronCap > 0 && apronUsed / apronCap >= 0.8)) return 'warning';
    return 'optimal';
  })();

  return (
    <div>
      <PageShell title="Data Pangkalan Udara" subtitle="Monitoring kapasitas logistik, operasional, dan fasilitas tiap lanud — Avtur & apron live" actions={<button onClick={() => openForm()} className="rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ background: 'var(--primary)', color: 'var(--on-primary, #ffffff)' }}>Tambah pangkalan</button>}>
      <div>
        {(below15 > 0 || reorderNeeded > 0) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {below15 > 0 && <Chip tone="var(--status-kritis)">{below15} lanud di bawah 15% avtur</Chip>}
            {reorderNeeded > 0 && <Chip tone="var(--status-waspada)">{reorderNeeded} lanud butuh reorder</Chip>}
          </div>
        )}
        <div className="mb-6 overflow-hidden rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }}>
          <div className="grid grid-cols-2 divide-x divide-y lg:grid-cols-4" style={{ borderColor: 'var(--card-border)' }}>
            <div className="p-4 sm:p-5">
              <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}><span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--text-muted)' }} aria-hidden="true">location_on</span>Total Pangkalan</p>
              <div className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>{totalBases}</div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{totalStationedAircraft} pesawat · {totalBases} lanud</p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}><span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--text-muted)' }} aria-hidden="true">verified</span>Status Operasional</p>
              <div className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>{totalOperational}</div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{totalBases > 0 ? Math.round((totalOperational / totalBases) * 100) : 0}% optimal</p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}><span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--text-muted)' }} aria-hidden="true">local_gas_station</span>Stok Avtur</p>
              <div className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>{avgAvtur}%</div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{(totalAvturStock/1000).toFixed(0)}K / {(totalAvturCapacity/1000).toFixed(0)}K L</p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}><span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--text-muted)' }} aria-hidden="true">local_shipping</span>Kesiapan Kendaraan</p>
              <div className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>{truckReadiness}%</div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{activeRefuelingTrucks}/{totalRefuelingTrucks} truk</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }}>
            <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: 'var(--card-border)' }}><h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Distribusi Status Pangkalan</h3><p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Optimal / Waspada / Kritis</p></div>
            <div className="space-y-3 p-4 sm:p-5">
              <Meter label="Optimal" pct={totalBases > 0 ? (totalOperational / totalBases) * 100 : 0} display={`${totalOperational} lanud`} tone="var(--status-aman)" note={totalBases > 0 ? `${Math.round((totalOperational / totalBases) * 100)}% dari ${totalBases} lanud` : ''} />
              <Meter label="Waspada" pct={totalBases > 0 ? (totalWarning / totalBases) * 100 : 0} display={`${totalWarning} lanud`} tone="var(--status-waspada)" note={totalBases > 0 ? `${Math.round((totalWarning / totalBases) * 100)}% dari ${totalBases} lanud` : ''} />
              <Meter label="Kritis" pct={totalBases > 0 ? (totalCritical / totalBases) * 100 : 0} display={`${totalCritical} lanud`} tone="var(--status-kritis)" note={totalBases > 0 ? `${Math.round((totalCritical / totalBases) * 100)}% dari ${totalBases} lanud` : ''} />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }}>
            <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: 'var(--card-border)' }}><h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Metrik Penggunaan Fasilitas</h3><p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Apron & Avtur</p></div>
            <div className="space-y-4 p-4 sm:p-5">
              <Meter label="Penggunaan Apron" pct={apronUtilization} display={`${apronUtilization}%`} tone="var(--primary)" note={`${totalApronUsed} dari ${totalApronCapacity} bay terpakai`} />
              <Meter label="Kesiapan Truk Refueler" pct={truckReadiness} display={`${truckReadiness}%`} tone="var(--secondary)" note={`${activeRefuelingTrucks} dari ${totalRefuelingTrucks} truk siap`} />
              <Meter label="Stok Avtur Nasional" pct={avgAvtur} display={`${avgAvtur}%`} tone={avgAvtur < 30 ? 'var(--status-kritis)' : avgAvtur < 60 ? 'var(--status-waspada)' : 'var(--status-aman)'} note={`${reorderNeeded} lanud di bawah titik reorder (15% kapasitas)`} />
            </div>
          </div>
        </div>

        {/* Filter + Search */}
        <div className="filter-bar mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px]" style={{ color: 'var(--text-muted)' }} aria-hidden="true">search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, lokasi, kode, atau ICAO" aria-label="Cari pangkalan" className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2" style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
          </div>
          <select value={kodau} onChange={(e) => setKodau(e.target.value)} aria-label="Filter Kodau" className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}><option value="">Semua Kodau</option>{KODAU_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}</select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter Status" className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}><option value="">Semua status</option><option value="optimal">Optimal</option><option value="warning">Waspada</option><option value="critical">Kritis</option></select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Urutkan" className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}><option value="nama">Urut: Nama</option><option value="avtur">Urut: Avtur terendah</option><option value="apron">Urut: Apron terpakai</option></select>
        </div>

        {error && <div className="mb-6 rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--status-kritis)', background: 'var(--status-kritis-bg)', color: 'var(--status-kritis)' }}>{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}><div className="mr-3 h-8 w-8 animate-spin rounded-full border-b-2" style={{ borderColor: 'var(--primary)' }}></div>Memuat data pangkalan...</div>
        ) : airbases.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Belum ada data pangkalan. Klik tombol tambah untuk membuat data baru.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <div className="overflow-x-auto table-wrap">
              <table className="w-full min-w-[1080px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Pangkalan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Kodau</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Koordinat</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Stok Avtur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Apron</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedBases.map((base) => {
                    const avturPercent = Number(base.avtur_capacity_liters || 0) ? (Number(base.avtur_stock_liters || 0) / Number(base.avtur_capacity_liters || 1)) * 100 : 0;
                    return (
                      <tr key={base.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{base.name}</div>
                          <div className="text-xs text-slate-500">{base.location || '—'} {base.code ? `· ${base.code}` : ''} {base.icao ? `· ${base.icao}` : ''} · {base.tipe ? `Tipe ${base.tipe}` : ''} {base.runway_m ? `· ${base.runway_m}m` : ''}</div>
                        </td>
                        <td className="px-4 py-3"><Chip>{base.kodau || '—'}</Chip></td>
                        <td className="px-4 py-3"><div className="font-mono text-xs text-slate-700">{base.latitude != null && base.longitude != null ? `${Number(base.latitude).toFixed(4)}, ${Number(base.longitude).toFixed(4)}` : '—'}</div><div className="text-[11px] text-slate-500">{base.latitude != null ? toDMS(base.latitude, base.longitude) : ''}</div></td>
                        <td className="px-4 py-3"><Chip tone={STATUS_TONE[base.status || 'optimal']}>{STATUS_TEXT[base.status || 'optimal']}</Chip></td>
                        <td className="px-4 py-3 min-w-[170px]">
                          <div className="flex justify-between text-sm mb-1 tabular-nums" style={{ color: 'var(--text-secondary)' }}><span>{avturPercent.toFixed(0)}%</span><span>{(Number(base.avtur_stock_liters || 0) / 1000).toFixed(0)}K L</span></div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-container)' }}><div className="h-full" style={{ width: `${Math.min(avturPercent, 100)}%`, background: base.alert_below_15 ? 'var(--status-kritis)' : base.needs_reorder ? 'var(--status-waspada)' : 'var(--primary)' }} /></div>
                          {(base.alert_below_15 || base.needs_reorder) && <div className="mt-1 text-[11px] leading-none" style={{ color: base.alert_below_15 ? 'var(--status-kritis)' : 'var(--status-waspada)' }}>{base.alert_below_15 ? 'di bawah 15%' : 'reorder'}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{base.apron_used_live ?? base.apron_used ?? 0} / {base.apron_capacity_aircraft || 0}</td>
                        <td className="px-4 py-3"><div className="flex justify-end gap-1"><button onClick={() => openDetail(base)} className="rounded-md border px-2.5 py-1.5 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>Detail</button><button onClick={() => openForm(base)} className="rounded-md border px-2.5 py-1.5 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>Edit</button><button onClick={() => deleteBase(base.id)} className="rounded-md border px-2.5 py-1.5 text-xs" style={{ borderColor: 'var(--card-border)', color: 'color-mix(in srgb, var(--status-kritis) 85%, #ffffff)' }}>Hapus</button></div></td>
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border p-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }} onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{detailBase.name}</h3><p className="text-xs text-slate-500">{detailBase.kodau || '—'} · <span className="font-mono">{detailBase.code || '—'}</span> · <span className="font-mono">{detailBase.icao || '—'}</span>{detailBase.tipe ? ` · Tipe ${detailBase.tipe}` : ''}{detailBase.runway_m ? ` · RWY ${fmtNum(detailBase.runway_m)} m` : ''}{detailBase.elev_m ? ` · Elev ${fmtNum(detailBase.elev_m)} m` : ''}</p>
              <p className="text-xs text-slate-500">{detailBase.latitude != null && detailBase.longitude != null ? `${Number(detailBase.latitude).toFixed(4)}, ${Number(detailBase.longitude).toFixed(4)}` : 'Koordinat belum diisi'} · {detailBase.latitude != null ? 'lihat Situational Overview' : ''}</p><p className="text-xs text-slate-500">{detailBase.location || '—'}</p></div><button onClick={()=>setDetailBase(null)} className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>Tutup</button></div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-3 sm:grid-cols-4" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-muted, var(--input-bg))' }}>
              <FacilityStat label="Stok Avtur" value={`${fmtNum(detailBase.avtur_stock_liters)} / ${fmtNum(detailBase.avtur_capacity_liters)} L`} tone={detailBase.alert_below_15 ? 'var(--status-kritis)' : detailBase.needs_reorder ? 'var(--status-waspada)' : undefined} />
              <FacilityStat label="Titik Reorder" value={fmtNum(detailBase.reorder_point_liters, ' L')} />
              <FacilityStat label="Oli Khusus" value={fmtNum(detailBase.special_lube_stock_liters, ' L')} />
              <FacilityStat label="Forklift" value={fmtNum(detailBase.forklifts_count)} />
              <FacilityStat label="Truk Refueler" value={`${fmtNum(detailBase.refueler_trucks_active)} / ${fmtNum(detailBase.refueler_trucks_count)}`} tone={detailBase.refueler_trucks_count > 0 && !detailBase.refueler_trucks_active ? 'var(--status-kritis)' : undefined} />
              <FacilityStat label="Apron Terpakai" value={`${fmtNum(detailBase.apron_used_live ?? detailBase.apron_used)} / ${fmtNum(detailBase.apron_capacity_aircraft)}`} />
              <FacilityStat label="Taxi Time" value={fmtNum(detailBase.taxi_time_minutes, ' mnt')} />
              <FacilityStat label="Minima Alternat" value={detailBase.alternate_minima_ceiling_ft != null ? `${fmtNum(detailBase.alternate_minima_ceiling_ft, ' ft')} / ${fmtNum(detailBase.alternate_minima_vis_m, ' m')}` : '—'} />
            </div>
            <div className="mt-4 flex gap-2"><input type="number" placeholder="Refill liter" aria-label="Jumlah refill liter" value={refillLiters} onChange={(e)=>setRefillLiters(e.target.value)} className="flex-1 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} /><button onClick={doRefill} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: 'var(--primary)', color: 'var(--on-primary, #ffffff)' }}>Refill</button></div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium text-slate-500">Log avtur. Konsumsi per misi memakai total_fuel_liters.</div>
              {detailLoading ? <div className="py-6 text-center text-sm text-slate-500">Memuat log…</div> : avturLogs.length===0 ? <div className="py-6 text-center text-sm text-slate-500">Belum ada log.</div> : (
                <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left text-xs">Waktu</th><th className="px-3 py-2 text-right text-xs">Δ (L)</th><th className="px-3 py-2 text-right text-xs">Sisa</th><th className="px-3 py-2 text-left text-xs">Alasan / Misi</th></tr></thead><tbody className="divide-y">{avturLogs.map(r=>(<tr key={r.id}><td className="px-3 py-2 text-xs tabular-nums">{formatStamp(r.created_at)}</td><td className="px-3 py-2 text-right font-mono text-xs tabular-nums" style={{ color: Number(r.delta_liters)<0?'var(--status-kritis)':'var(--status-aman)' }}>{Number(r.delta_liters)>0?'+':''}{Number(r.delta_liters).toFixed(0)}</td><td className="px-3 py-2 text-right font-mono text-xs">{Number(r.stock_after_liters).toFixed(0)}</td><td className="px-3 py-2 text-xs">{r.reason}{r.mission_id?` #${r.mission_id}`:''}</td></tr>))}</tbody></table></div>
              )}
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border p-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <h2 className="mb-5 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{form.id ? 'Edit Pangkalan' : 'Tambah Pangkalan'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-600 mb-2">Nama Pangkalan</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Contoh: Lanud Iswahjudi" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-600 mb-2">Lokasi</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Contoh: Madiun, Jawa Timur" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Kodau</label>
                <select value={form.kodau} onChange={(e) => setForm({ ...form, kodau: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  {KODAU_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Tipe</label>
                <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="Perwakilan">Perwakilan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Kode Lanud (3 huruf)</label>
                <input required maxLength={4} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0,4) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" placeholder="HLP" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">ICAO</label>
                <input maxLength={4} value={form.icao} onChange={(e) => setForm({ ...form, icao: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0,4) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" placeholder="WIHH" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Latitude</label>
                <input type="number" step="0.0001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="-6.2644" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Longitude</label>
                <input type="number" step="0.0001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="106.8958" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Runway (m)</label>
                <input type="number" value={form.runway_m} onChange={(e) => setForm({ ...form, runway_m: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Elevasi (m)</label>
                <input type="number" value={form.elev_m} onChange={(e) => setForm({ ...form, elev_m: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <p className="block text-sm font-semibold text-slate-600 mb-2">Status (otomatis)</p>
                <div className="flex h-[42px] items-center"><Chip tone={STATUS_TONE[previewStatus]}>{STATUS_TEXT[previewStatus]}</Chip></div>
                <p className="mt-1 text-xs text-slate-500">Dihitung dari avtur, truk aktif, dan apron.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Kapasitas Avtur (L)</label>
                <input type="number" value={form.avtur_capacity_liters} onChange={(e) => setForm({ ...form, avtur_capacity_liters: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Stok Avtur (L)</label>
                <input type="number" value={form.avtur_stock_liters} onChange={(e) => setForm({ ...form, avtur_stock_liters: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Stok Oli Khusus (L)</label>
                <input type="number" value={form.special_lube_stock_liters} onChange={(e) => setForm({ ...form, special_lube_stock_liters: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Jumlah Truk</label>
                <input type="number" value={form.refueler_trucks_count} onChange={(e) => setForm({ ...form, refueler_trucks_count: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Truk Aktif</label>
                <input type="number" value={form.refueler_trucks_active} onChange={(e) => setForm({ ...form, refueler_trucks_active: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Jumlah Forklift</label>
                <input type="number" value={form.forklifts_count} onChange={(e) => setForm({ ...form, forklifts_count: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Kapasitas Apron</label>
                <input type="number" value={form.apron_capacity_aircraft} onChange={(e) => setForm({ ...form, apron_capacity_aircraft: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Apron Terpakai <span className="text-xs font-normal text-slate-500">(otomatis)</span></label>
                <input type="number" value={form.apron_used} disabled className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500" />
                <p className="mt-1 text-xs text-slate-500">Live dari aircraft_units.airbase_id.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }} className="rounded-lg border px-4 py-2 font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>Batal</button>
              <button disabled={saving} onClick={saveBase} className="rounded-lg px-4 py-2 font-semibold disabled:opacity-60" style={{ background: 'var(--primary)', color: 'var(--on-primary, #ffffff)' }}>{saving ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
