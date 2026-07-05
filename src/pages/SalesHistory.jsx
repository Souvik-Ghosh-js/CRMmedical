import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useCollection } from '../lib/hooks'
import * as db from '../lib/db'
import { restoreAllocations } from '../lib/stock'
import { logAudit } from '../lib/audit'
import { PageHeader, Toolbar, Modal, Empty, Badge } from '../components/ui'
import InvoicePrint from '../components/InvoicePrint'
import InvoiceEdit from '../components/InvoiceEdit'
import { Pagination, usePagination } from '../components/Pagination'
import { inr, num, fmtDate, today, daysUntil, exportCSV } from '../lib/format'
import { buildPdf } from '../lib/pdf'
import { useAuth } from '../lib/auth'

const STATUS_OPTIONS = ['Pending', 'Settled', 'Cancelled', 'Returned', 'Payment Issue']
const STATUS_TEXT_CLASS = { Pending: 'text-amber-700', Settled: 'text-emerald-700', Cancelled: 'text-slate-500', Returned: 'text-sky-700', 'Payment Issue': 'text-rose-700' }
const OUTSTANDING_STATUSES = ['Pending', 'Payment Issue']
// Cancelled and payment-issue invoices never realized as sales — keep them out of the sold totals.
const EXCLUDED_FROM_TOTALS = ['Cancelled', 'Payment Issue']

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

