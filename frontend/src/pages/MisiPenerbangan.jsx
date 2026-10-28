import { useEffect, useState } from 'react';
import { flightMissionAPI, airbaseAPI, aircraftAPI, weatherAPI, extractTotal } from '../api';
import { EmptyState, Modal } from '../components/UI';
import Pagination from '../components/Pagination';
import { PageShell } from '../components/PageShell';
import { formatDateTime, formatTimeOnly, toLocalInput, parseUtc, localInputToUtc } from '../time';

const defaultForm = {
  aircraft_id: '',
  origin_base_id: '',
  destination_base_id: '',
  scheduled_departure: toLocalInput(),
  payload_kg: '',
  flight_level: '',
  alternate_base_id: '',
  origin_location: null,
  destination_location: null,
  route_points: [],
  alternate_locations: [],
};

const STATUS_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'In-Flight', label: 'In-Flight' },
  { value: 'Arrived', label: 'Arrived' },
  { value: 'Diverted', label: 'Diverted' },
];

const STATUS_TONE = {
  Arrived: 'var(--status-aman)',
  Completed: 'var(--status-aman)',
  'In-Flight': 'var(--status-waspada)',
  Delayed: 'var(--status-waspada)',
  Diverted: 'var(--status-kritis)',
};

function StatusBadge({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_TONE[status] || 'var(--text-muted)' }} aria-hidden="true" />
      {status}
    </span>
  );
}

function CompactWeatherBadge({ weather }) {
  if (!weather) return <span className="text-xs text-slate-500">—</span>;
  const cond = (weather.weather_condition || '—').split(' (')[0];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" title={`${cond} · ${weather.is_realtime ? 'real-time' : 'estimasi'}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: weather.is_realtime ? 'var(--status-aman)' : 'var(--status-waspada)' }} aria-hidden="true" />
      <span className="font-semibold tabular-nums text-slate-900">{Math.round(weather.temp_celsius)}°C</span>
      <span className="text-slate-500">{cond}</span>
    </span>
  );
}

function WeatherFreshness({ realtime }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: realtime ? 'var(--status-aman)' : 'var(--status-waspada)' }} aria-hidden="true" />
      {realtime ? 'Real-time' : 'Estimasi'}
    </span>
  );
}

function FilterPill({ label, value, options, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px]">
      <span className="whitespace-nowrap text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-[13px] font-semibold text-slate-800 focus:outline-none">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function MissionFiltersBar({ filters, setFilters, bases, units, onReset }) {
  const update = (key) => (val) => setFilters((p) => ({ ...p, [key]: val }));
  const baseOptions = [{ value: '', label: 'Semua' }, ...bases.map((b) => ({ value: b.id, label: b.name }))];
  const unitOptions = [{ value: '', label: 'Semua' }, ...units.map((u) => ({ value: u.id, label: u.tail_number }))];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={update('status')} />
        <FilterPill label="Lanud asal" value={filters.origin_base_id} options={baseOptions} onChange={update('origin_base_id')} />
        <FilterPill label="Lanud tujuan" value={filters.destination_base_id} options={baseOptions} onChange={update('destination_base_id')} />
        <FilterPill label="Pesawat" value={filters.aircraft_id} options={unitOptions} onChange={update('aircraft_id')} />
        <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50" onClick={onReset}>Reset</button>
      </div>
      <p className="mt-3 text-xs text-slate-500">Titik hijau menandai cuaca real-time, oranye estimasi.</p>
    </div>
  );
}

function MissionRow({ m, onShowDetail, onEdit, onUpdateStatus, onDelete }) {
  const etd = formatTimeOnly(m.scheduled_departure);
  const eta = formatTimeOnly(m.predicted_arrival);
  const jamTerbang = Number(m.aircraft_hours_after_arrival ?? 0).toFixed(1);
  return (
    <tr className="border-t border-slate-200 hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="text-[13px] font-semibold text-slate-900">{m.tail_number}</div>
        <div className="text-xs text-slate-500">{m.aircraft_type || '—'}</div>
      </td>
      <td className="px-4 py-3 text-[13px] text-slate-700">{m.origin_base_name}</td>
      <td className="px-4 py-3 text-[13px] text-slate-700">{m.destination_base_name}</td>
      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-slate-700">{m.distance_km?.toFixed?.(0) ?? '—'} km</td>
      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-slate-700">{m.predicted_duration_minutes?.toFixed?.(0) ?? '—'} mnt</td>
      <td className="px-4 py-3 text-xs tabular-nums">
        <div className="text-slate-500">ETD {etd}</div>
        <div className="font-semibold text-slate-900">ETA {eta}</div>
      </td>
      <td className="px-4 py-3"><CompactWeatherBadge weather={m.origin_weather} /></td>
      <td className="px-4 py-3"><CompactWeatherBadge weather={m.destination_weather} /></td>
      <td className="px-4 py-3">
        <StatusBadge status={m.status} />
        <div className="mt-1 text-xs tabular-nums text-slate-500">{jamTerbang} jam terbang</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1.5">
          <button type="button" aria-label="Lihat detail misi" className="icon-btn" onClick={() => onShowDetail(m)} title="Detail"><span className="material-symbols-outlined" aria-hidden="true">visibility</span></button>
          <button type="button" aria-label="Edit misi" className="icon-btn" onClick={() => onEdit(m.id)} title="Edit"><span className="material-symbols-outlined" aria-hidden="true">edit</span></button>
          {m.status === 'Scheduled' && <button type="button" aria-label="Mulai terbang" className="icon-btn icon-btn--strong" onClick={() => onUpdateStatus(m.id, 'In-Flight')} title="Mulai terbang"><span className="material-symbols-outlined" aria-hidden="true">flight_takeoff</span></button>}
          {m.status === 'In-Flight' && <button type="button" aria-label="Tandai tiba" className="icon-btn icon-btn--strong" onClick={() => onUpdateStatus(m.id, 'Arrived')} title="Tandai tiba"><span className="material-symbols-outlined" aria-hidden="true">flight_land</span></button>}
          <button type="button" aria-label="Hapus misi" className="icon-btn icon-btn--danger" onClick={() => onDelete(m.id)} title="Hapus"><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
        </div>
      </td>
    </tr>
  );
}

