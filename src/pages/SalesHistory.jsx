import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useCollection } from '../lib/hooks'
import * as db from '../lib/db'
import { PageHeader, Toolbar, Modal, Empty, Badge } from '../components/ui'
import InvoicePrint from '../components/InvoicePrint'
import InvoiceEdit from '../components/InvoiceEdit'
import { Pagination, usePagination } from '../components/Pagination'
import { inr, fmtDate, today, daysUntil, exportCSV } from '../lib/format'

export default function SalesHistory() {
  const sales = useCollection('sales')
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
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
      return !s || inv.invoiceNo.toLowerCase().includes(s) || (inv.customerName || '').toLowerCase().includes(s)
    })
  }, [sales, q, from, to])
  const pg = usePagination(filtered, 10)

  const total = filtered.reduce((s, i) => s + Number(i.grandTotal || 0), 0)

  // 1-day invoice edit limit: editable only on the day it was created.
  const editable = (inv) => daysUntil(inv.date) >= -1 && (inv.date || '').slice(0, 10) === today()

  return (
    <div>
      <PageHeader title="Sales History" subtitle={`${filtered.length} invoices · ${inr(total)}`} actions={<>
        <button className="btn-ghost" onClick={() => exportCSV('sales-history', filtered, [
          { key: 'invoiceNo', label: 'Invoice' }, { key: 'date', label: 'Date' }, { key: 'customerName', label: 'Customer' },
          { key: 'payMode', label: 'Pay Mode' }, { key: 'taxable', label: 'Taxable' }, { key: 'gstTotal', label: 'GST' }, { key: 'grandTotal', label: 'Total' },
        ])}>⬇ Excel</button>
        <Link to="/sales/new" className="btn-primary">+ New Invoice</Link>
      </>} />

      <Toolbar>
        <input className="input max-w-xs" placeholder="Search invoice / customer…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input type="date" className="input max-w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-slate-400">to</span>
        <input type="date" className="input max-w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} />
      </Toolbar>

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? <Empty title="No invoices" hint="Create your first invoice." /> : (
          <table className="w-full">
            <thead><tr><th className="th">Invoice No.</th><th className="th">Date</th><th className="th">Customer</th><th className="th">Pay</th><th className="th text-right">Taxable</th><th className="th text-right">GST</th><th className="th text-right">Total</th><th className="th"></th></tr></thead>
            <tbody>{pg.slice.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="td font-medium font-mono text-xs">{inv.invoiceNo}</td>
                <td className="td">{fmtDate(inv.date)}</td>
                <td className="td">{inv.customerName}</td>
                <td className="td"><Badge tone={inv.payMode === 'Credit' ? 'amber' : 'green'}>{inv.payMode}</Badge></td>
                <td className="td text-right">{inr(inv.taxable)}</td>
                <td className="td text-right">{inr(inv.gstTotal)}</td>
                <td className="td text-right font-semibold">{inr(inv.grandTotal)}</td>
                <td className="td whitespace-nowrap">
                  <button className="btn-ghost btn-sm" onClick={() => setView(inv)}>View / Print</button>
                  {editable(inv)
                    ? <button className="btn-sm text-brand-700 hover:bg-brand-50 rounded px-2" onClick={() => setEdit(inv)}>Edit</button>
                    : <span className="text-[11px] text-slate-400" title="Invoices can only be edited on the day they were created">🔒 locked</span>}
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
