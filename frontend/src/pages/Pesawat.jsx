import { useState, useEffect } from 'react';
import { aircraftAPI } from '../api';
import { StatusBadge, Modal, Spinner } from '../components/UI';

export default function Pesawat() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [unitForm, setUnitForm] = useState({ tail_number: '', aircraft_type: '', max_flight_hours: 3000, accumulated_flight_hours: 0 });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const aircraftCategories = {
    'F-16': 'Tempur Taktis',
    'T-50i': 'Latih Lanjut',
    'C-130': 'Angkut Berat',
    'CN-235': 'Angkut Menengah',
  };

  const getStatusColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'critical';
    if (percentage >= 70) return 'warning';
    return 'optimal';
  };

  const getStatusText = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'Kritis';
    if (percentage >= 70) return 'Minor';
    return 'Optimal';
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await aircraftAPI.getUnits();
      // Handle both direct array and axios response format
      const data = response?.data ? response.data : response;
      setUnits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading aircraft:', error);
      setUnits([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveUnit = async () => {
    if (!unitForm.tail_number.trim() || !unitForm.aircraft_type.trim()) return;
    setSaving(true);
    try {
      await aircraftAPI.createUnit({
        tail_number: unitForm.tail_number,
        aircraft_type_id: 1,
        accumulated_flight_hours: parseFloat(unitForm.accumulated_flight_hours) || 0,
      });
      setShowModal(false);
      setUnitForm({ tail_number: '', aircraft_type: '', max_flight_hours: 3000, accumulated_flight_hours: 0 });
      await load();
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    }
    setSaving(false);
  };

  const filteredUnits = units.filter((u) => {
    const matchesSearch = u.tail_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.aircraft_type?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || u.aircraft_type?.name?.includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-white border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Pelacakan Keausan & Jam Terbang Armada</h1>
            <p className="text-gray-600 mt-1">Manajemen status operasional dan jadwal pemeliharaan pesawat</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter & Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari Tail Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">Semua Kategori</option>
            <option value="F-16">Tempur Taktis</option>
            <option value="T-50i">Latih Lanjut</option>
            <option value="C-130">Angkut Berat</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <span>+</span> Tambah Data
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-3 text-gray-600">Memuat data pesawat...</span>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-gray-500 text-lg">Belum ada data pesawat</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Tail Number</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Model</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase tracking-wider w-64">Jam Terbang</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-blue-900 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUnits.map((unit) => {
                    const percentage = (unit.accumulated_flight_hours / 3000) * 100;
                    const status = getStatusText(unit.accumulated_flight_hours, 3000);
                    const statusColor = getStatusColor(unit.accumulated_flight_hours, 3000);

                    const statusColorMap = {
                      optimal: 'bg-green-100 text-green-800 border-green-300',
                      warning: 'bg-orange-100 text-orange-800 border-orange-300',
                      critical: 'bg-red-100 text-red-800 border-red-300',
                    };

                    const progressColorMap = {
                      optimal: 'bg-green-500',
                      warning: 'bg-orange-500',
                      critical: 'bg-red-500',
                    };

                    return (
                      <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-blue-900">{unit.tail_number}</td>
                        <td className="px-6 py-4 text-gray-700">{unit.aircraft_type?.name || '-'}</td>
                        <td className="px-6 py-4 text-gray-700">
                          {aircraftCategories[unit.aircraft_type?.name?.split(' ')[0]] || 'Lainnya'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">{unit.accumulated_flight_hours?.toFixed(0)} / 3000 Jam</span>
                              <span className="text-gray-600">{percentage.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${progressColorMap[statusColor]} transition-all`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusColorMap[statusColor]}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition" title="Lihat Detail">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition" title="Ajukan Servis">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
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

          {/* Pagination */}
          {filteredUnits.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Menampilkan {filteredUnits.length} dari {units.length} Armada
              </span>
              <div className="flex gap-1">
                <button className="p-1 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-50">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-semibold text-blue-900">1</button>
                <button className="px-3 py-1 hover:bg-gray-200 rounded text-sm text-gray-700">2</button>
                <button className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">Tambah Data Pesawat</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tail Number *</label>
                <input
                  type="text"
                  placeholder="Contoh: TS-1601"
                  value={unitForm.tail_number}
                  onChange={(e) => setUnitForm({ ...unitForm, tail_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipe Pesawat *</label>
                <input
                  type="text"
                  placeholder="Contoh: F-16 C/D Block 52ID"
                  value={unitForm.aircraft_type}
                  onChange={(e) => setUnitForm({ ...unitForm, aircraft_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jam Terbang Maksimal</label>
                <input
                  type="number"
                  value={unitForm.max_flight_hours}
                  onChange={(e) => setUnitForm({ ...unitForm, max_flight_hours: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Jam Terbang Terkumpul</label>
                <input
                  type="number"
                  min="0"
                  value={unitForm.accumulated_flight_hours}
                  onChange={(e) => setUnitForm({ ...unitForm, accumulated_flight_hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Batal
              </button>
              <button
                onClick={saveUnit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
