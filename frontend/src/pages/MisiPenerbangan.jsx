import { useEffect, useState } from 'react';
import { flightMissionAPI, airbaseAPI, aircraftAPI, weatherAPI, extractTotal } from '../api';
import { EmptyState, Modal } from '../components/UI';
import Pagination from '../components/Pagination';
import { PageShell } from '../components/PageShell';

const defaultForm = {
  aircraft_id: '',
  origin_base_id: '',
  destination_base_id: '',
  scheduled_departure: new Date().toISOString().slice(0, 16),
  payload_kg: '',
  flight_level: '',
  alternate_base_id: '',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'In-Flight', label: 'In-Flight' },
  { value: 'Arrived', label: 'Arrived' },
  { value: 'Diverted', label: 'Diverted' },
];

function statusBadge(status) {
  if (status === 'Arrived') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'In-Flight') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'Diverted') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-sky-200 bg-sky-50 text-sky-700';
}

function CompactWeatherBadge({ weather }) {
  if (!weather) return <span className="text-xs text-slate-500">—</span>;
  const cond = (weather.weather_condition || '—').split(' (')[0];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${weather.is_realtime ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`} title={cond}>
      <span className="font-bold">{Math.round(weather.temp_celsius)}°C</span>
      <span className="font-normal opacity-80">{cond}</span>
    </span>
  );
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function formatTimeOnly(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function FilterPill({ label, value, options, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
      <span className="whitespace-nowrap text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none">
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Filter Cepat</div>
      <div className="flex flex-wrap gap-2">
        <FilterPill label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={update('status')} />
        <FilterPill label="Lanud Asal" value={filters.origin_base_id} options={baseOptions} onChange={update('origin_base_id')} />
        <FilterPill label="Lanud Tujuan" value={filters.destination_base_id} options={baseOptions} onChange={update('destination_base_id')} />
        <FilterPill label="Pesawat" value={filters.aircraft_id} options={unitOptions} onChange={update('aircraft_id')} />
        <button type="button" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={onReset}>Reset</button>
      </div>
    </div>
  );
}

function MissionRow({ m, onShowDetail, onEdit, onUpdateStatus, onDelete }) {
  const etd = formatTimeOnly(m.scheduled_departure);
  const eta = formatTimeOnly(m.predicted_arrival);
  return (
    <tr className="border-t border-slate-200 hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="font-bold text-slate-900 font-mono text-sm">{m.tail_number}</div>
        <div className="text-xs text-slate-500">{m.aircraft_type || '—'}</div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700">{m.origin_base_name}</td>
      <td className="px-4 py-3 text-sm text-slate-700">→ {m.destination_base_name}</td>
      <td className="px-4 py-3 font-mono text-xs text-slate-600">{m.distance_km?.toFixed?.(1) || '—'} km</td>
      <td className="px-4 py-3 font-mono text-xs text-slate-600">+{m.predicted_duration_minutes?.toFixed?.(0) || '—'} m</td>
      <td className="px-4 py-3 font-mono text-xs">
        <div className="text-slate-500">ETD {etd}</div>
        <div className="font-bold text-blue-700">ETA {eta}</div>
      </td>
      <td className="px-4 py-3"><CompactWeatherBadge weather={m.origin_weather} /></td>
      <td className="px-4 py-3"><CompactWeatherBadge weather={m.destination_weather} /></td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(m.status)}`}>{m.status}</span>
        <div className="mt-1 text-xs text-slate-500">⏱ {(m.aircraft_hours_after_arrival ?? 0).toFixed?.(1) || 0} jam</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1.5">
          <button aria-label="Lihat detail misi" className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => onShowDetail(m)} title="Detail">👁</button>
          <button aria-label="Edit misi" className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => onEdit(m.id)} title="Edit">✎</button>
          {m.status === 'Scheduled' && <button aria-label="Mulai terbang" className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => onUpdateStatus(m.id, 'In-Flight')} title="Mulai terbang">▶</button>}
          {m.status === 'In-Flight' && <button aria-label="Tandai tiba" className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => onUpdateStatus(m.id, 'Arrived')} title="Tandai tiba">✓</button>}
          <button aria-label="Hapus misi" className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-red-50 px-2.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" onClick={() => onDelete(m.id)} title="Hapus">🗑</button>
        </div>
      </td>
    </tr>
  );
}

