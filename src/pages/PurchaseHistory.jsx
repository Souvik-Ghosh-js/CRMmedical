import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../lib/hooks'
import { PageHeader, Toolbar, Empty, Modal } from '../components/ui'
import { Pagination, usePagination } from '../components/Pagination'
import { inr, fmtDate, exportCSV } from '../lib/format'

export default function PurchaseHistory() {
  const purchases = useCollection('purchases')
  const [q, setQ] = useState('')
  const [view, setView] = useState(null)

  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return purchases.filter((p) => !s || p.grnNo.toLowerCase().includes(s) || (p.vendorName || '').toLowerCase().includes(s) || (p.billNo || '').toLowerCase().includes(s))
  }, [purchases, q])

  const pg = usePagination(filtered, 10)

  const total = filtered.reduce((s, p) => s + Number(p.grandTotal || 0), 0)

  return (
    <div>
      <PageHeader title="Purchase History" subtitle={`${filtered.length} GRNs · ${inr(total)}`} actions={<>
        <button className="btn-ghost" onClick={() => exportCSV('purchases', filtered, [
          { key: 'grnNo', label: 'GRN' }, { key: 'billNo', label: 'Bill No' }, { key: 'date', label: 'Date' },
          { key: 'vendorName', label: 'Supplier' }, { key: 'taxable', label: 'Taxable' }, { key: 'gst', label: 'GST' }, { key: 'grandTotal', label: 'Total' },
        ])}>⬇ Excel</button>
        <Link to="/purchase/new" className="btn-primary">+ New Purchase</Link>
      </>} />
      <Toolbar><input className="input max-w-xs" placeholder="Search GRN / supplier / bill…" value={q} onChange={(e) => setQ(e.target.value)} /></Toolbar>
      <div className="card overflow-x-auto">
        {filtered.length === 0 ? <Empty title="No purchases" /> : (
          <table className="w-full">
            <thead><tr><th className="th">GRN No.</th><th className="th">Bill No.</th><th className="th">Date</th><th className="th">Supplier</th><th className="th text-right">Items</th><th className="th text-right">Total</th><th className="th"></th></tr></thead>
            <tbody>{pg.slice.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="td font-mono text-xs font-medium">{p.grnNo}</td>
                <td className="td">{p.billNo || '—'}</td>
                <td className="td">{fmtDate(p.date)}</td>
                <td className="td">{p.vendorName}</td>
                <td className="td text-right">{p.lines?.length}</td>
                <td className="td text-right font-semibold">{inr(p.grandTotal)}</td>
                <td className="td"><button className="btn-ghost btn-sm" onClick={() => setView(p)}>View</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <Pagination pg={pg} />
      </div>

      <Modal open={!!view} onClose={() => setView(null)} title={`Purchase ${view?.grnNo}`} wide>
        {view && (
          <table className="w-full">
            <thead><tr><th className="th">Item</th><th className="th">Batch</th><th className="th">Expiry</th><th className="th text-right">Qty</th><th className="th text-right">Cost</th><th className="th text-right">MRP</th></tr></thead>
            <tbody>{view.lines.map((l) => (
              <tr key={l.key}><td className="td">{l.name}</td><td className="td font-mono text-xs">{l.batchNo}</td><td className="td">{l.expiryDate || '—'}</td><td className="td text-right">{l.qty}</td><td className="td text-right">{inr(l.cost)}</td><td className="td text-right">{inr(l.mrp)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Modal>
    </div>
  )
}
