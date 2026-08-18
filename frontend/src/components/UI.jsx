export function StatusBadge({ status }) {
  const map = {
    Ready: { cls: 'badge-aman', label: '● SIAP TERBANG' },
    Maintenance: { cls: 'badge-waspada', label: '⚙ MAINTENANCE' },
    'Mandatory Grounding': { cls: 'badge-grounding', label: '🚫 GROUNDING' },
    AMAN: { cls: 'badge-aman', label: '✔ AMAN' },
    KRITIS: { cls: 'badge-kritis', label: '⚠ KRITIS' },
    WASPADA: { cls: 'badge-waspada', label: '! WASPADA' },
  };
  const item = map[status] || { cls: 'badge-waspada', label: status };
  return <span className={`badge ${item.cls}`}>{item.label}</span>;
}

export function Spinner() {
  return <span className="spinner" />;
}

export function KPICard({ icon, value, label, sub, color }) {
  return (
    <div className="kpi-card">
      <span className="kpi-icon">{icon}</span>
      <div className="kpi-value" style={color ? { color } : {}}>{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sublabel">{sub}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon = '📭', title, desc }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-desc">{desc}</div>
    </div>
  );
}

export function AIAlertBanner({ isCritical, probability, mitigations }) {
  const cls = isCritical ? 'ai-alert-kritis' : 'ai-alert-aman';
  const icon = isCritical ? '⚠️' : '✅';
  const title = isCritical
    ? `PREDIKSI AI: RISIKO KRITIS TERDETEKSI (${probability}%)`
    : `PREDIKSI AI: KONDISI OPERASIONAL AMAN (${probability}%)`;

  return (
    <div className={`ai-alert ${cls}`}>
      <span className="ai-alert-icon">{icon}</span>
      <div>
        <div className="ai-alert-title">{title}</div>
        {mitigations && mitigations.length > 0 && (
          <div className="ai-alert-message">
            <strong>Rekomendasi Mitigasi:</strong>
            <ul style={{ marginTop: '6px', paddingLeft: '18px' }}>
              {mitigations.map((m, i) => <li key={i} style={{ marginBottom: '4px' }}>{m}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
