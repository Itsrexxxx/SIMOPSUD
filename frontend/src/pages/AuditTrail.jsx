import { useEffect, useState } from 'react'
import { auditAPI } from '../api'
import { extractTotal } from '../api'
import Pagination from '../components/Pagination'
import { PageShell } from '../components/PageShell'

const KLAS_COLOR = { Terbuka: 'border-emerald-200 bg-emerald-50 text-emerald-700', Terbatas: 'border-amber-200 bg-amber-50 text-amber-700', Rahasia: 'border-red-200 bg-red-50 text-red-700' }
const ACTION_COLOR = { CREATE: 'bg-sky-100 text-sky-700', UPDATE: 'bg-amber-100 text-amber-700', DELETE: 'bg-red-100 text-red-700', LOGIN: 'bg-emerald-100 text-emerald-700', LOGOUT: 'bg-slate-100 text-slate-700', STATUS_CHANGE: 'bg-violet-100 text-violet-700' }

function fmt(t){ if(!t) return '-'; try{ const d=new Date(t); return d.toLocaleString('id-ID',{dateStyle:'short', timeStyle:'medium'}) }catch{ return t } }

export default function AuditTrail(){
  const [rows,setRows]=useState([])
  const [total,setTotal]=useState(0)
  const [page,setPage]=useState(1)
  const [pageSize,setPageSize]=useState(20)
  const [q,setQ]=useState('')
  const [debounced,setDebounced]=useState('')
  const [action,setAction]=useState('')
  const [resource,setResource]=useState('')
  const [klas,setKlas]=useState('')
  const [loading,setLoading]=useState(true)
  const [err,setErr]=useState('')

  useEffect(()=>{ const t=setTimeout(()=>{ setDebounced(q); setPage(1)},350); return ()=>clearTimeout(t)},[q])

  const load=async()=>{
    setLoading(true); setErr('')
    try{
      const params={ skip:(page-1)*pageSize, limit:pageSize }
      if(debounced.trim()) params.q=debounced.trim()
      if(action) params.action=action
      if(resource) params.resource_type=resource
      if(klas) params.klasifikasi=klas
      const res=await auditAPI.getAll(params)
      const data=res.data
      setRows(Array.isArray(data)?data:[])
      setTotal(extractTotal(res,data))
    }catch(e){ setErr(e.response?.data?.detail || e.message || 'Gagal memuat audit trail') }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ load() },[page,pageSize,debounced,action,resource,klas])

  const doExport=async()=>{
    try{
      const params={}
      if(debounced.trim()) params.q=debounced.trim()
      if(action) params.action=action
      if(resource) params.resource_type=resource
      if(klas) params.klasifikasi=klas
      const res=await auditAPI.exportCsv(params)
      const url=URL.createObjectURL(new Blob([res.data],{type:'text/csv'}))
      const a=document.createElement('a'); a.href=url; a.download='audit-trail.csv'; a.click(); URL.revokeObjectURL(url)
    }catch(e){ setErr(e.response?.data?.detail || 'Export gagal') }
  }

  return (
    <div>
      <PageShell title="Audit Trail" subtitle="Jejak audit immutable · Klasifikasi Terbuka / Terbatas / Rahasia · Hanya Administrator" actions={<button onClick={doExport} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">⬇ Export CSV</button>}>
      <div>
        {err && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari user / detail / resource..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <select value={action} onChange={e=>{setAction(e.target.value); setPage(1)}} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="">Semua Aksi</option>
            <option value="CREATE">CREATE</option><option value="UPDATE">UPDATE</option><option value="DELETE">DELETE</option><option value="LOGIN">LOGIN</option><option value="LOGOUT">LOGOUT</option><option value="STATUS_CHANGE">STATUS_CHANGE</option>
          </select>
          <select value={resource} onChange={e=>{setResource(e.target.value); setPage(1)}} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="">Semua Resource</option>
            <option value="aircraft_type">aircraft_type</option><option value="aircraft_unit">aircraft_unit</option><option value="airbase">airbase</option><option value="flight_mission">flight_mission</option><option value="user">user</option><option value="auth">auth</option>
          </select>
          <select value={klas} onChange={e=>{setKlas(e.target.value); setPage(1)}} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="">Semua Klasifikasi</option>
            <option value="Terbuka">Terbuka</option><option value="Terbatas">Terbatas</option><option value="Rahasia">Rahasia</option>
          </select>
          <span className="ml-auto text-xs font-bold text-slate-500">Total: {total}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2 text-xs text-slate-500 border-b bg-amber-50">Immutabel — tidak ada edit/hapus. Retensi {365} hari. Filter klasifikasi untuk need-to-know.</div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-600"><span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" /> Memuat audit...</div>
          ) : rows.length===0 ? (
            <div className="py-12 text-center text-sm text-slate-500">Belum ada jejak audit.</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto table-wrap">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 border-b"><tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Waktu</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">User</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Aksi</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Resource</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Klasifikasi</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Detail</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {rows.map(r=>(
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">{fmt(r.created_at)}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-900">{r.username || '-'}<span className="text-slate-400 font-normal"> #{r.user_id ?? '-'}</span></td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${ACTION_COLOR[r.action] || 'bg-slate-100 text-slate-700'}`}>{r.action}</span></td>
                        <td className="px-4 py-3 text-xs text-slate-700">{r.resource_type || '-'}<span className="text-slate-400"> {r.resource_id ? `#${r.resource_id}` : ''}</span></td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${KLAS_COLOR[r.klasifikasi] || 'border-slate-200 bg-white text-slate-600'}`}>{r.klasifikasi}</span></td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-600">{r.ip_address || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-700 max-w-[320px] truncate" title={r.detail}>{r.detail || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y">
                {rows.map(r=>(
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${ACTION_COLOR[r.action] || 'bg-slate-100'}`}>{r.action}</span>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${KLAS_COLOR[r.klasifikasi]||''}`}>{r.klasifikasi}</span>
                    </div>
                    <div className="text-xs text-slate-900 font-bold">{r.username || '-'} <span className="font-normal text-slate-500">{fmt(r.created_at)}</span></div>
                    <div className="text-xs text-slate-600">{r.resource_type || '-'} {r.resource_id ? `#${r.resource_id}` : ''} · {r.ip_address || '-'}</div>
                    <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2 border">{r.detail || '-'}</div>
                  </div>
                ))}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={s=>{setPageSize(s); setPage(1)}} />
            </>
          )}
        </div>
      </div>
    </PageShell>
    </div>
  )
}
