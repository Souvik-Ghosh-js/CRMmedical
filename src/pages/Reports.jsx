import { useMemo, useState } from 'react'
import { useCollection } from '../lib/hooks'
import { productStock } from '../lib/stock'
import { PageHeader, Toolbar, Empty, Stat, Badge } from '../components/ui'
import { LineChart, BarChart, DonutChart, ChartCard } from '../components/charts'
import { inr, num, fmtDate, daysUntil, exportCSV } from '../lib/format'

function DateRange({ from, to, setFrom, setTo }) {
  return (
    <Toolbar>
      <input type="date" className="input max-w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
      <span className="text-slate-400">to</span>
      <input type="date" className="input max-w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} />
    </Toolbar>
  )
}

const inRange = (d, from, to) => { const x = (d || '').slice(0, 10); return (!from || x >= from) && (!to || x <= to) }

export function SalesReport() {
  const sales = useCollection('sales')
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  const rows = sales.filter((s) => inRange(s.date, from, to))
  const total = rows.reduce((s, i) => s + Number(i.grandTotal || 0), 0)
  const tax = rows.reduce((s, i) => s + Number(i.gstTotal || 0), 0)
  return (
    <div>
      <PageHeader title="Sales Report" subtitle="Invoice-level sales summary" actions={<button className="btn-ghost" onClick={() => exportCSV('sales-report', rows, [{ key: 'invoiceNo', label: 'Invoice' }, { key: 'date', label: 'Date' }, { key: 'customerName', label: 'Customer' }, { key: 'taxable', label: 'Taxable' }, { key: 'gstTotal', label: 'GST' }, { key: 'grandTotal', label: 'Total' }])}>⬇ Excel</button>} />
      <div className="grid sm:grid-cols-3 gap-4 mb-4"><Stat label="Invoices" value={num(rows.length)} icon="🧾" /><Stat label="Net Sales" value={inr(total)} tone="green" icon="💰" /><Stat label="GST Collected" value={inr(tax)} tone="brand" icon="🏛️" /></div>
      <DateRange {...{ from, to, setFrom, setTo }} />
      <div className="card overflow-x-auto">{rows.length === 0 ? <Empty title="No sales in range" /> : (
        <table className="w-full"><thead><tr><th className="th">Invoice</th><th className="th">Date</th><th className="th">Customer</th><th className="th">Pay</th><th className="th text-right">Taxable</th><th className="th text-right">GST</th><th className="th text-right">Total</th></tr></thead>
          <tbody>{rows.map((s) => (<tr key={s.id} className="hover:bg-slate-50"><td className="td font-mono text-xs">{s.invoiceNo}</td><td className="td">{fmtDate(s.date)}</td><td className="td">{s.customerName}</td><td className="td">{s.payMode}</td><td className="td text-right">{inr(s.taxable)}</td><td className="td text-right">{inr(s.gstTotal)}</td><td className="td text-right font-semibold">{inr(s.grandTotal)}</td></tr>))}</tbody></table>
      )}</div>
    </div>
  )
}

