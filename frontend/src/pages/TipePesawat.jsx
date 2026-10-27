import { useState, useEffect, useCallback } from 'react';
import { aircraftAPI, extractTotal } from '../api';
import Pagination from '../components/Pagination';
import { PageShell } from '../components/PageShell';

const EMPTY = {
  id: null, name: '', description: '',
  // kosong = biar backend pakai default; jangan prefill angka palsu seolah spek nyata
  cruise_speed_kmh: '', tbo_hours: '', phase_interval_hours: '',
  calendar_interval_days: '', fuel_burn_lph: '', max_range_km: '', payload_capacity_kg: '',
};

// spek ini dipakai rumus ETA — backend menolak create kalau kosong, jadi wajib di UI
const REQUIRED = ['cruise_speed_kmh', 'fuel_burn_lph', 'max_range_km', 'payload_capacity_kg'];
const LABEL = { cruise_speed_kmh: 'Jelajah', fuel_burn_lph: 'Konsumsi avtur', max_range_km: 'Range maksimum', payload_capacity_kg: 'Payload maksimum' };
const FALLBACK = {
  cruise_speed_kmh: 'contoh: 900', fuel_burn_lph: 'contoh: 3000', max_range_km: 'contoh: 3700', payload_capacity_kg: 'contoh: 9500',
  tbo_hours: '4000', phase_interval_hours: '300', calendar_interval_days: '60',
};

const num = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString('en-US'));
const TH = 'px-4 py-3 text-left text-xs font-medium';

