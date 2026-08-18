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

  const del = async (id) => {
    if (!confirm('Hapus skenario ini?')) return;
    try { await scenarioAPI.delete(id); await load(); }
    catch (e) { alert('Gagal: ' + e.message); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-accent">SKENARIO</span> OPERASI</h1>
          <p className="page-subtitle">Konfigurasi rencana pengerahan pesawat untuk kebutuhan operasi udara</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Buat Skenario</button>
      </div>

      {/* Info cards */}
      <div className="summary-grid" style={{ marginBottom: 24 }}>
        {[
          { icon: '📋', value: scenarios.length, label: 'Total Skenario' },
          { icon: '🏛️', value: bases.length, label: 'Pangkalan Tersedia' },
          { icon: '✈️', value: units.filter(u => u.status === 'Ready').length, label: 'Pesawat Siap Terbang' },
        ].map((c, i) => (
          <div key={i} className="metric-card">
            <span style={{ fontSize: '2rem' }}>{c.icon}</span>
            <div>
              <div className="stat-value text-accent">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Daftar Skenario Operasi</div>
        </div>
        {loading ? (
          <div className="empty-center"><Spinner /></div>
        ) : scenarios.length === 0 ? (
          <EmptyState icon="📋" title="Belum Ada Skenario" desc="Buat skenario operasi untuk memulai analisa prediktif AI." />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Nama Skenario</th><th>Deskripsi</th><th>Tanggal Dibuat</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {scenarios.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-muted text-sm">{i + 1}</td>
                    <td className="text-accent font-bold">{s.name}</td>
                    <td className="text-muted text-sm">{s.description || '-'}</td>
                    <td className="text-mono text-sm">{s.start_date ? new Date(s.start_date).toLocaleDateString('id-ID') : '-'}</td>
                    <td>
                      <div className="action-cell">
                        <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="➕ Buat Skenario Operasi Baru" onClose={() => setShowModal(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Simpan'}</button>
          </>}>
          <div className="form-group">
            <label className="form-label">Nama Skenario Operasi *</label>
            <input className="form-control" placeholder="Contoh: Latgab TNI 2025 - Fase 1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Deskripsi Singkat</label>
            <textarea className="form-control" rows="3" placeholder="Deskripsi tujuan dan rencana operasi..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  );
}
