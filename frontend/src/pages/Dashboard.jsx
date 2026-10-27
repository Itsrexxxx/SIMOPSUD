
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  ready: 'var(--primary)',
  maintenance: 'var(--status-waspada)',
  grounding: 'var(--text-muted)',
  avturStock: 'var(--secondary)',
  avturCap: 'var(--surface-container-highest)',
  missions: ['var(--primary)', 'var(--secondary)', 'var(--surface-container-highest)', 'var(--text-muted)'],
};

// Colour follows the threshold, never decoration: green within limits, amber watch, red act.
const TONE = {
  ok: 'var(--status-optimal)',
  warn: 'var(--status-warning)',
  critical: 'var(--status-critical)',
  none: 'var(--text-primary)',
};

function Kpi({ label, value, sub, tone = 'none', icon }) {
  return (
    <div className="p-4 sm:p-5">
      <p className="flex min-h-[2.25rem] items-start gap-1.5 text-xs font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
        <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--text-muted)' }} aria-hidden="true">{icon}</span>
        {label}
      </p>
      <div className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: TONE[tone] }}>{value}</div>
      {sub && <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
    </div>
  );
}

function Card({ title, subtitle, source, children, right }) {
  return (
    <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5" style={{ borderColor: 'var(--card-border)' }}>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }} title={source}>{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const response = await dashboardAPI.getSummary();
      setSummary(response.data);
      setLastUpdate(new Date());
    } catch (e) {
      setSummary(null);
      setErr(e?.message || 'Gagal memuat ringkasan dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const aircraft = summary?.aircraft || { total: 0, ready: 0, unserviceable: 0, readiness_percent: 0, total_hours: 0, average_hours: 0, per_airbase: [], top_hours: [] };
  const airbases = summary?.airbases || { total: 0, fuel_risk: 0, rows: [], avtur_chart: [] };
  const missions = summary?.missions || { total: 0, active: 0, scheduled: 0, in_flight: 0, arrived: 0, completed: 0, by_status: [] };
  const bases = airbases.rows;
  const stats = { ready: aircraft.ready, maintenance: aircraft.unserviceable, totalHours: aircraft.total_hours, avgHours: aircraft.average_hours, readyPct: aircraft.readiness_percent, fuelRisk: airbases.fuel_risk };
  const readinessTone = stats.readyPct >= 80 ? 'ok' : stats.readyPct >= 60 ? 'warn' : 'critical';
  const statusPie = [
    { name: 'S', value: aircraft.ready, color: COLORS.ready },
    { name: 'U/S', value: aircraft.unserviceable, color: COLORS.grounding },
  ].filter((d) => d.value > 0);
  const perLanud = aircraft.per_airbase;
  const avturChart = airbases.avtur_chart;
  const missionByStatus = missions.by_status;
  const topHours = aircraft.top_hours;
  const alerts = summary?.alerts || [];
  const noPlacement = perLanud.length === 0 || perLanud.every((x) => x.total === 0);

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-16"><span className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--primary)' }} /><span className="ml-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Memuat dashboard…</span></div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Ringkasan kesiapan & operasi</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Semua angka dan grafik diambil langsung dari database (pesawat, pangkalan, misi). Tidak ada data dummy — kosong berarti memang belum ada data.</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={err
                ? { borderColor: 'var(--status-warning)', background: 'var(--status-waspada-bg)', color: 'var(--status-warning)' }
                : { borderColor: 'var(--status-optimal)', background: 'var(--status-aman-bg)', color: 'var(--status-optimal)' }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: err ? 'var(--status-warning)' : 'var(--status-optimal)' }} />
              {err ? 'Offline' : 'Live'}
            </span>
            <button onClick={load} className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-container-highest)', color: 'var(--text-primary)' }}>Refresh</button>
          </div>
        </div>
        {lastUpdate && <p className="mt-3 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>Update: {lastUpdate.toLocaleString('id-ID')} WIB · {aircraft.total} pesawat · {airbases.total} pangkalan · {missions.total} misi</p>}
        {err && <p className="mt-2 text-xs" style={{ color: 'var(--status-warning)' }}>{err}</p>}
      </div>

      {/* KPI — strip metrik unified */}
      <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }}>
        <div className="grid grid-cols-2 divide-x divide-y lg:grid-cols-4 divide-[var(--card-border)]">

          <Kpi icon="flight" label="Kesiapan alutsista" value={`${stats.readyPct.toFixed(1)}%`} sub={`${stats.ready}/${aircraft.total} S · ${stats.maintenance} U/S`} tone={readinessTone} />
          <Kpi icon="schedule" label="Rata-rata jam terbang" value={`${stats.avgHours.toFixed(1)} j`} sub={`Total ${stats.totalHours.toFixed(0)} j`} />
          <Kpi icon="local_gas_station" label="Pangkalan avtur kritis" value={`${stats.fuelRisk}`} sub={`dari ${airbases.total} pangkalan · ambang 30%`} tone={stats.fuelRisk ? 'warn' : 'ok'} />
          <Kpi icon="flight_takeoff" label="Misi aktif" value={`${missions.active}`} sub={`${missions.scheduled} scheduled · ${missions.in_flight} in-flight · ${missions.arrived} arrived`} />
        </div>
      </div>

      {/* Row 1: Status pie + Pesawat per Lanud */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Komposisi status armada" subtitle="Berapa pesawat siap terbang dan berapa yang tidak." source="derived dari TBO / Phase / Kalender">
          {statusPie.length === 0 ? <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data pesawat.</p> : (
            <div className="w-full" style={{ height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="var(--card-bg)" strokeWidth={2}>
                    {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} pesawat`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card title="Pesawat per pangkalan" subtitle="Sebaran armada di tiap lanud, delapan terbanyak." source="aircraft_units.airbase_id">
          {noPlacement ? <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada penempatan pesawat di pangkalan.</p> : (
            <div className="w-full" style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={perLanud} margin={{ top: 6, right: 12, left: -10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} interval={0} angle={-14} textAnchor="end" height={56} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)" }} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total" name="Total" fill="var(--surface-container-highest)" radius={[8, 8, 0, 0]} barSize={18} />
                  <Bar dataKey="ready" name="Ready" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Avtur + Misi */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Stok avtur per pangkalan" subtitle="Stok dibanding kapasitas. Batang pendek berarti stok di bawah 30%." source="airbase_avtur_logs">
          {avturChart.length === 0 ? <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data pangkalan.</p> : (
            <div className="w-full" style={{ height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={avturChart} margin={{ top: 6, right: 12, left: -10, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} angle={-22} textAnchor="end" interval={0} height={60} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}K`} />
                  <Tooltip formatter={(v, n) => [`${v}K L`, n]} contentStyle={{ borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)" }} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="kapasitas" name="Kapasitas" fill="var(--surface-container-highest)" radius={[8, 8, 0, 0]} barSize={16} />
                  <Bar dataKey="stok" name="Stok" fill="var(--secondary)" radius={[8, 8, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card title="Misi penerbangan per status" subtitle="Jumlah misi menurut status terakhirnya." source="flight_missions">
          {missionByStatus.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada misi terdaftar.</p>
              <Link to="/misi-penerbangan" className="mt-2 inline-block text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }}>Buat misi di halaman Prediksi ETA →</Link>
            </div>
          ) : (
            <div className="w-full" style={{ height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={missionByStatus} margin={{ top: 6, right: 12, left: -10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)" }} />
                  <Bar dataKey="value" name="Jumlah" radius={[4, 4, 0, 0]} barSize={22}>
                    {missionByStatus.map((_, i) => <Cell key={i} fill={COLORS.missions[i % COLORS.missions.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Top jam + Lanud detail + Alert */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card title="Jam terbang tertinggi" subtitle="Delapan pesawat dengan jam terbang terbanyak. Merah = lewat 280 jam, waktunya phase check." source="aircraft_units.flight_hours">
          {topHours.length === 0 ? <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data jam terbang.</p> : (
            <div className="w-full" style={{ height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={topHours} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="var(--chart-grid)" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" width={84} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(v) => [`${v} jam`, 'Jam']} contentStyle={{ borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)" }} />
                  <Bar dataKey="jam" radius={[0, 4, 4, 0]} barSize={14}>
                    {topHours.map((r, i) => <Cell key={i} fill={r.jam >= 280 ? 'var(--error)' : r.jam >= 220 ? 'var(--status-waspada)' : 'var(--secondary)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Kesiapan per lanud" subtitle="Pesawat siap dibanding total di tiap pangkalan." source="aircraft_units + airbases">
          <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
            {airbases.total === 0 ? <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada pangkalan.</p> : noPlacement ? (
              bases.slice(0, 6).map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><div className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name}</div><div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{b.location || '—'} · {b.refueler_trucks_active ?? b.refueler_trucks_count ?? 0} truk · {b.forklifts_count ?? 0} forklift</div></div>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: 'var(--surface-container-highest)', color: 'var(--text-secondary)' }}>0 pesawat</span>
                </div>
              ))
            ) : perLanud.map((h) => {
              const pct = h.total ? (h.ready / h.total) * 100 : 0;
              return (
                <div key={h.name} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><div className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{h.name}</div><div className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{h.ready}/{h.total} ready</div></div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full" style={{ background: 'var(--surface-container-highest)' }}><div className="h-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 80 ? TONE.ok : pct >= 60 ? TONE.warn : TONE.critical }} /></div>
                                        <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/pangkalan" className="mt-4 inline-block text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }}>Kelola pangkalan →</Link>
        </Card>

        <Card title="Alert operasional" subtitle="Peringatan yang diturunkan dari data, bukan diisi manual." source="dashboard/summary → alerts">
          <div className="space-y-3">
            {alerts.map((a, i) => {
              const tone = a.tone === 'critical' ? 'critical' : a.tone === 'warn' ? 'warn' : 'ok';
              return (
                <div
                  key={i}
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: TONE[tone],
                    background: a.tone === 'critical' ? 'var(--status-kritis-bg)' : a.tone === 'warn' ? 'var(--status-waspada-bg)' : 'var(--status-aman-bg)',
                  }}
                >
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{a.title}</div>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{a.desc}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/misi-penerbangan" className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>Prediksi ETA & Misi →</Link>
        <Link to="/pesawat" className="rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-container-highest)', color: 'var(--text-primary)' }}>Inventaris Pesawat</Link>
        <Link to="/pangkalan" className="rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-container-highest)', color: 'var(--text-primary)' }}>Pangkalan & Logistik</Link>
      </div>
    </div>
  );
}
