
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { aircraftAPI, airbaseAPI, flightMissionAPI } from '../api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  ready: '#22c55e',
  maintenance: '#f59e0b',
  grounding: '#ef4444',
  avturStock: '#0ea5e9',
  avturCap: '#e0f2fe',
  missions: ['#1e3a8a', '#0ea5e9', '#22c55e', '#f59e0b'],
};

function Kpi({ label, value, sub, accent, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <span className="text-lg leading-none opacity-60" aria-hidden="true">{icon}</span>
      </div>
      <div className={`mt-2 text-3xl font-extrabold tracking-tight ${accent || 'text-slate-900'}`}>{value}</div>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Card({ title, subtitle, children, right }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [units, setUnits] = useState([]);
  const [bases, setBases] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const errs = [];
      const [uRes, bRes, mRes] = await Promise.all([
        aircraftAPI.getUnits().catch((e) => { errs.push(e?.message || 'Pesawat'); return { data: [] }; }),
        airbaseAPI.getAll().catch((e) => { errs.push(e?.message || 'Pangkalan'); return { data: [] }; }),
        flightMissionAPI.getAll().catch((e) => { errs.push(e?.message || 'Misi'); return { data: [] }; }),
      ]);
      if (errs.length) setErr(errs.join(' · '));
      setUnits(Array.isArray(uRes.data) ? uRes.data : []);
      setBases(Array.isArray(bRes.data) ? bRes.data : []);
      setMissions(Array.isArray(mRes.data) ? mRes.data : []);
      setLastUpdate(new Date());
    } catch (e) {
      setErr(e?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const ready = units.filter((x) => x.status === 'S').length;
    const us = units.filter((x) => x.status === 'U/S').length;
    const fuelRisk = bases.filter((b) => {
      const cap = Number(b.avtur_capacity_liters || 0);
      const stock = Number(b.avtur_stock_liters || 0);
      return cap > 0 && stock / cap <= 0.3;
    }).length;
    const totalHours = units.reduce((s, x) => s + Number(x.accumulated_flight_hours || 0), 0);
    const avgHours = units.length ? totalHours / units.length : 0;
    const readyPct = units.length ? (ready / units.length) * 100 : 0;
    return { ready, maintenance: us, grounding: 0, criticalHours: us, fuelRisk, totalHours, avgHours, readyPct };
  }, [units, bases]);

  const statusPie = useMemo(() => [
    { name: 'S', value: stats.ready, color: COLORS.ready },
    { name: 'U/S', value: stats.maintenance, color: COLORS.grounding },
  ].filter((d) => d.value > 0), [stats]);

  const perLanud = useMemo(() => {
    const map = new Map(bases.map((b) => [b.id, { name: b.name.replace(/^Lanud\s+/i, ''), total: 0, ready: 0 }]));
    for (const u of units) {
      if (u.airbase_id != null && map.has(u.airbase_id)) {
        const e = map.get(u.airbase_id);
        e.total += 1;
        if (u.status === 'S') e.ready += 1;
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  }, [units, bases]);

  const avturChart = useMemo(() => bases.slice(0, 8).map((b) => ({
    name: b.name.replace(/^Lanud\s+/i, '').slice(0, 12),
    kapasitas: Math.round(Number(b.avtur_capacity_liters || 0) / 1000),
    stok: Math.round(Number(b.avtur_stock_liters || 0) / 1000),
    pct: Number(b.avtur_capacity_liters || 0) ? Math.round((Number(b.avtur_stock_liters || 0) / Number(b.avtur_capacity_liters || 1)) * 100) : 0,
  })), [bases]);

  const missionByStatus = useMemo(() => {
    const counts = {};
    for (const m of missions) counts[m.status] = (counts[m.status] || 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [missions]);

  const topHours = useMemo(() => [...units].sort((a, b) => Number(b.accumulated_flight_hours || 0) - Number(a.accumulated_flight_hours || 0)).slice(0, 8).map((u) => {
    const phase = Number(u.aircraft_type?.phase_interval_hours || 300);
    const hs = Number(u.accumulated_flight_hours || 0) - Number(u.last_service_hours || 0);
    const rem = phase - hs;
    return { name: u.tail_number, jam: Number(Number(u.accumulated_flight_hours || 0).toFixed(1)), status: u.status, nearing: rem > 0 && rem <= 30 };
  }), [units]);

  const alerts = useMemo(() => {
    const list = [];
    const crit = units.find((a) => a.status === 'U/S');
    if (crit) {
      const hs = Number(crit.accumulated_flight_hours || 0) - Number(crit.last_service_hours || 0);
      const phase = Number(crit.aircraft_type?.phase_interval_hours || 300);
      list.push({ tone: 'critical', title: `${crit.tail_number} — U/S`, desc: `Harwat: ${hs.toFixed(1)} j sejak servis terakhir / Phase ${phase} j — jadwalkan harwat.` });
    } else {
      const near = [...units].sort((a, b) => {
        const pa = Number(a.aircraft_type?.phase_interval_hours || 300) - (Number(a.accumulated_flight_hours || 0) - Number(a.last_service_hours || 0));
        const pb = Number(b.aircraft_type?.phase_interval_hours || 300) - (Number(b.accumulated_flight_hours || 0) - Number(b.last_service_hours || 0));
        return pa - pb;
      }).find((a) => {
        const hs = Number(a.accumulated_flight_hours || 0) - Number(a.last_service_hours || 0);
        const rem = Number(a.aircraft_type?.phase_interval_hours || 300) - hs;
        return rem > 0 && rem <= 30;
      });
      if (near) {
        const hs = Number(near.accumulated_flight_hours || 0) - Number(near.last_service_hours || 0);
        const phase = Number(near.aircraft_type?.phase_interval_hours || 300);
        list.push({ tone: 'warn', title: `${near.tail_number} — ${(phase - hs).toFixed(0)} j lagi Phase`, desc: `${hs.toFixed(1)}/${phase} j sejak servis terakhir.` });
      }
    }
    const low = bases.find((b) => Number(b.avtur_capacity_liters || 0) > 0 && Number(b.avtur_stock_liters || 0) / Number(b.avtur_capacity_liters || 1) < 0.3);
    if (low) list.push({ tone: 'critical', title: `Avtur rendah — ${low.name}`, desc: `Stok ${(Number(low.avtur_stock_liters || 0) / 1000).toFixed(0)}K / ${(Number(low.avtur_capacity_liters || 0) / 1000).toFixed(0)}K liter.` });
    if (stats.grounding > 0) list.push({ tone: 'warn', title: `${stats.grounding} pesawat grounded`, desc: 'Perlu tinjau perawatan & ketersediaan suku cadang.' });
    if (missions.filter((m) => m.status === 'In-Flight').length > 0) list.push({ tone: 'info', title: `${missions.filter((m) => m.status === 'In-Flight').length} misi in-flight`, desc: 'Pantau ETA & cuaca tujuan.' });
    if (list.length === 0) list.push({ tone: 'ok', title: 'Sistem normal', desc: `Monitoring ${units.length} pesawat di ${bases.length} pangkalan · ${missions.length} misi terdaftar.` });
    return list.slice(0, 4);
  }, [units, bases, missions, stats.grounding]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-16"><span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" /><span className="ml-3 text-sm text-slate-600">Memuat dashboard…</span></div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">SIMOPSUD — Dashboard Operasional</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Ringkasan Kesiapan & Operasi</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">Semua angka dan grafik diambil langsung dari database (pesawat, pangkalan, misi). Tidak ada data dummy — kosong berarti memang belum ada data.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${err ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              <span className={`h-2 w-2 rounded-full ${err ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />{err ? 'Offline' : 'Live'}
            </span>
            <button onClick={load} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Refresh</button>
          </div>
        </div>
        {lastUpdate && <p className="mt-3 text-xs text-slate-500">Update: {lastUpdate.toLocaleString('id-ID')} WIB · {units.length} pesawat · {bases.length} pangkalan · {missions.length} misi</p>}
        {err && <p className="mt-2 text-xs text-amber-700">{err}</p>}
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon="✈" label="Kesiapan Alutsista" value={`${stats.readyPct.toFixed(1)}%`} sub={`${stats.ready}/${units.length} S · ${stats.maintenance} U/S`} accent={stats.readyPct < 60 ? 'text-amber-600' : 'text-emerald-600'} />
        <Kpi icon="⏱" label="Rata-rata Jam Terbang" value={`${stats.avgHours.toFixed(1)} j`} sub={`Total ${stats.totalHours.toFixed(0)} j · ${stats.criticalHours} U/S (harwat)`} accent={stats.criticalHours ? 'text-red-600' : 'text-slate-900'} />
        <Kpi icon="⛽" label="Risiko Avtur" value={`${stats.fuelRisk} pangkalan`} sub={`${bases.length} pangkalan dipantau · ambang &lt;30%`} accent={stats.fuelRisk ? 'text-red-600' : 'text-emerald-600'} />
        <Kpi icon="🗺" label="Misi Aktif" value={`${missions.length}`} sub={`${missions.filter((m) => m.status === 'Scheduled').length} scheduled · ${missions.filter((m) => m.status === 'In-Flight').length} in-flight · ${missions.filter((m) => m.status === 'Arrived').length} arrived`} />
      </div>

      {/* Row 1: Status pie + Pesawat per Lanud */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Komposisi Status Armada" subtitle="Proporsi S / U/S (harwat real-time). Sumber: derived dari TBO/Phase/Kalender">
          {statusPie.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Belum ada data pesawat.</p> : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3}>
                    {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} pesawat`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card title="Pesawat per Pangkalan" subtitle="Jumlah total & yang Ready per Lanud (top 8). Sumber: aircraft_units.airbase_id">
          {perLanud.length === 0 || perLanud.every((x) => x.total === 0) ? <p className="py-10 text-center text-sm text-slate-500">Belum ada penempatan pesawat di pangkalan.</p> : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={perLanud} margin={{ top: 6, right: 12, left: -10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-14} textAnchor="end" height={56} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="ready" name="Ready" fill="#22c55e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Avtur + Misi */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Stok Avtur per Pangkalan" subtitle="Kapasitas vs stok (ribu liter). Bar tipis = stok menipis. Ambang risiko &lt;30%.">
          {avturChart.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Belum ada data pangkalan.</p> : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={avturChart} margin={{ top: 6, right: 12, left: -10, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-22} textAnchor="end" interval={0} height={60} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}K`} />
                  <Tooltip formatter={(v, n) => [`${v}K L`, n]} />
                  <Legend />
                  <Bar dataKey="kapasitas" name="Kapasitas" fill="#dbeafe" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="stok" name="Stok" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card title="Misi Penerbangan per Status" subtitle="Distribusi Scheduled / In-Flight / Arrived / Diverted. Sumber: flight_missions.">
          {missionByStatus.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-500">Belum ada misi terdaftar.</p>
              <Link to="/misi-penerbangan" className="mt-2 inline-block text-xs font-semibold text-sky-700 hover:underline">Buat misi di halaman Prediksi ETA →</Link>
            </div>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={missionByStatus} margin={{ top: 6, right: 12, left: -10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Jumlah" radius={[6, 6, 0, 0]}>
                    {missionByStatus.map((_, i) => <Cell key={i} fill={COLORS.missions[i % COLORS.missions.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Top jam + Lanud detail + Alert */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Jam Terbang Tertinggi" subtitle="Top 8 pesawat — bar merah ≥280 j (butuh Phase Check).">
          {topHours.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Belum ada data jam terbang.</p> : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={topHours} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip formatter={(v) => [`${v} jam`, 'Jam']} />
                  <Bar dataKey="jam" radius={[0, 6, 6, 0]}>
                    {topHours.map((r, i) => <Cell key={i} fill={r.jam >= 280 ? '#ef4444' : r.jam >= 220 ? '#f59e0b' : '#0ea5e9'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Kesiapan per Lanud" subtitle="Ready/total · dukungan darat.">
          <div className="divide-y divide-slate-100">
            {bases.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Belum ada pangkalan.</p> : perLanud.length === 0 || perLanud.every((x) => x.total === 0) ? (
              bases.slice(0, 6).map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{b.name}</div><div className="text-xs text-slate-500">{b.location || '—'} · {b.refueler_trucks_active ?? b.refueler_trucks_count ?? 0} truk · {b.forklifts_count ?? 0} forklift</div></div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">0 pesawat</span>
                </div>
              ))
            ) : perLanud.map((h) => {
              const pct = h.total ? (h.ready / h.total) * 100 : 0;
              return (
                <div key={h.name} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{h.name}</div><div className="text-xs text-slate-500">{h.ready}/{h.total} Ready</div></div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-sky-500" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                    <span className="text-xs font-bold text-slate-700">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/pangkalan" className="mt-4 inline-block text-xs font-semibold text-sky-700 hover:underline">Kelola pangkalan →</Link>
        </Card>

        <Card title="Alert Operasional" subtitle="Diturunkan otomatis dari data real.">
          <div className="space-y-3">
            {alerts.map((a, i) => (
              <div key={i} className={`rounded-xl border p-3 ${a.tone === 'critical' ? 'border-red-200 bg-red-50' : a.tone === 'warn' ? 'border-amber-200 bg-amber-50' : a.tone === 'info' ? 'border-sky-200 bg-sky-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/misi-penerbangan" className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Prediksi ETA & Misi →</Link>
        <Link to="/pesawat" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Inventaris Pesawat</Link>
        <Link to="/pangkalan" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Pangkalan & Logistik</Link>
      </div>
    </div>
  );
}
