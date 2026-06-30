import { useMemo, useState } from 'react'
import { useCollection } from '../lib/hooks'
import { PageHeader, Toolbar, Empty, Badge } from '../components/ui'
import { inr, fmtDate, exportCSV } from '../lib/format'
import { Pagination, usePagination } from '../components/Pagination'

export default function ReceiptRegister() {
  const payments = useCollection('payments')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [mode, setMode] = useState('All')

  const filtered = useMemo(() => payments.filter((p) => {
    const d = (p.date || '').slice(0, 10)
    if (from && d < from) return false
    if (to && d > to) return false
    if (mode !== 'All' && p.mode !== mode) return false
    return true
  }), [payments, from, to, mode])

  const pg = usePagination(filtered, 10)

  const total = filtered.reduce((s, p) => s + Number(p.amount || 0), 0)
  const byMode = useMemo(() => {
    const m = {}
    filtered.forEach((p) => { m[p.mode] = (m[p.mode] || 0) + Number(p.amount || 0) })
    return m
  }, [filtered])

  return (
    <div>
      <PageHeader title="Receipt Register" subtitle={`${filtered.length} receipts · ${inr(total)} collected`} actions={
        <button className="btn-ghost" onClick={() => exportCSV('receipt-register', filtered, [
          { key: 'receiptNo', label: 'Receipt' }, { key: 'date', label: 'Date' }, { key: 'partyName', label: 'Party' },
          { key: 'mode', label: 'Mode' }, { key: 'utr', label: 'UTR' }, { key: 'amount', label: 'Amount' },
        ])}>⬇ Excel</button>
      } />

      <Toolbar>
        <input type="date" className="input max-w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-slate-400">to</span>
        <input type="date" className="input max-w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} />
        <select className="input max-w-[160px]" value={mode} onChange={(e) => setMode(e.target.value)}>{['All', 'UPI', 'Bank Transfer', 'NEFT', 'Cash', 'Cheque', 'Card'].map((m) => <option key={m}>{m}</option>)}</select>
      </Toolbar>

      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(byMode).map(([m, v]) => <div key={m} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm">{m}: <b>{inr(v)}</b></div>)}
      </div>

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? <Empty title="No receipts in range" /> : (
          <table className="w-full">
            <thead><tr><th className="th">Receipt No.</th><th className="th">Date</th><th className="th">Party</th><th className="th">Mode</th><th className="th">UTR / Ref</th><th className="th text-right">Amount</th></tr></thead>
            <tbody>{pg.slice.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="td font-mono text-xs">{p.receiptNo}</td>
                <td className="td">{fmtDate(p.date)}</td>
                <td className="td font-medium">{p.partyName}</td>
                <td className="td"><Badge tone="blue">{p.mode}</Badge></td>
                <td className="td font-mono text-xs">{p.utr || '—'}</td>
                <td className="td text-right font-semibold">{inr(p.amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <Pagination pg={pg} />
      </div>
    </div>
  )
}
