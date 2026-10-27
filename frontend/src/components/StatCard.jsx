export function StatCard({ icon, label, value, sub, valueClass = '', iconBg = 'bg-slate-50', iconColor = 'text-slate-700', bar, barClass = '' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 ${iconBg} ${iconColor}`} aria-hidden="true">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
      </div>
      <div className={`mt-3 text-[30px] font-extrabold leading-none tracking-tight ${valueClass || 'text-slate-900'}`}>{value}</div>
      {sub && <p className="mt-2 text-xs leading-relaxed text-slate-500">{sub}</p>}
      {bar}
    </div>
  );
}

export function SegmentedBar({ leftPct, leftClass = 'bg-emerald-500', rightClass = 'bg-red-500', labels }) {
  return (
    <>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={leftClass} style={{ width: `${Math.max(0, Math.min(100, leftPct))}%` }} />
        <div className={rightClass} style={{ width: `${Math.max(0, 100 - Math.min(100, leftPct))}%` }} />
      </div>
      {labels && <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-500">{labels}</div>}
    </>
  );
}

export function SolidBar({ pct, fillClass = 'bg-sky-500', label }) {
  return (
    <>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${fillClass} rounded-full`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      {label && <div className="mt-1.5 text-[11px] font-medium text-slate-500">{label}</div>}
    </>
  );
}
