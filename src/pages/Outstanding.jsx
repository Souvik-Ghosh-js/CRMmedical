import { useMemo } from 'react'
import { useCollection } from '../lib/hooks'
import { PageHeader, Empty, Badge, Stat } from '../components/ui'
import { inr, fmtDate, daysUntil, exportCSV } from '../lib/format'

export default function Outstanding() {
  const customers = useCollection('customers')
  const sales = useCollection('sales')

  // Day-wise outstanding: group credit invoices by date, plus party balances.
  const partyDue = useMemo(() => customers.filter((c) => Number(c.balance) > 0).map((c) => ({
    ...c,
    // age from latest credit invoice
    lastCredit: sales.filter((s) => s.customerId === c.id && s.payMode === 'Credit').sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date,
  })), [customers, sales])

  const dayWise = useMemo(() => {
    const map = {}
    sales.filter((s) => s.payMode === 'Credit').forEach((s) => {
      const d = (s.date || '').slice(0, 10)
      map[d] = (map[d] || 0) + Number(s.grandTotal || 0)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [sales])

  const totalDue = partyDue.reduce((s, c) => s + Number(c.balance), 0)
  const bucket = (days) => (days == null ? '—' : days >= -30 ? '0–30d' : days >= -60 ? '31–60d' : days >= -90 ? '61–90d' : '90d+')

  return (
    <div>
      <PageHeader title="Day-wise Outstanding" subtitle="Receivables ageing & credit invoice register" actions={
        <button className="btn-ghost" onClick={() => exportCSV('outstanding', partyDue, [{ key: 'name', label: 'Customer' }, { key: 'phone', label: 'Phone' }, { key: 'balance', label: 'Outstanding' }, { key: 'lastCredit', label: 'Last Credit' }])}>⬇ Excel</button>
      } />

      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <Stat label="Total Receivable" value={inr(totalDue)} tone="amber" icon="📆" />
        <Stat label="Parties with Dues" value={partyDue.length} tone="brand" icon="🧑" />
        <Stat label="Credit Sale Days" value={dayWise.length} tone="slate" icon="📒" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card overflow-x-auto">
          <div className="px-4 py-3 font-semibold text-slate-800 border-b border-slate-100">Party-wise Ageing</div>
          {partyDue.length === 0 ? <Empty title="No outstanding dues" icon="✅" /> : (
            <table className="w-full">
              <thead><tr><th className="th">Customer</th><th className="th">Last Credit</th><th className="th">Ageing</th><th className="th text-right">Outstanding</th></tr></thead>
              <tbody>{partyDue.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{c.name}<div className="text-xs text-slate-400">{c.phone}</div></td>
                  <td className="td">{c.lastCredit ? fmtDate(c.lastCredit) : '—'}</td>
                  <td className="td"><Badge tone={bucket(c.lastCredit ? daysUntil(c.lastCredit) : null) === '90d+' ? 'rose' : 'amber'}>{bucket(c.lastCredit ? daysUntil(c.lastCredit) : null)}</Badge></td>
                  <td className="td text-right font-semibold">{inr(c.balance)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div className="card overflow-x-auto">
          <div className="px-4 py-3 font-semibold text-slate-800 border-b border-slate-100">Day-wise Credit Sales</div>
          {dayWise.length === 0 ? <Empty title="No credit sales" /> : (
            <table className="w-full">
              <thead><tr><th className="th">Date</th><th className="th text-right">Credit Amount</th></tr></thead>
              <tbody>{dayWise.map(([d, v]) => (
                <tr key={d} className="hover:bg-slate-50"><td className="td">{fmtDate(d)}</td><td className="td text-right font-semibold">{inr(v)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
