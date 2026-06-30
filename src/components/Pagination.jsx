import { useState, useMemo, useEffect } from 'react'

// Reusable pagination hook. Returns the current page slice + controls.
export function usePagination(rows, initialSize = 10) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(initialSize)
  const total = rows.length
  const pages = Math.max(1, Math.ceil(total / size))

  // clamp page when the underlying data shrinks (e.g. after filtering)
  useEffect(() => { if (page > pages) setPage(1) }, [pages, page])

  const slice = useMemo(() => rows.slice((page - 1) * size, page * size), [rows, page, size])
  const from = total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, total)

  return { page, setPage, size, setSize, pages, total, slice, from, to }
}

// Page-number window: 1 … 4 5 [6] 7 8 … 20
function pageWindow(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const out = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pages - 1, page + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < pages - 1) out.push('…')
  out.push(pages)
  return out
}

export function Pagination({ pg, sizes = [10, 25, 50, 100] }) {
  const { page, setPage, size, setSize, pages, total, from, to } = pg
  if (total === 0) return null
  const win = pageWindow(page, pages)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <span>Rows</span>
        <select className="rounded-lg border border-slate-200 px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-brand-200"
          value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1) }}>
          {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="hidden sm:inline">·</span>
        <span className="tabular-nums">{from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}</span>
      </div>

      <div className="flex items-center gap-1">
        <PgBtn disabled={page === 1} onClick={() => setPage(1)} title="First">«</PgBtn>
        <PgBtn disabled={page === 1} onClick={() => setPage(page - 1)} title="Previous">‹</PgBtn>
        {win.map((p, i) => p === '…'
          ? <span key={`e${i}`} className="px-1.5 text-slate-300">…</span>
          : <button key={p} onClick={() => setPage(p)}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium tabular-nums transition ${p === page ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{p}</button>)}
        <PgBtn disabled={page === pages} onClick={() => setPage(page + 1)} title="Next">›</PgBtn>
        <PgBtn disabled={page === pages} onClick={() => setPage(pages)} title="Last">»</PgBtn>
      </div>
    </div>
  )
}

function PgBtn({ children, disabled, onClick, title }) {
  return (
    <button title={title} disabled={disabled} onClick={onClick}
      className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
      {children}
    </button>
  )
}
