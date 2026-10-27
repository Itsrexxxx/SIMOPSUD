import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { situationalOverviewAPI } from '../api';
import { PageShell } from '../components/PageShell';
import { Spinner } from '../components/UI';

const planeIcon = (heading = 0) => L.divIcon({
  className: '',
  html: `<div style="transform:rotate(${heading}deg);font-size:26px;color:#f97316;text-shadow:0 1px 3px #fff">✈</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15],
});

const airbaseIcon = (status, code) => {
  const color = { optimal: '#16a34a', warning: '#eab308', critical: '#dc2626' }[status] || '#64748b';
  return L.divIcon({ className: '', html: `<div style="background:${color};border:2px solid white;border-radius:8px;color:white;font-size:10px;font-weight:800;padding:4px 5px;box-shadow:0 2px 5px #0005">▰ ${code || 'BASE'}</div>`, iconSize: [58, 24], iconAnchor: [29, 12] });
};

function FitMap({ airbases, tracks, adsbTracks }) {
  const map = useMap();
  const [fitted, setFitted] = useState(false);
  useEffect(() => {
    if (fitted) return;
    const points = [
      ...airbases.filter((b) => b.lat != null && b.lon != null).map((b) => [b.lat, b.lon]),
      ...tracks.flatMap((t) => [t.position, t.origin, t.destination].filter((point) => point?.lat != null && point?.lon != null).map((point) => [point.lat, point.lon])),
      ...adsbTracks.filter((t) => t.latitude != null && t.longitude != null).map((t) => [t.latitude, t.longitude]),
    ];
    if (points.length) { map.fitBounds(points, { padding: [30, 30], maxZoom: 8 }); setFitted(true); }
  }, [airbases, tracks, adsbTracks, map, fitted]);
  return null;
}

export default function SituationalOverview() {
  const [tracks, setTracks] = useState([]);
  const [adsbTracks, setAdsbTracks] = useState([]);
  const [airbases, setAirbases] = useState([]);
  const [allAirbases, setAllAirbases] = useState([]);
  const [status, setStatus] = useState('In-Flight');
  const [airbaseId, setAirbaseId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [stale, setStale] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [telemetry, setTelemetry] = useState('');
  const requestRef = useRef(0);
  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    try {
      setError('');
      setLoading(true);
      const response = await situationalOverviewAPI.getTracks({ status, airbase_id: airbaseId || undefined, q: query || undefined });
      if (requestId !== requestRef.current) return;
      const nextAirbases = response.data?.airbases || [];
      setTracks(response.data?.tracks || []); setAdsbTracks(response.data?.adsb_tracks || []); setAirbases(nextAirbases); setAllAirbases((current) => current.length ? current : nextAirbases);
      setLastUpdate(response.data?.server_time || new Date().toISOString()); setTelemetry(response.data?.telemetry?.label || 'Telemetry virtual — bukan GPS nyata'); setConnected(true); setStale(false);
    } catch (err) { if (requestId === requestRef.current) { setConnected(false); setStale(true); setError(err.response?.data?.detail || 'Data situational overview gagal dimuat.'); } }
    finally { if (requestId === requestRef.current) setLoading(false); }
  }, [status, airbaseId, query]);
  useEffect(() => {
    const debounce = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(debounce);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    let timer;
    const schedule = () => { clearInterval(timer); if (!document.hidden) timer = setInterval(load, 15000); };
    schedule();
    const onVisibility = () => { if (!document.hidden) { load(); schedule(); } else clearInterval(timer); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [load]);
  const mapAirbases = airbases.filter((base) => base.coordinate_valid !== false && base.lat != null && base.lon != null);
  const center = mapAirbases[0] ? [mapAirbases[0].lat, mapAirbases[0].lon] : [-2.5, 118];
  const statusCount = (status) => airbases.filter((base) => base.status === status).length;
  return (
    <PageShell title="Situational Overview" subtitle="Jaringan Lanud, telemetry internal, ADSB publik, dan virtual fallback." actions={<button type="button" onClick={load} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-50">Refresh</button>}>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs font-bold">Status misi<select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border p-2 text-sm font-normal"><option value="">Semua status</option>{['In-Flight', 'Scheduled', 'Arrived', 'Cancelled'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-bold">Lanud<select value={airbaseId} onChange={(e) => setAirbaseId(e.target.value)} className="rounded-lg border p-2 text-sm font-normal"><option value="">Semua Lanud</option>{allAirbases.map((base) => <option key={base.id} value={base.id}>{base.code || base.name} — {base.name}</option>)}</select></label>
        <label className="flex min-w-[220px] flex-[2] flex-col gap-1 text-xs font-bold">Cari tail number / kode Lanud<input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => setQuery(search.trim())} onKeyDown={(e) => { if (e.key === 'Enter') setQuery(search.trim()); }} placeholder="Contoh: A-1339 atau IWJ" className="rounded-lg border p-2 text-sm font-normal" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs"><span className={`rounded-full px-3 py-1 font-bold ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>● API: {connected ? 'Terhubung' : 'Terputus'}</span><span className={`rounded-full px-3 py-1 font-bold ${stale ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{stale ? 'Data usang' : 'Data terbaru'}</span><span>Update server: {lastUpdate ? new Date(lastUpdate).toLocaleString('id-ID') : '—'}</span><span className="rounded-full bg-orange-100 px-3 py-1 font-bold text-orange-700">{telemetry || 'Telemetry virtual — bukan GPS nyata'}</span>{loading && <Spinner label="Memuat" />}</div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} Data terakhir dipertahankan.</div>}
      {airbases.some((base) => base.coordinate_warning) && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{airbases.filter((base) => base.coordinate_warning).length} Lanud perlu perbaikan koordinat. Marker tidak ditampilkan sampai koordinat valid.</div>}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <MapContainer center={center} zoom={5} className="h-[calc(100vh-220px)] min-h-[620px] w-full" scrollWheelZoom>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitMap airbases={mapAirbases} tracks={tracks} adsbTracks={adsbTracks} />
          {adsbTracks.filter((track) => track.latitude != null && track.longitude != null).map((track) => <Marker key={`adsb-${track.icao24}`} position={[track.latitude, track.longitude]} icon={planeIcon(track.heading_deg)}><Tooltip direction="top">{track.tail_number} · ADSB · {track.status}</Tooltip><Popup><b>{track.tail_number}</b><br />ICAO24: {track.icao24}<br />ADSB publik · {track.status}<br />Altitude: {track.altitude_m ?? '-'} m · Speed: {track.speed_kmh ?? '-'} km/h<br />Observed: {new Date(track.observed_at).toLocaleString('id-ID')}</Popup></Marker>)}
          {mapAirbases.map((base) => <Marker key={base.id} position={[base.lat, base.lon]} icon={airbaseIcon(base.status, base.code)}><Tooltip direction="top" offset={[0, -10]}>{base.code || base.name} · {base.status}</Tooltip><Popup><b>{base.name}</b><br />{base.code || '-'} · {base.icao || '-'}<br />Status: {base.status}<br />AVTUR: {base.avtur_percent}%<br />Apron: {base.apron_used}/{base.apron_capacity_aircraft}<br />Truk aktif: {base.refueler_trucks_active}/{base.refueler_trucks_count}</Popup></Marker>)}
          {tracks.filter((track) => track.position && track.origin?.lat != null && track.origin?.lon != null && track.destination?.lat != null && track.destination?.lon != null).map((track) => <span key={`route-${track.mission_id}`}><Polyline positions={[[track.origin.lat, track.origin.lon], [track.destination.lat, track.destination.lon]]} pathOptions={{ color: '#f97316', dashArray: '8 8', weight: 3 }} /><Marker position={[track.position.lat, track.position.lon]} icon={planeIcon(track.heading_deg)} eventHandlers={{ click: () => setSelected(track) }}><Tooltip direction="top">{track.tail_number} · {track.status}</Tooltip><Popup><b>{track.tail_number}</b><br />Misi #{track.mission_id} · {track.status}<br />{track.origin.name} → {track.destination.name}<br />Progress: {track.progress_percent}% · {track.speed_kmh} km/h<br />ETA: {track.eta || '-'}<br />Telemetry virtual — bukan GPS nyata</Popup></Marker></span>)}
        </MapContainer>
        <div className="absolute left-4 top-4 z-[1000] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg"><div className="font-bold text-slate-900">OPERATIONAL PICTURE</div><div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1"><span>Lanud {airbases.length}</span><span>Misi {tracks.length}</span><span>ADSB {adsbTracks.length}</span><span className="text-green-700">Optimal {statusCount('optimal')}</span><span className="text-yellow-700">Warning {statusCount('warning')}</span><span className="text-red-700">Critical {statusCount('critical')}</span></div><div className="mt-2 border-t pt-2 text-slate-500">▰ Lanud · <span className="text-orange-600">✈ Pesawat</span></div></div>
      </div>
      <section className="rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}><div className="border-b p-4"><h2 className="font-bold">Daftar Misi</h2><p className="text-xs text-slate-500">{tracks.length} misi sesuai filter · status: {status || 'semua'}</p></div>{tracks.length === 0 ? <div className="p-6 text-sm text-slate-500">Tidak ada misi sesuai filter.</div> : <div className="divide-y">{tracks.map((mission) => <button type="button" key={mission.mission_id} onClick={() => setSelected(mission)} className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"><span><b>{mission.tail_number}</b><span className="ml-2 text-sm text-slate-500">{mission.origin.name} → {mission.destination.name}</span></span><span className="text-xs text-orange-700">{mission.status} · {mission.position ? `${mission.progress_percent}% · ${mission.speed_kmh} km/h` : 'posisi tidak tersedia'} · virtual</span></button>)}</div>}</section>
      {selected && <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm"><b>{selected.tail_number}</b> · {selected.origin.name} → {selected.destination.name} · {selected.progress_percent}% · heading {selected.heading_deg}° · Telemetry virtual</div>}
    </PageShell>
  );
}
