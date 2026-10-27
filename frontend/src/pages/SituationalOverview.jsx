import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, ScaleControl, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { situationalOverviewAPI, weatherAPI } from '../api';
import { PageShell } from '../components/PageShell';

const TILES = {
  dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '&copy; OpenStreetMap &copy; CARTO' },
  light: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap contributors' },
};
const STATUS_LABEL = { optimal: 'Optimal', warning: 'Waspada', critical: 'Kritis' };
const panel = { background: 'var(--card-bg)', borderColor: 'var(--card-border)' };
const num = (value, digits = 0) => (value === null || value === undefined || value === '' ? '—' : Number(value).toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
const jam = (value) => (value ? new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—');
const cssVar = (name, fallback) => (typeof document === 'undefined' ? fallback : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);

function planeIcon(heading, color) {
  return L.divIcon({
    className: '',
    html: `<svg width="20" height="20" viewBox="0 0 24 24" style="transform:rotate(${heading || 0}deg)"><path d="M12 2 L19 21 L12 17.4 L5 21 Z" fill="${color}" stroke="${color}" stroke-width="1" /></svg>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  });
}

function airbaseIcon(status, code) {
  const color = cssVar(`--status-${status}`, '#64748b');
  return L.divIcon({
    className: '',
    html: `<div style="font-size:11px;font-weight:700;line-height:1.4;color:var(--text-primary);background:var(--card-bg);border:1px solid var(--card-border);border-left:3px solid ${color};border-radius:3px;padding:1px 5px">${code || 'BASE'}</div>`,
    iconSize: [52, 22], iconAnchor: [26, 11],
  });
}

function useDarkTheme() {
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

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

function MapFocus({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 8), { duration: 0.6 });
  }, [target, map]);
  return null;
}

function Cell({ label, value, note, tone }) {
  return (
    <div className="min-w-[128px] flex-1 border-l px-4 py-3 first:border-l-0" style={{ borderColor: 'var(--card-border)' }}>
      <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        {tone && <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--status-${tone})` }} />}
        <span className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      {note && <div className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{note}</div>}
    </div>
  );
}

