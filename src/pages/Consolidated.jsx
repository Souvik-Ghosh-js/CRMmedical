import { useMemo, useState } from 'react'
import { useCollection } from '../lib/hooks'
import { PageHeader, Empty, Badge } from '../components/ui'
import { inr, exportCSV } from '../lib/format'

// Consolidated financial statements across all group companies, with inter-company elimination.
export default function Consolidated() {
  const companies = useCollection('companies')
  const sales = useCollection('sales')
  const purchases = useCollection('purchases')
  const payments = useCollection('payments')
  const interco = useCollection('intercoTxns')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const inRange = (d) => { const x = (d || '').slice(0, 10); return (!from || x >= from) && (!to || x <= to) }
  const nameById = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies])

  // Per-company figures derived from tagged transactions.
  const perCompany = useMemo(() => {
    return companies.map((c) => {
      const cSales = sales.filter((s) => s.companyId === c.id && inRange(s.date))
      const cPur = purchases.filter((p) => p.companyId === c.id && inRange(p.date))
      const revenue = cSales.reduce((s, i) => s + Number(i.taxableAfterDisc || i.taxable || 0), 0)
      const outputGst = cSales.reduce((s, i) => s + Number(i.gstTotal || 0), 0)
      const cogs = cPur.reduce((s, p) => s + Number(p.taxable || 0), 0)
      const inputGst = cPur.reduce((s, p) => s + Number(p.gst || 0), 0)
      const collections = payments.filter((p) => p.companyId === c.id && inRange(p.date)).reduce((s, p) => s + Number(p.amount || 0), 0)
      const grossProfit = revenue - cogs
      return { id: c.id, name: c.name, state: c.state, parent: c.parent, revenue, cogs, grossProfit, outputGst, inputGst, netGst: outputGst - inputGst, collections, invoices: cSales.length }
    })
  }, [companies, sales, purchases, payments, from, to])

  // Inter-company eliminations (transactions flagged eliminate, within range, posted).
  const elim = useMemo(() => {
    const rows = interco.filter((t) => t.eliminate !== false && t.eliminate !== 'No' && t.status !== 'Cancelled' && inRange(t.date))
    const totalElim = rows.reduce((s, t) => s + Number(t.amount || 0), 0)
    // Stock transfers / service charges inflate both a "sale" in one co and "purchase" in another → eliminate from both revenue & cogs
    const revenueElim = rows.filter((t) => ['Stock Transfer', 'Service Charge', 'Management Fee'].includes(t.type)).reduce((s, t) => s + Number(t.amount || 0), 0)
    return { rows, totalElim, revenueElim }
  }, [interco, from, to])

  const group = useMemo(() => {
    const sum = (k) => perCompany.reduce((s, c) => s + c[k], 0)
    const revenueGross = sum('revenue')
    const cogsGross = sum('cogs')
    // elimination cannot exceed what's actually there (defensive against bad manual entries)
    const revElim = Math.min(elim.revenueElim, revenueGross, cogsGross)
    return {
      revenueGross, cogsGross, revElim,
      revenueConsolidated: revenueGross - revElim,
      cogsConsolidated: cogsGross - revElim, // matching contra side
      grossProfit: (revenueGross - revElim) - (cogsGross - revElim),
      outputGst: sum('outputGst'), inputGst: sum('inputGst'), netGst: sum('netGst'),
      collections: sum('collections'), invoices: sum('invoices'),
    }
  }, [perCompany, elim])

  if (companies.length < 2) {
    return (
      <div>
        <PageHeader title="Consolidated Statements" subtitle="Group financial consolidation" />
        <Empty icon="🏢" title="Add at least two companies" hint="Consolidation combines figures across group companies." />
      </div>
    )
  }

  const exportRows = perCompany.map((c) => ({
    Company: c.name, State: c.state, Revenue: c.revenue, COGS: c.cogs, GrossProfit: c.grossProfit,
    OutputGST: c.outputGst, InputGST: c.inputGst, NetGST: c.netGst, Collections: c.collections, Invoices: c.invoices,
  }))

  return (
    <div>
      <PageHeader title="Consolidated Statements" subtitle="MediCare Group — combined P&L with inter-company elimination" actions={
        <button className="btn-ghost" onClick={() => exportCSV('consolidated-statements', exportRows)}>⬇ Excel</button>
      } />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input type="date" className="input max-w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-slate-400">to</span>
        <input type="date" className="input max-w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} />
        <span className="text-sm text-slate-400 ml-2">{companies.length} companies · {elim.rows.length} eliminations</span>
      </div>

      {/* Group KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Kpi label="Group Revenue (net)" value={inr(group.revenueConsolidated)} sub={`Gross ${inr(group.revenueGross)}`} tone="brand" />
        <Kpi label="Group Gross Profit" value={inr(group.grossProfit)} sub={`Margin ${group.revenueConsolidated ? Math.round((group.grossProfit / group.revenueConsolidated) * 100) : 0}%`} tone="green" />
        <Kpi label="Inter-Co Eliminated" value={inr(elim.totalElim)} sub={`${elim.rows.length} transactions`} tone="amber" />
        <Kpi label="Net GST Liability" value={inr(group.netGst)} sub={`Output ${inr(group.outputGst)} − Input ${inr(group.inputGst)}`} tone="slate" />
      </div>

      {/* Consolidation worksheet */}
      <div className="card overflow-x-auto mb-5">
        <div className="px-4 py-3 font-semibold text-slate-800 border-b border-slate-100">Consolidation Worksheet</div>
        <table className="w-full min-w-[820px]">
          <thead><tr>
            <th className="th">Company</th><th className="th">State</th>
            <th className="th text-right">Revenue</th><th className="th text-right">COGS</th>
            <th className="th text-right">Gross Profit</th><th className="th text-right">Output GST</th>
            <th className="th text-right">Input GST</th><th className="th text-right">Collections</th>
          </tr></thead>
          <tbody>
            {perCompany.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="td font-medium">{c.name} {c.parent && <Badge tone="brand">Parent</Badge>}</td>
                <td className="td">{c.state}</td>
                <td className="td text-right">{inr(c.revenue)}</td>
                <td className="td text-right">{inr(c.cogs)}</td>
                <td className="td text-right font-medium">{inr(c.grossProfit)}</td>
                <td className="td text-right">{inr(c.outputGst)}</td>
                <td className="td text-right">{inr(c.inputGst)}</td>
                <td className="td text-right">{inr(c.collections)}</td>
              </tr>
            ))}
            {/* Sub-total */}
            <tr className="bg-slate-50 font-semibold">
              <td className="td" colSpan="2">Combined (before elimination)</td>
              <td className="td text-right">{inr(group.revenueGross)}</td>
              <td className="td text-right">{inr(group.cogsGross)}</td>
              <td className="td text-right">{inr(group.revenueGross - group.cogsGross)}</td>
              <td className="td text-right">{inr(group.outputGst)}</td>
              <td className="td text-right">{inr(group.inputGst)}</td>
              <td className="td text-right">{inr(group.collections)}</td>
            </tr>
            {/* Elimination */}
            <tr className="text-rose-700">
              <td className="td" colSpan="2">Less: Inter-company eliminations</td>
              <td className="td text-right">− {inr(group.revElim)}</td>
              <td className="td text-right">− {inr(group.revElim)}</td>
              <td className="td text-right">—</td>
              <td className="td text-right">—</td><td className="td text-right">—</td><td className="td text-right">—</td>
            </tr>
            {/* Consolidated */}
            <tr className="bg-brand-50 font-bold text-brand-800 border-t-2 border-brand-200">
              <td className="td" colSpan="2">Consolidated Group Total</td>
              <td className="td text-right">{inr(group.revenueConsolidated)}</td>
              <td className="td text-right">{inr(group.cogsConsolidated)}</td>
              <td className="td text-right">{inr(group.grossProfit)}</td>
              <td className="td text-right">{inr(group.outputGst)}</td>
              <td className="td text-right">{inr(group.inputGst)}</td>
              <td className="td text-right">{inr(group.collections)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Eliminations detail */}
      <div className="card overflow-x-auto">
        <div className="px-4 py-3 font-semibold text-slate-800 border-b border-slate-100">Inter-Company Eliminations</div>
        {elim.rows.length === 0 ? <Empty icon="🔁" title="No inter-company transactions in range" /> : (
          <table className="w-full">
            <thead><tr><th className="th">Txn</th><th className="th">Type</th><th className="th">From</th><th className="th">To</th><th className="th text-right">Amount</th></tr></thead>
            <tbody>{elim.rows.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="td font-mono text-xs">{t.txnNo}</td>
                <td className="td">{t.type}</td>
                <td className="td">{nameById[t.fromCompanyId] || t.fromCompanyId}</td>
                <td className="td">{nameById[t.toCompanyId] || t.toCompanyId}</td>
                <td className="td text-right font-medium">{inr(t.amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3 max-w-3xl">
        Consolidation combines each group company's revenue, COGS, GST and collections, then eliminates inter-company
        stock transfers, service charges and management fees (which would otherwise double-count within the group).
        Fund transfers and loans net to zero across the group and are shown for reconciliation.
      </p>
    </div>
  )
}

function Kpi({ label, value, sub, tone }) {
  const tones = { brand: 'text-brand-700', green: 'text-emerald-700', amber: 'text-amber-700', slate: 'text-slate-700' }
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}