function MissionCard({ m, onShowDetail, onEdit, onUpdateStatus, onDelete }) {
  return (
    <div className="space-y-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] font-semibold text-slate-900">{m.tail_number}</div>
          <div className="text-xs text-slate-500">{m.aircraft_type || '—'}</div>
        </div>
        <StatusBadge status={m.status} />
      </div>
      <div className="text-[13px] text-slate-700">{m.origin_base_name} → {m.destination_base_name}</div>
      <div className="text-xs tabular-nums text-slate-500">{m.distance_km?.toFixed?.(0) ?? '—'} km · {m.predicted_duration_minutes?.toFixed?.(0) ?? '—'} mnt · ETD {formatTimeOnly(m.scheduled_departure)} · ETA {formatTimeOnly(m.predicted_arrival)}</div>
      <div className="flex flex-wrap gap-3"><CompactWeatherBadge weather={m.origin_weather} /><CompactWeatherBadge weather={m.destination_weather} /></div>
      <div className="flex justify-end gap-1.5">
        <button type="button" aria-label="Lihat detail misi" className="icon-btn" onClick={() => onShowDetail(m)}><span className="material-symbols-outlined" aria-hidden="true">visibility</span></button>
        <button type="button" aria-label="Edit misi" className="icon-btn" onClick={() => onEdit(m.id)}><span className="material-symbols-outlined" aria-hidden="true">edit</span></button>
        {m.status === 'Scheduled' && <button type="button" aria-label="Mulai terbang" className="icon-btn icon-btn--strong" onClick={() => onUpdateStatus(m.id, 'In-Flight')}><span className="material-symbols-outlined" aria-hidden="true">flight_takeoff</span></button>}
        {m.status === 'In-Flight' && <button type="button" aria-label="Tandai tiba" className="icon-btn icon-btn--strong" onClick={() => onUpdateStatus(m.id, 'Arrived')}><span className="material-symbols-outlined" aria-hidden="true">flight_land</span></button>}
        <button type="button" aria-label="Hapus misi" className="icon-btn icon-btn--danger" onClick={() => onDelete(m.id)}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
      </div>
    </div>
  );
}