export default function TipePesawat() {
  const [types, setTypes] = useState([]);
  const [q, setQ] = useState(''); const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(10); const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unitCounts, setUnitCounts] = useState({});
  const [showModal, setShowModal] = useState(false); const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { const t = setTimeout(() => { setDebounced(q); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, stats] = await Promise.all([
        aircraftAPI.getTypes({ skip: (page - 1) * pageSize, limit: pageSize, ...(debounced.trim() ? { q: debounced.trim() } : {}) }),
        aircraftAPI.getUnitStats().catch(() => null),
      ]);
      const data = res?.data ?? [];
      setTypes(Array.isArray(data) ? data : []);
      setTotal(extractTotal(res, data));
      const perCategory = stats?.data?.per_category ?? [];
      setUnitCounts(Object.fromEntries(perCategory.map((c) => [String(c.id), c.count])));
    } catch { setTypes([]); setTotal(0); } finally { setLoading(false); }
  }, [page, pageSize, debounced]);

  useEffect(() => { load(); }, [load]);

  const open = (row = null) => {
    setErr('');
    const src = row || {};
    const key = (k, fallback) => (src[k] != null ? String(src[k]) : fallback);
    setForm(row ? {
      id: row.id, name: row.name || '', description: row.description || '',
      cruise_speed_kmh: key('cruise_speed_kmh', EMPTY.cruise_speed_kmh),
      tbo_hours: key('tbo_hours', EMPTY.tbo_hours),
      phase_interval_hours: key('phase_interval_hours', EMPTY.phase_interval_hours),
      calendar_interval_days: key('calendar_interval_days', EMPTY.calendar_interval_days),
      fuel_burn_lph: key('fuel_burn_lph', EMPTY.fuel_burn_lph),
      max_range_km: key('max_range_km', EMPTY.max_range_km),
      payload_capacity_kg: key('payload_capacity_kg', EMPTY.payload_capacity_kg),
    } : EMPTY);
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setErr('Nama tipe wajib diisi.'); return; }
    const kosong = REQUIRED.filter((k) => String(form[k]).trim() === '' || Number(form[k]) <= 0);
    if (kosong.length) { setErr(`Wajib diisi dan > 0: ${kosong.map((k) => LABEL[k]).join(', ')}.`); return; }
    setSaving(true); setErr('');
    try {
      const pick = ['cruise_speed_kmh', 'tbo_hours', 'phase_interval_hours', 'calendar_interval_days', 'fuel_burn_lph', 'max_range_km', 'payload_capacity_kg'];
      const payload = { name: form.name.trim(), description: form.description.trim() || null };
      pick.forEach((k) => { if (String(form[k]).trim() !== '') payload[k] = Number(form[k]); });
      if (form.id) await aircraftAPI.updateType(form.id, payload);
      else await aircraftAPI.createType(payload);
      setShowModal(false); setForm(EMPTY); await load();
    } catch (e) { setErr(e?.response?.data?.detail || e.message); } finally { setSaving(false); }
  };

  const del = async (row) => {
    const used = unitCounts[String(row.id)] || 0;
    if (!window.confirm(used ? `Tipe "${row.name}" dipakai ${used} pesawat. Hapus tipe ini?` : `Hapus tipe "${row.name}"?`)) return;
    try { await aircraftAPI.deleteType(row.id); await load(); } catch (e) { alert(`Gagal: ${e?.response?.data?.detail || e.message}`); }
  };

  const inputStyle = { borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' };
  const field = (label, keyName, hint) => (
    <div>
      <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}{REQUIRED.includes(keyName) ? ' *' : ''}</label>
      <input type="number" value={form[keyName]} onChange={(e) => setForm({ ...form, [keyName]: e.target.value })} className="w-full rounded-lg border px-3 py-2 tabular-nums" style={inputStyle} aria-label={label} placeholder={FALLBACK[keyName]} />
      {hint && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );

  return (
    <div>
      <PageShell
        title="Tipe Pesawat"
        subtitle="Spek tipe (jelajah, avtur, TBO, phase, kalender, range, payload) — dipakai halaman Pesawat dan rumus ETA serta harwat S/U/S"
        actions={<button onClick={() => open()} className="rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>Tambah tipe</button>}
      >
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px]" style={{ color: 'var(--text-muted)' }} aria-hidden="true">search</span>
              <input
                value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari tipe atau deskripsi" aria-label="Cari tipe pesawat"
                className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm"
                style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              />
            </div>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{total} tipe terdaftar</span>
          </div>

          <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="mr-3 h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--primary)' }} />
                Memuat…
              </div>
            ) : types.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                Belum ada tipe.
                <button onClick={() => open()} className="ml-2 font-semibold hover:underline" style={{ color: 'var(--primary)' }}>Tambah tipe pertama</button>
              </div>
            ) : (
              <>
                <div className="table-wrap hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1080px]">
                    <thead className="border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-muted)' }}>
                      <tr>
                        <th className={TH} style={{ color: 'var(--text-muted)' }}>Tipe</th>
                        <th className={`${TH} text-right`} style={{ color: 'var(--text-muted)' }}>Unit</th>
                        <th className={`${TH} text-right`} style={{ color: 'var(--text-muted)' }}>Jelajah</th>
                        <th className={`${TH} text-right`} style={{ color: 'var(--text-muted)' }}>Avtur</th>
                        <th className={`${TH} text-right`} style={{ color: 'var(--text-muted)' }}>Range</th>
                        <th className={`${TH} text-right`} style={{ color: 'var(--text-muted)' }}>TBO</th>
                        <th className={`${TH} text-right`} style={{ color: 'var(--text-muted)' }}>Phase</th>
                        <th className={`${TH} text-right`} style={{ color: 'var(--text-muted)' }}>Kalender</th>
                        <th className={`${TH} text-right`} style={{ color: 'var(--text-muted)' }}>Payload</th>
                        <th className={`${TH} text-right`} style={{ color: 'var(--text-muted)' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {types.map((t) => (
                        <tr key={t.id} className="transition hover:bg-slate-50" style={{ borderColor: 'var(--card-border)' }}>
                          <td className="border-t px-4 py-3" style={{ borderColor: 'var(--card-border)' }}>
                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.description || '—'}</div>
                          </td>
                          <td className="border-t px-4 py-3 text-right text-sm tabular-nums" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>{unitCounts[String(t.id)] ?? 0}</td>
                          <td className="border-t px-4 py-3 text-right text-sm tabular-nums" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>{num(t.cruise_speed_kmh)} km/j</td>
                          <td className="border-t px-4 py-3 text-right text-sm tabular-nums" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>{num(t.fuel_burn_lph)} L/j</td>
                          <td className="border-t px-4 py-3 text-right text-sm tabular-nums" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>{num(t.max_range_km)} km</td>
                          <td className="border-t px-4 py-3 text-right text-sm tabular-nums" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>{num(t.tbo_hours)} j</td>
                          <td className="border-t px-4 py-3 text-right text-sm tabular-nums" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>{num(t.phase_interval_hours)} j</td>
                          <td className="border-t px-4 py-3 text-right text-sm tabular-nums" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>{num(t.calendar_interval_days)} hari</td>
                          <td className="border-t px-4 py-3 text-right text-sm tabular-nums" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>{num(t.payload_capacity_kg)} kg</td>
                          <td className="border-t px-4 py-3" style={{ borderColor: 'var(--card-border)' }}>
                            <div className="flex justify-end gap-1">
                              <button onClick={() => open(t)} className="rounded-md border px-2.5 py-1.5 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>Edit</button>
                              <button onClick={() => del(t)} className="rounded-md border px-2.5 py-1.5 text-xs" style={{ borderColor: 'var(--card-border)', color: 'color-mix(in srgb, var(--status-kritis) 85%, #ffffff)' }}>Hapus</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden">
                  {types.map((t) => (
                    <div key={t.id} className="space-y-1 border-t p-4 first:border-t-0" style={{ borderColor: 'var(--card-border)' }}>
                      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.description || '—'}</div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-xs tabular-nums">
                        {[
                          ['Unit', unitCounts[String(t.id)] ?? 0],
                          ['Jelajah', `${num(t.cruise_speed_kmh)} km/j`],
                          ['Avtur', `${num(t.fuel_burn_lph)} L/j`],
                          ['Range', `${num(t.max_range_km)} km`],
                          ['TBO', `${num(t.tbo_hours)} j`],
                          ['Phase', `${num(t.phase_interval_hours)} j`],
                          ['Kalender', `${num(t.calendar_interval_days)} hari`],
                          ['Payload', `${num(t.payload_capacity_kg)} kg`],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <dt style={{ color: 'var(--text-muted)' }}>{k}</dt>
                            <dd style={{ color: 'var(--text-primary)' }}>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="flex justify-end gap-1 pt-2">
                        <button onClick={() => open(t)} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>Edit</button>
                        <button onClick={() => del(t)} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--card-border)', color: 'color-mix(in srgb, var(--status-kritis) 85%, #ffffff)' }}>Hapus</button>
                      </div>
                    </div>
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border p-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{form.id ? 'Edit tipe pesawat' : 'Tambah tipe pesawat'}</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Jelajah, konsumsi avtur, range, dan payload wajib diisi (dipakai rumus ETA + tabel). TBO/phase/kalender boleh dikosongkan — dipakai default 4.000 j / 300 j / 60 hari.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Nama tipe *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border px-3 py-2" style={inputStyle} placeholder="Contoh: F-16C Block 52 / Rafale" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Deskripsi</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border px-3 py-2" style={inputStyle} placeholder="Peran, skadron, catatan" />
              </div>
              {field('Jelajah (km/jam)', 'cruise_speed_kmh')}
              {field('Konsumsi avtur (L/jam)', 'fuel_burn_lph', 'Dipakai hitung konsumsi bahan bakar per misi.')}
              {field('Range maksimum (km)', 'max_range_km')}
              {field('Payload maksimum (kg)', 'payload_capacity_kg')}
              {field('TBO (jam)', 'tbo_hours')}
              {field('Phase interval (jam)', 'phase_interval_hours')}
              {field('Kalender interval (hari)', 'calendar_interval_days')}
            </div>
            {err && <p className="mt-4 text-sm" style={{ color: 'var(--status-kritis)' }} role="alert">{err}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => { setShowModal(false); setForm(EMPTY); }} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>Batal</button>
              <button disabled={saving} onClick={save} className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>{saving ? 'Menyimpan…' : form.id ? 'Simpan perubahan' : 'Tambah tipe'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