export default function SalesHistory() {
  const sales = useCollection('sales')
  const { user, company } = useAuth()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [view, setView] = useState(null)
  const [edit, setEdit] = useState(null)

  useEffect(() => {
    const open = params.get('open')
    if (open) { const inv = db.get('sales', open); if (inv) setView(inv) }
  }, []) // eslint-disable-line

  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return sales.filter((inv) => {
      const d = (inv.date || '').slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      if (statusFilter && (inv.status || 'Settled') !== statusFilter) return false
      return !s || inv.invoiceNo.toLowerCase().includes(s) || (inv.customerName || '').toLowerCase().includes(s)
    })
  }, [sales, q, from, to, statusFilter])
  const pg = usePagination(filtered, 10)

  const sold = useMemo(() => filtered.filter((i) => !EXCLUDED_FROM_TOTALS.includes(i.status || 'Settled')), [filtered])
  const total = sold.reduce((s, i) => s + Number(i.grandTotal || 0), 0)
  const taxable = sold.reduce((s, i) => s + Number(i.taxable || 0), 0)
  const gst = sold.reduce((s, i) => s + Number(i.gstTotal || 0), 0)

  // 1-day invoice edit limit: editable only on the day it was created.
  const editable = (inv) => daysUntil(inv.date) >= -1 && (inv.date || '').slice(0, 10) === today()

  // Settle/cancel/return an invoice: keep the customer's credit balance and stock in sync with the new status.
  const updateStatus = (inv, next) => {
    const prev = inv.status || 'Settled'
    if (prev === next) return
    const wasOutstanding = OUTSTANDING_STATUSES.includes(prev)
    const isOutstanding = OUTSTANDING_STATUSES.includes(next)
    const customer = db.get('customers', inv.customerId)
    if (inv.payMode === 'Credit' && customer && wasOutstanding !== isOutstanding) {
      const delta = isOutstanding ? Number(inv.grandTotal || 0) : -Number(inv.grandTotal || 0)
      db.update('customers', customer.id, { balance: Math.max(0, Number(customer.balance || 0) + delta) })
    }
    if (next === 'Returned' && prev !== 'Returned' && prev !== 'Cancelled') restoreAllocations(inv.lines)
    db.update('sales', inv.id, { status: next, updatedAt: new Date().toISOString() })
    logAudit('Invoice Status Update', `${inv.invoiceNo} ${prev} → ${next}`)
  }

  const exportPdf = () => {
    const dateRangeLabel = () => {
      if (!from && !to) return 'All dates'
      if (from && to) return `${fmtDate(from)} – ${fmtDate(to)}`
      if (from) return `From ${fmtDate(from)}`
      return `Until ${fmtDate(to)}`
    }

    buildPdf({
      title: 'Sales History Report',
      subtitle: 'Chronological sales invoice history list',
      company: company?.name,
      generatedBy: user?.name,
      dateRange: dateRangeLabel(),
      kpis: [
        { label: 'Invoices Count', value: num(filtered.length) },
        { label: 'Total Taxable',  value: inr(taxable) },
        { label: 'Total GST',      value: inr(gst) },
        { label: 'Net Sales',      value: inr(total) },
      ],
      sections: [
        {
          heading: 'Invoice List',
          type: 'table',
          columns: [
            { key: 'invoiceNo',    label: 'Invoice No.' },
            { key: 'date',         label: 'Date',     value: (r) => fmtDate(r.date) },
            { key: 'customerName', label: 'Customer' },
            { key: 'payMode',      label: 'Pay Mode' },
            { key: 'status',       label: 'Status',   value: (r) => r.status || 'Settled' },
            { key: 'taxable',      label: 'Taxable',  align: 'right', value: (r) => inr(r.taxable) },
            { key: 'gstTotal',     label: 'GST',      align: 'right', value: (r) => inr(r.gstTotal) },
            { key: 'grandTotal',   label: 'Total',    align: 'right', value: (r) => inr(r.grandTotal) },
          ],
          rows: filtered,
          totalRow: { invoiceNo: `${filtered.length} items`, taxable: inr(taxable), gstTotal: inr(gst), grandTotal: inr(total) },
        }
      ]
    })
  }

  return (
    <div>
      <PageHeader title="Sales History" subtitle={`${filtered.length} invoices · ${inr(total)}`} actions={<>
        <button className="btn-ghost" onClick={() => exportCSV('sales-history', filtered.map((r) => ({ ...r, status: r.status || 'Settled' })), [
          { key: 'invoiceNo', label: 'Invoice' }, { key: 'date', label: 'Date' }, { key: 'customerName', label: 'Customer' },
          { key: 'payMode', label: 'Pay Mode' }, { key: 'status', label: 'Status' }, { key: 'taxable', label: 'Taxable' }, { key: 'gstTotal', label: 'GST' }, { key: 'grandTotal', label: 'Total' },
        ])}>⬇ Excel</button>
        <PdfButton onClick={exportPdf} />
        <Link to="/sales/new" className="btn-primary">+ New Invoice</Link>
      </>} />

      <Toolbar>
        <input className="input max-w-xs" placeholder="Search invoice / customer…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input type="date" className="input max-w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-slate-400">to</span>
        <input type="date" className="input max-w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} />
        <select className="input max-w-[160px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Toolbar>

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? <Empty title="No invoices" hint="Create your first invoice." /> : (
          <table className="w-full">
            <thead><tr><th className="th">Invoice No.</th><th className="th">Date</th><th className="th">Customer</th><th className="th">Pay</th><th className="th">Status</th><th className="th text-right">Taxable</th><th className="th text-right">GST</th><th className="th text-right">Total</th><th className="th"></th></tr></thead>
            <tbody>{pg.slice.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="td font-medium font-mono text-xs">{inv.invoiceNo}</td>
                <td className="td">{fmtDate(inv.date)}</td>
                <td className="td">{inv.customerName}</td>
                <td className="td"><Badge tone={inv.payMode === 'Credit' ? 'amber' : 'green'}>{inv.payMode}</Badge></td>
                <td className="td">
                  <select
                    className={`input py-1 text-xs w-auto font-medium ${STATUS_TEXT_CLASS[inv.status || 'Settled'] || ''}`}
                    value={inv.status || 'Settled'}
                    onChange={(e) => updateStatus(inv, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="td text-right">{inr(inv.taxable)}</td>
                <td className="td text-right">{inr(inv.gstTotal)}</td>
                <td className="td text-right font-semibold">{inr(inv.grandTotal)}</td>
                <td className="td whitespace-nowrap">
                  <button className="btn-ghost btn-sm" onClick={() => setView(inv)}>View / Print</button>
                  {editable(inv)
                    ? <button className="btn-sm text-brand-700 hover:bg-brand-50 rounded px-2" onClick={() => setEdit(inv)}>Edit</button>
                    : <span className="text-[11px] text-slate-400" title="Invoices can only be edited on the day they were created"></span>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <Pagination pg={pg} />
      </div>

      <Modal open={!!view} onClose={() => { setView(null); setParams({}) }} title={`Invoice ${view?.invoiceNo}`} wide>
        {view && <>
          <div className="flex justify-end gap-2 mb-3 no-print">
            <button className="btn-primary" onClick={() => window.print()}>🖨 Print Bill</button>
          </div>
          <InvoicePrint inv={view} />
        </>}
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit Invoice ${edit?.invoiceNo}`} wide>
        {edit && <InvoiceEdit inv={edit} onClose={() => setEdit(null)} onSaved={() => setEdit(null)} />}
      </Modal>
    </div>
  )
}
