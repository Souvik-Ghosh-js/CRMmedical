import { useMemo, useState } from 'react'
import { useCollection } from '../lib/hooks'
import { PageHeader, Toolbar, Empty, Badge } from '../components/ui'
import { Pagination, usePagination } from '../components/Pagination'
import { fmtDateTime, exportCSV } from '../lib/format'

export default function AuditLog() {
  const log = useCollection('auditLog')
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return log.filter((l) => !s || [l.action, l.detail, l.user].some((v) => (v || '').toLowerCase().includes(s)))
  }, [log, q])
  const pg = usePagination(filtered, 10)

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Append-only immutable activity trail" actions={
        <button className="btn-ghost" onClick={() => exportCSV('audit-log', filtered, [{ key: 'ts', label: 'Timestamp' }, { key: 'user', label: 'User' }, { key: 'role', label: 'Role' }, { key: 'action', label: 'Action' }, { key: 'detail', label: 'Detail' }])}>⬇ Excel</button>
      } />
      <Toolbar><input className="input max-w-xs" placeholder="Search action, user, detail…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="text-sm text-slate-400">{filtered.length} entries</span></Toolbar>
      <div className="card overflow-x-auto">
        {filtered.length === 0 ? <Empty title="No activity logged yet" /> : (
          <table className="w-full">
            <thead><tr><th className="th">Timestamp</th><th className="th">User</th><th className="th">Action</th><th className="th">Detail</th></tr></thead>
            <tbody>{pg.slice.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="td whitespace-nowrap text-xs text-slate-500">{fmtDateTime(l.ts)}</td>
                <td className="td">{l.user} <span className="text-xs text-slate-400">({l.role})</span></td>
                <td className="td"><Badge tone="brand">{l.action}</Badge></td>
                <td className="td text-sm">{l.detail}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <Pagination pg={pg} />
      </div>
    </div>
  )
}
