export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50] }) {
  const totalPages = Math.ceil((total || 0) / pageSize);
  if (!totalPages) return null;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  let s = Math.max(1, page - 2);
  let e = Math.min(totalPages, s + 4);
  if (e - s < 4) s = Math.max(1, e - 4);
  const pages = [];
  for (let i = s; i <= e; i++) pages.push(i);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>Menampilkan <b className="text-slate-800">{start}-{end}</b> dari <b className="text-slate-800">{total}</b></span>
        <label className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          per halaman
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} aria-label="Halaman sebelumnya" onClick={() => onPageChange(page - 1)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">‹ Prev</button>
        {s > 1 && <><button aria-label="Halaman 1" onClick={() => onPageChange(1)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">1</button><span className="px-1 text-slate-500">…</span></>}
        {pages.map((p) => (
          <button key={p} aria-label={`Halaman ${p}`} aria-current={p === page ? 'page' : undefined} onClick={() => onPageChange(p)} className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${p === page ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{p}</button>
        ))}
        {e < totalPages && <><span className="px-1 text-slate-500">…</span><button aria-label={`Halaman ${totalPages}`} onClick={() => onPageChange(totalPages)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{totalPages}</button></>}
        <button disabled={page >= totalPages} aria-label="Halaman berikutnya" onClick={() => onPageChange(page + 1)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Next ›</button>
      </div>
    </div>
  );
}
