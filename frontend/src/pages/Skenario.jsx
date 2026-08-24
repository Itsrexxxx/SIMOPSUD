import { useState, useEffect } from 'react';
import { scenarioAPI, airbaseAPI, aircraftAPI } from '../api';
import { Modal, EmptyState, Spinner, AIAlertBanner } from '../components/UI';

export default function Skenario() {
  const [scenarios, setScenarios] = useState([]);
  const [bases, setBases] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, b, u] = await Promise.all([scenarioAPI.getAll(), airbaseAPI.getAll(), aircraftAPI.getUnits()]);
      setScenarios(s.data || []);
      setBases(b.data || []);
      setUnits(u.data || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await scenarioAPI.create(form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      await load();
    } catch (e) { alert('Gagal: ' + e.message); }
    setSaving(false);
  };

  const readyUnits = units.filter(u => u.status === 'Ready').length;
  const groundedUnits = units.filter(u => u.status === 'Grounded').length;
  const maintenanceUnits = units.filter(u => u.status === 'Maintenance').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50">
      <div className="bg-white border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-900">Skenario Operasi Udara</h1>
            <p className="text-gray-600 mt-1">Persiapan simulasi dan analisa prediktif untuk operasi taktis</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
          >
            + Buat Skenario
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards - Readiness Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm opacity-90">Total Skenario</div>
                <div className="text-3xl font-bold mt-2">{scenarios.length}</div>
                <div className="text-xs opacity-75 mt-2">Simulasi dalam sistem</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm opacity-90">Pesawat Siap</div>
                <div className="text-3xl font-bold mt-2">{readyUnits}</div>
                <div className="text-xs opacity-75 mt-2">Kesiapan operasional</div>
              </div>
              <div className="text-4xl opacity-30">✓</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm opacity-90">Perawatan</div>
                <div className="text-3xl font-bold mt-2">{maintenanceUnits}</div>
                <div className="text-xs opacity-75 mt-2">Dalam pemeliharaan</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm opacity-90">Grounded</div>
                <div className="text-3xl font-bold mt-2">{groundedUnits}</div>
                <div className="text-xs opacity-75 mt-2">Tidak siap operasi</div>
              </div>
              <div className="text-4xl opacity-30">⚠️</div>
            </div>
          </div>
        </div>

        {/* Operational Status Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Komposisi Armada</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-emerald-700 font-medium">Siap Operasi</span>
                  <span className="font-bold">{readyUnits}/{units.length}</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{width: units.length > 0 ? `${(readyUnits/units.length)*100}%` : '0%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-orange-700 font-medium">Perawatan</span>
                  <span className="font-bold">{maintenanceUnits}/{units.length}</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{width: units.length > 0 ? `${(maintenanceUnits/units.length)*100}%` : '0%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-red-700 font-medium">Grounded</span>
                  <span className="font-bold">{groundedUnits}/{units.length}</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{width: units.length > 0 ? `${(groundedUnits/units.length)*100}%` : '0%'}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Pangkalan Siap</h3>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">{bases.length}</div>
                <div className="text-sm text-slate-600 mt-2">Lanud tersedia untuk operasi</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Kapasitas Simulasi</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Total Pesawat</span>
                <span className="font-bold text-slate-900">{units.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Total Pangkalan</span>
                <span className="font-bold text-slate-900">{bases.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Skenario Aktif</span>
                <span className="font-bold text-slate-900">{scenarios.length}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Kapasitas Simulasi</span>
                  <span className="font-bold text-lg text-purple-600">{Math.round((readyUnits/Math.max(units.length, 1))*100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Scenarios List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Daftar Skenario Operasi</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
              Memuat skenario...
            </div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="text-lg font-semibold">Belum Ada Skenario</div>
              <div className="text-sm mt-1">Buat skenario operasi untuk memulai analisa prediktif AI.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Skenario</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Deskripsi</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {scenarios.map((s, i) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">{i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{s.description || <span className="text-slate-400">-</span>}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {s.start_date ? new Date(s.start_date).toLocaleDateString('id-ID') : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => del(s.id)}
                          className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-purple-900 mb-5">Buat Skenario Operasi Baru</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Skenario Operasi *</label>
                <input
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Contoh: Latgab TNI 2025 - Fase 1"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi Singkat</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="4"
                  placeholder="Deskripsi tujuan dan rencana operasi..."
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300"
              >
                Batal
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Skenario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
