import { useMemo, useState } from 'react'
import { useDb, useCollection } from '../lib/hooks'
import { logAudit } from '../lib/audit'
import { PageHeader, Modal, Field, Badge, Toolbar, Empty } from '../components/ui'
import { Pagination, usePagination } from '../components/Pagination'
import { inr, fmtDate, daysUntil, today, exportCSV } from '../lib/format'

const BLANK = {
  productId: '', batchNo: '', mfgDate: '', expiryDate: '', qty: 0, costPrice: 0, mrp: 0, supplierId: '', rackBin: '',
  rawMaterialBatch: '', productionMachine: '', operator: '', qcStatus: 'Released', qcReportNo: '',
}
const QC_STATUS = ['Released', 'Under Test', 'Quarantine', 'Rejected']

export default function Batches() {
  const { rows, insert, update, remove } = useDb('batches')
  const products = useCollection('products')
  const vendors = useCollection('vendors')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)

  const pName = (id) => products.find((p) => p.id === id)?.name || 'Unknown'

  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return rows
      .filter((b) => {
        const d = daysUntil(b.expiryDate)
        if (filter === 'expired') return d < 0
        if (filter === 'soon') return d >= 0 && d <= 90
        return true
      })
      .filter((b) => !s || b.batchNo.toLowerCase().includes(s) || pName(b.productId).toLowerCase().includes(s))
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
  }, [rows, q, filter, products])
  const pg = usePagination(filtered, 10)

  const openNew = () => { setEditing('new'); setForm({ ...BLANK, mfgDate: today() }) }
  const openEdit = (b) => { setEditing(b.id); setForm({ ...BLANK, ...b }) }

  const save = (e) => {
    e.preventDefault()
    const payload = { ...form, qty: Number(form.qty), costPrice: Number(form.costPrice), mrp: Number(form.mrp) }
    if (editing === 'new') { insert(payload); logAudit('Batch Create', `Batch ${payload.batchNo} for ${pName(payload.productId)}`) }
    else { update(editing, payload); logAudit('Batch Update', `Edited batch ${payload.batchNo}`) }
    setEditing(null)
  }

  const del = (b) => { if (confirm(`Delete batch ${b.batchNo}?`)) { remove(b.id); logAudit('Batch Delete', `Deleted batch ${b.batchNo}`) } }

  const cols = [
    { key: 'product', label: 'Product', value: (b) => pName(b.productId) },
    { key: 'batchNo', label: 'Batch' }, { key: 'mfgDate', label: 'Mfg' }, { key: 'expiryDate', label: 'Expiry' },
    { key: 'qty', label: 'Qty' }, { key: 'mrp', label: 'MRP' }, { key: 'rackBin', label: 'Rack/Bin' },
  ]

  return (
    <div>
      <PageHeader
        title="Batch & Expiry Management"
        subtitle="Batch-wise stock with FEFO expiry tracking and rack/bin location"
        actions={<>
          <button className="btn-ghost" onClick={() => exportCSV('batches', filtered, cols)}>⬇ Excel</button>
          <button className="btn-primary" onClick={openNew}>+ New Batch</button>
        </>}
      />

      <Toolbar>
        <input className="input max-w-xs" placeholder="Search batch / product…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex gap-1">
          {[['all', 'All'], ['soon', 'Expiring ≤90d'], ['expired', 'Expired']].map(([k, l]) => (
            <button key={k} className={`btn-sm rounded-lg ${filter === k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </Toolbar>

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? <Empty title="No batches" /> : (
          <table className="w-full">
            <thead><tr>
              <th className="th">Product</th><th className="th">Batch No.</th><th className="th">Mfg</th><th className="th">Expiry</th>
              <th className="th text-right">Qty</th><th className="th text-right">Cost</th><th className="th text-right">MRP</th>
              <th className="th">Rack/Bin</th><th className="th">Status</th><th className="th"></th>
            </tr></thead>
            <tbody>
              {pg.slice.map((b) => {
                const d = daysUntil(b.expiryDate)
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="td font-medium">{pName(b.productId)}</td>
                    <td className="td font-mono text-xs">{b.batchNo}</td>
                    <td className="td">{fmtDate(b.mfgDate)}</td>
                    <td className="td">{fmtDate(b.expiryDate)}</td>
                    <td className="td text-right">{b.qty}</td>
                    <td className="td text-right">{inr(b.costPrice)}</td>
                    <td className="td text-right">{inr(b.mrp)}</td>
                    <td className="td">{b.rackBin || '—'}</td>
                    <td className="td"><Badge tone={d < 0 ? 'rose' : d <= 90 ? 'amber' : 'green'}>{d < 0 ? 'Expired' : d <= 90 ? `${d}d left` : 'OK'}</Badge></td>
                    <td className="td whitespace-nowrap">
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(b)}>Edit</button>
                      <button className="btn-sm text-rose-600 hover:bg-rose-50 rounded px-2" onClick={() => del(b)}>Del</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <Pagination pg={pg} />
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Batch' : 'Edit Batch'}>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <Field label="Product *" className="sm:col-span-2">
            <select required className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>)}
            </select>
          </Field>
          <Field label="Batch Number *"><input required className="input" value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} /></Field>
          <Field label="Supplier">
            <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">—</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <Field label="Mfg Date"><input type="date" className="input" value={form.mfgDate} onChange={(e) => setForm({ ...form, mfgDate: e.target.value })} /></Field>
          <Field label="Expiry Date *"><input type="date" required className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
          <Field label="Quantity"><input type="number" className="input" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
          <Field label="Rack / Bin"><input className="input" value={form.rackBin} onChange={(e) => setForm({ ...form, rackBin: e.target.value })} /></Field>
          <Field label="Cost Price"><input type="number" step="0.01" className="input" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></Field>
          <Field label="MRP"><input type="number" step="0.01" className="input" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} /></Field>
          <Field label="Raw Material Batch"><input className="input" value={form.rawMaterialBatch} onChange={(e) => setForm({ ...form, rawMaterialBatch: e.target.value })} placeholder="API/RM lot" /></Field>
          <Field label="Production Machine"><input className="input" value={form.productionMachine} onChange={(e) => setForm({ ...form, productionMachine: e.target.value })} /></Field>
          <Field label="Operator"><input className="input" value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} /></Field>
          <Field label="QC Status"><select className="input" value={form.qcStatus} onChange={(e) => setForm({ ...form, qcStatus: e.target.value })}>{QC_STATUS.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="QC Report No."><input className="input" value={form.qcReportNo} onChange={(e) => setForm({ ...form, qcReportNo: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary">Save Batch</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
