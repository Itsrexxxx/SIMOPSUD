import { useState, useEffect } from 'react';
import { aircraftAPI, airbaseAPI } from '../api';

const STATUS_STYLES = {
  Ready: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Maintenance: 'bg-amber-100 text-amber-700 border border-amber-200',
  'Mandatory Grounding': 'bg-red-100 text-red-700 border border-red-200',
};

const defaultForm = {
  id: null,
  tail_number: '',
  aircraft_type_id: '',
  status: 'Ready',
  accumulated_flight_hours: 0,
  airbase_id: '',
};

export default function Pesawat() {
  const [units, setUnits] = useState([]);
  const [types, setTypes] = useState([]);
  const [airbases, setAirbases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [unitForm, setUnitForm] = useState(defaultForm);

  const loadTypes = async () => {
    try {
      const response = await aircraftAPI.getTypes();
      const data = response?.data ?? response ?? [];
      setTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading aircraft types:', error);
      setTypes([]);
    }
  };

  const loadUnits = async () => {
    setLoading(true);
    try {
      const response = await aircraftAPI.getUnits();
      const data = response?.data ?? response ?? [];
      setUnits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading aircraft:', error);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
    loadUnits();
    airbaseAPI.getAll().then((response) => setAirbases(response.data || [])).catch(() => setAirbases([]));
  }, []);

  const prepareForm = (unit = null) => {
    setUnitForm(
      unit
        ? {
            id: unit.id,
            tail_number: unit.tail_number || '',
            aircraft_type_id: unit.aircraft_type_id ?? '',
            status: unit.status || 'Ready',
            accumulated_flight_hours: unit.accumulated_flight_hours ?? 0,
            airbase_id: unit.airbase_id ?? '',
          }
        : { ...defaultForm }
    );
    setShowModal(true);
  };

  const saveUnit = async () => {
    if (!unitForm.tail_number.trim()) return;
    if (!unitForm.aircraft_type_id) {
      alert('Pilih tipe pesawat terlebih dahulu.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tail_number: unitForm.tail_number,
        aircraft_type_id: Number(unitForm.aircraft_type_id),
        status: unitForm.status,
        accumulated_flight_hours: Number(unitForm.accumulated_flight_hours || 0),
        airbase_id: unitForm.airbase_id ? Number(unitForm.airbase_id) : null,
      };

      if (unitForm.id) {
        await aircraftAPI.updateUnitStatus(unitForm.id, payload);
      } else {
        await aircraftAPI.createUnit(payload);
      }

      setShowModal(false);
      setUnitForm(defaultForm);
      await loadUnits();
    } catch (error) {
      alert(`Gagal menyimpan data pesawat: ${error?.response?.data?.detail || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteUnit = async (id) => {
    if (!window.confirm('Hapus data pesawat ini?')) return;

    try {
      await aircraftAPI.deleteUnit(id);
      await loadUnits();
    } catch (error) {
      alert(`Gagal menghapus data pesawat: ${error?.response?.data?.detail || error.message}`);
    }
  };

  const totalReady = units.filter((u) => u.status === 'Ready').length;
  const totalMaintenance = units.filter((u) => u.status === 'Maintenance').length;
  const totalCritical = units.filter((u) => Number(u.accumulated_flight_hours || 0) >= 2500).length;
  const avgFlightHours = units.length > 0 
    ? (units.reduce((sum, u) => sum + Number(u.accumulated_flight_hours || 0), 0) / units.length).toFixed(1)
    : 0;
  const totalFlightHours = units.reduce((sum, u) => sum + Number(u.accumulated_flight_hours || 0), 0);

  const getStatusColor = (status) => {
    if (status === 'Ready') return 'text-emerald-600';
    if (status === 'Maintenance') return 'text-amber-600';
    return 'text-red-600';
  };

  const readyPercentage = units.length > 0 ? ((totalReady / units.length) * 100).toFixed(1) : '0.0';

  const filteredUnits = units.filter((u) => {
    const typeName = u.aircraft_type?.name || '';
    const airbaseName = u.airbase?.name || '';
    const matchesSearch =
      u.tail_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      typeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airbaseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || String(u.aircraft_type_id) === String(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const getStatusLabel = (value) => {
    if (value === 'Ready') return 'Siap Operasi';
    if (value === 'Maintenance') return 'Perawatan';
    return 'Grounding';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Data Pesawat & Jam Terbang</h1>
            <p className="text-gray-600 mt-1">Monitoring kondisi operasional, kategori pesawat, dan status perawatan</p>
          </div>
          <button
            onClick={() => prepareForm()}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            + Tambah Pesawat
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
            <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Total Armada</div>
            <div className="text-4xl font-bold text-blue-900 mt-2">{units.length}</div>
            <div className="text-xs text-slate-500 mt-2">Pesawat terdaftar</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 hover:shadow-md transition">
            <div className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Siap Operasi</div>
            <div className="text-4xl font-bold text-emerald-600 mt-2">{totalReady}</div>
            <div className="text-xs text-slate-500 mt-2">{readyPercentage}% dari total armada</div>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${readyPercentage}%` }} />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition">
            <div className="text-xs uppercase tracking-widest text-amber-700 font-semibold">Dalam Perawatan</div>
            <div className="text-4xl font-bold text-amber-600 mt-2">{totalMaintenance}</div>
            <div className="text-xs text-slate-500 mt-2">Pemeliharaan berkala</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5 hover:shadow-md transition">
            <div className="text-xs uppercase tracking-widest text-red-700 font-semibold">Jam Terbang Kritis</div>
            <div className="text-4xl font-bold text-red-600 mt-2">{totalCritical}</div>
            <div className="text-xs text-slate-500 mt-2">Pesawat ≥ 2500 jam</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <p className="text-xs uppercase tracking-widest text-slate-600 font-semibold">Statistik Operasional</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">Jam Terbang</h3>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">Total Akumulasi</span>
                  <span className="font-bold text-slate-900">{totalFlightHours.toFixed(0)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full"></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">Rata-rata/Pesawat</span>
                  <span className="font-bold text-slate-900">{avgFlightHours}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full" style={{ width: `${Math.min((avgFlightHours / 3000) * 100, 100)}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <p className="text-xs uppercase tracking-widest text-slate-600 font-semibold">Komposisi Status</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">Distribusi Pesawat</h3>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-emerald-700 font-medium">Siap</span>
                  <span className="font-bold text-emerald-700">{totalReady}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${units.length > 0 ? (totalReady / units.length) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-amber-700 font-medium">Perawatan</span>
                  <span className="font-bold text-amber-700">{totalMaintenance}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${units.length > 0 ? (totalMaintenance / units.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-sm border border-blue-200 p-6">
            <p className="text-xs uppercase tracking-widest text-blue-700 font-semibold">Quick Insights</p>
            <h3 className="mt-2 text-lg font-bold text-blue-900">Kondisi Armada</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-blue-900">{totalReady} pesawat dalam kondisi baik</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="text-blue-900">{totalMaintenance} pesawat dalam perawatan</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                <span className="text-blue-900">{totalCritical} pesawat butuh evaluasi</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari tail number atau tipe pesawat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">Semua Kategori</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              Memuat data pesawat...
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Belum ada data pesawat yang sesuai filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase">Tail Number</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase">Kategori</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase">Jam Terbang</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase">Lanud Saat Ini</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-blue-900 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map((unit) => {
                    const currentHours = Number(unit.accumulated_flight_hours || 0);
                    const usagePercent = Math.min((currentHours / 3000) * 100, 100);
                    const statusStyle = STATUS_STYLES[unit.status] || 'bg-slate-100 text-slate-700 border border-slate-200';

                    return (
                      <tr key={unit.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{unit.tail_number}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {unit.aircraft_type?.name || 'Belum dikategorikan'}
                        </td>
                        <td className="px-6 py-4 min-w-[220px]">
                          <div className="flex justify-between text-sm text-slate-600 mb-2">
                            <span>{currentHours.toLocaleString()} jam</span>
                            <span>{usagePercent.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${usagePercent >= 80 ? 'bg-red-500' : usagePercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${usagePercent}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusStyle}`}>
                            {getStatusLabel(unit.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="font-semibold">{unit.airbase?.name || 'Belum ditempatkan'}</div>
                          <div className="text-xs text-slate-500">Pangkalan udara · {unit.airbase?.location || 'Lokasi belum diisi'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => prepareForm(unit)}
                              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteUnit(unit.id)}
                              className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-blue-900 mb-5">
              {unitForm.id ? 'Edit Data Pesawat' : 'Tambah Data Pesawat'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tail Number</label>
                <input
                  value={unitForm.tail_number}
                  onChange={(e) => setUnitForm({ ...unitForm, tail_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Contoh: TS-1601"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori Pesawat</label>
                <select
                  value={unitForm.aircraft_type_id}
                  onChange={(e) => setUnitForm({ ...unitForm, aircraft_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Pilih kategori</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={unitForm.status}
                  onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="Ready">Siap Operasi</option>
                  <option value="Maintenance">Perawatan</option>
                  <option value="Mandatory Grounding">Grounding</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pangkalan Udara Saat Ini</label>
                <select
                  value={unitForm.airbase_id}
                  onChange={(e) => setUnitForm({ ...unitForm, airbase_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Belum ditempatkan</option>
                  {airbases.map((base) => (
                    <option key={base.id} value={base.id}>{base.name} - {base.location || 'Lokasi tidak tersedia'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jam Terbang Terkumpul</label>
                <input
                  type="number"
                  min="0"
                  value={unitForm.accumulated_flight_hours}
                  onChange={(e) => setUnitForm({ ...unitForm, accumulated_flight_hours: Number(e.target.value || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setUnitForm(defaultForm);
                }}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300"
              >
                Batal
              </button>
              <button
                disabled={saving}
                onClick={saveUnit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : unitForm.id ? 'Simpan Perubahan' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

