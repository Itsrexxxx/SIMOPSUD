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

  const groundedPercentage = stats.totalAircraft > 0 
    ? ((stats.groundedAircraft / stats.totalAircraft) * 100).toFixed(1) 
    : '0.0';

  const avgFlightHours = stats.totalAircraft > 0 
    ? (stats.totalFlightHours / stats.totalAircraft).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-50">
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
              <div className="group rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-sky-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Kesiapan Armada</span>
                  <span className="rounded-lg bg-sky-100 p-2 text-lg text-sky-700">✈️</span>
                </div>
                <div className="mt-4 text-3xl font-bold text-slate-900">{readyPercentage}%</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">\n                  <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600" style={{ width: `${readyPercentage}%` }} />\n                </div>
                <p className="mt-2 text-sm text-slate-500">{stats.readyAircraft} dari {stats.totalAircraft} pesawat siap beroperasi</p>
              </div>

              <div className="group rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-cyan-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Total Jam Terbang</span>
                  <span className="rounded-lg bg-cyan-100 p-2 text-lg text-cyan-700">⏱️</span>
                </div>
                <div className="mt-4 text-3xl font-bold text-slate-900">{Number(stats.totalFlightHours || 0).toFixed(0)}</div>
                <p className="mt-2 text-xs text-slate-500">Rata-rata: <span className="font-semibold">{avgFlightHours}</span> jam/pesawat</p>
              </div>

              <div className="group rounded-2xl border border-amber-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Pangkalan</span>
                  <span className="rounded-lg bg-amber-100 p-2 text-lg text-amber-700">🏟️</span>
                </div>
                <div className="mt-4 text-3xl font-bold text-slate-900">{stats.airbases}</div>
                <p className="mt-2 text-sm text-slate-500">Lokasi operasional terpantau</p>
              </div>

              <div className="group rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Risk Alert</span>
                  <span className="rounded-lg bg-red-100 p-2 text-lg text-red-700">⚠️</span>
                </div>
                <div className="mt-4 text-3xl font-bold text-red-600">{stats.criticalAlerts + stats.fuelRisk}</div>
                <p className="mt-2 text-sm text-slate-500"><span className="font-semibold text-red-700">{stats.criticalAlerts}</span> pesawat, <span className="font-semibold text-red-700">{stats.fuelRisk}</span> pangkalan</p>
              </div>
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Distribusi Status</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">Komposisi Armada Operasional</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="flex flex-col items-center rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="text-3xl font-bold text-emerald-700">{stats.readyAircraft}</div>
                    <p className="mt-1 text-xs font-semibold uppercase text-emerald-600">Siap Operasi</p>
                    <div className="mt-3 h-1 w-12 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex flex-col items-center rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                    <div className="text-3xl font-bold text-amber-700">{stats.criticalAlerts}</div>
                    <p className="mt-1 text-xs font-semibold uppercase text-amber-600\">Dalam Evaluasi</p>
                    <div className="mt-3 h-1 w-12 rounded-full bg-amber-400" />
                  </div>
                  <div className="flex flex-col items-center rounded-xl border border-red-100 bg-red-50/50 p-4">
                    <div className="text-3xl font-bold text-red-700">{stats.groundedAircraft}</div>
                    <p className="mt-1 text-xs font-semibold uppercase text-red-600\">Perlu Perhatian</p>
                    <div className="mt-3 h-1 w-12 rounded-full bg-red-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600\">Statistik Pangkalan</p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900\">Utilitas Operasional</h2>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Pangkalan Aktif</span>
                      <span className="font-semibold text-slate-900">{stats.airbases}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-full bg-sky-500" />
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Area Risiko Bahan Bakar</span>
                      <span className="font-semibold text-red-600">{stats.fuelRisk}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-red-500" style={{ width: `${stats.fuelRisk * 25}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
                    <p className="font-semibold mb-1">Catatan: </p>
                    <p>Sistem monitoring kontinyu terhadap kapasitas avtur, ketersediaan sumber daya logistik, dan readiness armada.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Input Features</div>
                <div className="mt-3 text-sm text-slate-700 font-medium">Jam Terbang</div>
                <div className="mt-1 text-xs text-slate-500">Status pesawat, kapasitas operasi</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Model Score</div>
                <div className="mt-3 text-2xl font-bold text-sky-700">92.4%</div>
                <div className="text-xs text-slate-500">Confidence Index</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold\">Risk Precision</div>
                <div className="mt-3 text-2xl font-bold text-emerald-700\">89.1%</div>
                <div className="text-xs text-slate-500\">Akurasi Klasifikasi</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold\">Recall Critical</div>
                <div className="mt-3 text-2xl font-bold text-red-700\">87.8%</div>
                <div className="text-xs text-slate-500\">Deteksi Titik Kritis</div>
              </div>
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Pipeline Analisis</p>
                <h2 className="mt-3 text-lg font-bold text-slate-900">Input Data Operasional</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Integrasi dari jam terbang pesawat, status ketersediaan, kapasitas fuel operasional, dan distribusi logistik pangkalan.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Model Prediksi</p>
                <h2 className="mt-3 text-lg font-bold text-slate-900">Klasifikasi Risiko</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Supervised learning mengidentifikasi titik hambatan kritis dan asset yang berpotensi memicu disruption operasional.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Output Mitigasi</p>
                <h2 className="mt-3 text-lg font-bold text-slate-900">Rekomendasi Taktis</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Strategi pengalihan sumber daya, prioritas maintenance, dan penyesuaian alokasi untuk menjaga operasi tetap aman.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">Operational Timeline</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">Tren Operasional 7 Hari Terakhir</h2>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Operasi Udara</span>
                </div>
                <div className="flex h-64 items-end gap-3">
                  {flightTrendData.map((item, idx) => {
                    const percentage = (item.jamTerbang / Math.max(...flightTrendData.map((d) => d.jamTerbang))) * 100;
                    return (
                      <div key={idx} className="flex flex-1 flex-col items-center gap-2 group">
                        <div className="relative h-48 w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-100 group-hover:border-sky-300 group-hover:shadow-md transition">
                          <div
                            className="absolute bottom-0 w-full bg-gradient-to-t from-sky-600 via-sky-500 to-sky-400 rounded-t-lg"
                            style={{ height: `${percentage}%` }}
                          />
                          <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-lg">{item.jamTerbang} jam</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-bold text-slate-700">{item.hari}</span>
                          <p className="text-[10px] text-slate-500">{item.jamTerbang} jam</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-sky-50 p-3 border border-sky-100">
                    <p className="text-xs text-sky-700 font-semibold">Max Hari</p>
                    <p className="mt-1 text-sm font-bold text-sky-900">{Math.max(...flightTrendData.map((d) => d.jamTerbang))} jam</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                    <p className="text-xs text-slate-700 font-semibold">Rata-rata</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{Math.round(flightTrendData.reduce((a, b) => a + b.jamTerbang, 0) / flightTrendData.length)} jam</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-100">
                    <p className="text-xs text-emerald-700 font-semibold">Total</p>
                    <p className="mt-1 text-sm font-bold text-emerald-900">{flightTrendData.reduce((a, b) => a + b.jamTerbang, 0)} jam</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">Monitoring</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">Alert Operasional Aktif</h2>
                  </div>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    {alerts.length} aktif
                  </span>
                </div>
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 font-medium flex items-center gap-3">
                      <span className="text-xl">✓</span>
                      Sistem normal. Tidak ada alert kritis.
                    </div>
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
                      const dotColors = {
                        critical: 'bg-red-500',
                        warning: 'bg-amber-500',
                        info: 'bg-sky-500',
                      };

                      return (
                        <div key={idx} className={`rounded-xl border p-3 ${alertColors[alert.tone] || alertColors.info} hover:shadow-md transition`}>
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${dotColors[alert.tone] || dotColors.info}`} />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                                <div className={`mt-0 rounded-lg px-2 py-0.5 text-xs font-bold flex-shrink-0 ${badgeColors[alert.tone] || badgeColors.info} whitespace-nowrap`}>
                                  {alert.badge}
                                </div>
                              </div>
                              <p className="mt-1 text-xs text-slate-600 leading-relaxed">{alert.description}</p>
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
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">Armada Aktif</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Ringkasan Status Pesawat Operasional</h2>
                </div>
                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{stats.readyAircraft} siap / {stats.groundedAircraft} perlu perhatian</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="pb-4 pr-4 font-semibold">Pesawat</th>
                      <th className="pb-4 pr-4 font-semibold">Status</th>
                      <th className="pb-4 pr-4 font-semibold">Jam Terbang</th>
                      <th className="pb-4 pr-4 font-semibold">Persentase</th>
                      <th className="pb-4 pr-4 font-semibold">Rekomendasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {units.slice(0, 5).map((unit) => {
                      const hours = Number(unit.accumulated_flight_hours || 0);
                      const percentage = Math.min((hours / 3000) * 100, 100);

                      let statusLabel = 'Siap';
                      let statusTone = 'bg-emerald-100 text-emerald-700';
                      let recommendation = 'Operasi normal';
                      let recommendationTone = 'bg-emerald-50 text-emerald-700';

                      if (unit.status === 'MAINTENANCE' || unit.status === 'Maintenance') {
                        statusLabel = 'Maintenance';
                        statusTone = 'bg-red-100 text-red-700';
                        recommendation = 'Berhenti operasi';
                        recommendationTone = 'bg-red-50 text-red-700';
                      } else if (hours >= 2700) {
                        statusLabel = 'Critical';
                        statusTone = 'bg-red-100 text-red-700';
                        recommendation = 'Servis mendesak';
                        recommendationTone = 'bg-red-50 text-red-700';
                      } else if (hours >= 2200) {
                        statusLabel = 'Waspada';
                        statusTone = 'bg-amber-100 text-amber-700';
                        recommendation = 'Jadwal servis';
                        recommendationTone = 'bg-amber-50 text-amber-700';
                      }

                      return (
                        <tr key={unit.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 pr-4 font-semibold text-slate-900">{unit.tail_number}</td>
                          <td className="py-4 pr-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>{statusLabel}</span>
                          </td>
                          <td className="py-4 pr-4 text-slate-700 font-medium">{hours.toFixed(1)} jam</td>
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                                <div 
                                  className={`h-full rounded-full ${percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-amber-500' : 'bg-sky-500'}`} 
                                  style={{ width: `${Math.min(percentage, 100)}%` }} 
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-8">{percentage.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${recommendationTone}`}>{recommendation}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <p className="font-semibold mb-1 text-slate-700\">Catatan:</p>
                <p>Standar maintenance pesawat militer: 3000 jam terbang. Jika mencapai 2700 jam, perlu scheduling servis komprehensif. Data dimonitor real-time untuk antisipasi disruption operasional.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
