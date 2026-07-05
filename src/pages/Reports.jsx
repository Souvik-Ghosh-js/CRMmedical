import { useMemo, useState } from 'react'
import { useCollection } from '../lib/hooks'
import { productStock } from '../lib/stock'
import { PageHeader, Toolbar, Empty, Stat, Badge } from '../components/ui'
import { LineChart, BarChart, ChartCard, DonutChart } from '../components/charts'
import { inr, num, fmtDate, daysUntil, today, exportCSV } from '../lib/format'
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
const monthKey = (d) => (d || '').slice(0, 7)
// 'YYYY-MM' shifted by n months (n can be negative).
const addMonths = (ymd, n) => {
  const [y, mo] = ymd.split('-').map(Number)
  const d = new Date(y, mo - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const pctDelta = (cur, prev) => (prev ? ((cur - prev) / Math.abs(prev)) * 100 : (cur > 0 ? 100 : 0))

function Delta({ value }) {
  if (value == null || !isFinite(value)) return <span className="text-xs text-slate-400">— no prior data</span>
  const up = value >= 0
  return <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>{up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%</span>
}

// Compact ranked table used by the several "Top N products" widgets in the MIS report.
function MiniTable({ columns, rows, empty = 'No data in range' }) {
  if (!rows.length) return <div className="text-sm text-slate-400 text-center py-6">{empty}</div>
  return (
    <table className="w-full text-sm">
      <thead><tr>{columns.map((c) => <th key={c.label} className={`th ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={r.id || r.productId || i} className="hover:bg-slate-50">
          {columns.map((c) => <td key={c.label} className={`td ${c.align === 'right' ? 'text-right' : ''}`}>{c.value(r)}</td>)}
        </tr>
      ))}</tbody>
    </table>
  )
}

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
  const products  = useCollection('products')
  const vendors   = useCollection('vendors')
  const expenses  = useCollection('expenses')
  const { user, company } = useAuth()
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  const [cmpAFrom, setCmpAFrom] = useState(''), [cmpATo, setCmpATo] = useState('')
  const [cmpBFrom, setCmpBFrom] = useState(''), [cmpBTo, setCmpBTo] = useState('')

  const pCost = (id) => Number(products.find((p) => p.id === id)?.purchasePrice || 0)
  // Period-scoped rows — respects the date filter above (empty = all time, same as before this filter existed).
  const rows      = useMemo(() => sales.filter((s) => inRange(s.date, from, to)), [sales, from, to])
  const purchRows = useMemo(() => purchases.filter((p) => inRange(p.date, from, to)), [purchases, from, to])
  const payRows   = useMemo(() => payments.filter((p) => inRange(p.date, from, to)), [payments, from, to])
  const expRows   = useMemo(() => expenses.filter((e) => inRange(e.date, from, to)), [expenses, from, to])

  const totalSales = rows.reduce((s, i) => s + Number(i.grandTotal || 0), 0)
  const totalPurch = purchRows.reduce((s, p) => s + Number(p.grandTotal || 0), 0)
  const collected  = payRows.reduce((s, p) => s + Number(p.amount || 0), 0)
  const stockVal   = batches.reduce((s, b) => s + b.qty * b.costPrice, 0) // current snapshot, unaffected by date filter

  /* ── Monthly history (always full history — powers trend/growth/forecast, independent of the filter) ── */
  const firstPurchaseMonth = useMemo(() => {
    const map = {}
    sales.forEach((s) => { const k = monthKey(s.date); if (!map[s.customerId] || k < map[s.customerId]) map[s.customerId] = k })
    return map
  }, [sales])

  const m = useMemo(() => {
    const grouped = {}
    sales.forEach((s) => {
      const k = monthKey(s.date)
      grouped[k] = grouped[k] || { month: k, sales: 0, gst: 0, invoices: 0, cogs: 0, custSeen: new Set() }
      grouped[k].sales += Number(s.grandTotal || 0)
      grouped[k].gst += Number(s.gstTotal || 0)
      grouped[k].invoices++
      grouped[k].custSeen.add(s.customerId)
      ;(s.lines || []).forEach((l) => { grouped[k].cogs += Number(l.qty || 0) * pCost(l.productId) })
    })
    return Object.values(grouped).map((g) => {
      const newCust = [...g.custSeen].filter((cid) => firstPurchaseMonth[cid] === g.month).length
      return {
        month: g.month, sales: g.sales, gst: g.gst, invoices: g.invoices,
        cogs: Math.round(g.cogs), profit: Math.round(g.sales - g.gst - g.cogs),
        customers: g.custSeen.size, newCustomers: newCust, repeatCustomers: g.custSeen.size - newCust,
      }
    }).sort((a, b) => b.month.localeCompare(a.month))
  }, [sales, firstPurchaseMonth, products])

  const purchMonthly = useMemo(() => {
    const g = {}
    purchases.forEach((p) => { const k = monthKey(p.date); g[k] = (g[k] || 0) + Number(p.grandTotal || 0) })
    return g
  }, [purchases])

  const asc = [...m].reverse()
  const salesTrend = asc.map((r) => ({ label: r.month.slice(5), value: Math.round(r.sales) }))
  const purByMonth = asc.map((r) => ({ label: r.month.slice(5), value: Math.round(purchMonthly[r.month] || 0) }))
  const aovTrend = asc.map((r) => ({ label: r.month.slice(5), value: r.invoices ? Math.round(r.sales / r.invoices) : 0 }))
  const retentionTrend = asc.map((r) => ({ label: r.month.slice(5), value: (r.newCustomers + r.repeatCustomers) ? Math.round((r.repeatCustomers / (r.newCustomers + r.repeatCustomers)) * 100) : 0 }))

  /* ── Customer analysis ── */
  const aov = rows.length ? totalSales / rows.length : 0
  const latestMonth = m[0], prevMonthRow = m[1]
  const retentionRate = latestMonth && (latestMonth.newCustomers + latestMonth.repeatCustomers)
    ? Math.round((latestMonth.repeatCustomers / (latestMonth.newCustomers + latestMonth.repeatCustomers)) * 100) : 0
  const retentionPrev = prevMonthRow && (prevMonthRow.newCustomers + prevMonthRow.repeatCustomers)
    ? Math.round((prevMonthRow.repeatCustomers / (prevMonthRow.newCustomers + prevMonthRow.repeatCustomers)) * 100) : null

  /* ── Product-level analytics (respects the date filter) ── */
  const productAgg = useMemo(() => {
    const map = {}
    rows.forEach((s) => (s.lines || []).forEach((l) => {
      map[l.productId] = map[l.productId] || { productId: l.productId, name: l.name, qty: 0, revenue: 0, discAmt: 0, cost: 0 }
      const p = map[l.productId]
      p.qty += Number(l.qty || 0)
      p.revenue += Number(l.lineTaxable || 0)
      p.discAmt += Number(l.disc || 0)
      p.cost += Number(l.qty || 0) * pCost(l.productId)
    }))
    return Object.values(map).map((p) => ({ ...p, profit: Math.round(p.revenue - p.cost) }))
  }, [rows, products])

  const topSelling = useMemo(() => [...productAgg].sort((a, b) => b.revenue - a.revenue).slice(0, 10), [productAgg])
  const leastSelling = useMemo(() => productAgg.filter((p) => p.qty > 0).sort((a, b) => a.qty - b.qty).slice(0, 10), [productAgg])
  const highestProfit = useMemo(() => [...productAgg].sort((a, b) => b.profit - a.profit).slice(0, 10), [productAgg])
  const highestDiscount = useMemo(() => productAgg.filter((p) => p.discAmt > 0).sort((a, b) => b.discAmt - a.discAmt).slice(0, 10), [productAgg])
  const productTable = useMemo(() => [...productAgg].sort((a, b) => b.revenue - a.revenue).slice(0, 20), [productAgg])

  const returnedAgg = useMemo(() => {
    const map = {}
    rows.filter((s) => s.status === 'Returned').forEach((s) => (s.lines || []).forEach((l) => {
      map[l.productId] = map[l.productId] || { productId: l.productId, name: l.name, qty: 0, value: 0 }
      map[l.productId].qty += Number(l.qty || 0)
      map[l.productId].value += Number(l.lineTaxable || 0) + Number(l.gstAmt || 0)
    }))
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10)
  }, [rows])

  /* ── Inventory & operational analytics ── */
  const lowStock = useMemo(() => products
    .map((p) => ({ ...p, stock: productStock(p.id, batches) }))
    .filter((p) => p.stock <= p.reorderLevel)
    .sort((a, b) => a.stock - b.stock), [products, batches])

  const expiringSoon = useMemo(() => batches
    .filter((b) => b.qty > 0 && daysUntil(b.expiryDate) <= 90)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
    .slice(0, 10), [batches])

  const deadStock = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90)
    const soldRecently = new Set()
    sales.forEach((s) => { if (new Date(s.date) >= cutoff) (s.lines || []).forEach((l) => soldRecently.add(l.productId)) })
    return products
      .map((p) => ({ ...p, stock: productStock(p.id, batches) }))
      .filter((p) => p.stock > 0 && !soldRecently.has(p.id))
      .map((p) => ({ ...p, value: batches.filter((b) => b.productId === p.id).reduce((s, b) => s + b.qty * b.costPrice, 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [sales, products, batches])

  /* ── GST & payment mode analytics (respects the date filter) ── */
  const gstCollected = rows.reduce((s, i) => s + Number(i.gstTotal || 0), 0)
  const gstPaid = purchRows.reduce((s, p) => s + Number(p.gst || 0), 0)
  const gstTaxableBase = rows.reduce((s, i) => s + Number(i.taxable || 0), 0)
  const effectiveGstPct = gstTaxableBase ? (gstCollected / gstTaxableBase) * 100 : 0

  const gstSlabs = useMemo(() => {
    const slabKeys = [5, 12, 18, 28, 'Other']
    const acc = Object.fromEntries(slabKeys.map((k) => [k, { taxable: 0, tax: 0 }]))
    rows.forEach((s) => (s.lines || []).forEach((l) => {
      const key = [5, 12, 18, 28].includes(Number(l.gst)) ? Number(l.gst) : 'Other'
      acc[key].taxable += Number(l.lineTaxable || 0)
      acc[key].tax += Number(l.gstAmt || 0)
    }))
    return slabKeys.map((k) => ({ slab: k === 'Other' ? 'Other' : `${k}%`, taxable: acc[k].taxable, tax: acc[k].tax })).filter((r) => r.taxable > 0)
  }, [rows])

  const paymentModeData = useMemo(() => {
    const map = {}
    rows.forEach((s) => { map[s.payMode] = (map[s.payMode] || 0) + Number(s.grandTotal || 0) })
    return Object.entries(map).map(([label, value]) => ({ label, value }))
  }, [rows])

  /* ── Enhanced financial insights ── */
  const cogsOfSales = rows.reduce((s, inv) => s + (inv.lines || []).reduce((s2, l) => s2 + Number(l.qty || 0) * pCost(l.productId), 0), 0)
  const revenueExGst = rows.reduce((s, i) => s + Number(i.taxableAfterDisc ?? i.taxable ?? 0), 0)
  const grossProfit = revenueExGst - cogsOfSales
  const grossMarginPct = revenueExGst ? (grossProfit / revenueExGst) * 100 : 0

  const expenseByCat = useMemo(() => {
    const map = {}
    expRows.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0) })
    return Object.entries(map).map(([label, value]) => ({ label, value }))
  }, [expRows])
  const totalExpenses = expenseByCat.reduce((s, e) => s + e.value, 0)
  const netProfitAfterOpex = grossProfit - totalExpenses

  const arAging = useMemo(() => {
    const buckets = { '0-30d': 0, '31-60d': 0, '61-90d': 0, '90d+': 0 }
    sales.filter((s) => s.payMode === 'Credit' && ['Pending', 'Payment Issue'].includes(s.status)).forEach((s) => {
      const age = Math.max(0, Math.round((Date.now() - new Date(s.date)) / 86400000))
      const bucket = age <= 30 ? '0-30d' : age <= 60 ? '31-60d' : age <= 90 ? '61-90d' : '90d+'
      buckets[bucket] += Number(s.grandTotal || 0)
    })
    return Object.entries(buckets).map(([label, value]) => ({ label, value }))
  }, [sales])
  const totalAR = arAging.reduce((s, b) => s + b.value, 0)
  const totalPayable = vendors.reduce((s, v) => s + Number(v.balance || 0), 0)
  const topPayableVendors = useMemo(() => [...vendors].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0)).slice(0, 5), [vendors])

  /* ── Monthly growth & comparisons (always full history) ── */
  const thisMonthKey = monthKey(today())
  const lastMonthKey = addMonths(thisMonthKey, -1)
  const sameMonthLastYearKey = addMonths(thisMonthKey, -12)
  const findM = (k) => m.find((x) => x.month === k)
  const curM = findM(thisMonthKey), prevM = findM(lastMonthKey), sameLYM = findM(sameMonthLastYearKey)
  const growth = {
    sales: prevM ? pctDelta(curM?.sales || 0, prevM.sales) : null,
    profit: prevM ? pctDelta(curM?.profit || 0, prevM.profit) : null,
    purchases: (purchMonthly[lastMonthKey] != null) ? pctDelta(purchMonthly[thisMonthKey] || 0, purchMonthly[lastMonthKey]) : null,
    customers: prevM ? pctDelta(curM?.customers || 0, prevM.customers) : null,
  }

  const periodSum = (f, t) => {
    const rs = sales.filter((s) => inRange(s.date, f, t))
    return { sales: rs.reduce((s, i) => s + Number(i.grandTotal || 0), 0), invoices: rs.length }
  }
  const cmpA = periodSum(cmpAFrom, cmpATo)
  const cmpB = periodSum(cmpBFrom, cmpBTo)
  const customRangeReady = (cmpAFrom || cmpATo) && (cmpBFrom || cmpBTo)

  /* ── Simple run-rate forecast (no ML — just month-to-date × remaining-days factor) ── */
  const forecast = useMemo(() => {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dayOfMonth = now.getDate()
    const factor = daysInMonth / Math.max(1, dayOfMonth)
    const mtd = sales.filter((s) => monthKey(s.date) === thisMonthKey)
    const mtdSales = mtd.reduce((s, i) => s + Number(i.grandTotal || 0), 0)
    const mtdGst = mtd.reduce((s, i) => s + Number(i.gstTotal || 0), 0)
    const mtdPurch = purchMonthly[thisMonthKey] || 0
    const mtdCogs = curM?.cogs || 0
    return {
      dayOfMonth, daysInMonth,
      projSales: Math.round(mtdSales * factor),
      projGst: Math.round(mtdGst * factor),
      projPurch: Math.round(mtdPurch * factor),
      projProfit: Math.round((mtdSales - mtdGst - mtdCogs) * factor),
    }
  }, [sales, purchMonthly, curM, thisMonthKey])

  const exportPdf = () => {
    const custMap = {}
    rows.forEach((s) => { custMap[s.customerName] = (custMap[s.customerName] || 0) + Number(s.grandTotal || 0) })
    const topCustomers = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }))

    buildPdf({
      title: 'Consolidated MIS Report',
      subtitle: 'Management Information — Sales / Purchase / Collections / Stock / Profitability',
      company: company?.name,
      generatedBy: user?.name,
      dateRange: dateRangeLabel(from, to),
      kpis: [
        { label: 'Total Sales',     value: inr(totalSales) },
        { label: 'Total Purchases', value: inr(totalPurch) },
        { label: 'Collections',     value: inr(collected) },
        { label: 'Stock Value',     value: inr(stockVal) },
        { label: 'Gross Margin',    value: `${grossMarginPct.toFixed(1)}%` },
        { label: 'Avg. Order Value', value: inr(aov) },
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
            { key: '_cogs',    label: 'COGS',     align: 'right', value: (r) => inr(r.cogs) },
            { key: '_profit',  label: 'Profit',   align: 'right', value: (r) => inr(r.profit) },
          ],
          rows: m,
          totalRow: { month: 'TOTAL', invoices: num(sales.length), _sales: inr(totalSales) },
        },
        { heading: 'Top 5 Customers by Revenue', type: 'table',
          columns: [{ key: 'name', label: 'Customer' }, { key: 'value', label: 'Revenue', align: 'right', value: (r) => inr(r.value) }], rows: topCustomers },
        { heading: 'Top 10 Selling Medicines', type: 'table',
          columns: [{ key: 'name', label: 'Product' }, { key: 'qty', label: 'Qty', align: 'right' }, { key: 'revenue', label: 'Revenue', align: 'right', value: (r) => inr(r.revenue) }], rows: topSelling },
        { heading: 'Highest Profit Medicines', type: 'table',
          columns: [{ key: 'name', label: 'Product' }, { key: 'profit', label: 'Profit', align: 'right', value: (r) => inr(r.profit) }], rows: highestProfit },
        { heading: 'Most Returned Medicines', type: 'table',
          columns: [{ key: 'name', label: 'Product' }, { key: 'qty', label: 'Qty Returned', align: 'right' }, { key: 'value', label: 'Value', align: 'right', value: (r) => inr(r.value) }], rows: returnedAgg },
        { heading: 'Accounts Receivable Aging', type: 'table',
          columns: [{ key: 'label', label: 'Bucket' }, { key: 'value', label: 'Outstanding', align: 'right', value: (r) => inr(r.value) }], rows: arAging,
          totalRow: { label: 'TOTAL OUTSTANDING', value: inr(totalAR) } },
        { heading: 'Expense Breakdown', type: 'table',
          columns: [{ key: 'label', label: 'Category' }, { key: 'value', label: 'Amount', align: 'right', value: (r) => inr(r.value) }], rows: expenseByCat,
          totalRow: { label: 'TOTAL', value: inr(totalExpenses) } },
        {
          heading: 'Summary Financials',
          type: 'kv',
          pairs: [
            ['Total Sales',        inr(totalSales)],
            ['Total Purchases',    inr(totalPurch)],
            ['Gross Profit (COGS-based)', inr(grossProfit)],
            ['Gross Margin %',     `${grossMarginPct.toFixed(1)}%`],
            ['Operating Expenses', inr(totalExpenses)],
            ['Net Profit (after opex)', inr(netProfitAfterOpex)],
            ['Collections',        inr(collected)],
            ['Accounts Receivable',inr(totalAR)],
            ['Accounts Payable',   inr(totalPayable)],
            ['Stock Value (cost)', inr(stockVal)],
            ['GST Collected',      inr(gstCollected)],
            ['GST Paid',           inr(gstPaid)],
            ['Effective GST %',    `${effectiveGstPct.toFixed(1)}%`],
          ],
        },
      ],
    })
  }

  return (
    <div>
      <PageHeader title="Consolidated MIS Report" subtitle="Management information — sales / purchase / collections / profitability" actions={
        <>
          <button className="btn-ghost" onClick={() => exportCSV('mis-report', m)}>⬇ Excel</button>
          <PdfButton onClick={exportPdf} />
        </>
      } />

      <DateRange {...{ from, to, setFrom, setTo }} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Total Sales"     value={inr(totalSales)} tone="green"  icon="📈" spark={salesTrend.map((s) => s.value)} />
        <Stat label="Total Purchases" value={inr(totalPurch)} tone="amber"  icon="📥" spark={purByMonth.map((s) => s.value)} />
        <Stat label="Collections"     value={inr(collected)}  tone="brand"  icon="💰" />
        <Stat label="Stock Value"     value={inr(stockVal)}   tone="slate"  icon="📦" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Gross Profit Margin" value={`${grossMarginPct.toFixed(1)}%`} sub={inr(grossProfit)} tone="green" icon="💹" />
        <Stat label="Avg. Order Value" value={inr(aov)} tone="brand" icon="🧾" spark={aovTrend.map((s) => s.value)} />
        <Stat label="Customer Retention" value={`${retentionRate}%`} sub={retentionPrev != null ? `${retentionRate >= retentionPrev ? '▲' : '▼'} ${Math.abs(retentionRate - retentionPrev)} pts vs last month` : 'Repeat customers, latest month'} tone="blue" icon="🤝" />
        <Stat label="Receivables Outstanding" value={inr(totalAR)} sub={`Payables ${inr(totalPayable)}`} tone="amber" icon="⏳" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Sales Trend" subtitle="Monthly revenue"><LineChart data={salesTrend} height={220} color="#10b981" /></ChartCard>
        <ChartCard title="Sales vs Purchases" subtitle="Monthly comparison"><BarChart data={salesTrend} height={220} /></ChartCard>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Average Order Value" subtitle="Monthly trend — are baskets growing?"><LineChart data={aovTrend} height={200} color="#4f46e5" /></ChartCard>
        <ChartCard title="Customer Retention Rate" subtitle="% of repeat vs new customers, by month"><LineChart data={retentionTrend} height={200} color="#0ea5e9" valueFmt={(v) => `${Math.round(v)}%`} /></ChartCard>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Payment Mode Analysis" subtitle="Revenue share by payment mode (selected period)">
          {paymentModeData.length ? <DonutChart data={paymentModeData} centerValue={inr(totalSales)} centerLabel="total" /> : <Empty title="No sales in range" />}
        </ChartCard>
        <ChartCard title="GST Slab Analysis" subtitle="Taxable value by GST slab (selected period)">
          {gstSlabs.length ? <DonutChart data={gstSlabs.map((s) => ({ label: s.slab, value: s.taxable }))} centerValue={`${effectiveGstPct.toFixed(1)}%`} centerLabel="effective GST" /> : <Empty title="No sales in range" />}
        </ChartCard>
      </div>

      {/* Monthly growth */}
      <ChartCard title="Monthly Growth" subtitle={`${thisMonthKey} vs ${lastMonthKey} (prior calendar month)`} className="mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GrowthTile label="Sales Growth" value={inr(curM?.sales || 0)} delta={growth.sales} />
          <GrowthTile label="Profit Growth" value={inr(curM?.profit || 0)} delta={growth.profit} />
          <GrowthTile label="Purchase Growth" value={inr(purchMonthly[thisMonthKey] || 0)} delta={growth.purchases} />
          <GrowthTile label="Customer Growth" value={num(curM?.customers || 0)} delta={growth.customers} />
        </div>
      </ChartCard>

      {/* Comparison section */}
      <ChartCard title="Comparison" subtitle="This month vs last month vs same month last year" className="mb-4">
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <CompareCard label="This Month" value={inr(curM?.sales || 0)} />
          <CompareCard label="Last Month" value={inr(prevM?.sales || 0)} delta={curM && prevM ? pctDelta(curM.sales, prevM.sales) : null} />
          <CompareCard label="Same Month Last Year" value={inr(sameLYM?.sales || 0)} delta={curM && sameLYM ? pctDelta(curM.sales, sameLYM.sales) : null} />
        </div>
        <div className="border-t border-slate-100 pt-3">
          <div className="text-sm font-medium text-slate-600 mb-2">Custom range comparison</div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-slate-400 w-16">Period A</span>
            <input type="date" className="input max-w-[150px]" value={cmpAFrom} onChange={(e) => setCmpAFrom(e.target.value)} />
            <span className="text-slate-400">to</span>
            <input type="date" className="input max-w-[150px]" value={cmpATo} onChange={(e) => setCmpATo(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-slate-400 w-16">Period B</span>
            <input type="date" className="input max-w-[150px]" value={cmpBFrom} onChange={(e) => setCmpBFrom(e.target.value)} />
            <span className="text-slate-400">to</span>
            <input type="date" className="input max-w-[150px]" value={cmpBTo} onChange={(e) => setCmpBTo(e.target.value)} />
          </div>
          {customRangeReady ? (
            <div className="grid sm:grid-cols-3 gap-4">
              <CompareCard label="Period A Sales" value={inr(cmpA.sales)} sub={`${cmpA.invoices} invoices`} />
              <CompareCard label="Period B Sales" value={inr(cmpB.sales)} sub={`${cmpB.invoices} invoices`} />
              <CompareCard label="B vs A" value={<Delta value={pctDelta(cmpB.sales, cmpA.sales)} />} />
            </div>
          ) : <div className="text-xs text-slate-400">Pick both periods to compare.</div>}
        </div>
      </ChartCard>

      {/* Forecast */}
      <ChartCard title="Forecast (Simple Run-Rate)" subtitle={`Projected from day ${forecast.dayOfMonth} of ${forecast.daysInMonth} this month · no AI, just current trend`} className="mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Projected Month-End Sales" value={inr(forecast.projSales)} tone="brand" />
          <Kpi label="Expected GST" value={inr(forecast.projGst)} tone="slate" />
          <Kpi label="Expected Purchases" value={inr(forecast.projPurch)} tone="amber" />
          <Kpi label="Expected Profit" value={inr(forecast.projProfit)} tone="green" />
        </div>
      </ChartCard>

      {/* Inventory & operational analytics */}
      <ChartCard title="Top-Selling Products" subtitle="By revenue, selected period" className="mb-4">
        <BarChart data={topSelling.slice(0, 10).map((p) => ({ label: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name, value: Math.round(p.revenue) }))} horizontal height={260} />
      </ChartCard>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Low Stock Alerts" subtitle="At or below reorder level">
          <MiniTable
            empty="No items below reorder level"
            rows={lowStock.slice(0, 10)}
            columns={[
              { label: 'Product', value: (r) => r.name },
              { label: 'Stock', align: 'right', value: (r) => r.stock },
              { label: 'Reorder', align: 'right', value: (r) => r.reorderLevel },
              { label: 'Status', value: (r) => <Badge tone={r.stock === 0 ? 'rose' : 'amber'}>{r.stock === 0 ? 'Out' : 'Low'}</Badge> },
            ]}
          />
        </ChartCard>
        <ChartCard title="Expiring Soon" subtitle="Batches expiring within 90 days">
          <MiniTable
            empty="Nothing expiring soon"
            rows={expiringSoon}
            columns={[
              { label: 'Product', value: (r) => products.find((p) => p.id === r.productId)?.name || 'Unknown' },
              { label: 'Batch', value: (r) => r.batchNo },
              { label: 'Qty', align: 'right', value: (r) => r.qty },
              { label: 'Expiry', value: (r) => <Badge tone={daysUntil(r.expiryDate) < 0 ? 'rose' : daysUntil(r.expiryDate) <= 30 ? 'amber' : 'slate'}>{daysUntil(r.expiryDate) < 0 ? 'Expired' : `${daysUntil(r.expiryDate)}d`}</Badge> },
            ]}
          />
        </ChartCard>
      </div>
      <ChartCard title="Dead Stock / Slow-Moving Items" subtitle="In stock, but not sold in the last 90 days — capital tied up" className="mb-4">
        <MiniTable
          empty="No dead stock — everything in stock has moved recently"
          rows={deadStock}
          columns={[
            { label: 'Product', value: (r) => r.name },
            { label: 'Stock', align: 'right', value: (r) => r.stock },
            { label: 'Value (cost)', align: 'right', value: (r) => inr(r.value) },
          ]}
        />
      </ChartCard>

      {/* Product analytics */}
      <ChartCard title="Product Analytics" subtitle="Top 20 by revenue, selected period" className="mb-4">
        <MiniTable
          rows={productTable}
          columns={[
            { label: 'Product', value: (r) => r.name },
            { label: 'Qty', align: 'right', value: (r) => r.qty },
            { label: 'Revenue', align: 'right', value: (r) => inr(r.revenue) },
            { label: 'Profit', align: 'right', value: (r) => inr(r.profit) },
          ]}
        />
      </ChartCard>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Top 10 Selling Medicines" subtitle="By revenue">
          <MiniTable rows={topSelling} columns={[{ label: 'Product', value: (r) => r.name }, { label: 'Qty', align: 'right', value: (r) => r.qty }, { label: 'Revenue', align: 'right', value: (r) => inr(r.revenue) }]} />
        </ChartCard>
        <ChartCard title="Least Selling Medicines" subtitle="Sold, but low volume">
          <MiniTable rows={leastSelling} columns={[{ label: 'Product', value: (r) => r.name }, { label: 'Qty', align: 'right', value: (r) => r.qty }, { label: 'Revenue', align: 'right', value: (r) => inr(r.revenue) }]} />
        </ChartCard>
        <ChartCard title="Highest Profit Medicines" subtitle="By gross profit">
          <MiniTable rows={highestProfit} columns={[{ label: 'Product', value: (r) => r.name }, { label: 'Profit', align: 'right', value: (r) => inr(r.profit) }]} />
        </ChartCard>
        <ChartCard title="Most Returned Medicines" subtitle="From invoices marked Returned">
          <MiniTable empty="No returns in range" rows={returnedAgg} columns={[{ label: 'Product', value: (r) => r.name }, { label: 'Qty Returned', align: 'right', value: (r) => r.qty }, { label: 'Value', align: 'right', value: (r) => inr(r.value) }]} />
        </ChartCard>
        <ChartCard title="Highest Discount Medicines" subtitle="Most margin given away">
          <MiniTable empty="No discounts given in range" rows={highestDiscount} columns={[{ label: 'Product', value: (r) => r.name }, { label: 'Discount Given', align: 'right', value: (r) => inr(r.discAmt) }]} />
        </ChartCard>
      </div>

      {/* Enhanced financial insights */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Accounts Receivable Aging" subtitle="Outstanding credit invoices (Pending / Payment Issue)">
          <BarChart data={arAging} height={200} />
          <div className="text-right text-sm font-semibold text-slate-700 mt-2">Total outstanding: {inr(totalAR)}</div>
        </ChartCard>
        <ChartCard title="Accounts Payable" subtitle="Vendor balances (no due-date data to age)">
          <MiniTable rows={topPayableVendors} columns={[{ label: 'Vendor', value: (r) => r.name }, { label: 'Balance', align: 'right', value: (r) => inr(r.balance) }]} />
          <div className="text-right text-sm font-semibold text-slate-700 mt-2">Total payable: {inr(totalPayable)}</div>
        </ChartCard>
      </div>
      <ChartCard title="Expense Breakdown" subtitle="Operating expenses by category, selected period" className="mb-4">
        <div className="grid lg:grid-cols-2 gap-4 items-center">
          {expenseByCat.length ? <DonutChart data={expenseByCat} centerValue={inr(totalExpenses)} centerLabel="total opex" /> : <Empty title="No expenses in range" />}
          <MiniTable rows={expenseByCat} columns={[{ label: 'Category', value: (r) => r.label }, { label: 'Amount', align: 'right', value: (r) => inr(r.value) }]} />
        </div>
        <div className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-100">Net profit after opex: <b className={netProfitAfterOpex >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{inr(netProfitAfterOpex)}</b></div>
      </ChartCard>

      {/* GST analytics */}
      <ChartCard title="GST Analytics" subtitle="Output vs input tax, selected period" className="mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Kpi label="GST Collected" value={inr(gstCollected)} tone="brand" />
          <Kpi label="GST Paid" value={inr(gstPaid)} tone="amber" />
          <Kpi label="Net GST Liability" value={inr(gstCollected - gstPaid)} tone="slate" />
          <Kpi label="Effective GST %" value={`${effectiveGstPct.toFixed(1)}%`} tone="green" />
        </div>
        <MiniTable empty="No sales in range" rows={gstSlabs} columns={[
          { label: 'GST Slab', value: (r) => r.slab },
          { label: 'Taxable Value', align: 'right', value: (r) => inr(r.taxable) },
          { label: 'Tax Collected', align: 'right', value: (r) => inr(r.tax) },
        ]} />
      </ChartCard>

      <div className="card overflow-x-auto">{m.length === 0 ? <Empty title="No monthly data yet" /> : (
        <table className="w-full">
          <thead><tr>
            <th className="th">Month</th><th className="th text-right">Invoices</th>
            <th className="th text-right">Sales</th><th className="th text-right">GST</th>
            <th className="th text-right">COGS</th><th className="th text-right">Profit</th>
          </tr></thead>
          <tbody>{m.map((r) => (
            <tr key={r.month} className="hover:bg-slate-50">
              <td className="td font-medium">{r.month}</td>
              <td className="td text-right">{r.invoices}</td>
              <td className="td text-right font-semibold">{inr(r.sales)}</td>
              <td className="td text-right">{inr(r.gst)}</td>
              <td className="td text-right">{inr(r.cogs)}</td>
              <td className="td text-right">{inr(r.profit)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}</div>
    </div>
  )
}

function GrowthTile({ label, value, delta }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold text-slate-800 mt-0.5">{value}</div>
      <div className="mt-1"><Delta value={delta} /></div>
    </div>
  )
}

function CompareCard({ label, value, delta, sub }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold text-slate-800 mt-0.5">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      {delta != null && <div className="mt-1"><Delta value={delta} /></div>}
    </div>
  )
}

function Kpi({ label, value, tone }) {
  const tones = { brand: 'text-brand-700', green: 'text-emerald-700', amber: 'text-amber-700', slate: 'text-slate-700', rose: 'text-rose-700' }
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${tones[tone] || tones.slate}`}>{value}</div>
    </div>
  )
}