function MissionCard({ m, onShowDetail, onEdit, onUpdateStatus, onDelete }) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div><div className="font-mono text-sm font-bold text-slate-900">{m.tail_number}</div><div className="text-xs text-slate-500">{m.aircraft_type || '—'}</div></div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusBadge(m.status)}`}>{m.status}</span>
      </div>
      <div className="text-sm text-slate-700">{m.origin_base_name} → {m.destination_base_name} · <span className="font-mono text-xs">{m.distance_km?.toFixed?.(1) || '—'} km · +{m.predicted_duration_minutes?.toFixed?.(0) || '—'}m</span></div>
      <div className="flex gap-2 text-xs font-mono"><span className="text-slate-500">ETD {formatTimeOnly(m.scheduled_departure)}</span><span className="font-bold text-blue-700">ETA {formatTimeOnly(m.predicted_arrival)}</span></div>
      <div className="flex flex-wrap gap-2"><CompactWeatherBadge weather={m.origin_weather} /><CompactWeatherBadge weather={m.destination_weather} /></div>
      <div className="flex justify-end gap-2">
        <button aria-label="Detail" onClick={() => onShowDetail(m)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-bold focus-visible:ring-2 focus-visible:ring-blue-500">👁</button>
        <button aria-label="Edit" onClick={() => onEdit(m.id)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-bold text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">✎</button>
        {m.status === 'Scheduled' && <button aria-label="Mulai terbang" onClick={() => onUpdateStatus(m.id, 'In-Flight')} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-bold text-white">▶</button>}
        {m.status === 'In-Flight' && <button aria-label="Tandai tiba" onClick={() => onUpdateStatus(m.id, 'Arrived')} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white">✓</button>}
        <button aria-label="Hapus" onClick={() => onDelete(m.id)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-red-50 px-2.5 py-2 text-xs font-bold text-red-700 focus-visible:ring-2 focus-visible:ring-red-400">🗑</button>
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
    <Modal title={`Detail Misi #${mission.id} — ${mission.tail_number || ''}`} onClose={onClose} footer={<button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700" onClick={onClose}>Tutup</button>}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-blue-700">ETD (Jadwal Berangkat)</div>
          <div className="mt-1 text-sm font-bold text-slate-900">{etdText}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">ETA (Prediksi Tiba)</div>
          <div className="mt-1 text-sm font-bold text-slate-900">{etaText}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><div className="text-xs font-bold text-slate-500">Pesawat</div><div className="font-semibold text-slate-900">{mission.tail_number || '—'}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Tipe</div><div className="font-semibold text-slate-900">{mission.aircraft_type || '—'}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Status</div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(mission.status)}`}>{mission.status}</span></div>
        <div><div className="text-xs font-bold text-slate-500">Lanud Asal</div><div className="font-semibold text-slate-900">{mission.origin_base_name || '—'}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Lanud Tujuan</div><div className="font-semibold text-slate-900">{mission.destination_base_name || '—'}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Jarak</div><div className="font-semibold text-slate-900">{mission.distance_km?.toFixed?.(1) || '—'} KM</div></div>
        <div><div className="text-xs font-bold text-slate-500">Durasi Terbang</div><div className="font-semibold text-slate-900">+{durasi?.toFixed?.(1) || '—'} menit</div></div>
        <div><div className="text-xs font-bold text-slate-500">Status Lanud Tujuan</div><div className="font-semibold text-slate-900">{mission.airbase_status_after_arrival || '—'}</div></div>
        <div><div className="text-xs font-bold text-slate-500">ETD Aktual</div><div className="font-semibold text-slate-900">{actualEtdText}</div></div>
        <div><div className="text-xs font-bold text-slate-500">ETA Aktual</div><div className="font-semibold text-slate-900">{actualEtaText}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Jam Sebelum Terbang</div><div className="font-semibold text-slate-900">{jamAwal != null ? Number(jamAwal).toFixed(1) : '—'} jam</div></div>
        <div><div className="text-xs font-bold text-slate-500">Akumulasi Setelah Tiba</div><div className="font-bold text-blue-700">{akumulasi != null ? Number(akumulasi).toFixed(1) : '—'} jam {jamAwal != null && durasi ? <span className="font-normal text-slate-500">({Number(jamAwal).toFixed(1)} + {(durasi / 60).toFixed(2)})</span> : null}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Payload</div><div className="font-semibold text-slate-900">{mission.payload_kg != null ? `${mission.payload_kg} kg` : '—'}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Flight Level</div><div className="font-semibold text-slate-900">{mission.flight_level != null ? `FL${mission.flight_level}` : '—'}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Wind Component</div><div className="font-semibold text-slate-900">{mission.wind_component_kmh != null ? `${mission.wind_component_kmh > 0 ? '+' : ''}${Number(mission.wind_component_kmh).toFixed(1)} km/h ${mission.wind_component_kmh > 0 ? 'head' : mission.wind_component_kmh < 0 ? 'tail' : ''}` : '—'}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Taxi Time</div><div className="font-semibold text-slate-900">{mission.taxi_time_minutes != null ? `${Number(mission.taxi_time_minutes).toFixed(1)} min` : '—'}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Alternate</div><div className="font-semibold text-slate-900">{mission.alternate_distance_km ? `${Number(mission.alternate_distance_km).toFixed(1)} km · ${mission.alternate_fuel_liters ?? '—'} L` : '—'}</div></div>
        <div><div className="text-xs font-bold text-slate-500">Total Fuel</div><div className="font-bold text-amber-700">{mission.total_fuel_liters != null ? `${Number(mission.total_fuel_liters).toLocaleString('id-ID')} L` : '—'}</div></div>
        <div className="col-span-2"><div className="text-xs font-bold text-slate-500">SIGMET</div><div className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${mission.sigmet_active && mission.sigmet_active !== 'NIL' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{mission.sigmet_active || 'NIL'}</div></div>
        <div className="col-span-2"><div className="text-xs font-bold text-slate-500">TAF</div><div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-200">{mission.taf_summary || '—'}</div></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          ['Cuaca Asal', mission.origin_weather],
          ['Cuaca Tujuan', mission.destination_weather],
        ].map(([label, w]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">{label}</span>
              {w && <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${w.is_realtime ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{w.is_realtime ? 'Real-Time' : 'Estimasi'}</span>}
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{w ? `${Math.round(w.temp_celsius)}°C` : '—'}</div>
            <div className="text-xs text-slate-600">{w?.weather_condition || '—'}</div>
            {w && <div className="mt-1 text-xs text-slate-500">💨 {Math.round(w.wind_speed_kmh)} km/jam</div>}
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
        <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${weather.is_realtime ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{weather.is_realtime ? 'Real-Time' : 'Estimasi'}</span>
      </div>
      <div className="mt-2 text-xl font-extrabold text-slate-900">{Math.round(weather.temp_celsius)}°C</div>
      <div className="text-xs text-slate-600">{weather.weather_condition}</div>
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500"><span>💨 {Math.round(weather.wind_speed_kmh)} km/jam · {wdir}</span><span>👁 {vis}</span>{weather.cloudcover_pct != null ? <span>☁ {weather.cloudcover_pct}%</span> : null}</div>
      {weather.taf_summary && <div className="mt-2 rounded-lg bg-white border border-slate-200 px-2 py-1.5 text-xs text-slate-700">{weather.taf_summary}</div>}
      {weather.sigmet_active && weather.sigmet_active !== 'NIL' && <div className="mt-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-bold text-red-700">{weather.sigmet_active}</div>}
    </div>
  );
}

function PredictionModal({ open, onClose, bases, units, form, setForm, onSubmit, predicting, predictionResult, onSave, saving, editingId, error, originWeather, destinationWeather, originWeatherLoading, destinationWeatherLoading }) {
  if (!open) return null;
  const canPredict = form.aircraft_id && form.origin_base_id && form.destination_base_id && form.origin_base_id !== form.destination_base_id;
  return (
    <Modal title={editingId ? 'Edit Misi Penerbangan' : 'Prediksi & Daftarkan Misi'} onClose={onClose} footer={
      <>
        <button type="button" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onClose}>Tutup</button>
        {!predictionResult ? (
          <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50" onClick={onSubmit} disabled={predicting || !canPredict}>{predicting ? 'Memproses…' : 'Prediksi'}</button>
        ) : (
          <button type="button" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50" onClick={onSave} disabled={saving}>{saving ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Daftarkan Misi'}</button>
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
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Lanud Asal *</label>
          <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.origin_base_id} onChange={(e) => setForm((p) => ({ ...p, origin_base_id: e.target.value }))}>
            <option value="">— pilih —</option>
            {bases.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Lanud Tujuan *</label>
          <select className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" value={form.destination_base_id} onChange={(e) => setForm((p) => ({ ...p, destination_base_id: e.target.value }))}>
            <option value="">— pilih —</option>
            {bases.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
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
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {predictionResult && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-center"><div className="text-xs text-slate-500">Jarak</div><div className="text-sm font-bold text-slate-900">{predictionResult.distance_km} km</div></div>
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-center"><div className="text-xs text-slate-500">Durasi</div><div className="text-sm font-bold text-slate-900">{predictionResult.predicted_duration_minutes} m</div><div className="text-xs text-slate-400">{predictionResult.air_time_minutes != null ? `air ${predictionResult.air_time_minutes}m + taxi ${predictionResult.taxi_time_minutes}m` : ''}</div></div>
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-center"><div className="text-xs text-slate-500">ETA</div><div className="text-sm font-bold text-slate-900">{new Date(predictionResult.predicted_arrival).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div></div>
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-center"><div className="text-xs text-slate-500">Risiko</div><div className="text-sm font-bold text-slate-900">{predictionResult.delay_risk}</div></div>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-white border p-2"><span className="text-slate-500">GS</span> <b>{predictionResult.ground_speed_kmh} km/h</b> <span className="text-slate-400">{predictionResult.bearing_deg}° TAS {predictionResult.cruise_speed_kmh} km/h</span></div>
              <div className="rounded-lg bg-white border p-2"><span className="text-slate-500">Wind</span> <b>{predictionResult.wind_component_label || `${predictionResult.wind_component_kmh} km/h`}</b> {predictionResult.origin_weather?.wind_direction_deg != null && <span className="text-slate-400">{predictionResult.origin_weather.wind_direction_deg}°{predictionResult.origin_weather.wind_from_compass ? ` ${predictionResult.origin_weather.wind_from_compass}` : ''} → dest {predictionResult.destination_weather?.wind_direction_deg ?? '—'}°</span>}</div>
              <div className="rounded-lg bg-white border p-2"><span className="text-slate-500">VIS</span> <b>{predictionResult.origin_weather?.visibility_m ? `${(predictionResult.origin_weather.visibility_m/1000).toFixed(1)} km` : '—'}</b> <span className="text-slate-400">→ {predictionResult.destination_weather?.visibility_m ? `${(predictionResult.destination_weather.visibility_m/1000).toFixed(1)} km` : '—'} pred</span></div>
              <div className="rounded-lg bg-white border p-2"><span className="text-slate-500">Fuel trip</span> <b>{predictionResult.estimated_avtur_consumed_liters} L</b> <span className="text-slate-400">total {predictionResult.total_fuel_liters}L{predictionResult.alternate_fuel_liters ? ` alt ${predictionResult.alternate_fuel_liters}L` : ''}</span></div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {predictionResult.sigmet_active && predictionResult.sigmet_active !== 'NIL' && <span className="rounded-full bg-red-100 border border-red-200 px-2.5 py-1 font-bold text-red-700">{predictionResult.sigmet_active}</span>}
              {predictionResult.taf_summary && <span className="rounded-full bg-slate-100 border px-2.5 py-1 text-slate-700">{predictionResult.taf_summary}</span>}
              {predictionResult.payload_ratio != null && predictionResult.payload_ratio > 0 && <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-amber-700">Payload {(predictionResult.payload_ratio*100).toFixed(0)}%</span>}
            </div>
            {predictionResult.recommendations?.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">{predictionResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>}
          </div>
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
        origin_base_id: parseInt(form.origin_base_id),
        destination_base_id: parseInt(form.destination_base_id),
        scheduled_departure: new Date(form.scheduled_departure).toISOString(),
        payload_kg: form.payload_kg ? parseFloat(form.payload_kg) : 0,
        flight_level: form.flight_level ? parseInt(form.flight_level) : null,
        alternate_base_id: form.alternate_base_id ? parseInt(form.alternate_base_id) : null,
      });
      setPredictionResult(res.data);
    } catch (err) {
      setNotice({ type: 'error', title: 'Gagal memproses prediksi ETA', message: err.response?.data?.detail || err.message });
    }
    setPredicting(false);
  };
  const handleSaveMission = async () => {
    if (!form.aircraft_id || !form.origin_base_id || !form.destination_base_id) return;
    if (form.origin_base_id === form.destination_base_id) { setError('Lanud Asal dan Lanud Tujuan tidak boleh sama.'); return; }
    setSaving(true);
    try {
      const payload = {
        aircraft_id: parseInt(form.aircraft_id),
        origin_base_id: parseInt(form.origin_base_id),
        destination_base_id: parseInt(form.destination_base_id),
        scheduled_departure: new Date(form.scheduled_departure).toISOString(),
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
        origin_base_id: String(m.origin_base_id),
        destination_base_id: String(m.destination_base_id),
        scheduled_departure: m.scheduled_departure ? new Date(m.scheduled_departure).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        payload_kg: m.payload_kg ? String(m.payload_kg) : '',
        flight_level: m.flight_level ? String(m.flight_level) : '',
        alternate_base_id: m.alternate_base_id ? String(m.alternate_base_id) : '',
      });
      setPredictionResult(null); setError(''); setPredictOpen(true);
    } catch (err) {
      setNotice({ type: 'error', title: 'Gagal membuka misi', message: err.response?.data?.detail || err.message });
    }
  };
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await flightMissionAPI.updateStatus(id, { status: newStatus, actual_departure: newStatus === 'In-Flight' ? new Date().toISOString() : null });
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
      <PageShell title="Prediksi ETA & Misi Penerbangan" subtitle="Prediksi kedatangan lintas lanud dengan cuaca real-time Open-Meteo" actions={<><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Open-Meteo</span><button type="button" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700" onClick={openPredict}>+ Prediksi & Daftar Misi</button></>}>
      <div className="space-y-6">
        <div className="relative max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
          <input value={missionSearch} onChange={(e) => setMissionSearch(e.target.value)} placeholder="Cari tail number / lanud…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <MissionFiltersBar filters={filters} setFilters={setFilters} bases={bases} units={units} onReset={resetFilters} />

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 flex items-center justify-center gap-3 text-sm text-slate-600"><span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" /> Memuat misi…</div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="text-sm font-bold text-slate-900">Daftar Misi Penerbangan</div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{total} Misi</span>
            </div>
            {missions.length === 0 ? (
              <EmptyState icon="✈" title="Belum Ada Misi" desc="Tekan tombol Prediksi untuk mendaftarkan misi baru." />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                  <thead className="bg-blue-50 border-b border-blue-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-900">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-900">Asal</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-900">Tujuan</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-900">Jarak</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-900">Durasi</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-900">Jadwal</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-900">Cuaca A</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-900">Cuaca B</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-900">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase text-blue-900">Aksi</th>
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

      {notice && <Modal title={notice.title} onClose={() => setNotice(null)} footer={<button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700" onClick={() => setNotice(null)}>OK</button>}><div className={`text-sm ${notice.type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{notice.message}</div></Modal>}

      {deleteTarget && <Modal title="Konfirmasi Hapus Misi" onClose={() => setDeleteTarget(null)} footer={<><button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => setDeleteTarget(null)}>Batal</button><button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700" onClick={confirmDeleteMission}>Hapus</button></>}><p className="text-sm text-slate-600">Misi penerbangan ini akan dihapus permanen. Lanjut?</p></Modal>}
    </div>
  );
}