export function StockReport() {
  const products = useCollection('products')
  const batches = useCollection('batches')
  const data = products.map((p) => { const stock = productStock(p.id, batches); const value = batches.filter((b) => b.productId === p.id).reduce((s, b) => s + b.qty * b.costPrice, 0); return { ...p, stock, value } })
  return (
    <div>
      <PageHeader title="Stock Report" subtitle="Product-wise stock valuation" actions={<button className="btn-ghost" onClick={() => exportCSV('stock-report', data, [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Product' }, { key: 'stock', label: 'Stock' }, { key: 'reorderLevel', label: 'Reorder' }, { key: 'value', label: 'Value' }])}>⬇ Excel</button>} />
      <div className="card overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Code</th><th className="th">Product</th><th className="th">Group</th><th className="th text-right">Stock</th><th className="th text-right">Reorder</th><th className="th text-right">Value (cost)</th><th className="th">Status</th></tr></thead>
        <tbody>{data.map((p) => (<tr key={p.id} className="hover:bg-slate-50"><td className="td font-mono text-xs">{p.code}</td><td className="td font-medium">{p.name}</td><td className="td">{p.group}</td><td className="td text-right">{p.stock}</td><td className="td text-right">{p.reorderLevel}</td><td className="td text-right">{inr(p.value)}</td><td className="td"><Badge tone={p.stock === 0 ? 'rose' : p.stock <= p.reorderLevel ? 'amber' : 'green'}>{p.stock === 0 ? 'Out' : p.stock <= p.reorderLevel ? 'Low' : 'OK'}</Badge></td></tr>))}</tbody></table></div>
    </div>
  )
}

export function ExpiryReport() {
  const products = useCollection('products')
  const batches = useCollection('batches')
  const [window, setWindow] = useState(90)
  const rows = batches.filter((b) => b.qty > 0 && daysUntil(b.expiryDate) <= window).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
  const pName = (id) => products.find((p) => p.id === id)?.name || 'Unknown'
  const lossValue = rows.filter((b) => daysUntil(b.expiryDate) < 0).reduce((s, b) => s + b.qty * b.costPrice, 0)
  return (
    <div>
      <PageHeader title="Expiry Report" subtitle="Item expiry & batch-wise alerts" actions={<button className="btn-ghost" onClick={() => exportCSV('expiry-report', rows.map((b) => ({ product: pName(b.productId), batch: b.batchNo, expiry: b.expiryDate, qty: b.qty, value: b.qty * b.costPrice })))}>⬇ Excel</button>} />
      <div className="grid sm:grid-cols-3 gap-4 mb-4"><Stat label="Batches Flagged" value={rows.length} tone="amber" icon="⏰" /><Stat label="Already Expired" value={rows.filter((b) => daysUntil(b.expiryDate) < 0).length} tone="rose" icon="⚠️" /><Stat label="Expired Stock Value" value={inr(lossValue)} tone="rose" icon="💸" /></div>
      <Toolbar><span className="text-sm text-slate-500">Window:</span>{[30, 60, 90, 180, 365].map((w) => (<button key={w} className={`btn-sm rounded-lg ${window === w ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setWindow(w)}>{w}d</button>))}</Toolbar>
      <div className="card overflow-x-auto">{rows.length === 0 ? <Empty title="Nothing expiring in window" icon="✅" /> : (
        <table className="w-full"><thead><tr><th className="th">Product</th><th className="th">Batch</th><th className="th">Expiry</th><th className="th text-right">Qty</th><th className="th text-right">Value</th><th className="th">Status</th></tr></thead>
          <tbody>{rows.map((b) => { const d = daysUntil(b.expiryDate); return (<tr key={b.id} className="hover:bg-slate-50"><td className="td font-medium">{pName(b.productId)}</td><td className="td font-mono text-xs">{b.batchNo}</td><td className="td">{fmtDate(b.expiryDate)}</td><td className="td text-right">{b.qty}</td><td className="td text-right">{inr(b.qty * b.costPrice)}</td><td className="td"><Badge tone={d < 0 ? 'rose' : d <= 30 ? 'amber' : 'slate'}>{d < 0 ? 'Expired' : `${d}d`}</Badge></td></tr>) })}</tbody></table>
      )}</div>
    </div>
  )
}

export function GstReport() {
  const sales = useCollection('sales')
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  const rows = sales.filter((s) => inRange(s.date, from, to))
  const summary = useMemo(() => {
    let taxable = 0, cgst = 0, sgst = 0, igst = 0
    rows.forEach((s) => { taxable += Number(s.taxableAfterDisc || s.taxable || 0); if (s.interState) igst += Number(s.igst || 0); else { cgst += Number(s.cgst || 0); sgst += Number(s.sgst || 0) } })
    return { taxable, cgst, sgst, igst, total: cgst + sgst + igst }
  }, [rows])
  return (
    <div>
      <PageHeader title="GST Report (GSTR-1 summary)" subtitle="Output tax liability — outward supplies" actions={<button className="btn-ghost" onClick={() => exportCSV('gst-report', rows.map((s) => ({ invoice: s.invoiceNo, date: s.date, gstin: s.customerGstin, taxable: s.taxableAfterDisc || s.taxable, cgst: s.cgst, sgst: s.sgst, igst: s.interState ? s.igst : 0, total: s.grandTotal })))}>⬇ Excel</button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4"><Stat label="Taxable Value" value={inr(summary.taxable)} icon="🧾" /><Stat label="CGST" value={inr(summary.cgst)} tone="brand" /><Stat label="SGST" value={inr(summary.sgst)} tone="brand" /><Stat label="IGST" value={inr(summary.igst)} tone="green" /></div>
      <DateRange {...{ from, to, setFrom, setTo }} />
      <div className="card overflow-x-auto">{rows.length === 0 ? <Empty title="No invoices in range" /> : (
        <table className="w-full"><thead><tr><th className="th">Invoice</th><th className="th">Date</th><th className="th">GSTIN</th><th className="th text-right">Taxable</th><th className="th text-right">CGST</th><th className="th text-right">SGST</th><th className="th text-right">IGST</th><th className="th text-right">Total</th></tr></thead>
          <tbody>{rows.map((s) => (<tr key={s.id} className="hover:bg-slate-50"><td className="td font-mono text-xs">{s.invoiceNo}</td><td className="td">{fmtDate(s.date)}</td><td className="td font-mono text-xs">{s.customerGstin || 'B2C'}</td><td className="td text-right">{inr(s.taxableAfterDisc || s.taxable)}</td><td className="td text-right">{inr(s.interState ? 0 : s.cgst)}</td><td className="td text-right">{inr(s.interState ? 0 : s.sgst)}</td><td className="td text-right">{inr(s.interState ? s.igst : 0)}</td><td className="td text-right font-semibold">{inr(s.grandTotal)}</td></tr>))}</tbody></table>
      )}</div>
    </div>
  )
}

export function MisReport() {
  const sales = useCollection('sales')
  const purchases = useCollection('purchases')
  const payments = useCollection('payments')
  const batches = useCollection('batches')
  const m = useMemo(() => {
    const grouped = {}
    sales.forEach((s) => { const k = (s.date || '').slice(0, 7); grouped[k] = grouped[k] || { month: k, sales: 0, gst: 0, invoices: 0 }; grouped[k].sales += Number(s.grandTotal || 0); grouped[k].gst += Number(s.gstTotal || 0); grouped[k].invoices++ })
    return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month))
  }, [sales])
  const totalSales = sales.reduce((s, i) => s + Number(i.grandTotal || 0), 0)
  const totalPurch = purchases.reduce((s, p) => s + Number(p.grandTotal || 0), 0)
  const collected = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const stockVal = batches.reduce((s, b) => s + b.qty * b.costPrice, 0)
  const asc = [...m].reverse()
  const salesTrend = asc.map((r) => ({ label: r.month.slice(5), value: Math.round(r.sales) }))
  const purByMonth = useMemo(() => {
    const g = {}; purchases.forEach((p) => { const k = (p.date || '').slice(0, 7); g[k] = (g[k] || 0) + Number(p.grandTotal || 0) })
    return asc.map((r) => ({ label: r.month.slice(5), value: Math.round(g[r.month] || 0) }))
  }, [purchases, m])
  return (
    <div>
      <PageHeader title="Consolidated MIS Report" subtitle="Management information — sales / purchase / collections" actions={<button className="btn-ghost" onClick={() => exportCSV('mis-report', m)}>⬇ Excel</button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Total Sales" value={inr(totalSales)} tone="green" icon="📈" spark={salesTrend.map((s) => s.value)} />
        <Stat label="Total Purchases" value={inr(totalPurch)} tone="amber" icon="📥" spark={purByMonth.map((s) => s.value)} />
        <Stat label="Collections" value={inr(collected)} tone="brand" icon="💰" />
        <Stat label="Stock Value" value={inr(stockVal)} tone="slate" icon="📦" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Sales Trend" subtitle="Monthly revenue"><LineChart data={salesTrend} height={220} color="#10b981" /></ChartCard>
        <ChartCard title="Sales vs Purchases" subtitle="Monthly comparison">
          <BarChart data={salesTrend} height={220} />
        </ChartCard>
      </div>
      <div className="card overflow-x-auto">{m.length === 0 ? <Empty title="No monthly data yet" /> : (
        <table className="w-full"><thead><tr><th className="th">Month</th><th className="th text-right">Invoices</th><th className="th text-right">Sales</th><th className="th text-right">GST</th></tr></thead>
          <tbody>{m.map((r) => (<tr key={r.month} className="hover:bg-slate-50"><td className="td font-medium">{r.month}</td><td className="td text-right">{r.invoices}</td><td className="td text-right font-semibold">{inr(r.sales)}</td><td className="td text-right">{inr(r.gst)}</td></tr>))}</tbody></table>
      )}</div>
    </div>
  )
}
