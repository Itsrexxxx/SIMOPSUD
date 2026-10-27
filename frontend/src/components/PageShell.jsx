export function PageShell({ title, subtitle, actions, children }) {
  return (
    <div className="page-container space-y-6">
      <div className="rounded-xl border p-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow)' }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h1>
            {subtitle && <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}
