import { useState, useEffect } from 'react';
import { scenarioAPI, airbaseAPI, aircraftAPI } from '../api';
import { AIAlertBanner, StatusBadge, Spinner } from '../components/UI';

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
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [s, b, u] = await Promise.all([scenarioAPI.getAll(), airbaseAPI.getAll(), aircraftAPI.getUnits()]);
        setScenarios(s.data || []);
        setBases(b.data || []);
        setUnits((u.data || []).filter(u => u.status === 'Ready'));
      } catch { }
    };
    load();
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
    setDownloadUrl('');
    try {
      const res = await scenarioAPI.runSimulation({
        scenario_id: parseInt(form.scenario_id),
        airbase_id: parseInt(form.airbase_id),
        tail_numbers: form.tail_numbers,
        daily_flight_hours_per_aircraft: parseFloat(form.daily_flight_hours_per_aircraft),
      });
      setResult(res.data);
      if (res.data.pdf_download_url) {
        setDownloadUrl(`http://localhost:8000${res.data.pdf_download_url}`);
      }
    } catch (e) {
      setError('Simulasi gagal: ' + (e.response?.data?.detail || e.message));
    }
    setRunning(false);
  };

  const ai = result?.ai_analysis;
  const cons = result?.consumption;
  const bots = result?.bottlenecks;
  const grounded = result?.newly_grounded_aircraft || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-accent">MODEL PREDIKTIF</span> TITIK KRITIS</h1>
          <p className="page-subtitle">Analisa Prediktif Titik Kritis dan Mitigasi Hambatan berdasarkan jam terbang dalam dukungan operasi udara berbasis supervised learning</p>
        </div>
        <span className="badge badge-aman">🤖 AI Engine: Active</span>
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
              ⚠ {error}
            </div>
          )}

          <button className="btn btn-primary w-full btn-lg" onClick={runSim} disabled={running}>
            {running ? <><Spinner /> &nbsp;Menjalankan Prediksi AI...</> : '🚀 Jalankan Analisa Prediktif'}
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

            {/* Consumption Summary */}
            {cons && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">⛽ Ringkasan Konsumsi Logistik</div>
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
                  <div className="card-title">📊 Analisa Titik Kritis Infrastruktur</div>
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
                  <div className="card-title card-title-gold">🚫 Maintenance Trigger — Pesawat Digrounding</div>
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

            {/* Download PDF */}
            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg w-full btn-full">
                📥 Unduh Laporan PDF — Analisa Prediktif SIMKO
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
