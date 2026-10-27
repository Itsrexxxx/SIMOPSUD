import { useEffect, useRef } from 'react';

export function StatusBadge({ status }) {
  const map = {
    S: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'S' },
    'U/S': { cls: 'bg-red-100 text-red-700 border-red-200', label: 'U/S' },
    // legacy compat
    Ready: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'S' },
    Maintenance: { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'U/S' },
    'Mandatory Grounding': { cls: 'bg-red-100 text-red-700 border-red-200', label: 'U/S' },
    Grounded: { cls: 'bg-red-100 text-red-700 border-red-200', label: 'U/S' },
    AMAN: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Aman' },
    KRITIS: { cls: 'bg-red-100 text-red-700 border-red-200', label: 'Kritis' },
    WASPADA: { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Waspada' },
  };
  const item = map[status] || { cls: 'bg-slate-100 text-slate-700 border-slate-200', label: status };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${item.cls}`}>{item.label}</span>;
}

export function Spinner({ label = '' }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-600" role="status" aria-live="polite" aria-label={label || 'Memuat'}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden="true" />
      {label}
    </span>
  );
}

export function Modal({ title, onClose, children, footer }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement;
    setTimeout(() => {
      const el = dialogRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      el?.focus();
    }, 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [onClose]);
  const onKeyDown = (e) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.hasAttribute('disabled'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose} aria-hidden="true">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 id="modal-title" className="text-base font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Tutup dialog" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon = '—', title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border text-xl" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }} aria-hidden="true">{icon}</div>
      <div className="mt-3 text-sm font-bold text-slate-900">{title}</div>
      {desc && <div className="mt-1 max-w-md text-sm text-slate-600">{desc}</div>}
    </div>
  );
}

export function AIAlertBanner({ isCritical, probability, mitigations }) {
  return (
    <div role="alert" className={`rounded-xl border p-4 ${isCritical ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <div className={`text-sm font-bold ${isCritical ? 'text-red-700' : 'text-emerald-700'}`}>
        {isCritical ? `Risiko Kritis Terdeteksi (${probability != null ? `${Number(probability).toFixed(1)}%` : '—'})` : `Kondisi Operasional Aman (${probability != null ? `${Number(probability).toFixed(1)}%` : '—'})`}
      </div>
      {mitigations?.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {mitigations.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      )}
    </div>
  );
}