function MissionDetailModal({ mission, onClose }) {
  const etdText = formatDateTime(mission.scheduled_departure);
  const etaText = formatDateTime(mission.predicted_arrival);
  const actualEtdText = formatDateTime(mission.actual_departure);
  const actualEtaText = formatDateTime(mission.actual_arrival);
  const durasi = mission.predicted_duration_minutes;
  const jamPesawat = mission.aircraft_hours_after_arrival;
  const jamAwal = mission.aircraft_hours_before_departure;
  const akumulasi = (() => {
    if (jamPesawat != null) return Number(jamPesawat);
    if (jamAwal != null && Number(durasi || 0) > 0) return Number(jamAwal) + Number(durasi) / 60;
    return null;
  })();

  return (
    <Modal title={`Detail Misi #${mission.id} — ${mission.tail_number || ''}`} onClose={onClose} footer={<button className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700" onClick={onClose}>Tutup</button>}>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--card-border)' }}>
          <div className="text-xs text-slate-500">ETD · jadwal berangkat</div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-slate-900">{etdText}</div>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--card-border)' }}>
          <div className="text-xs text-slate-500">ETA · prediksi tiba</div>
          <div className="mt-1 text-sm font-semibold tabular-nums text-slate-900">{etaText}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><div className="text-xs font-medium text-slate-500">Pesawat</div><div className="font-semibold text-slate-900">{mission.tail_number || '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Tipe</div><div className="font-semibold text-slate-900">{mission.aircraft_type || '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Status</div><div className="mt-0.5"><StatusBadge status={mission.status} /></div></div>
        <div><div className="text-xs font-medium text-slate-500">Lanud Asal</div><div className="font-semibold text-slate-900">{mission.origin_base_name || '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Lanud Tujuan</div><div className="font-semibold text-slate-900">{mission.destination_base_name || '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Jarak</div><div className="font-semibold text-slate-900">{mission.distance_km?.toFixed?.(1) || '—'} KM</div></div>
        <div><div className="text-xs font-medium text-slate-500">Durasi Terbang</div><div className="font-semibold text-slate-900">+{durasi?.toFixed?.(1) || '—'} menit</div></div>
        <div><div className="text-xs font-medium text-slate-500">Status Lanud Tujuan</div><div className="font-semibold text-slate-900">{mission.airbase_status_after_arrival || '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">ETD Aktual</div><div className="font-semibold text-slate-900">{actualEtdText}</div></div>
        <div><div className="text-xs font-medium text-slate-500">ETA Aktual</div><div className="font-semibold text-slate-900">{actualEtaText}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Selisih ETA</div><div className="font-semibold tabular-nums" style={{ color: mission.eta_variance_minutes > 0 ? 'var(--status-kritis)' : 'var(--status-aman)' }}>{mission.eta_variance_minutes != null ? `${mission.eta_variance_minutes > 0 ? '+' : ''}${mission.eta_variance_minutes} menit` : '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Alasan Keterlambatan</div><div className="font-semibold text-slate-900">{mission.delay_reason || '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Jam Sebelum Terbang</div><div className="font-semibold text-slate-900">{jamAwal != null ? Number(jamAwal).toFixed(1) : '—'} jam</div></div>
        <div><div className="text-xs font-medium text-slate-500">Akumulasi Setelah Tiba</div><div className="font-semibold tabular-nums text-slate-900">{akumulasi != null ? Number(akumulasi).toFixed(1) : '—'} jam {jamAwal != null && durasi ? <span className="font-normal text-slate-500">({Number(jamAwal).toFixed(1)} + {(durasi / 60).toFixed(2)})</span> : null}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Payload</div><div className="font-semibold text-slate-900">{mission.payload_kg != null ? `${mission.payload_kg} kg` : '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Flight Level</div><div className="font-semibold text-slate-900">{mission.flight_level != null ? `FL${mission.flight_level}` : '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Wind Component</div><div className="font-semibold text-slate-900">{mission.wind_component_kmh != null ? `${mission.wind_component_kmh > 0 ? '+' : ''}${Number(mission.wind_component_kmh).toFixed(1)} km/h ${mission.wind_component_kmh > 0 ? 'head' : mission.wind_component_kmh < 0 ? 'tail' : ''}` : '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Taxi Time</div><div className="font-semibold text-slate-900">{mission.taxi_time_minutes != null ? `${Number(mission.taxi_time_minutes).toFixed(1)} min` : '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Alternate</div><div className="font-semibold text-slate-900">{mission.alternate_distance_km ? `${Number(mission.alternate_distance_km).toFixed(1)} km · ${mission.alternate_fuel_liters ?? '—'} L` : '—'}</div></div>
        <div><div className="text-xs font-medium text-slate-500">Total Fuel</div><div className="font-semibold tabular-nums text-slate-900">{mission.total_fuel_liters != null ? `${Number(mission.total_fuel_liters).toLocaleString('id-ID')} L` : '—'}</div></div>
        <div className="col-span-2"><div className="text-xs font-medium text-slate-500">SIGMET</div><div className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold" style={mission.sigmet_active && mission.sigmet_active !== 'NIL' ? { background: 'var(--status-kritis-bg)', color: 'var(--status-kritis)' } : { background: 'var(--status-aman-bg)', color: 'var(--status-aman)' }}>{mission.sigmet_active || 'NIL'}</div></div>
        <div className="col-span-2"><div className="text-xs font-medium text-slate-500">TAF</div><div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-200">{mission.taf_summary || '—'}</div></div>
      </div>
      {mission.route_legs?.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Rute dan progres ETA</div>
          <div className="mt-3 space-y-3">
            {mission.route_legs.map((point, index) => {
              const active = mission.status === 'In-Flight' && index === 0;
              const reached = mission.status === 'Arrived' || (mission.status === 'In-Flight' && index < 1);
              return <div key={`${point.name}-${point.order ?? index}`} className="flex items-center gap-3">
                <span className={`h-3 w-3 shrink-0 rounded-full border-2 ${reached ? 'border-emerald-500 bg-emerald-400' : 'border-slate-300 bg-white'} ${active ? 'animate-pulse' : ''}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm font-semibold text-slate-800"><span className="truncate">{point.name}</span><span className="text-xs font-normal text-slate-500">Transit {point.order ?? index + 1}</span></div>
                  <div className="text-xs text-slate-500">{point.latitude}, {point.longitude}{point.stop_duration_minutes ? ` · berhenti ${point.stop_duration_minutes} menit` : ''}</div>
                </div>
              </div>;
            })}
          </div>
          <div className="mt-3 text-xs text-slate-500">Animasi hanya menandai status misi; bukan posisi GPS realtime.</div>
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          ['Cuaca Asal', mission.origin_weather],
          ['Cuaca Tujuan', mission.destination_weather],
        ].map(([label, w]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">{label}</span>
              {w && <WeatherFreshness realtime={w.is_realtime} />}
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{w ? `${Math.round(w.temp_celsius)}°C` : '—'}</div>
            <div className="text-xs text-slate-600">{w?.weather_condition || '—'}</div>
            {w && <div className="mt-1 text-xs tabular-nums text-slate-500">Angin {Math.round(w.wind_speed_kmh)} km/jam</div>}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function CompactWeatherInline({ label, weather, loading }) {
  if (!weather && loading) return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-500">Memuat cuaca…</div>;
  if (!weather) return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-center text-xs text-slate-500">Pilih {label.toLowerCase()}…</div>;
  const vis = weather.visibility_m != null ? `${(weather.visibility_m / 1000).toFixed(1)} km` : '—';
  const wdir = weather.wind_direction_deg != null ? `${weather.wind_direction_deg}° ${weather.wind_from_compass || ''}`.trim() : '—';
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600">{label}</span>
        <WeatherFreshness realtime={weather.is_realtime} />
      </div>
      <div className="mt-2 text-xl font-extrabold text-slate-900">{Math.round(weather.temp_celsius)}°C</div>
      <div className="text-xs text-slate-600">{weather.weather_condition}</div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-slate-500"><span>Angin {Math.round(weather.wind_speed_kmh)} km/jam · {wdir}</span><span>Jarak pandang {vis}</span>{weather.cloudcover_pct != null ? <span>Awan {weather.cloudcover_pct}%</span> : null}</div>
      {weather.taf_summary && <div className="mt-2 rounded-lg bg-white border border-slate-200 px-2 py-1.5 text-xs text-slate-700">{weather.taf_summary}</div>}
      {weather.sigmet_active && weather.sigmet_active !== 'NIL' && <div className="mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--status-kritis-bg)', color: 'var(--status-kritis)' }}>{weather.sigmet_active}</div>}
    </div>
  );
}

function LocationInline({ label, value, onChange }) {
  if (!value) return <button type="button" className="mt-2 text-[13px] font-medium text-slate-700 hover:underline" onClick={() => onChange({ name: '', country: '', latitude: '', longitude: '', location_type: 'OTHER' })}>+ Tambah lokasi baru</button>;
  return <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3">
    <input aria-label={`${label} nama`} className="rounded-lg border px-2 py-1.5 text-xs" placeholder="Nama lokasi *" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
    <input aria-label={`${label} negara`} className="rounded-lg border px-2 py-1.5 text-xs" placeholder="Negara" value={value.country || ''} onChange={(e) => onChange({ ...value, country: e.target.value })} />
    <input aria-label={`${label} latitude`} type="number" min="-90" max="90" step="any" className="rounded-lg border px-2 py-1.5 text-xs" placeholder="Latitude *" value={value.latitude} onChange={(e) => onChange({ ...value, latitude: e.target.value })} />
    <input aria-label={`${label} longitude`} type="number" min="-180" max="180" step="any" className="rounded-lg border px-2 py-1.5 text-xs" placeholder="Longitude *" value={value.longitude} onChange={(e) => onChange({ ...value, longitude: e.target.value })} />
    <button type="button" className="col-span-2 text-left text-xs text-slate-600" onClick={() => onChange(null)}>Pakai lokasi tersimpan</button>
  </div>;
}

function PredictionModal({ open, onClose, bases, units, form, setForm, onSubmit, predicting, predictionResult, onSave, saving, editingId, error, originWeather, destinationWeather, originWeatherLoading, destinationWeatherLoading }) {
  if (!open) return null;
  const canPredict = form.aircraft_id && (form.origin_base_id || form.origin_location?.name) && (form.destination_base_id || form.destination_location?.name) && (form.origin_base_id !== form.destination_base_id || form.origin_location || form.destination_location);
  return (
    <Modal title={editingId ? 'Edit Misi Penerbangan' : 'Prediksi & Daftarkan Misi'} onClose={onClose} footer={
      <>
        <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50" onClick={onClose}>Tutup</button>
        {!predictionResult ? (
          <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50" onClick={onSubmit} disabled={predicting || !canPredict}>{predicting ? 'Memproses…' : 'Prediksi'}</button>
        ) : (
          <button type="button" className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50" onClick={onSave} disabled={saving}>{saving ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Daftarkan Misi'}</button>
        )}
      </>
    }>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Pesawat *</label>
          <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.aircraft_id} onChange={(e) => setForm((p) => ({ ...p, aircraft_id: e.target.value }))}>
            <option value="">— pilih —</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.tail_number} · {u.aircraft_type?.name || '—'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">ETD</label>
          <input type="datetime-local" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.scheduled_departure} onChange={(e) => setForm((p) => ({ ...p, scheduled_departure: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Asal *</label>
          <select disabled={!!form.origin_location} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100" value={form.origin_base_id} onChange={(e) => setForm((p) => ({ ...p, origin_base_id: e.target.value }))}>
            <option value="">— pilih lokasi tersimpan —</option>
            {bases.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <LocationInline label="Asal" value={form.origin_location} onChange={(value) => setForm((p) => ({ ...p, origin_location: value, origin_base_id: value ? '' : p.origin_base_id }))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Tujuan akhir *</label>
          <select disabled={!!form.destination_location} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100" value={form.destination_base_id} onChange={(e) => setForm((p) => ({ ...p, destination_base_id: e.target.value }))}>
            <option value="">— pilih lokasi tersimpan —</option>
            {bases.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <LocationInline label="Tujuan" value={form.destination_location} onChange={(value) => setForm((p) => ({ ...p, destination_location: value, destination_base_id: value ? '' : p.destination_base_id }))} />
        </div>
        <div className="md:col-span-2 rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-slate-700">Titik transit</span><button type="button" className="text-[13px] font-medium text-slate-700 hover:underline" onClick={() => setForm((p) => ({ ...p, route_points: [...p.route_points, { name: '', latitude: '', longitude: '', order: p.route_points.length + 1, stop_duration_minutes: '' }] }))}>+ Tambah titik transit</button></div>
          {form.route_points.map((point, index) => <div key={index} className="mt-2 grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg"><input className="rounded-lg border px-2 py-1.5 text-xs" placeholder={`Transit ${index + 1} *`} value={point.name} onChange={(e) => setForm((p) => ({ ...p, route_points: p.route_points.map((x, i) => i === index ? { ...x, name: e.target.value } : x) }))} /><input type="number" step="any" className="rounded-lg border px-2 py-1.5 text-xs" placeholder="Latitude *" value={point.latitude} onChange={(e) => setForm((p) => ({ ...p, route_points: p.route_points.map((x, i) => i === index ? { ...x, latitude: e.target.value } : x) }))} /><input type="number" step="any" className="rounded-lg border px-2 py-1.5 text-xs" placeholder="Longitude *" value={point.longitude} onChange={(e) => setForm((p) => ({ ...p, route_points: p.route_points.map((x, i) => i === index ? { ...x, longitude: e.target.value } : x) }))} /><input type="number" min="0" className="rounded-lg border px-2 py-1.5 text-xs" placeholder="Durasi berhenti (opsional)" value={point.stop_duration_minutes} onChange={(e) => setForm((p) => ({ ...p, route_points: p.route_points.map((x, i) => i === index ? { ...x, stop_duration_minutes: e.target.value } : x) }))} /></div>)}
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Payload (kg)</label>
          <input type="number" min="0" placeholder="0" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.payload_kg} onChange={(e) => setForm((p) => ({ ...p, payload_kg: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Flight Level (FL)</label>
          <input type="number" min="0" max="600" placeholder="mis. 250" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.flight_level} onChange={(e) => setForm((p) => ({ ...p, flight_level: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Alternate (opsional)</label>
          <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.alternate_base_id} onChange={(e) => setForm((p) => ({ ...p, alternate_base_id: e.target.value }))}>
            <option value="">— tanpa alternate —</option>
            {bases.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <p className="mt-1 text-xs text-slate-500">Fuel alternate dihitung: jarak Dest→Alternate × burn + 10% · Taxi dari Lanud Asal</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <CompactWeatherInline label="Cuaca Asal" weather={originWeather} loading={originWeatherLoading} />
        <CompactWeatherInline label="Cuaca Tujuan" weather={destinationWeather} loading={destinationWeatherLoading} />
      </div>
      {error && <div role="alert" className="mt-4 rounded-lg border px-4 py-3 text-[13px]" style={{ borderColor: 'color-mix(in srgb, var(--status-kritis) 45%, transparent)', background: 'var(--status-kritis-bg)', color: 'var(--text-primary)' }}>{error}</div>}
      {predictionResult && (
        <div className="mt-4 rounded-lg border border-slate-200 p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
            {[
              ['Jarak', `${predictionResult.distance_km} km`, null],
              ['Durasi', `${predictionResult.predicted_duration_minutes} mnt`, predictionResult.air_time_minutes != null ? `terbang ${predictionResult.air_time_minutes} + taxi ${predictionResult.taxi_time_minutes} mnt` : null],
              ['ETA', formatTimeOnly(predictionResult.predicted_arrival), null],
              ['Risiko keterlambatan', predictionResult.delay_risk, null],
            ].map(([label, value, note]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-900">{value}</dd>
                {note && <dd className="text-xs tabular-nums text-slate-500">{note}</dd>}
              </div>
            ))}
          </dl>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-xs md:grid-cols-4">
            <div><dt className="text-slate-500">Ground speed</dt><dd className="tabular-nums text-slate-900">{predictionResult.ground_speed_kmh} km/h · {predictionResult.bearing_deg}°</dd><dd className="tabular-nums text-slate-500">TAS {predictionResult.cruise_speed_kmh} km/h</dd></div>
            <div><dt className="text-slate-500">Komponen angin</dt><dd className="tabular-nums text-slate-900">{predictionResult.wind_component_label || `${predictionResult.wind_component_kmh} km/h`}</dd>{predictionResult.origin_weather?.wind_direction_deg != null && <dd className="tabular-nums text-slate-500">{predictionResult.origin_weather.wind_direction_deg}° → {predictionResult.destination_weather?.wind_direction_deg ?? '—'}°</dd>}</div>
            <div><dt className="text-slate-500">Jarak pandang</dt><dd className="tabular-nums text-slate-900">{predictionResult.origin_weather?.visibility_m ? `${(predictionResult.origin_weather.visibility_m / 1000).toFixed(1)} km` : '—'}</dd><dd className="tabular-nums text-slate-500">tujuan {predictionResult.destination_weather?.visibility_m ? `${(predictionResult.destination_weather.visibility_m / 1000).toFixed(1)} km` : '—'}</dd></div>
            <div><dt className="text-slate-500">Bahan bakar</dt><dd className="tabular-nums text-slate-900">{predictionResult.estimated_avtur_consumed_liters} L</dd><dd className="tabular-nums text-slate-500">total {predictionResult.total_fuel_liters} L{predictionResult.alternate_fuel_liters ? ` · alt ${predictionResult.alternate_fuel_liters} L` : ''}</dd></div>
          </dl>
          {(predictionResult.sigmet_active && predictionResult.sigmet_active !== 'NIL') || predictionResult.taf_summary || predictionResult.payload_ratio > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {predictionResult.sigmet_active && predictionResult.sigmet_active !== 'NIL' && <span className="rounded-md px-2 py-0.5 font-semibold" style={{ background: 'var(--status-kritis-bg)', color: 'var(--status-kritis)' }}>SIGMET {predictionResult.sigmet_active}</span>}
              {predictionResult.payload_ratio > 0 && <span className="rounded-md px-2 py-0.5" style={{ background: 'var(--status-waspada-bg)', color: 'var(--text-primary)' }}>Payload {(predictionResult.payload_ratio * 100).toFixed(0)}%</span>}
              {predictionResult.taf_summary && <span className="rounded-md border border-slate-200 px-2 py-0.5 text-slate-600">{predictionResult.taf_summary}</span>}
            </div>
          ) : null}
          {predictionResult.recommendations?.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-slate-700">{predictionResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>}
        </div>
      )}
    </Modal>
  );
}

export default function MisiPenerbangan() {
  const [bases, setBases] = useState([]);
  const [units, setUnits] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState({ status: '', origin_base_id: '', destination_base_id: '', aircraft_id: '' });
  const [missionSearch, setMissionSearch] = useState('');
  const [debouncedMissionSearch, setDebouncedMissionSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(defaultForm);
  const [originWeather, setOriginWeather] = useState(null);
  const [destinationWeather, setDestinationWeather] = useState(null);
  const [originWeatherLoading, setOriginWeatherLoading] = useState(false);
  const [destinationWeatherLoading, setDestinationWeatherLoading] = useState(false);
  const [predictOpen, setPredictOpen] = useState(false);
  const [detailMission, setDetailMission] = useState(null);

  const loadLookups = async () => {
    try {
      const [bRes, uRes] = await Promise.all([
        airbaseAPI.getAll({ limit: 100 }),
        aircraftAPI.getUnits({ limit: 100 }),
      ]);
      setBases(bRes.data || []);
      setUnits((uRes.data || []).filter((u) => u.status === 'S'));
    } catch { /* ignore lookup */ }
  };

  const loadMissions = async (filterOverrides = null) => {
    setLoading(true);
    try {
      const activeFilters = filterOverrides ?? filters;
      const q = debouncedMissionSearch.trim() || undefined;
      const mRes = await flightMissionAPI.getAll({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        ...(q ? { q } : {}),
        ...(activeFilters.status ? { status_filter: activeFilters.status } : {}),
        ...(activeFilters.origin_base_id ? { origin_base_id: activeFilters.origin_base_id } : {}),
        ...(activeFilters.destination_base_id ? { destination_base_id: activeFilters.destination_base_id } : {}),
        ...(activeFilters.aircraft_id ? { aircraft_id: activeFilters.aircraft_id } : {}),
      });
      setMissions(mRes.data || []);
      setTotal(extractTotal(mRes, mRes.data || []));
    } catch (e) {
      console.error('Error loading mission data:', e);
      setError('Gagal memuat data misi.');
    }
    setLoading(false);
  };

  const loadData = loadMissions;

  useEffect(() => { loadLookups(); loadMissions(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadMissions(); }, 200);
    return () => clearTimeout(timer);
    /* eslint-disable-next-line */
  }, [filters.status, filters.origin_base_id, filters.destination_base_id, filters.aircraft_id]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedMissionSearch(missionSearch); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [missionSearch]);

  useEffect(() => { loadMissions(); /* eslint-disable-next-line */ }, [page, pageSize, debouncedMissionSearch]);

  useEffect(() => {
    if (!form.origin_base_id) { setOriginWeather(null); return; }
    let cancelled = false;
    setOriginWeatherLoading(true);
    weatherAPI.getByBase(form.origin_base_id).then((res) => { if (!cancelled) setOriginWeather(res.data); }).catch(() => {}).finally(() => { if (!cancelled) setOriginWeatherLoading(false); });
    return () => { cancelled = true; };
  }, [form.origin_base_id]);

  useEffect(() => {
    if (!form.destination_base_id) { setDestinationWeather(null); return; }
    let cancelled = false;
    setDestinationWeatherLoading(true);
    weatherAPI.getByBase(form.destination_base_id).then((res) => { if (!cancelled) setDestinationWeather(res.data); }).catch(() => {}).finally(() => { if (!cancelled) setDestinationWeatherLoading(false); });
    return () => { cancelled = true; };
  }, [form.destination_base_id]);

  const openPredict = () => { setForm(defaultForm); setPredictionResult(null); setError(''); setEditingId(null); setPredictOpen(true); };
  const handlePredict = async () => {
    if (!form.aircraft_id || !form.origin_base_id || !form.destination_base_id) { setError('Lengkapi Pesawat, Lanud Asal, dan Lanud Tujuan.'); return; }
    if (form.origin_base_id === form.destination_base_id) { setError('Lanud Asal dan Lanud Tujuan tidak boleh sama.'); return; }
    setError(''); setPredicting(true); setPredictionResult(null);
    try {
      const res = await flightMissionAPI.predictETA({
        aircraft_id: parseInt(form.aircraft_id),
        ...(form.origin_base_id ? { origin_base_id: parseInt(form.origin_base_id) } : { origin_location: { ...form.origin_location, latitude: Number(form.origin_location.latitude), longitude: Number(form.origin_location.longitude) } }),
        ...(form.destination_base_id ? { destination_base_id: parseInt(form.destination_base_id) } : { destination_location: { ...form.destination_location, latitude: Number(form.destination_location.latitude), longitude: Number(form.destination_location.longitude) } }),
        route_points: form.route_points.map((p) => ({ ...p, latitude: Number(p.latitude), longitude: Number(p.longitude), stop_duration_minutes: p.stop_duration_minutes ? Number(p.stop_duration_minutes) : null })),
        scheduled_departure: localInputToUtc(form.scheduled_departure),
        payload_kg: form.payload_kg ? parseFloat(form.payload_kg) : 0,
        flight_level: form.flight_level ? parseInt(form.flight_level) : null,
        alternate_base_id: form.alternate_base_id ? parseInt(form.alternate_base_id) : null,
        alternate_locations: form.alternate_locations,
      });
      setPredictionResult(res.data);
    } catch (err) {
      setNotice({ type: 'error', title: 'Gagal memproses prediksi ETA', message: err.response?.data?.detail || err.message });
    }
    setPredicting(false);
  };
  const handleSaveMission = async () => {
    if (!form.aircraft_id || (!form.origin_base_id && !form.origin_location) || (!form.destination_base_id && !form.destination_location)) return;
    if (form.origin_base_id && form.origin_base_id === form.destination_base_id) { setError('Lanud Asal dan Lanud Tujuan tidak boleh sama.'); return; }
    setSaving(true);
    try {
      const payload = {
        aircraft_id: parseInt(form.aircraft_id),
        ...(form.origin_base_id ? { origin_base_id: parseInt(form.origin_base_id) } : { origin_location: { ...form.origin_location, latitude: Number(form.origin_location.latitude), longitude: Number(form.origin_location.longitude) } }),
        ...(form.destination_base_id ? { destination_base_id: parseInt(form.destination_base_id) } : { destination_location: { ...form.destination_location, latitude: Number(form.destination_location.latitude), longitude: Number(form.destination_location.longitude) } }),
        route_points: form.route_points.map((p) => ({ ...p, latitude: Number(p.latitude), longitude: Number(p.longitude), stop_duration_minutes: p.stop_duration_minutes ? Number(p.stop_duration_minutes) : null })),
        alternate_locations: form.alternate_locations,
        scheduled_departure: localInputToUtc(form.scheduled_departure),
        payload_kg: form.payload_kg ? parseFloat(form.payload_kg) : 0,
        flight_level: form.flight_level ? parseInt(form.flight_level) : null,
        alternate_base_id: form.alternate_base_id ? parseInt(form.alternate_base_id) : null,
      };
      if (editingId) await flightMissionAPI.update(editingId, payload);
      else await flightMissionAPI.create(payload);
      setNotice({ type: 'success', title: editingId ? 'Misi diperbarui' : 'Misi tersimpan', message: editingId ? 'Perubahan misi sudah disimpan.' : 'Misi penerbangan sudah didaftarkan.' });
      setPredictOpen(false); setPredictionResult(null); setEditingId(null); setForm(defaultForm); await loadData();
    } catch (err) {
      setNotice({ type: 'error', title: 'Gagal menyimpan misi', message: err.response?.data?.detail || err.message });
    }
    setSaving(false);
  };
  const handleEditMission = async (id) => {
    try {
      const res = await flightMissionAPI.getById(id);
      const m = res.data;
      setEditingId(id);
      setForm({
        aircraft_id: String(m.aircraft_id),
        origin_base_id: m.origin_base_id ? String(m.origin_base_id) : '',
        destination_base_id: m.destination_base_id ? String(m.destination_base_id) : '',
        origin_location: m.origin_location || null,
        destination_location: m.destination_location || null,
        route_points: (m.route_legs || []).map((p, index) => ({ ...p, order: p.order ?? index + 1, stop_duration_minutes: p.stop_duration_minutes ?? '' })),
        alternate_locations: m.alternate_locations || [],
        scheduled_departure: m.scheduled_departure ? toLocalInput(parseUtc(m.scheduled_departure)) : toLocalInput(),
        payload_kg: m.payload_kg != null ? String(m.payload_kg) : '',
        flight_level: m.flight_level != null ? String(m.flight_level) : '',
        alternate_base_id: m.alternate_base_id ? String(m.alternate_base_id) : '',
      });
      setPredictionResult(null); setError(''); setPredictOpen(true);
    } catch (err) {
      setNotice({ type: 'error', title: 'Gagal membuka misi', message: err.response?.data?.detail || err.message });
    }
  };
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      if (newStatus === 'In-Flight') await flightMissionAPI.approve(id, { approval_note: 'Disetujui melalui panel misi' });
      await flightMissionAPI.updateStatus(id, { status: newStatus, actual_departure: newStatus === 'In-Flight' ? new Date().toISOString() : null, actual_arrival: newStatus === 'Arrived' ? new Date().toISOString() : null });
      await loadData();
      setNotice({ type: 'success', title: 'Status diperbarui', message: `Misi #${id} sekarang ${newStatus}.` });
    } catch (err) {
      setNotice({ type: 'error', title: 'Gagal memperbarui status', message: err.response?.data?.detail || err.message });
    }
  };
  const handleDeleteMission = (id) => setDeleteTarget(id);
  const confirmDeleteMission = async () => {
    if (!deleteTarget) return;
    try { await flightMissionAPI.delete(deleteTarget); setDeleteTarget(null); await loadData(); setNotice({ type: 'success', title: 'Misi dihapus', message: 'Data misi penerbangan berhasil dihapus.' }); }
    catch (err) { setNotice({ type: 'error', title: 'Gagal menghapus misi', message: err.response?.data?.detail || err.message }); }
  };
  const resetFilters = async () => { const empty = { status: '', origin_base_id: '', destination_base_id: '', aircraft_id: '' }; setFilters(empty); setMissionSearch(''); setDebouncedMissionSearch(''); setPage(1); await loadData(empty); };

  return (
    <div>
      <PageShell title="Prediksi ETA & Misi Penerbangan" subtitle="Prediksi kedatangan lintas lanud dengan cuaca real-time Open-Meteo" actions={<><span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--status-aman)' }} aria-hidden="true" />Cuaca: Open-Meteo</span><button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700" onClick={openPredict}>Prediksi &amp; daftar misi</button></>}>
      <div className="space-y-6">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-500" aria-hidden="true">search</span>
          <input value={missionSearch} onChange={(e) => setMissionSearch(e.target.value)} placeholder="Cari tail number atau lanud" aria-label="Cari misi" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <MissionFiltersBar filters={filters} setFilters={setFilters} bases={bases} units={units} onReset={resetFilters} />

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-600"><span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" /> Memuat misi…</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Daftar misi penerbangan</h2>
              <span className="text-xs tabular-nums text-slate-500">{total} misi</span>
            </div>
            {missions.length === 0 ? (
              <EmptyState icon={<span className="material-symbols-outlined">flight</span>} title="Belum ada misi" desc="Tekan Prediksi & Daftar Misi untuk membuat misi baru." />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto table-wrap">
                  <table className="w-full min-w-[900px]">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Unit</th>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Asal</th>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Tujuan</th>
                      <th scope="col" className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Jarak</th>
                      <th scope="col" className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Durasi</th>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Jadwal</th>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Cuaca asal</th>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Cuaca tujuan</th>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Status</th>
                      <th scope="col" className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {missions.map((m) => <MissionRow key={m.id} m={m} onShowDetail={setDetailMission} onEdit={handleEditMission} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteMission} />)}
                  </tbody>
                </table>
                </div>
                <div className="md:hidden divide-y divide-slate-200">
                  {missions.map((m) => <MissionCard key={m.id} m={m} onShowDetail={setDetailMission} onEdit={handleEditMission} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteMission} />)}
                </div>
              </>
            )}
            {missions.length > 0 && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
          </div>
        )}
      </div>
    </PageShell>

      {detailMission && <MissionDetailModal mission={detailMission} onClose={() => setDetailMission(null)} />}

      <PredictionModal open={predictOpen} onClose={() => setPredictOpen(false)} bases={bases} units={units} form={form} setForm={setForm} onSubmit={handlePredict} predicting={predicting} predictionResult={predictionResult} onSave={handleSaveMission} saving={saving} editingId={editingId} error={error} originWeather={originWeather} destinationWeather={destinationWeather} originWeatherLoading={originWeatherLoading} destinationWeatherLoading={destinationWeatherLoading} />

      {notice && <Modal title={notice.title} onClose={() => setNotice(null)} footer={<button className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700" onClick={() => setNotice(null)}>OK</button>}><div className={`text-sm ${notice.type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{notice.message}</div></Modal>}

      {deleteTarget && <Modal title="Konfirmasi Hapus Misi" onClose={() => setDeleteTarget(null)} footer={<><button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50" onClick={() => setDeleteTarget(null)}>Batal</button><button className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700" onClick={confirmDeleteMission}>Hapus</button></>}><p className="text-sm text-slate-600">Misi penerbangan ini akan dihapus permanen. Lanjut?</p></Modal>}
    </div>
  );
}