function Row({ label, value, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0" style={{ borderColor: 'var(--card-border)' }}>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-right text-sm font-semibold" style={{ color: tone ? `var(--status-${tone})` : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function Bar({ percent, tone }) {
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-muted)' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(percent) || 0))}%`, background: tone ? `var(--status-${tone})` : 'var(--secondary)' }} />
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl border ${className}`} style={{ background: 'var(--surface-muted)', borderColor: 'var(--card-border)' }} />;
}

export default function SituationalOverview() {
  const [tracks, setTracks] = useState([]);
  const [adsbTracks, setAdsbTracks] = useState([]);
  const [airbases, setAirbases] = useState([]);
  const [allAirbases, setAllAirbases] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [status, setStatus] = useState('In-Flight');
  const [airbaseId, setAirbaseId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [selection, setSelection] = useState(null);
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [stale, setStale] = useState(false);
  const [auto, setAuto] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const requestRef = useRef(0);
  const dark = useDarkTheme();
  const tiles = dark ? TILES.dark : TILES.light;

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    try {
      setError('');
      setLoading(true);
      const response = await situationalOverviewAPI.getTracks({ status, airbase_id: airbaseId || undefined, q: query || undefined });
      if (requestId !== requestRef.current) return;
      const nextAirbases = response.data?.airbases || [];
      setTracks(response.data?.tracks || []);
      setAdsbTracks(response.data?.adsb_tracks || []);
      setAirbases(nextAirbases);
      setAllAirbases((current) => (current.length ? current : nextAirbases));
      setTelemetry(response.data?.telemetry || null);
      setCoverage(response.data?.coverage || null);
      setLastUpdate(response.data?.server_time || new Date().toISOString());
      setConnected(true); setStale(false);
    } catch (err) {
      if (requestId === requestRef.current) {
        setConnected(false); setStale(true);
        setError(err.response?.data?.detail || 'Data situational overview gagal dimuat.');
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [status, airbaseId, query]);

  useEffect(() => {
    const debounce = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(debounce);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!auto) return undefined;
    const timer = setInterval(() => { if (!document.hidden) load(); }, 15000);
    const onVisibility = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [auto, load]);

  useEffect(() => {
    setWeather(null); setWeatherError('');
    if (selection?.type !== 'base') return undefined;
    let active = true;
    weatherAPI.getByBase(selection.data.id)
      .then((response) => { if (active) setWeather(response.data || null); })
      .catch((err) => { if (active) setWeatherError(err.response?.data?.detail || 'Cuaca lanud tidak tersedia.'); });
    return () => { active = false; };
  }, [selection]);

  const mapAirbases = airbases.filter((base) => base.coordinate_valid !== false && base.lat != null && base.lon != null);
  const center = mapAirbases[0] ? [mapAirbases[0].lat, mapAirbases[0].lon] : [-2.5, 118];
  const virtualCount = telemetry?.virtual_count ?? 0;
  const providerError = telemetry?.provider_error || '';
  const providerNotes = telemetry?.provider_notes || [];
  const coverageText = coverage
    ? `${coverage.base_name} · radius ${num(coverage.radius_nm)} nm · ${coverage.provider || 'provider tidak menjawab'}`
    : 'tidak ada lanud berkoordinat valid untuk coverage';

  const attention = useMemo(() => {
    const items = [];
    airbases.forEach((base) => {
      const label = base.code || base.name;
      if (base.status === 'critical') items.push({ key: `s-${base.id}`, tone: 'critical', label, text: 'Status lanud kritis' });
      if (base.coordinate_warning) items.push({ key: `c-${base.id}`, tone: 'warning', label, text: `Koordinat belum valid — ${base.coordinate_warning}` });
      if (base.avtur_capacity_liters > 0 && base.avtur_percent < 20) items.push({ key: `a-${base.id}`, tone: 'critical', label, text: `Avtur ${num(base.avtur_percent, 1)}% dari kapasitas` });
      else if (base.avtur_capacity_liters > 0 && base.avtur_percent < 35) items.push({ key: `a-${base.id}`, tone: 'warning', label, text: `Avtur ${num(base.avtur_percent, 1)}% dari kapasitas` });
      if (base.refueler_trucks_count > 0 && base.refueler_trucks_active < base.refueler_trucks_count) items.push({ key: `t-${base.id}`, tone: 'warning', label, text: `Truk refueler siap ${base.refueler_trucks_active}/${base.refueler_trucks_count}` });
    });
    if (providerError) items.push({ key: 'adsb', tone: 'warning', label: 'ADSB', text: providerError });
    return items;
  }, [airbases, providerError]);

  const traffic = useMemo(() => [
    ...tracks.map((mission) => ({
      id: `m-${mission.mission_id}`, type: 'mission', ref: mission,
      tail: mission.tail_number, source: mission.is_virtual ? 'Internal · telemetry virtual' : 'Internal · tanpa posisi',
      route: `${mission.origin?.name || '—'} → ${mission.destination?.name || '—'}`,
      altitude: null, speed: mission.speed_kmh, status: mission.status, at: mission.eta || mission.scheduled_departure,
      point: mission.position ? [mission.position.lat, mission.position.lon] : null,
    })),
    ...adsbTracks.map((item) => ({
      id: `a-${item.icao24}`, type: 'adsb', ref: item,
      tail: item.tail_number, source: `ADSB · ${item.provider || '—'}`,
      route: `${num(item.latitude, 3)}, ${num(item.longitude, 3)}`,
      altitude: item.altitude_m, speed: item.speed_kmh, status: item.status, at: item.observed_at,
      point: [item.latitude, item.longitude],
    })),
  ], [tracks, adsbTracks]);

  const finding = useMemo(() => {
    const parts = [];
    const kritis = airbases.filter((base) => base.status === 'critical').length;
    const waspada = airbases.filter((base) => base.status === 'warning').length;
    if (kritis) parts.push(`${kritis} lanud kritis`);
    if (waspada) parts.push(`${waspada} lanud waspada`);
    const koordinat = airbases.filter((base) => base.coordinate_warning).length;
    if (koordinat) parts.push(`${koordinat} koordinat belum valid`);
    parts.push(coverage?.provider ? `traffic ADSB lewat ${coverage.provider} (${num(coverage.count)})` : 'traffic ADSB tidak tersedia');
    return parts.join(' · ');
  }, [airbases, coverage]);

  const pick = (item) => { setSelection({ type: item.type, data: item.ref }); setFocus(item.point || null); };
  const missionEta = (track) => {
    if (!track?.eta) return '—';
    const minutes = Math.round((new Date(track.eta).getTime() - Date.now()) / 60000);
    return `${jam(track.eta)}${minutes > 0 ? ` · ${minutes} mnt lagi` : ''}`;
  };

  const skeleton = loading && airbases.length === 0;

  return (
    <PageShell
      title="Situational Overview"
      subtitle={finding}
      actions={
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAuto((value) => !value)} aria-pressed={auto} className="rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: 'var(--card-border)', color: auto ? 'var(--text-primary)' : 'var(--text-muted)' }}>{auto ? 'Auto 15 s: hidup' : 'Auto 15 s: mati'}</button>
          <button type="button" onClick={load} className="rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>Refresh</button>
        </div>
      }
    >
      {skeleton ? (
        <div className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-stretch overflow-hidden rounded-xl border" style={panel}>
            <Cell label="Sambungan" value={connected ? 'Terhubung' : 'Terputus'} note={stale ? 'Data usang, hasil terakhir dipertahankan' : `Update server ${jam(lastUpdate)}`} tone={connected ? 'optimal' : 'critical'} />
            <Cell label="Misi" value={num(telemetry?.mission_count ?? tracks.length)} note={`${num(virtualCount)} pakai telemetry virtual`} />
            <Cell label="Traffic ADSB" value={num(telemetry?.adsb_count ?? adsbTracks.length)} note={coverage?.provider ? `dijawab ${coverage.provider}` : providerError || 'provider tidak menjawab'} tone={telemetry?.adsb_count || coverage?.provider ? 'optimal' : 'warning'} />
            <Cell label="Coverage" value={coverage ? `${num(coverage.radius_nm)} nm` : '—'} note={coverageText} />
            <Cell label="Lanud" value={num(airbases.length)} note={`${num(airbases.filter((base) => base.status === 'critical').length)} kritis · ${num(airbases.filter((base) => base.status === 'warning').length)} waspada`} />
          </div>

          <section className="overflow-hidden rounded-xl border" style={panel}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--card-border)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Perlu perhatian</h2>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{attention.length ? `${attention.length} temuan urut prioritas` : 'tidak ada anomali jaringan'}</span>
            </div>
            {attention.length === 0 ? (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Semua lanud optimal, avtur di atas 35%, truk refueler lengkap, dan provider ADSB menjawab.</p>
            ) : (
              <ul>
                {attention.slice(0, 6).map((item) => (
                  <li key={item.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-4 py-2 text-sm last:border-b-0" style={{ borderColor: 'var(--card-border)' }}>
                    <span className="w-14 text-[11px] font-bold uppercase" style={{ color: `var(--status-${item.tone})` }}>{STATUS_LABEL[item.tone] || item.tone}</span>
                    <button type="button" onClick={() => { const base = airbases.find((row) => (row.code || row.name) === item.label); if (base) { setSelection({ type: 'base', data: base }); setFocus([base.lat, base.lon]); } }} className="font-bold hover:underline" style={{ color: 'var(--text-primary)' }}>{item.label}</button>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {attention.length > 6 && <p className="px-4 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>+{attention.length - 6} temuan lain</p>}
          </section>

          {error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--status-critical)', background: 'var(--status-kritis-bg)', color: 'var(--text-primary)' }}>
              <span>{error} Data terakhir dipertahankan.</span>
              <button type="button" onClick={load} className="rounded-lg border px-3 py-1.5 text-xs font-bold" style={{ borderColor: 'var(--card-border)' }}>Coba lagi</button>
            </div>
          )}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="relative w-full flex-1 overflow-hidden rounded-xl border" style={panel}>
              <MapContainer center={center} zoom={5} className="h-[460px] w-full lg:h-[600px]" scrollWheelZoom>
                <TileLayer attribution={tiles.attr} url={tiles.url} />
                <ScaleControl position="bottomright" imperial={false} />
                <FitMap airbases={mapAirbases} tracks={tracks} adsbTracks={adsbTracks} />
                <MapFocus target={focus} />
                {coverage && (
                  <Circle center={[coverage.lat, coverage.lon]} radius={Number(coverage.radius_nm || 250) * 1852} pathOptions={{ color: cssVar('--status-grounding', '#0284c7'), weight: 1, dashArray: '6 6', fillOpacity: 0.05 }} />
                )}
                {adsbTracks.filter((item) => item.latitude != null && item.longitude != null).map((item) => (
                  <Marker key={`adsb-${item.icao24}`} position={[item.latitude, item.longitude]} icon={planeIcon(item.heading_deg, cssVar('--secondary', '#006398'))} eventHandlers={{ click: () => pick({ type: 'adsb', ref: item, point: [item.latitude, item.longitude] }) }}>
                    <Tooltip direction="top">{item.tail_number} · ADSB · {item.status}</Tooltip>
                    <Popup>
                      <b>{item.tail_number}</b><br />ICAO24: {item.icao24}<br />Sumber: {item.provider || 'ADSB'} · {item.status}<br />
                      Ketinggian: {num(item.altitude_m)} m · Kecepatan: {num(item.speed_kmh)} km/h<br />
                      Terlihat: {jam(item.observed_at)}
                    </Popup>
                  </Marker>
                ))}
                {mapAirbases.map((base) => (
                  <Marker key={base.id} position={[base.lat, base.lon]} icon={airbaseIcon(base.status, base.code)} eventHandlers={{ click: () => pick({ type: 'base', ref: base, point: [base.lat, base.lon] }) }}>
                    <Tooltip direction="top" offset={[0, -8]}>{base.code || base.name} · {STATUS_LABEL[base.status] || base.status}</Tooltip>
                    <Popup>
                      <b>{base.name}</b><br />{base.code || '-'} · {base.icao || '-'}<br />Status: {STATUS_LABEL[base.status] || base.status}<br />
                      Avtur: {num(base.avtur_percent, 1)}%<br />Apron: {num(base.apron_used)}/{num(base.apron_capacity_aircraft)}<br />Truk refueler: {num(base.refueler_trucks_active)}/{num(base.refueler_trucks_count)}
                    </Popup>
                  </Marker>
                ))}
                {tracks.filter((track) => track.position && track.origin?.lat != null && track.origin?.lon != null && track.destination?.lat != null && track.destination?.lon != null).map((track) => (
                  <span key={`route-${track.mission_id}`}>
                    <Polyline positions={[[track.origin.lat, track.origin.lon], [track.destination.lat, track.destination.lon]]} pathOptions={{ color: cssVar('--status-warning', '#f97316'), dashArray: '8 8', weight: 2, opacity: 0.85 }} />
                    <Marker position={[track.position.lat, track.position.lon]} icon={planeIcon(track.heading_deg, cssVar('--status-warning', '#f97316'))} eventHandlers={{ click: () => pick({ type: 'mission', ref: track, point: [track.position.lat, track.position.lon] }) }}>
                      <Tooltip direction="top">{track.tail_number} · {track.status}</Tooltip>
                      <Popup>
                        <b>{track.tail_number}</b><br />Misi #{track.mission_id} · {track.status}<br />{track.origin.name} → {track.destination.name}<br />
                        Progress: {num(track.progress_percent, 1)}% · {num(track.speed_kmh)} km/h<br />ETA: {missionEta(track)}<br />Telemetry virtual — bukan GPS nyata
                      </Popup>
                    </Marker>
                  </span>
                ))}
              </MapContainer>
              <div className="pointer-events-none absolute left-3 top-3 z-[500] w-[224px] rounded-lg border p-3 text-xs" style={{ ...panel, boxShadow: 'var(--shadow)' }}>
                <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{coverage ? coverage.base_name : 'Coverage tidak tersedia'}</div>
                <div className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>{coverageText}</div>
                <div className="mt-2 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-2"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 2 L19 21 L12 17.4 L5 21 Z" fill={cssVar('--status-warning', '#f97316')} /></svg> Misi internal · telemetry virtual</div>
                  <div className="flex items-center gap-2"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 2 L19 21 L12 17.4 L5 21 Z" fill={cssVar('--secondary', '#006398')} /></svg> Traffic ADSB publik</div>
                  <div className="flex items-center gap-2"><span className="inline-block h-2.5 w-3 rounded-sm" style={{ background: cssVar('--status-optimal', '#22c55e') }} /><span className="inline-block h-2.5 w-3 rounded-sm" style={{ background: cssVar('--status-warning', '#f97316') }} /><span className="inline-block h-2.5 w-3 rounded-sm" style={{ background: cssVar('--status-critical', '#ef4444') }} /> Lanud: optimal / waspada / kritis</div>
                  <div className="flex items-center gap-2"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed" style={{ borderColor: cssVar('--status-grounding', '#0284c7') }} /> Lingkaran coverage</div>
                </div>
              </div>
            </div>

            <aside className="w-full shrink-0 rounded-xl border p-4 lg:h-[600px] lg:w-[320px] lg:overflow-y-auto" style={panel}>
              {!selection && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pilih pesawat, misi, atau lanud di peta/daftar untuk melihat rinciannya.</p>}

              {selection?.type === 'mission' && (
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selection.data.tail_number}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Misi #{selection.data.mission_id} · {selection.data.status} · telemetry virtual</p>
                  <div className="mt-2"><Bar percent={selection.data.progress_percent} /></div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>Progress {num(selection.data.progress_percent, 1)}%</div>
                  <div className="mt-3">
                    <Row label="Rute" value={`${selection.data.origin?.name || '—'} → ${selection.data.destination?.name || '—'}`} />
                    <Row label="Jenis pesawat" value={selection.data.aircraft_type || '—'} />
                    <Row label="ETA" value={missionEta(selection.data)} />
                    <Row label="Jarak" value={selection.data.distance_km ? `${num(selection.data.distance_km, 1)} km` : '—'} />
                    <Row label="Kecepatan" value={selection.data.speed_kmh ? `${num(selection.data.speed_kmh)} km/h` : '—'} />
                    <Row label="Kurs / FL" value={`${num(selection.data.heading_deg)}° · FL${selection.data.flight_level || '—'}`} />
                    <Row label="Payload" value={selection.data.payload_kg ? `${num(selection.data.payload_kg)} kg` : '—'} />
                    <Row label="Avtur total" value={selection.data.total_fuel_liters ? `${num(selection.data.total_fuel_liters)} L` : '—'} />
                    <Row label="SIGMET" value={selection.data.sigmet_active || 'NIL'} tone={selection.data.sigmet_active && selection.data.sigmet_active !== 'NIL' ? 'warning' : null} />
                    <Row label="Cuaca tujuan" value={selection.data.destination_weather?.condition ? `${selection.data.destination_weather.condition} · ${num(selection.data.destination_weather.temp_c, 1)}°C · ${num(selection.data.destination_weather.wind_kmh)} km/h` : '—'} />
                  </div>
                  {selection.data.taf_summary && selection.data.taf_summary !== 'NIL' && <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>TAF: {selection.data.taf_summary}</p>}
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Posisi dihitung dari waktu server, bukan GPS.</p>
                </div>
              )}

              {selection?.type === 'adsb' && (
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selection.data.tail_number}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>ADSB publik · {selection.data.provider || '—'} · {selection.data.status}</p>
                  <div className="mt-3">
                    <Row label="ICAO24" value={selection.data.icao24} />
                    <Row label="Ketinggian" value={selection.data.altitude_m != null ? `${num(selection.data.altitude_m)} m` : '—'} />
                    <Row label="Kecepatan" value={selection.data.speed_kmh != null ? `${num(selection.data.speed_kmh)} km/h` : '—'} />
                    <Row label="Kurs" value={`${num(selection.data.heading_deg)}°`} />
                    <Row label="Posisi" value={`${num(selection.data.latitude, 3)}, ${num(selection.data.longitude, 3)}`} />
                    <Row label="Terlihat" value={jam(selection.data.observed_at)} />
                  </div>
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{coverageText}</p>
                </div>
              )}

              {selection?.type === 'base' && (
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selection.data.name}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selection.data.code || '—'} · {selection.data.icao || '—'} · {STATUS_LABEL[selection.data.status] || selection.data.status || '—'}</p>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between"><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Avtur</span><span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{num(selection.data.avtur_percent, 1)}% ({num(selection.data.avtur_stock_liters)} / {num(selection.data.avtur_capacity_liters)} L)</span></div>
                    <Bar percent={selection.data.avtur_percent} tone={selection.data.avtur_percent < 20 ? 'critical' : selection.data.avtur_percent < 35 ? 'warning' : 'optimal'} />
                  </div>
                  <div className="mt-3">
                    <Row label="Lokasi" value={selection.data.location || '—'} />
                    <Row label="Koordinat" value={selection.data.coordinate_warning ? 'belum valid' : `${num(selection.data.lat, 3)}, ${num(selection.data.lon, 3)}`} tone={selection.data.coordinate_warning ? 'warning' : null} />
                    <Row label="Apron" value={`${num(selection.data.apron_used)} / ${num(selection.data.apron_capacity_aircraft)}`} />
                    <Row label="Truk refueler" value={`${num(selection.data.refueler_trucks_active)} / ${num(selection.data.refueler_trucks_count)}`} />
                  </div>
                  <div className="mt-3 border-t pt-2" style={{ borderColor: 'var(--card-border)' }}>
                    <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Cuaca real-time</div>
                    {weatherError && <p className="mt-1 text-xs" style={{ color: 'var(--status-critical)' }}>{weatherError}</p>}
                    {!weatherError && !weather && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Memuat cuaca…</p>}
                    {weather && (
                      <div>
                        <Row label="Kondisi" value={weather.weather_condition || '—'} />
                        <Row label="Suhu" value={`${num(weather.temp_celsius, 1)}°C`} />
                        <Row label="Angin" value={`${num(weather.wind_speed_kmh)} km/h ${weather.wind_from_compass || ''}`} />
                        <Row label="Visibilitas" value={`${num((weather.visibility_m || 0) / 1000, 1)} km`} />
                        <Row label="SIGMET" value={weather.sigmet_active || 'NIL'} tone={weather.sigmet_active && weather.sigmet_active !== 'NIL' ? 'warning' : null} />
                        <Row label="Taxi" value={`${num(weather.taxi_time_minutes)} menit`} />
                      </div>
                    )}
                    {weather?.taf_summary && <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>TAF: {weather.taf_summary}</p>}
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{weather?.is_realtime ? 'Sumber: Open-Meteo real-time.' : 'Estimasi bila API cuaca tidak menjawab.'}</p>
                  </div>
                </div>
              )}
            </aside>
          </div>

          <section className="overflow-hidden rounded-xl border" style={panel}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--card-border)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Traffic</h2>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {num(traffic.length)} baris · {num(telemetry?.mission_count ?? tracks.length)} misi · {num(telemetry?.adsb_count ?? adsbTracks.length)} ADSB · status filter: {status || 'semua'}
              </span>
            </div>
            <div className="flex flex-wrap items-end gap-3 px-4 py-3">
              <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Status misi
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border px-2 py-1.5 text-sm font-normal" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}>
                  <option value="">Semua status</option>
                  {['In-Flight', 'Scheduled', 'Arrived', 'Cancelled'].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="flex min-w-[170px] flex-1 flex-col gap-1 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Lanud (misi + coverage ADSB)
                <select value={airbaseId} onChange={(event) => setAirbaseId(event.target.value)} className="rounded-lg border px-2 py-1.5 text-sm font-normal" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}>
                  <option value="">Semua Lanud</option>
                  {allAirbases.map((base) => <option key={base.id} value={base.id}>{base.code || base.name} — {base.name}</option>)}
                </select>
              </label>
              <label className="flex min-w-[200px] flex-[2] flex-col gap-1 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Cari tail number / kode Lanud
                <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setQuery(search.trim()); }} placeholder="Contoh: A-1339 atau IWJ" className="rounded-lg border px-2 py-1.5 text-sm font-normal" style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }} />
              </label>
            </div>
            {traffic.length === 0 ? (
              <p className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Tidak ada misi maupun traffic ADSB sesuai filter.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y text-left text-[11px] uppercase" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
                    <th className="px-4 py-2 font-bold">Identitas</th>
                    <th className="hidden px-3 py-2 font-bold md:table-cell">Sumber</th>
                    <th className="px-3 py-2 font-bold">Rute / posisi</th>
                    <th className="hidden px-3 py-2 text-right font-bold sm:table-cell">Ketinggian</th>
                    <th className="px-3 py-2 text-right font-bold">Kecepatan</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                    <th className="px-4 py-2 text-right font-bold">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {traffic.map((item) => (
                    <tr key={item.id} onClick={() => pick(item)} className="cursor-pointer border-b last:border-b-0" style={{ borderColor: 'var(--card-border)' }}>
                      <td className="px-4 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>{item.tail}</td>
                      <td className="hidden px-3 py-2 md:table-cell" style={{ color: 'var(--text-secondary)' }}>{item.source}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{item.route}</td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{item.altitude != null ? `${num(item.altitude)} m` : '—'}</td>
                      <td className="px-3 py-2 text-right" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{item.speed != null ? `${num(item.speed)} km/h` : '—'}</td>
                      <td className="px-3 py-2" style={{ color: item.status === 'STALE' ? 'var(--status-warning)' : 'var(--text-primary)' }}>{item.status}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{jam(item.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="border-t px-4 py-3 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
              {adsbTracks.length === 0 ? `Traffic ADSB kosong. ${coverageText}. ` : `Sumber ADSB: ${coverageText}. `}
              {providerNotes.length ? `Catatan provider: ${providerNotes.join(' · ')}` : providerError || ''}
            </p>
          </section>
        </>
      )}
      {loading && airbases.length > 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Menyegarkan data…</p>}
    </PageShell>
  );
}
