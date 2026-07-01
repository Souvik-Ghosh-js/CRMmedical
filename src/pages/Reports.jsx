import { useMemo, useState } from 'react'
import { useCollection } from '../lib/hooks'
import { productStock } from '../lib/stock'
import { PageHeader, Toolbar, Empty, Stat, Badge } from '../components/ui'
import { LineChart, BarChart, ChartCard } from '../components/charts'
import { inr, num, fmtDate, daysUntil, exportCSV } from '../lib/format'
import { buildPdf } from '../lib/pdf'
import { useAuth } from '../lib/auth'

/* ─── Shared helpers ─────────────────────────────────────────────────── */
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

function PdfButton({ onClick }) {
  return (
    <button
      className="btn-ghost flex items-center gap-1.5"
      onClick={onClick}
      title="Export as PDF"
    >
      <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10,9 9,9 8,9" />
      </svg>
      PDF
    </button>
  )
}

function dateRangeLabel(from, to) {
  if (!from && !to) return 'All dates'
  if (from && to) return `${fmtDate(from)} – ${fmtDate(to)}`
  if (from) return `From ${fmtDate(from)}`
  return `Until ${fmtDate(to)}`
}

/* ─── Sales Report ──────────────────────────────────────────────────── */
export function SalesReport() {
  const sales = useCollection('sales')
  const { user, company } = useAuth()
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  const rows = sales.filter((s) => inRange(s.date, from, to))
  const total = rows.reduce((s, i) => s + Number(i.grandTotal || 0), 0)
  const tax   = rows.reduce((s, i) => s + Number(i.gstTotal   || 0), 0)
  const taxable = rows.reduce((s, i) => s + Number(i.taxable  || 0), 0)

  const exportPdf = () => {
    const topCustomers = Object.entries(
      rows.reduce((m, s) => { m[s.customerName] = (m[s.customerName] || 0) + Number(s.grandTotal || 0); return m }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5)

    buildPdf({
      title: 'Sales Report',
      subtitle: 'Invoice-level sales summary',
      company: company?.name,
      generatedBy: user?.name,
      dateRange: dateRangeLabel(from, to),
      kpis: [
        { label: 'Total Invoices', value: num(rows.length) },
        { label: 'Taxable Value',  value: inr(taxable) },
        { label: 'GST Collected',  value: inr(tax) },
        { label: 'Net Sales',      value: inr(total) },
      ],
      sections: [
        {
          heading: 'Invoice Detail',
          type: 'table',
          columns: [
            { key: 'invoiceNo',    label: 'Invoice No.' },
            { key: 'date',         label: 'Date',     value: (r) => fmtDate(r.date) },
            { key: 'customerName', label: 'Customer' },
            { key: 'payMode',      label: 'Pay Mode' },
            { key: 'taxable',      label: 'Taxable',  align: 'right', value: (r) => inr(r.taxable) },
            { key: 'gstTotal',     label: 'GST',      align: 'right', value: (r) => inr(r.gstTotal) },
            { key: 'grandTotal',   label: 'Total',    align: 'right', value: (r) => inr(r.grandTotal) },
          ],
          rows,
          totalRow: { invoiceNo: `${rows.length} invoices`, taxable: inr(taxable), gstTotal: inr(tax), grandTotal: inr(total) },
        },
        {
          heading: 'Top 5 Customers by Revenue',
          type: 'table',
          columns: [
            { key: 'name',  label: 'Customer' },
            { key: 'value', label: 'Revenue', align: 'right', value: (r) => inr(r.value) },
          ],
          rows: topCustomers.map(([name, value]) => ({ name, value })),
        },
      ],
    })
  }

  const exportExcel = () => exportCSV('sales-report', rows, [
    { key: 'invoiceNo', label: 'Invoice' }, { key: 'date', label: 'Date' },
    { key: 'customerName', label: 'Customer' }, { key: 'taxable', label: 'Taxable' },
    { key: 'gstTotal', label: 'GST' }, { key: 'grandTotal', label: 'Total' },
  ])

  return (
    <div>
      <PageHeader title="Sales Report" subtitle="Invoice-level sales summary" actions={
        <><button className="btn-ghost" onClick={exportExcel}>⬇ Excel</button><PdfButton onClick={exportPdf} /></>
      } />
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <Stat label="Invoices"     value={num(rows.length)} icon="🧾" />
        <Stat label="Net Sales"    value={inr(total)}       icon="💰" tone="green" />
        <Stat label="GST Collected" value={inr(tax)}        icon="🏛️" tone="brand" />
      </div>
      <DateRange {...{ from, to, setFrom, setTo }} />
      <div className="card overflow-x-auto">{rows.length === 0 ? <Empty title="No sales in range" /> : (
        <table className="w-full">
          <thead><tr>
            <th className="th">Invoice</th><th className="th">Date</th><th className="th">Customer</th>
            <th className="th">Pay</th><th className="th text-right">Taxable</th>
            <th className="th text-right">GST</th><th className="th text-right">Total</th>
          </tr></thead>
          <tbody>{rows.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <td className="td font-mono text-xs">{s.invoiceNo}</td>
              <td className="td">{fmtDate(s.date)}</td>
              <td className="td">{s.customerName}</td>
              <td className="td">{s.payMode}</td>
              <td className="td text-right">{inr(s.taxable)}</td>
              <td className="td text-right">{inr(s.gstTotal)}</td>
              <td className="td text-right font-semibold">{inr(s.grandTotal)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}</div>
    </div>
  )
}

/* ─── Stock Report ───────────────────────────────────────────────────── */
export function StockReport() {
  const products = useCollection('products')
  const batches  = useCollection('batches')
  const { user, company } = useAuth()

  const data = products.map((p) => {
    const stock = productStock(p.id, batches)
    const value = batches.filter((b) => b.productId === p.id).reduce((s, b) => s + b.qty * b.costPrice, 0)
    return { ...p, stock, value }
  })

  const totalValue = data.reduce((s, p) => s + p.value, 0)
  const totalUnits = data.reduce((s, p) => s + p.stock, 0)
  const lowStockCt = data.filter((p) => p.stock <= p.reorderLevel).length
  const outCt      = data.filter((p) => p.stock === 0).length

  const exportPdf = () => buildPdf({
    title: 'Stock Report',
    subtitle: 'Product-wise stock valuation & status',
    company: company?.name,
    generatedBy: user?.name,
    kpis: [
      { label: 'Total SKUs',    value: num(data.length) },
      { label: 'Total Units',   value: num(totalUnits) },
      { label: 'Stock Value',   value: inr(totalValue) },
      { label: 'Low / Out',     value: `${lowStockCt} / ${outCt}` },
    ],
    sections: [
      {
        heading: 'Product-wise Stock',
        type: 'table',
        columns: [
          { key: 'code',         label: 'Code' },
          { key: 'name',         label: 'Product' },
          { key: 'group',        label: 'Group' },
          { key: 'manufacturer', label: 'Manufacturer' },
          { key: 'stock',        label: 'Stock',        align: 'right' },
          { key: 'reorderLevel', label: 'Reorder',      align: 'right' },
          { key: 'value',        label: 'Value (cost)', align: 'right', value: (r) => inr(r.value) },
          { key: '_status',      label: 'Status',       value: (r) => r.stock === 0 ? 'Out of Stock' : r.stock <= r.reorderLevel ? 'Low Stock' : 'OK' },
        ],
        rows: data,
        totalRow: { code: `${data.length} products`, stock: num(totalUnits), value: inr(totalValue) },
      },
      {
        heading: 'Low Stock Items',
        type: 'table',
        columns: [
          { key: 'name',         label: 'Product' },
          { key: 'stock',        label: 'Current Stock', align: 'right' },
          { key: 'reorderLevel', label: 'Reorder Level', align: 'right' },
        ],
        rows: data.filter((p) => p.stock <= p.reorderLevel),
      },
    ],
  })

  return (
    <div>
      <PageHeader title="Stock Report" subtitle="Product-wise stock valuation" actions={
        <>
          <button className="btn-ghost" onClick={() => exportCSV('stock-report', data, [
            { key: 'code', label: 'Code' }, { key: 'name', label: 'Product' },
            { key: 'stock', label: 'Stock' }, { key: 'reorderLevel', label: 'Reorder' },
            { key: 'value', label: 'Value' },
          ])}>⬇ Excel</button>
          <PdfButton onClick={exportPdf} />
        </>
      } />
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="th">Code</th><th className="th">Product</th><th className="th">Group</th>
            <th className="th text-right">Stock</th><th className="th text-right">Reorder</th>
            <th className="th text-right">Value (cost)</th><th className="th">Status</th>
          </tr></thead>
          <tbody>{data.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="td font-mono text-xs">{p.code}</td>
              <td className="td font-medium">{p.name}</td>
              <td className="td">{p.group}</td>
              <td className="td text-right">{p.stock}</td>
              <td className="td text-right">{p.reorderLevel}</td>
              <td className="td text-right">{inr(p.value)}</td>
              <td className="td"><Badge tone={p.stock === 0 ? 'rose' : p.stock <= p.reorderLevel ? 'amber' : 'green'}>{p.stock === 0 ? 'Out' : p.stock <= p.reorderLevel ? 'Low' : 'OK'}</Badge></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Expiry Report ──────────────────────────────────────────────────── */
export function ExpiryReport() {
  const products = useCollection('products')
  const batches  = useCollection('batches')
  const { user, company } = useAuth()
  const [window, setWindow] = useState(90)

  const rows = batches
    .filter((b) => b.qty > 0 && daysUntil(b.expiryDate) <= window)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))

  const pName = (id) => products.find((p) => p.id === id)?.name || 'Unknown'
  const expiredRows = rows.filter((b) => daysUntil(b.expiryDate) < 0)
  const lossValue   = expiredRows.reduce((s, b) => s + b.qty * b.costPrice, 0)

  const exportPdf = () => buildPdf({
    title: 'Expiry Report',
    subtitle: `Batch expiry within ${window} days`,
    company: company?.name,
    generatedBy: user?.name,
    dateRange: `Window: ${window} days from today`,
    kpis: [
      { label: 'Batches Flagged', value: num(rows.length) },
      { label: 'Already Expired', value: num(expiredRows.length) },
      { label: 'Expired Value',   value: inr(lossValue) },
      { label: 'Units at Risk',   value: num(rows.reduce((s, b) => s + b.qty, 0)) },
    ],
    sections: [
      {
        heading: 'Expired Batches (Immediate Action Required)',
        type: 'table',
        columns: [
          { key: '_product',    label: 'Product',   value: (r) => pName(r.productId) },
          { key: 'batchNo',     label: 'Batch No.' },
          { key: 'expiryDate',  label: 'Expiry',    value: (r) => fmtDate(r.expiryDate) },
          { key: 'qty',         label: 'Qty',       align: 'right' },
          { key: '_value',      label: 'Cost Value', align: 'right', value: (r) => inr(r.qty * r.costPrice) },
          { key: '_days',       label: 'Days',      value: (r) => `${daysUntil(r.expiryDate)}d` },
        ],
        rows: expiredRows,
        totalRow: { _product: `${expiredRows.length} batches`, _value: inr(lossValue) },
      },
      {
        heading: 'Expiring Soon',
        type: 'table',
        columns: [
          { key: '_product',    label: 'Product',   value: (r) => pName(r.productId) },
          { key: 'batchNo',     label: 'Batch No.' },
          { key: 'expiryDate',  label: 'Expiry',    value: (r) => fmtDate(r.expiryDate) },
          { key: 'qty',         label: 'Qty',       align: 'right' },
          { key: '_value',      label: 'Value',     align: 'right', value: (r) => inr(r.qty * r.costPrice) },
          { key: '_days',       label: 'Days Left', value: (r) => `${daysUntil(r.expiryDate)}d` },
        ],
        rows: rows.filter((b) => daysUntil(b.expiryDate) >= 0),
      },
    ],
  })

  return (
    <div>
      <PageHeader title="Expiry Report" subtitle="Item expiry & batch-wise alerts" actions={
        <>
          <button className="btn-ghost" onClick={() => exportCSV('expiry-report', rows.map((b) => ({ product: pName(b.productId), batch: b.batchNo, expiry: b.expiryDate, qty: b.qty, value: b.qty * b.costPrice })))}>⬇ Excel</button>
          <PdfButton onClick={exportPdf} />
        </>
      } />
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <Stat label="Batches Flagged" value={rows.length}         tone="amber" icon="⏰" />
        <Stat label="Already Expired" value={expiredRows.length}  tone="rose"  icon="⚠️" />
        <Stat label="Expired Stock Value" value={inr(lossValue)}  tone="rose"  icon="💸" />
      </div>
      <Toolbar>
        <span className="text-sm text-slate-500">Window:</span>
        {[30, 60, 90, 180, 365].map((w) => (
          <button key={w} className={`btn-sm rounded-lg ${window === w ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setWindow(w)}>{w}d</button>
        ))}
      </Toolbar>
      <div className="card overflow-x-auto">{rows.length === 0 ? <Empty title="Nothing expiring in window" icon="✅" /> : (
        <table className="w-full">
          <thead><tr>
            <th className="th">Product</th><th className="th">Batch</th><th className="th">Expiry</th>
            <th className="th text-right">Qty</th><th className="th text-right">Value</th><th className="th">Status</th>
          </tr></thead>
          <tbody>{rows.map((b) => {
            const d = daysUntil(b.expiryDate)
            return (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="td font-medium">{pName(b.productId)}</td>
                <td className="td font-mono text-xs">{b.batchNo}</td>
                <td className="td">{fmtDate(b.expiryDate)}</td>
                <td className="td text-right">{b.qty}</td>
                <td className="td text-right">{inr(b.qty * b.costPrice)}</td>
                <td className="td"><Badge tone={d < 0 ? 'rose' : d <= 30 ? 'amber' : 'slate'}>{d < 0 ? 'Expired' : `${d}d`}</Badge></td>
              </tr>
            )
          })}</tbody>
        </table>
      )}</div>
    </div>
  )
}

/* ─── GST Report ─────────────────────────────────────────────────────── */
export function GstReport() {
  const sales = useCollection('sales')
  const { user, company } = useAuth()
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  const rows = sales.filter((s) => inRange(s.date, from, to))

  const summary = useMemo(() => {
    let taxable = 0, cgst = 0, sgst = 0, igst = 0
    rows.forEach((s) => {
      taxable += Number(s.taxableAfterDisc || s.taxable || 0)
      if (s.interState) igst += Number(s.igst || 0)
      else { cgst += Number(s.cgst || 0); sgst += Number(s.sgst || 0) }
    })
    return { taxable, cgst, sgst, igst, total: cgst + sgst + igst }
  }, [rows])

  // Monthly GST summary for breakdown section
  const monthlyGst = useMemo(() => {
    const m = {}
    rows.forEach((s) => {
      const k = (s.date || '').slice(0, 7)
      if (!m[k]) m[k] = { month: k, taxable: 0, cgst: 0, sgst: 0, igst: 0 }
      m[k].taxable += Number(s.taxableAfterDisc || s.taxable || 0)
      if (s.interState) m[k].igst += Number(s.igst || 0)
      else { m[k].cgst += Number(s.cgst || 0); m[k].sgst += Number(s.sgst || 0) }
    })
    return Object.values(m).sort((a, b) => b.month.localeCompare(a.month))
  }, [rows])

  const exportPdf = () => buildPdf({
    title: 'GST Report (GSTR-1 Summary)',
    subtitle: 'Output tax liability — outward supplies',
    company: company?.name,
    generatedBy: user?.name,
    dateRange: dateRangeLabel(from, to),
    kpis: [
      { label: 'Taxable Value', value: inr(summary.taxable) },
      { label: 'CGST',          value: inr(summary.cgst) },
      { label: 'SGST',          value: inr(summary.sgst) },
      { label: 'IGST',          value: inr(summary.igst) },
      { label: 'Total Tax',     value: inr(summary.total) },
    ],
    sections: [
      {
        heading: 'Monthly GST Summary',
        type: 'table',
        columns: [
          { key: 'month',   label: 'Month' },
          { key: 'taxable', label: 'Taxable Value', align: 'right', value: (r) => inr(r.taxable) },
          { key: 'cgst',    label: 'CGST',          align: 'right', value: (r) => inr(r.cgst) },
          { key: 'sgst',    label: 'SGST',          align: 'right', value: (r) => inr(r.sgst) },
          { key: 'igst',    label: 'IGST',          align: 'right', value: (r) => inr(r.igst) },
          { key: '_total',  label: 'Total Tax',      align: 'right', value: (r) => inr(r.cgst + r.sgst + r.igst) },
        ],
        rows: monthlyGst,
        totalRow: { month: 'GRAND TOTAL', taxable: inr(summary.taxable), cgst: inr(summary.cgst), sgst: inr(summary.sgst), igst: inr(summary.igst), _total: inr(summary.total) },
      },
      {
        heading: 'Invoice-wise Detail (B2B & B2C)',
        type: 'table',
        columns: [
          { key: 'invoiceNo',    label: 'Invoice' },
          { key: 'date',         label: 'Date',    value: (r) => fmtDate(r.date) },
          { key: '_gstin',       label: 'GSTIN',   value: (r) => r.customerGstin || 'B2C' },
          { key: '_taxable',     label: 'Taxable', align: 'right', value: (r) => inr(r.taxableAfterDisc || r.taxable) },
          { key: '_cgst',        label: 'CGST',    align: 'right', value: (r) => inr(r.interState ? 0 : r.cgst) },
          { key: '_sgst',        label: 'SGST',    align: 'right', value: (r) => inr(r.interState ? 0 : r.sgst) },
          { key: '_igst',        label: 'IGST',    align: 'right', value: (r) => inr(r.interState ? r.igst : 0) },
          { key: 'grandTotal',   label: 'Total',   align: 'right', value: (r) => inr(r.grandTotal) },
        ],
        rows,
        totalRow: { invoiceNo: `${rows.length} invoices`, grandTotal: inr(rows.reduce((s, r) => s + Number(r.grandTotal || 0), 0)) },
      },
    ],
  })

  return (
    <div>
      <PageHeader title="GST Report (GSTR-1 summary)" subtitle="Output tax liability — outward supplies" actions={
        <>
          <button className="btn-ghost" onClick={() => exportCSV('gst-report', rows.map((s) => ({ invoice: s.invoiceNo, date: s.date, gstin: s.customerGstin, taxable: s.taxableAfterDisc || s.taxable, cgst: s.cgst, sgst: s.sgst, igst: s.interState ? s.igst : 0, total: s.grandTotal })))}>⬇ Excel</button>
          <PdfButton onClick={exportPdf} />
        </>
      } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Taxable Value" value={inr(summary.taxable)} icon="🧾" />
        <Stat label="CGST" value={inr(summary.cgst)} tone="brand" />
        <Stat label="SGST" value={inr(summary.sgst)} tone="brand" />
        <Stat label="IGST" value={inr(summary.igst)} tone="green" />
      </div>
      <DateRange {...{ from, to, setFrom, setTo }} />
      <div className="card overflow-x-auto">{rows.length === 0 ? <Empty title="No invoices in range" /> : (
        <table className="w-full">
          <thead><tr>
            <th className="th">Invoice</th><th className="th">Date</th><th className="th">GSTIN</th>
            <th className="th text-right">Taxable</th><th className="th text-right">CGST</th>
            <th className="th text-right">SGST</th><th className="th text-right">IGST</th>
            <th className="th text-right">Total</th>
          </tr></thead>
          <tbody>{rows.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <td className="td font-mono text-xs">{s.invoiceNo}</td>
              <td className="td">{fmtDate(s.date)}</td>
              <td className="td font-mono text-xs">{s.customerGstin || 'B2C'}</td>
              <td className="td text-right">{inr(s.taxableAfterDisc || s.taxable)}</td>
              <td className="td text-right">{inr(s.interState ? 0 : s.cgst)}</td>
              <td className="td text-right">{inr(s.interState ? 0 : s.sgst)}</td>
              <td className="td text-right">{inr(s.interState ? s.igst : 0)}</td>
              <td className="td text-right font-semibold">{inr(s.grandTotal)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}</div>
    </div>
  )
}

/* ─── MIS Report ─────────────────────────────────────────────────────── */
export function MisReport() {
  const sales     = useCollection('sales')
  const purchases = useCollection('purchases')
  const payments  = useCollection('payments')
  const batches   = useCollection('batches')
  const { user, company } = useAuth()

  const m = useMemo(() => {
    const grouped = {}
    sales.forEach((s) => {
      const k = (s.date || '').slice(0, 7)
      grouped[k] = grouped[k] || { month: k, sales: 0, gst: 0, invoices: 0 }
      grouped[k].sales += Number(s.grandTotal || 0)
      grouped[k].gst += Number(s.gstTotal || 0)
      grouped[k].invoices++
    })
    return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month))
  }, [sales])

  const totalSales = sales.reduce((s, i) => s + Number(i.grandTotal || 0), 0)
  const totalPurch = purchases.reduce((s, p) => s + Number(p.grandTotal || 0), 0)
  const collected  = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const stockVal   = batches.reduce((s, b) => s + b.qty * b.costPrice, 0)
  const asc        = [...m].reverse()
  const salesTrend = asc.map((r) => ({ label: r.month.slice(5), value: Math.round(r.sales) }))

  const purByMonth = useMemo(() => {
    const g = {}
    purchases.forEach((p) => { const k = (p.date || '').slice(0, 7); g[k] = (g[k] || 0) + Number(p.grandTotal || 0) })
    return asc.map((r) => ({ label: r.month.slice(5), value: Math.round(g[r.month] || 0) }))
  }, [purchases, m])

  const exportPdf = () => {
    // Top 5 customers from sales
    const custMap = {}
    sales.forEach((s) => { custMap[s.customerName] = (custMap[s.customerName] || 0) + Number(s.grandTotal || 0) })
    const topCustomers = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }))

    // Top 5 products from sales
    const prodMap = {}
    sales.forEach((s) => (s.lines || []).forEach((l) => { prodMap[l.name] = (prodMap[l.name] || 0) + (l.lineTaxable || 0) }))
    const topProducts = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }))

    buildPdf({
      title: 'Consolidated MIS Report',
      subtitle: 'Management Information — Sales / Purchase / Collections / Stock',
      company: company?.name,
      generatedBy: user?.name,
      kpis: [
        { label: 'Total Sales',     value: inr(totalSales) },
        { label: 'Total Purchases', value: inr(totalPurch) },
        { label: 'Collections',     value: inr(collected) },
        { label: 'Stock Value',     value: inr(stockVal) },
        { label: 'Gross Margin',    value: `${totalSales > 0 ? ((totalSales - totalPurch) / totalSales * 100).toFixed(1) : 0}%` },
      ],
      sections: [
        {
          heading: 'Monthly Sales Summary',
          type: 'table',
          columns: [
            { key: 'month',    label: 'Month' },
            { key: 'invoices', label: 'Invoices', align: 'right' },
            { key: '_sales',   label: 'Sales',    align: 'right', value: (r) => inr(r.sales) },
            { key: '_gst',     label: 'GST',      align: 'right', value: (r) => inr(r.gst) },
            { key: '_net',     label: 'Net',       align: 'right', value: (r) => inr(r.sales - r.gst) },
          ],
          rows: m,
          totalRow: { month: 'TOTAL', invoices: num(sales.length), _sales: inr(totalSales) },
        },
        {
          heading: 'Top 5 Customers by Revenue',
          type: 'table',
          columns: [
            { key: 'name',  label: 'Customer' },
            { key: 'value', label: 'Revenue',  align: 'right', value: (r) => inr(r.value) },
          ],
          rows: topCustomers,
        },
        {
          heading: 'Top 5 Products by Revenue',
          type: 'table',
          columns: [
            { key: 'name',  label: 'Product' },
            { key: 'value', label: 'Revenue', align: 'right', value: (r) => inr(r.value) },
          ],
          rows: topProducts,
        },
        {
          heading: 'Summary Financials',
          type: 'kv',
          pairs: [
            ['Total Sales',       inr(totalSales)],
            ['Total Purchases',   inr(totalPurch)],
            ['Gross Margin',      inr(totalSales - totalPurch)],
            ['Margin %',          `${totalSales > 0 ? ((totalSales - totalPurch) / totalSales * 100).toFixed(1) : 0}%`],
            ['Collections',       inr(collected)],
            ['Outstanding',       inr(totalSales - collected)],
            ['Stock Value (cost)',inr(stockVal)],
          ],
        },
      ],
    })
  }

  return (
    <div>
      <PageHeader title="Consolidated MIS Report" subtitle="Management information — sales / purchase / collections" actions={
        <>
          <button className="btn-ghost" onClick={() => exportCSV('mis-report', m)}>⬇ Excel</button>
          <PdfButton onClick={exportPdf} />
        </>
      } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Total Sales"     value={inr(totalSales)} tone="green"  icon="📈" spark={salesTrend.map((s) => s.value)} />
        <Stat label="Total Purchases" value={inr(totalPurch)} tone="amber"  icon="📥" spark={purByMonth.map((s) => s.value)} />
        <Stat label="Collections"     value={inr(collected)}  tone="brand"  icon="💰" />
        <Stat label="Stock Value"     value={inr(stockVal)}   tone="slate"  icon="📦" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Sales Trend" subtitle="Monthly revenue"><LineChart data={salesTrend} height={220} color="#10b981" /></ChartCard>
        <ChartCard title="Sales vs Purchases" subtitle="Monthly comparison"><BarChart data={salesTrend} height={220} /></ChartCard>
      </div>
      <div className="card overflow-x-auto">{m.length === 0 ? <Empty title="No monthly data yet" /> : (
        <table className="w-full">
          <thead><tr>
            <th className="th">Month</th><th className="th text-right">Invoices</th>
            <th className="th text-right">Sales</th><th className="th text-right">GST</th>
          </tr></thead>
          <tbody>{m.map((r) => (
            <tr key={r.month} className="hover:bg-slate-50">
              <td className="td font-medium">{r.month}</td>
              <td className="td text-right">{r.invoices}</td>
              <td className="td text-right font-semibold">{inr(r.sales)}</td>
              <td className="td text-right">{inr(r.gst)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}</div>
    </div>
  )
}
