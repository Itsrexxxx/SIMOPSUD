import { useState, useEffect } from 'react';
import { scenarioAPI, airbaseAPI, aircraftAPI } from '../api';
import { AIAlertBanner, StatusBadge, Spinner } from '../components/UI';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function Simulasi() {
  const [scenarios, setScenarios] = useState([]);
  const [bases, setBases] = useState([]);
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({
    scenario_id: '', airbase_id: '', tail_numbers: [],
    daily_flight_hours_per_aircraft: 2,
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [automaticPrediction, setAutomaticPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(true);
  const [predictionError, setPredictionError] = useState('');

  useEffect(() => {
    const loadAutomaticPrediction = async () => {
      try {
        setPredictionError('');
        const response = await scenarioAPI.getAutomaticPrediction();
        setAutomaticPrediction(response.data);
      } catch (e) {
        setPredictionError('Prediksi otomatis belum dapat dimuat. Pastikan backend aktif.');
      } finally {
        setPredictionLoading(false);
      }
    };

    const load = async () => {
      try {
        const [s, b, u] = await Promise.all([scenarioAPI.getAll(), airbaseAPI.getAll(), aircraftAPI.getUnits()]);
        setScenarios(s.data || []);
        setBases(b.data || []);
        setUnits((u.data || []).filter(u => u.status === 'Ready'));
      } catch { }
    };
    load();
    loadAutomaticPrediction();
    const refreshTimer = setInterval(loadAutomaticPrediction, 30000);
    return () => clearInterval(refreshTimer);
  }, []);

  const toggleUnit = (tn) => {
    setForm(p => ({
      ...p,
      tail_numbers: p.tail_numbers.includes(tn)
        ? p.tail_numbers.filter(x => x !== tn)
        : [...p.tail_numbers, tn]
    }));
  };

  const runSim = async () => {
    if (!form.scenario_id || !form.airbase_id || form.tail_numbers.length === 0) {
      setError('Lengkapi semua parameter simulasi terlebih dahulu.');
      return;
    }
    setError('');
    setRunning(true);
    setResult(null);
    try {
      const res = await scenarioAPI.runSimulation({
        scenario_id: parseInt(form.scenario_id),
        airbase_id: parseInt(form.airbase_id),
        tail_numbers: form.tail_numbers,
        daily_flight_hours_per_aircraft: parseFloat(form.daily_flight_hours_per_aircraft),
      });
      setResult(res.data);
    } catch (e) {
      setError('Simulasi gagal: ' + (e.response?.data?.detail || e.message));
    }
    setRunning(false);
  };

  const ai = result?.ai_analysis;
  const cons = result?.consumption;
  const bots = result?.bottlenecks;
  const grounded = result?.newly_grounded_aircraft || [];
  const predictions = automaticPrediction?.airbase_predictions || [];
  const criticalPredictionCount = predictions.filter(item => item.is_critical).length;
  const averageRisk = predictions.length > 0
    ? predictions.reduce((sum, item) => sum + Number(item.probability_critical_percent || 0), 0) / predictions.length
    : 0;
  const highestRiskBase = predictions.reduce(
    (highest, item) => Number(item.probability_critical_percent || 0) > Number(highest?.probability_critical_percent || 0) ? item : highest,
    null
  );
  const riskChartData = predictions.map((item) => ({
    name: item.airbase_name.replace(/^Lanud /, ''),
    risk: Number(item.probability_critical_percent || 0),
    critical: item.is_critical,
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-accent">MODEL PREDIKTIF</span> TITIK KRITIS</h1>
          <p className="page-subtitle">Pusat AI untuk prediksi risiko operasional dan rekomendasi mitigasi berbasis kondisi armada serta dukungan pangkalan terkini.</p>
        </div>
        <span className="badge badge-aman">AI Engine Aktif</span>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Monitoring Prediksi Otomatis</div>
            <div className="text-muted text-sm" style={{ marginTop: 4 }}>Model berjalan otomatis tanpa menunggu tombol simulasi.</div>
          </div>
          <span className={`badge ${automaticPrediction?.is_critical ? 'badge-kritis' : 'badge-aman'}`}>
            <span className="status-dot" /> {automaticPrediction?.model_status === 'active' ? 'AI Engine Aktif' : 'Menunggu Data'}
          </span>
        </div>

        {predictionLoading ? (
          <div className="empty-center"><Spinner /></div>
        ) : predictionError ? (
          <div className="error-box">{predictionError}</div>
        ) : (
          <>
            <div className="summary-grid">
              <div className="summary-stat">
                <div className={`stat-value ${automaticPrediction.is_critical ? 'text-danger' : 'text-success'}`}>
                  {Number(automaticPrediction.overall_probability_critical_percent || 0).toFixed(1)}%
                </div>
                <div className="stat-label">Probabilitas risiko tertinggi</div>
              </div>
              <div className="summary-stat">
                <div className="stat-value text-accent">{automaticPrediction.ready_aircraft_count || 0}</div>
                <div className="stat-label">Pesawat siap dianalisis</div>
              </div>
              <div className="summary-stat">
                <div className="stat-value text-accent">{Number(automaticPrediction.average_flight_hours || 0).toFixed(1)}</div>
                <div className="stat-label">Rata-rata jam terbang</div>
              </div>
              <div className="summary-stat">
                <div className="stat-value text-accent">{predictions.length}</div>
                <div className="stat-label">Pangkalan dipantau</div>
              </div>
            </div>

            <div className={`ai-alert-banner ${automaticPrediction.is_critical ? 'critical' : 'safe'}`} style={{ marginTop: 16 }}>
              <div>
                <strong>{automaticPrediction.is_critical ? 'Risiko hambatan terdeteksi' : 'Operasi berada dalam batas wajar'}</strong>
                <p>Analisis ini menggunakan data aktual armada dan logistik pangkalan. Pembaruan otomatis setiap 30 detik.</p>
              </div>
            </div>

            {automaticPrediction.mitigations?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="form-label">Rekomendasi Mitigasi AI</div>
                <ul className="text-secondary text-sm">
                  {automaticPrediction.mitigations.map((item, index) => <li key={index}>• {item}</li>)}
                </ul>
              </div>
            )}

            {predictions.length > 0 && (
              <div className="simulation-result-grid" style={{ marginTop: 16 }}>
                <div className="card">
                  <div className="card-header"><div className="card-title">Profil Risiko per Pangkalan</div></div>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={riskChartData} margin={{ top: 8, right: 12, left: -18, bottom: 48 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe4ea" />
                        <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10, fill: '#444651' }} />
                        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10, fill: '#444651' }} />
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Risiko kritis']} />
                        <Bar dataKey="risk" radius={[4, 4, 0, 0]}>
                          {riskChartData.map((item, index) => <Cell key={`${item.name}-${index}`} fill={item.critical ? '#ba1a1a' : '#006398'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><div className="card-title">Ringkasan Risiko</div></div>
                  <div className="summary-stat" style={{ marginBottom: 16 }}>
                    <div className="stat-value text-danger">{highestRiskBase ? `${Number(highestRiskBase.probability_critical_percent).toFixed(1)}%` : '0%'}</div>
                    <div className="stat-label">Risiko tertinggi: {highestRiskBase?.airbase_name || '-'}</div>
                  </div>
                  <div className="metric-list">
                    <div><span>Rata-rata risiko</span><strong>{averageRisk.toFixed(1)}%</strong></div>
                    <div><span>Pangkalan berisiko</span><strong>{criticalPredictionCount} dari {predictions.length}</strong></div>
                    <div><span>Total truk dianalisis</span><strong>{predictions.reduce((sum, item) => sum + Number(item.available_trucks || 0), 0)}</strong></div>
                  </div>
                </div>
              </div>
            )}
            {predictions.length > 0 && (
              <div className="table-container" style={{ marginTop: 16 }}>
                <table className="data-table">
                  <thead><tr><th>Pangkalan</th><th>Probabilitas</th><th>Input Dukungan</th><th>Status Model</th><th>Mitigasi</th></tr></thead>
                  <tbody>
                    {predictions.map((item) => (
                      <tr key={item.airbase_id}>
                        <td className="font-bold">{item.airbase_name}</td>
                        <td className="text-mono">{Number(item.probability_critical_percent || 0).toFixed(1)}%</td>
                        <td className="text-muted text-sm">{item.available_trucks} truk · {item.available_forklifts} forklift · {item.deployed_aircraft} pesawat</td>
                        <td><span className={`badge ${item.is_critical ? 'badge-kritis' : 'badge-aman'}`}>{item.is_critical ? 'KRITIS' : 'AMAN'}</span></td>
                        <td className="text-muted text-sm">{item.mitigations?.[0] || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="text-muted text-sm" style={{ marginTop: 12 }}>Analisis terakhir: {automaticPrediction.generated_at ? new Date(automaticPrediction.generated_at).toLocaleString('id-ID') : '-'}</div>
            <div className="card" style={{ marginTop: 16, background: 'var(--surface-muted, #f8fafc)' }}>
              <div className="form-label">Transparansi Sumber Prediksi</div>
              <div className="text-secondary text-sm" style={{ display: 'grid', gap: 6 }}>
                <div><strong>Sumber input:</strong> {automaticPrediction.prediction_source}</div>
                <div><strong>Model:</strong> {automaticPrediction.model_name}</div>
                <div><strong>Target:</strong> {automaticPrediction.prediction_target}</div>
                <div><strong>Pelatihan:</strong> {automaticPrediction.training_source}</div>
                <div><strong>Fitur:</strong> {automaticPrediction.features?.join(', ')}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="section-heading" style={{ marginBottom: 12 }}>
        <h2>Simulasi Skenario Manual</h2>
        <p>Gunakan fitur ini untuk menguji rencana pengerahan tertentu dan menganalisis dampaknya secara langsung.</p>
      </div>

      <div className={`simulation-layout${result ? ' wide' : ''}`}>
        {/* Form Panel */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚙️ Parameter Input Model</div>
          </div>

          <div className="form-group">
            <label className="form-label">Skenario Operasi *</label>
            <select className="form-control" value={form.scenario_id} onChange={e => setForm(p => ({ ...p, scenario_id: e.target.value }))}>
              <option value="">-- Pilih Skenario --</option>
              {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Pangkalan Udara Pendukung *</label>
            <select className="form-control" value={form.airbase_id} onChange={e => setForm(p => ({ ...p, airbase_id: e.target.value }))}>
              <option value="">-- Pilih Pangkalan --</option>
              {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Jam Terbang Harian Per Pesawat</label>
            <input className="form-control" type="number" min="0.5" max="12" step="0.5"
              value={form.daily_flight_hours_per_aircraft}
              onChange={e => setForm(p => ({ ...p, daily_flight_hours_per_aircraft: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Variabel Prediksi</label>
            <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div className="summary-stat">
                <div className="stat-value text-accent">Jam terbang</div>
                <div className="stat-label">Flight hours</div>
              </div>
              <div className="summary-stat">
                <div className="stat-value text-accent">Stok avtur</div>
                <div className="stat-label">Fuel capacity</div>
              </div>
              <div className="summary-stat">
                <div className="stat-value text-accent">Status pesawat</div>
                <div className="stat-label">Fleet readiness</div>
              </div>
              <div className="summary-stat">
                <div className="stat-value text-accent">Kapasitas pangkalan</div>
                <div className="stat-label">Base support</div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Pilih Tail Number yang Dikerahkan *</label>
            {units.length === 0 ? (
              <div className="text-secondary text-sm" style={{ padding: '10px 0' }}>
                Tidak ada pesawat berstatus "Ready". Tambahkan data pesawat terlebih dahulu.
              </div>
            ) : (
              <div className="flex" style={{ flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {units.map(u => {
                  const selected = form.tail_numbers.includes(u.tail_number);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleUnit(u.tail_number)}
                      className={`btn btn-sm selection-chip${selected ? ' selected' : ''}`}>
                      {selected ? '✓ ' : ''}{u.tail_number}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {form.tail_numbers.length > 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              {form.tail_numbers.length} pesawat dipilih untuk pengerahan
            </div>
          )}

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button className="btn btn-primary w-full btn-lg" onClick={runSim} disabled={running}>
            {running ? <><Spinner /> &nbsp;Menjalankan Prediksi AI...</> : 'Jalankan Analisa Prediktif'}
          </button>
        </div>

        {/* Result Panel */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* AI Alert */}
            {ai && (
              <AIAlertBanner
                isCritical={ai.is_critical}
                probability={ai.probability_critical_percent}
                mitigations={ai.mitigations}
              />
            )}

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Statistik Hasil Prediksi Skenario</div>
                  <div className="text-muted text-sm" style={{ marginTop: 4 }}>Ringkasan dampak pengerahan yang baru saja dianalisis oleh model.</div>
                </div>
                <div className="form-label" style={{ marginTop: 16 }}>Kontribusi Fitur Model</div>
                <div className="metric-list">
                  {Object.entries(automaticPrediction.feature_importance || {}).map(([feature, importance]) => (
                    <div key={feature}><span>{feature}</span><strong>{(Number(importance) * 100).toFixed(1)}%</strong></div>
                  ))}
                </div>
              </div>
              <div className="summary-grid">
                <div className="summary-stat">
                  <div className={`stat-value ${ai?.is_critical ? 'text-danger' : 'text-success'}`}>{Number(ai?.probability_critical_percent || 0).toFixed(1)}%</div>
                  <div className="stat-label">Probabilitas bottleneck</div>
                </div>
                <div className="summary-stat">
                  <div className="stat-value text-accent">{form.tail_numbers.length}</div>
                  <div className="stat-label">Pesawat dikerahkan</div>
                </div>
                <div className="summary-stat">
                  <div className="stat-value text-accent">{Number(cons?.total_flight_hours || 0).toFixed(1)}</div>
                  <div className="stat-label">Jam terbang skenario</div>
                </div>
                <div className="summary-stat">
                  <div className={`stat-value ${grounded.length > 0 ? 'text-danger' : 'text-success'}`}>{grounded.length}</div>
                  <div className="stat-label">Pesawat terkena maintenance trigger</div>
                </div>
              </div>
              {bots && (
                <div className="summary-grid" style={{ marginTop: 16 }}>
                  <div className="summary-stat">
                    <div className="stat-value text-accent">{bots.required_trucks}/{bots.available_trucks}</div>
                    <div className="stat-label">Truk dibutuhkan / tersedia</div>
                  </div>
                  <div className="summary-stat">
                    <div className="stat-value text-accent">{bots.required_forklifts}/{bots.available_forklifts}</div>
                    <div className="stat-label">Forklift dibutuhkan / tersedia</div>
                  </div>
                  <div className="summary-stat">
                    <div className="stat-value text-accent">{Number(form.daily_flight_hours_per_aircraft || 0).toFixed(1)}</div>
                    <div className="stat-label">Jam per pesawat / hari</div>
                  </div>
                  <div className="summary-stat">
                    <div className={`stat-value ${bots.is_bottleneck ? 'text-danger' : 'text-success'}`}>{bots.is_bottleneck ? 'KRITIS' : 'AMAN'}</div>
                    <div className="stat-label">Status dukungan pangkalan</div>
                  </div>
                </div>
              )}
            </div>

            {/* Consumption Summary */}
            {cons && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Ringkasan Konsumsi Logistik</div>
                </div>
                <div className="summary-grid">
                  {[
                    { label: 'Total Jam Terbang', value: `${cons.total_flight_hours?.toFixed(1)} Jam` },
                    { label: 'Konsumsi Avtur', value: `${cons.avtur_consumed_liters?.toLocaleString('id-ID')} L` },
                    { label: 'Pelumas Khusus', value: `${cons.lube_consumed_liters?.toFixed(1)} L` },
                  ].map((c, i) => (
                    <div key={i} className="summary-stat">
                      <div className="stat-value text-accent">{c.value}</div>
                      <div className="stat-label">{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottleneck */}
            {bots && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Analisa Titik Kritis Infrastruktur</div>
                </div>
                <table className="data-table">
                  <thead><tr><th>Elemen</th><th>Dibutuhkan</th><th>Tersedia</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr>
                      <td>Truk Refueler</td>
                      <td className="text-mono">{bots.required_trucks}</td>
                      <td className="text-mono">{bots.available_trucks}</td>
                      <td><span className={`badge ${bots.truck_bottleneck ? 'badge-kritis' : 'badge-aman'}`}>{bots.truck_bottleneck ? '⚠ KRITIS' : '✔ AMAN'}</span></td>
                    </tr>
                    <tr>
                      <td>Forklift / Alat Berat</td>
                      <td className="text-mono">{bots.required_forklifts}</td>
                      <td className="text-mono">{bots.available_forklifts}</td>
                      <td><span className={`badge ${bots.forklift_bottleneck ? 'badge-kritis' : 'badge-aman'}`}>{bots.forklift_bottleneck ? '⚠ KRITIS' : '✔ AMAN'}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Grounded */}
            {grounded.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title card-title-gold">Maintenance Trigger — Pesawat Digrounding</div>
                </div>
                <table className="data-table">
                  <thead><tr><th>Tail Number</th><th>Akm. Jam Terbang</th><th>Status Baru</th></tr></thead>
                  <tbody>
                    {grounded.map(g => (
                      <tr key={g.id}>
                        <td className="text-mono text-accent">{g.tail_number}</td>
                        <td className="text-mono">{g.hours?.toFixed(1)} Jam</td>
                        <td><StatusBadge status="Mandatory Grounding" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
