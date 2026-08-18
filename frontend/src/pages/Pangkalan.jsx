import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { airbaseAPI } from '../api';

export default function Pangkalan() {
  const [airbases, setAirbases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const response = await airbaseAPI.getAll();
        // Handle both direct array and axios response format
        const data = response?.data ? response.data : response;
        setAirbases(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading airbases:', error);
        setError('Gagal memuat data pangkalan. Pastikan backend sudah berjalan di port 8000.');
        setAirbases([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'critical') {
      return { color: 'bg-red-100 text-red-800 border-red-300', icon: 'warning', text: 'Kritis' };
    } else if (status === 'warning') {
      return { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: 'alert_circle', text: 'Waspada' };
    }
    return { color: 'bg-green-100 text-green-800 border-green-300', icon: 'check_circle', text: 'Optimal' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-white border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-blue-900">Kapasitas Fisik & Inventaris Logistik Pangkalan</h1>
          <p className="text-gray-600 mt-1">Pantau status fasilitas, ketersediaan bahan bakar, dan kapasitas docking pesawat di setiap lanud</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">⚠️ {error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-4"></div>
            <p className="text-gray-600 text-lg">Memuat data pangkalan...</p>
          </div>
        ) : airbases.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-500 text-lg">Belum ada data pangkalan</p>
            <p className="text-gray-400">Pangkalan akan ditampilkan di sini setelah diinput ke sistem</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {airbases.map((base) => {
              const avturPercentage = base.avtur_capacity_liters ? (base.avtur_stock_liters || 0) / base.avtur_capacity_liters * 100 : 0;
              const apronPercentage = base.apron_capacity_aircraft ? (base.apron_used || 0) / base.apron_capacity_aircraft * 100 : 0;
              
              const statusBadge = getStatusBadge(base.status || 'optimal');

              return (
                <div
                  key={base.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all p-6 relative overflow-hidden group"
                >
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none"></div>

                  {/* Header Section */}
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                        {base.location || 'Lokasi'}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 mt-1">{base.name || 'Pangkalan'}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusBadge.color}`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      {statusBadge.text}
                    </span>
                  </div>

                  {/* Metrics Section */}
                  <div className="space-y-6 relative z-10">
                    {/* Avtur Tank */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="flex items-center gap-2 text-gray-700 font-medium">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                          </svg>
                          Avtur Tank
                        </span>
                        <span className="text-sm font-bold text-gray-900">{avturPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                          style={{ width: `${Math.min(avturPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {base.avtur_stock_liters?.toLocaleString() || 0} / {base.avtur_capacity_liters?.toLocaleString() || 0} Liters
                      </div>
                    </div>

                    {/* Refueler Trucks */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="flex items-center gap-2 text-gray-700 font-medium">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 18.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.5M9 18.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H9m12-5h-3.5a1.5 1.5 0 00-1.5 1.5V17a1.5 1.5 0 001.5 1.5H21" />
                          </svg>
                          Refueler Trucks
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {base.refueler_trucks_active || 0}/{base.refueler_trucks_count || 0}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: base.refueler_trucks_count || 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                              i < (base.refueler_trucks_active || 0)
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Apron Parking */}
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="flex items-center gap-2 text-gray-700 font-medium">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                          </svg>
                          Apron Parking
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {base.apron_used || 0}/{base.apron_capacity_aircraft || 0} Bays
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                          style={{ width: `${Math.min(apronPercentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
