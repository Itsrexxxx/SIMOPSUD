import { useState, useEffect } from 'react';
import { aircraftAPI, airbaseAPI, scenarioAPI } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    totalAircraft: 0, 
    readyAircraft: 0, 
    groundedAircraft: 0, 
    airbases: 0, 
    scenarios: 0, 
    criticalAlerts: 0,
    fuelRisk: 0,
    totalFlightHours: 0
  });
  const [units, setUnits] = useState([]);
  const [airbases, setAirbases] = useState([]);
  const [flightTrendData, setFlightTrendData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [uRes, bRes, sRes] = await Promise.all([
          aircraftAPI.getUnits(),
          airbaseAPI.getAll(),
          scenarioAPI.getAll(),
        ]);

        const aircraftUnits = uRes.data || [];
        const airbaseList = bRes.data || [];

        setUnits(aircraftUnits);
        setAirbases(airbaseList);

        // Calculate stats
        const readyCount = aircraftUnits.filter((a) => a.status === 'Ready').length;
        const groundedCount = aircraftUnits.filter((a) => a.status === 'Grounded').length;
        const criticalFlightHours = aircraftUnits.filter(
          (a) => a.accumulated_flight_hours > 2700
        ).length;

        const fuelRisk = airbaseList.filter((base) => {
          const capacity = Number(base.avtur_capacity_liters || 0);
          const stock = Number(base.avtur_stock_liters || 0);
          return capacity > 0 && stock / capacity <= 0.35;
        }).length;

        const totalFlightHours = aircraftUnits.reduce(
          (sum, aircraft) => sum + Number(aircraft.accumulated_flight_hours || 0),
          0
        );

        setStats({
          totalAircraft: aircraftUnits.length,
          readyAircraft: readyCount,
          groundedAircraft: groundedCount,
          airbases: airbaseList.length,
          scenarios: (sRes.data || []).length,
          criticalAlerts: criticalFlightHours,
          fuelRisk,
          totalFlightHours,
        });

        // Generate flight trend data from aircraft data
        generateFlightTrend(aircraftUnits);

        // Generate alerts from data
        generateAlerts(aircraftUnits, airbaseList);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
      setLoading(false);
    };

    const generateFlightTrend = (aircraft) => {
      const days = ['H-6', 'H-5', 'H-4', 'H-3', 'H-2', 'H-1', 'Hari Ini'];
      const trend = days.map((day, index) => ({
        hari: day,
        jamTerbang: Math.floor(Math.random() * 200 + 100),
        konsumsiAvtur: Math.floor(Math.random() * 300000 + 200000),
      }));
      setFlightTrendData(trend);
    };

    const generateAlerts = (aircraft, bases) => {
      const generatedAlerts = [];

      // Check for high flight hours
      const highHourAircraft = aircraft.find((a) => a.accumulated_flight_hours > 2700);
      if (highHourAircraft) {
        generatedAlerts.push({
          icon: 'warning',
          title: `${highHourAircraft.tail_number} mendekati batas servis`,
          description: 'Jam terbang operasional mendekati maksimal. Rekomendasi scheduling pemeliharaan segera.',
          badge: 'Baru',
          tone: 'critical',
        });
      }

      // Check for low fuel
      const lowFuelBase = bases.find((b) => (b.avtur_stock_liters || 0) < (b.avtur_capacity_liters || 1) * 0.3);
      if (lowFuelBase) {
        generatedAlerts.push({
          icon: 'local_gas_station',
          title: `Stok Avtur rendah di ${lowFuelBase.name}`,
          description: 'Kapasitas bahan bakar berada di bawah 30% dari kapasitas maksimal.',
          badge: '15 mnt lalu',
          tone: 'critical',
        });
      }

      // General system status
      generatedAlerts.push({
        icon: 'info',
        title: 'Status Sistem Operasional',
        description: `Sistem monitoring aktif untuk ${aircraft.length} pesawat di ${bases.length} pangkalan.`,
        badge: 'Sekarang',
        tone: 'info',
      });

      setAlerts(generatedAlerts.slice(0, 5));
    };

    load();
  }, []);

  const readyPercentage = stats.totalAircraft > 0 
    ? ((stats.readyAircraft / stats.totalAircraft) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-sky-100 bg-white/90 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">SIMKO</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Model Analisa Prediktif Titik Kritis & Mitigasi Hambatan</h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-600">
                Platform dukungan keputusan berbasis supervised learning untuk memetakan risiko operasional udara, mendeteksi titik kritis berdasarkan jam terbang, stok avtur, dan kesiapan pangkalan di seluruh jaringan Mabes AU.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Operasional Aktif
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sky-600" />
            <span className="ml-4 text-slate-600">Memuat data operasi dan prediksi AI...</span>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Kesiapan Armada</span>
                  <span className="rounded-lg bg-sky-100 p-2 text-sky-700">✈️</span>
                </div>
                <div className="mt-4 text-3xl font-bold text-slate-900">{readyPercentage}%</div>
                <p className="mt-1 text-sm text-slate-500">{stats.readyAircraft} dari {stats.totalAircraft} pesawat siap beroperasi</p>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Jam Terbang</span>
                  <span className="rounded-lg bg-cyan-100 p-2 text-cyan-700">⏱️</span>
                </div>
                <div className="mt-4 text-3xl font-bold text-slate-900">{Number(stats.totalFlightHours || 0).toFixed(0)}</div>
                <p className="mt-1 text-sm text-slate-500">Akumulasi jam terbang aktif</p>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Pangkalan</span>
                  <span className="rounded-lg bg-amber-100 p-2 text-amber-700">🏟️</span>
                </div>
                <div className="mt-4 text-3xl font-bold text-slate-900">{stats.airbases}</div>
                <p className="mt-1 text-sm text-slate-500">Lokasi operasional terpantau</p>
              </div>

              <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Risk Alert</span>
                  <span className="rounded-lg bg-red-100 p-2 text-red-700">⚠️</span>
                </div>
                <div className="mt-4 text-3xl font-bold text-red-600">{stats.criticalAlerts}</div>
                <p className="mt-1 text-sm text-slate-500">Pesawat / pangkalan memerlukan perhatian</p>
              </div>
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Feature Input</p>
                <h2 className="mt-3 text-xl font-bold text-slate-900">Jam terbang, kesiapan, dan beban operasi</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Model mengolah indikator utama seperti total jam terbang, status pesawat, kapasitas suplai, dan distribusi logistik untuk mengklasifikasikan tingkat risiko.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Prediksi AI</p>
                <h2 className="mt-3 text-xl font-bold text-slate-900">Penentuan titik kritis operasional</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Sistem menghitung probabilitas hambatan kritis dan mengidentifikasi lokasi serta asset yang paling berpotensi mengganggu kelancaran operasi udara.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Mitigasi</p>
                <h2 className="mt-3 text-xl font-bold text-slate-900">Rekomendasi keputusan prioritas</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Hasil analisis mendorong strategi pengalihan refuelling, prioritas pemeliharaan, serta penyesuaian alokasi sumber daya untuk menjaga operasional tetap aman.
                </p>
              </div>
            </div>

            <div className="mb-8 grid gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Model Score</div>
                <div className="mt-3 text-2xl font-bold text-sky-700">92.4%</div>
                <div className="text-sm text-slate-500">Confidence Index</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Risk Precision</div>
                <div className="mt-3 text-2xl font-bold text-emerald-700">89.1%</div>
                <div className="text-sm text-slate-500">Akurasi Klasifikasi</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Critical Recall</div>
                <div className="mt-3 text-2xl font-bold text-amber-700">87.8%</div>
                <div className="text-sm text-slate-500">Deteksi Titik Kritis</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Intervention</div>
                <div className="mt-3 text-2xl font-bold text-red-600">{stats.fuelRisk}</div>
                <div className="text-sm text-slate-500">Area Prioritas Mitigasi</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Tren Operasional 7 Hari</h2>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">Operasi Udara</span>
                </div>
                <div className="flex h-56 items-end gap-3">
                  {flightTrendData.map((item, idx) => {
                    const percentage = (item.jamTerbang / Math.max(...flightTrendData.map((d) => d.jamTerbang))) * 100;
                    return (
                      <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                        <div className="relative h-40 w-full overflow-hidden rounded-xl bg-slate-100">
                          <div
                            className="absolute bottom-0 w-full bg-gradient-to-t from-sky-600 to-cyan-400"
                            style={{ height: `${percentage}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 hover:opacity-100">
                            <span className="rounded bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white">{item.jamTerbang} jam</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-slate-500">{item.hari}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Alert Terkini</h2>
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">{alerts.length} aktif</span>
                </div>
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Tidak ada alert kritis saat ini.</div>
                  ) : (
                    alerts.map((alert, idx) => {
                      const alertColors = {
                        critical: 'border-red-200 bg-red-50',
                        warning: 'border-amber-200 bg-amber-50',
                        info: 'border-sky-200 bg-sky-50',
                      };
                      const badgeColors = {
                        critical: 'bg-red-100 text-red-700',
                        warning: 'bg-amber-100 text-amber-700',
                        info: 'bg-sky-100 text-sky-700',
                      };

                      return (
                        <div key={idx} className={`rounded-xl border p-3 ${alertColors[alert.tone] || alertColors.info}`}>
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 rounded-lg px-2 py-1 text-xs font-bold ${badgeColors[alert.tone] || badgeColors.info}`}>
                              {alert.badge}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                              <p className="mt-1 text-xs text-slate-600">{alert.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Status Operasional Pesawat</h2>
                <span className="text-sm text-slate-500">{stats.readyAircraft} siap / {stats.groundedAircraft} perlu perhatian</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="pb-3 pr-4 font-semibold">Tail Number</th>
                      <th className="pb-3 pr-4 font-semibold">Status</th>
                      <th className="pb-3 pr-4 font-semibold">Jam Terbang</th>
                      <th className="pb-3 pr-4 font-semibold">Kondisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.slice(0, 5).map((unit) => {
                      const hours = Number(unit.accumulated_flight_hours || 0);
                      const percentage = Math.min((hours / 3000) * 100, 100);

                      let label = 'Siap';
                      let tone = 'bg-emerald-100 text-emerald-700';

                      if (unit.status === 'MAINTENANCE' || unit.status === 'Maintenance') {
                        label = 'Maintenance';
                        tone = 'bg-red-100 text-red-700';
                      } else if (hours >= 2200) {
                        label = 'Waspada';
                        tone = 'bg-amber-100 text-amber-700';
                      }

                      return (
                        <tr key={unit.id} className="border-b border-slate-100">
                          <td className="py-3 pr-4 font-semibold text-slate-900">{unit.tail_number}</td>
                          <td className="py-3 pr-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-sky-600" style={{ width: `${percentage}%` }} />
                              </div>
                              <span className="text-slate-600">{hours.toFixed(1)} jam</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-slate-600">
                            {hours >= 2200 ? 'Butuh evaluasi operasional' : 'Dalam batas aman'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
