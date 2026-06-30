import { useMemo, useState } from 'react'
import { useDb } from '../lib/hooks'
import { logAudit } from '../lib/audit'
import { PageHeader, Modal, Field, Toolbar, Empty, Badge } from './ui'
import { Pagination, usePagination } from './Pagination'
import { exportCSV, fmtDate } from '../lib/format'

// Generic, config-driven CRUD screen used by every enterprise module.
// Pass a `config` describing the collection, columns and form fields and you get a
// fully working list + add/edit/delete + search + Excel export + audit logging.
//
// config = {
//   collection: 'qmsDeviations',          // localStorage key
//   title, subtitle, icon,
//   searchKeys: ['title','status'],        // fields searched by the search box
//   filters: [{ key:'status', label:'Status', options:['Open','Closed'] }],  // optional dropdown filters
//   columns: [{ key, label, badge?: (row)=>['tone','text'], render?: (row)=>node, align? }],
//   fields:  [{ key, label, type?: 'text'|'number'|'date'|'select'|'textarea', options?, required?, full?, default? }],
//   stats?: (rows) => [{ label, value, tone }],
//   numberPrefix?: 'DEV',                   // auto doc number e.g. DEV-0001 into field `code`
// }
export default function CrudModule({ config }) {
  const { rows, insert, update, remove } = useDb(config.collection)
  const [q, setQ] = useState('')
  const [filterVals, setFilterVals] = useState({})
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  const blank = useMemo(() => {
    const o = {}
    config.fields.forEach((f) => { o[f.key] = f.default ?? (f.type === 'number' ? 0 : '') })
    return o
  }, [config])

  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return rows.filter((r) => {
      if (s && !(config.searchKeys || []).some((k) => String(r[k] ?? '').toLowerCase().includes(s))) return false
      for (const f of config.filters || []) {
        if (filterVals[f.key] && filterVals[f.key] !== 'All' && r[f.key] !== filterVals[f.key]) return false
      }
      return true
    })
  }, [rows, q, filterVals, config])

  const pg = usePagination(filtered, 10)

  const openNew = () => { setEditing('new'); setForm({ ...blank }) }
  const openEdit = (r) => { setEditing(r.id); setForm({ ...blank, ...r }) }

  const save = (e) => {
    e.preventDefault()
    const payload = { ...form }
    config.fields.forEach((f) => { if (f.type === 'number') payload[f.key] = Number(payload[f.key] || 0) })
    if (editing === 'new') {
      if (config.numberPrefix) payload.code = `${config.numberPrefix}-${String(rows.length + 1).padStart(4, '0')}`
      insert(payload)
      logAudit(`${config.title} Create`, `${payload.code || payload[config.fields[0].key] || 'record'}`)
    } else {
      update(editing, payload)
      logAudit(`${config.title} Update`, `${payload.code || editing}`)
    }
    setEditing(null)
  }

  const del = (r) => { if (confirm('Delete this record?')) { remove(r.id); logAudit(`${config.title} Delete`, r.code || r.id) } }

  const cell = (r, col) => {
    if (col.render) return col.render(r)
    if (col.badge) { const [tone, text] = col.badge(r); return <Badge tone={tone}>{text}</Badge> }
    const v = r[col.key]
    if (col.type === 'date') return fmtDate(v)
    return v ?? '—'
  }

  const stats = config.stats ? config.stats(rows) : null

  return (
    <div>
      <PageHeader title={config.title} subtitle={config.subtitle} actions={<>
        <button className="btn-ghost" onClick={() => exportCSV(config.collection, filtered, config.columns.map((c) => ({ key: c.key, label: c.label })))}>⬇ Excel</button>
        <button className="btn-primary" onClick={openNew}>+ New</button>
      </>} />

      {stats && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <Toolbar>
        <input className="input max-w-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        {(config.filters || []).map((f) => (
          <select key={f.key} className="input max-w-[180px]" value={filterVals[f.key] || 'All'} onChange={(e) => setFilterVals((v) => ({ ...v, [f.key]: e.target.value }))}>
            <option>All</option>
            {f.options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
        <span className="text-sm text-slate-400">{filtered.length} records</span>
      </Toolbar>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? <Empty icon={config.icon || '📋'} title="No records yet" hint="Click + New to add one." /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>{config.columns.map((c) => <th key={c.key} className={`th ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}<th className="th"></th></tr></thead>
                <tbody>{pg.slice.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    {config.columns.map((c) => <td key={c.key} className={`td ${c.align === 'right' ? 'text-right' : ''}`}>{cell(r, c)}</td>)}
                    <td className="td whitespace-nowrap text-right">
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(r)}>Edit</button>
                      <button className="btn-sm text-rose-600 hover:bg-rose-50 rounded px-2" onClick={() => del(r)}>Del</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <Pagination pg={pg} />
          </>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? `New — ${config.title}` : `Edit — ${config.title}`} wide>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          {config.fields.map((f) => (
            <Field key={f.key} label={f.label + (f.required ? ' *' : '')} className={f.full ? 'sm:col-span-2' : ''}>
              {f.type === 'select' ? (
                <select required={f.required} className="input" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">Select…</option>
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea required={f.required} className="input" rows={3} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : (
                <input required={f.required} type={f.type || 'text'} step={f.type === 'number' ? 'any' : undefined} className="input" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </Field>
          ))}
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
