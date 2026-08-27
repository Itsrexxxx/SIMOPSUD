import { useState, useEffect } from 'react';
import { airbaseAPI, aircraftAPI } from '../api';

const emptyForm = {
  id: null,
  name: '',
  location: '',
  status: 'optimal',
  avtur_capacity_liters: 0,
  avtur_stock_liters: 0,
  special_lube_stock_liters: 0,
  refueler_trucks_count: 0,
  refueler_trucks_active: 0,
  forklifts_count: 0,
  apron_capacity_aircraft: 0,
  apron_used: 0,
};

export default function Pangkalan() {
  const [airbases, setAirbases] = useState([]);
  const [aircraftUnits, setAircraftUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadAirbases = async () => {
    try {
      setError(null);
      const [airbaseResponse, aircraftResponse] = await Promise.all([
        airbaseAPI.getAll(),
        aircraftAPI.getUnits(),
      ]);
      const data = airbaseResponse?.data ?? airbaseResponse ?? [];
      setAirbases(Array.isArray(data) ? data : []);
      setAircraftUnits(Array.isArray(aircraftResponse?.data) ? aircraftResponse.data : []);
    } catch (error) {
      console.error('Error loading airbases:', error);
      setError('Gagal memuat data pangkalan. Pastikan backend sudah berjalan di port 8000.');
      setAirbases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAirbases();
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'critical') {
      return { color: 'bg-red-100 text-red-800 border-red-300', text: 'Kritis' };
    }
    if (status === 'warning') {
      return { color: 'bg-orange-100 text-orange-800 border-orange-300', text: 'Waspada' };
    }
    return { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'Optimal' };
  };

  const openForm = (base = null) => {
    setForm(
      base
        ? {
            id: base.id,
            name: base.name || '',
            location: base.location || '',
            status: base.status || 'optimal',
            avtur_capacity_liters: Number(base.avtur_capacity_liters || 0),
            avtur_stock_liters: Number(base.avtur_stock_liters || 0),
            special_lube_stock_liters: Number(base.special_lube_stock_liters || 0),
            refueler_trucks_count: Number(base.refueler_trucks_count || 0),
            refueler_trucks_active: Number(base.refueler_trucks_active || 0),
            forklifts_count: Number(base.forklifts_count || 0),
            apron_capacity_aircraft: Number(base.apron_capacity_aircraft || 0),
            apron_used: Number(base.apron_used || 0),
          }
        : { ...emptyForm }
    );
    setShowModal(true);
  };

  const saveBase = async () => {
    if (!form.name.trim()) {
      alert('Nama pangkalan wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        avtur_capacity_liters: Number(form.avtur_capacity_liters || 0),
        avtur_stock_liters: Number(form.avtur_stock_liters || 0),
        special_lube_stock_liters: Number(form.special_lube_stock_liters || 0),
        refueler_trucks_count: Number(form.refueler_trucks_count || 0),
        refueler_trucks_active: Number(form.refueler_trucks_active || 0),
        forklifts_count: Number(form.forklifts_count || 0),
        apron_capacity_aircraft: Number(form.apron_capacity_aircraft || 0),
        apron_used: Number(form.apron_used || 0),
      };

      if (form.id) {
        await airbaseAPI.update(form.id, payload);
      } else {
        await airbaseAPI.create(payload);
      }

      setShowModal(false);
      setForm(emptyForm);
      await loadAirbases();
    } catch (error) {
      alert(`Gagal menyimpan data pangkalan: ${error?.response?.data?.detail || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteBase = async (id) => {
    if (!window.confirm('Hapus data pangkalan ini?')) return;

    try {
      await airbaseAPI.delete(id);
      await loadAirbases();
    } catch (error) {
      alert(`Gagal menghapus pangkalan: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const totalOperational = airbases.filter((base) => (base.status || 'optimal') === 'optimal').length;
  const totalWarning = airbases.filter((base) => (base.status || 'optimal') === 'warning').length;
  const totalCritical = airbases.filter((base) => (base.status || 'optimal') === 'critical').length;
  
  // Fuel & logistics metrics
  const totalAvturCapacity = airbases.reduce((sum, base) => sum + (Number(base.avtur_capacity_liters || 0)), 0);
  const totalAvturStock = airbases.reduce((sum, base) => sum + (Number(base.avtur_stock_liters || 0)), 0);
  const avgAvtur = totalAvturCapacity > 0 ? Math.round((totalAvturStock / totalAvturCapacity) * 100) : 0;
  
  const totalRefuelingTrucks = airbases.reduce((sum, base) => sum + (Number(base.refueler_trucks_count || 0)), 0);
  const activeRefuelingTrucks = airbases.reduce((sum, base) => sum + (Number(base.refueler_trucks_active || 0)), 0);
  const truckReadiness = totalRefuelingTrucks > 0 ? Math.round((activeRefuelingTrucks / totalRefuelingTrucks) * 100) : 0;
  
  const totalApronCapacity = airbases.reduce((sum, base) => sum + (Number(base.apron_capacity_aircraft || 0)), 0);
  const totalApronUsed = airbases.reduce((sum, base) => sum + (Number(base.apron_used || 0)), 0);
  const apronUtilization = totalApronCapacity > 0 ? Math.round((totalApronUsed / totalApronCapacity) * 100) : 0;
  const totalStationedAircraft = aircraftUnits.filter((unit) => unit.airbase_id != null).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Data Pangkalan Udara</h1>
            <p className="text-gray-600 mt-1">Monitoring kapasitas logistik, operasional, dan fasilitas tiap lanud</p>
          </div>
          <button
            onClick={() => openForm()}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            + Tambah Pangkalan
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards - Statistik Operasional Utama */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm opacity-90">Total Pangkalan</div>
                <div className="text-3xl font-bold mt-2">{airbases.length}</div>
                <div className="text-xs opacity-75 mt-2">{totalStationedAircraft} pesawat memiliki penempatan</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm opacity-90">Status Operasional</div>
                <div className="text-3xl font-bold mt-2">{totalOperational}</div>
                <div className="text-xs opacity-75 mt-2">{airbases.length > 0 ? Math.round((totalOperational/airbases.length)*100) : 0}% optimal</div>
              </div>
              <div className="text-4xl opacity-30">✓</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl shadow-sm p-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm opacity-90">Stok Avtur</div>
                <div className="text-3xl font-bold mt-2">{avgAvtur}%</div>
                <div className="text-xs opacity-75 mt-2">{(totalAvturStock/1000).toFixed(0)}K / {(totalAvturCapacity/1000).toFixed(0)}K Liter</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm opacity-90">Kesiapan Kendaraan</div>
                <div className="text-3xl font-bold mt-2">{truckReadiness}%</div>
                <div className="text-xs opacity-75 mt-2">{activeRefuelingTrucks}/{totalRefuelingTrucks} truk aktif</div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights Panel - Distribusi Status & Penggunaan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Distribusi Status Pangkalan</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-emerald-700 font-medium">Optimal</span>
                  <span className="font-bold text-emerald-700">{totalOperational}</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{width: airbases.length > 0 ? `${(totalOperational/airbases.length)*100}%` : '0%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-orange-700 font-medium">Waspada</span>
                  <span className="font-bold text-orange-700">{totalWarning}</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{width: airbases.length > 0 ? `${(totalWarning/airbases.length)*100}%` : '0%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-red-700 font-medium">Kritis</span>
                  <span className="font-bold text-red-700">{totalCritical}</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{width: airbases.length > 0 ? `${(totalCritical/airbases.length)*100}%` : '0%'}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Metrik Penggunaan Fasilitas</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                  <span>Penggunaan Apron</span>
                  <span>{apronUtilization}%</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{width: `${Math.min(apronUtilization, 100)}%`}}></div>
                </div>
                <div className="text-xs text-slate-500 mt-1">{totalApronUsed}/{totalApronCapacity} bay terpakai</div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                  <span>Kapasitas Bahan Bakar</span>
                  <span>{avgAvtur}%</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{width: `${Math.min(avgAvtur, 100)}%`}}></div>
                </div>
                <div className="text-xs text-slate-500 mt-1">{(totalAvturStock/1000).toFixed(0)}K Liter tersimpan</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            Memuat data pangkalan...
          </div>
        ) : airbases.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Belum ada data pangkalan. Klik tombol tambah untuk membuat data baru.</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Pangkalan</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Status</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Pesawat Ditempatkan</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Stok Avtur</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Truk Aktif</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Apron</th>
                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {airbases.map((base) => {
                    const avturPercent = Number(base.avtur_capacity_liters || 0)
                      ? (Number(base.avtur_stock_liters || 0) / Number(base.avtur_capacity_liters || 1)) * 100
                      : 0;
                    const stationedAircraft = aircraftUnits.filter((unit) => String(unit.airbase_id) === String(base.id));
                    const badge = getStatusBadge(base.status || 'optimal');

                    return (
                      <tr key={base.id} className="hover:bg-blue-50/40 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{base.name}</div>
                          <div className="text-xs text-slate-500">{base.location || 'Lokasi belum diisi'}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>{badge.text}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{stationedAircraft.length}</div>
                          <div className="text-xs text-slate-500">dari {base.apron_capacity_aircraft || 0} kapasitas apron</div>
                        </td>
                        <td className="px-5 py-4 min-w-[160px]">
                          <div className="flex justify-between text-sm text-slate-700 mb-1"><span>{avturPercent.toFixed(0)}%</span><span>{(Number(base.avtur_stock_liters || 0) / 1000).toFixed(0)}K L</span></div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${Math.min(avturPercent, 100)}%` }} /></div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">{base.refueler_trucks_active || 0} / {base.refueler_trucks_count || 0}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{base.apron_used || 0} / {base.apron_capacity_aircraft || 0} bay</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openForm(base)} className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">Edit</button>
                            <button onClick={() => deleteBase(base.id)} className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-blue-900 mb-5">
              {form.id ? 'Edit Pangkalan' : 'Tambah Pangkalan'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Pangkalan</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Contoh: Lanud Iswahjudi"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Contoh: Madiun, Jawa Timur"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="optimal">Optimal</option>
                  <option value="warning">Waspada</option>
                  <option value="critical">Kritis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kapasitas Avtur (L)</label>
                <input
                  type="number"
                  value={form.avtur_capacity_liters}
                  onChange={(e) => setForm({ ...form, avtur_capacity_liters: Number(e.target.value || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stok Avtur (L)</label>
                <input
                  type="number"
                  value={form.avtur_stock_liters}
                  onChange={(e) => setForm({ ...form, avtur_stock_liters: Number(e.target.value || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stok Oli Khusus (L)</label>
                <input
                  type="number"
                  value={form.special_lube_stock_liters}
                  onChange={(e) => setForm({ ...form, special_lube_stock_liters: Number(e.target.value || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Truk</label>
                <input
                  type="number"
                  value={form.refueler_trucks_count}
                  onChange={(e) => setForm({ ...form, refueler_trucks_count: Number(e.target.value || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Truk Aktif</label>
                <input
                  type="number"
                  value={form.refueler_trucks_active}
                  onChange={(e) => setForm({ ...form, refueler_trucks_active: Number(e.target.value || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah Forklift</label>
                <input
                  type="number"
                  value={form.forklifts_count}
                  onChange={(e) => setForm({ ...form, forklifts_count: Number(e.target.value || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kapasitas Apron</label>
                <input
                  type="number"
                  value={form.apron_capacity_aircraft}
                  onChange={(e) => setForm({ ...form, apron_capacity_aircraft: Number(e.target.value || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Apron Terpakai</label>
                <input
                  type="number"
                  value={form.apron_used}
                  onChange={(e) => setForm({ ...form, apron_used: Number(e.target.value || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(emptyForm);
                }}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300"
              >
                Batal
              </button>
              <button
                disabled={saving}
                onClick={saveBase}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

