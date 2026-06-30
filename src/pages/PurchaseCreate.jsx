import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollection } from '../lib/hooks'
import * as db from '../lib/db'
import { addStock } from '../lib/stock'
import { logAudit } from '../lib/audit'
import { PageHeader, Field } from '../components/ui'
import { inr, today } from '../lib/format'

export default function PurchaseCreate() {
  const nav = useNavigate()
  const products = useCollection('products')
  const vendors = useCollection('vendors')
  const [vendorId, setVendorId] = useState(vendors[0]?.id || '')
  const [date, setDate] = useState(today())
  const [billNo, setBillNo] = useState('')
  const [lines, setLines] = useState([])
  const [pick, setPick] = useState('')

  const vendor = vendors.find((v) => v.id === vendorId)

  const addLine = (productId) => {
    const p = products.find((x) => x.id === productId)
    if (!p) return
    setLines((ls) => [...ls, { key: crypto.randomUUID(), productId, name: p.name, batchNo: '', expiryDate: '', qty: 1, cost: p.purchasePrice, mrp: p.mrp, gst: p.gst }])
    setPick('')
  }
  const upd = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const del = (key) => setLines((ls) => ls.filter((l) => l.key !== key))

  const calc = useMemo(() => {
    let taxable = 0, gst = 0
    lines.forEach((l) => { const t = l.qty * l.cost; taxable += t; gst += (t * l.gst) / 100 })
    const grandTotal = Math.round(taxable + gst)
    return { taxable, gst, grandTotal }
  }, [lines])

  const save = (e) => {
    e.preventDefault()
    if (!lines.length) return alert('Add at least one item.')
    for (const l of lines) if (!l.batchNo) return alert(`Batch number required for ${l.name}.`)
    const seq = db.nextNumber('purchase')
    const grnNo = `GRN-${new Date(date).getFullYear()}-${seq}`
    lines.forEach((l) => addStock(l.productId, l.batchNo, Number(l.qty), { expiryDate: l.expiryDate, costPrice: Number(l.cost), mrp: Number(l.mrp), supplierId: vendorId }))
    const pur = db.insert('purchases', { grnNo, billNo, date, vendorId, vendorName: vendor?.name, lines, ...calc })
    if (vendor) db.update('vendors', vendor.id, { balance: Number(vendor.balance || 0) + calc.grandTotal })
    logAudit('Purchase Entry', `${grnNo} from ${vendor?.name} ${inr(calc.grandTotal)}`)
    nav('/purchase')
  }

  return (
    <div>
      <PageHeader title="Purchase Entry" subtitle="Goods receipt (GRN) — adds batch stock & vendor payable" />
      <form onSubmit={save}>
        <div className="card p-5 grid sm:grid-cols-3 gap-4 mb-4">
          <Field label="Supplier"><select className="input" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Field label="Supplier Bill No."><input className="input" value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="e.g. SUN/24-25/1234" /></Field>
          <Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>

        <div className="card p-5 mb-4">
          <Field label="Add Item">
            <select className="input max-w-md" value={pick} onChange={(e) => addLine(e.target.value)}>
              <option value="">Select product to receive…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>)}
            </select>
          </Field>
          <div className="overflow-x-auto mt-4">
            <table className="w-full min-w-[840px]">
              <thead><tr><th className="th">Item</th><th className="th">Batch *</th><th className="th">Expiry</th><th className="th text-right">Qty</th><th className="th text-right">Cost</th><th className="th text-right">MRP</th><th className="th text-right">GST%</th><th className="th text-right">Amount</th><th className="th"></th></tr></thead>
              <tbody>
                {lines.length === 0 && <tr><td colSpan="9" className="td text-center text-slate-400 py-8">No items added.</td></tr>}
                {lines.map((l) => (
                  <tr key={l.key}>
                    <td className="td font-medium">{l.name}</td>
                    <td className="td"><input className="input w-28 py-1" value={l.batchNo} onChange={(e) => upd(l.key, { batchNo: e.target.value })} /></td>
                    <td className="td"><input type="date" className="input w-36 py-1" value={l.expiryDate} onChange={(e) => upd(l.key, { expiryDate: e.target.value })} /></td>
                    <td className="td text-right"><input type="number" min="1" className="input w-16 text-right py-1" value={l.qty} onChange={(e) => upd(l.key, { qty: Number(e.target.value) })} /></td>
                    <td className="td text-right"><input type="number" step="0.01" className="input w-20 text-right py-1" value={l.cost} onChange={(e) => upd(l.key, { cost: Number(e.target.value) })} /></td>
                    <td className="td text-right"><input type="number" step="0.01" className="input w-20 text-right py-1" value={l.mrp} onChange={(e) => upd(l.key, { mrp: Number(e.target.value) })} /></td>
                    <td className="td text-right">{l.gst}%</td>
                    <td className="td text-right font-semibold">{inr(l.qty * l.cost * (1 + l.gst / 100))}</td>
                    <td className="td"><button type="button" className="text-rose-600 px-2" onClick={() => del(l.key)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4 max-w-sm ml-auto">
          <div className="flex justify-between text-sm py-0.5"><span className="text-slate-500">Taxable</span><span>{inr(calc.taxable)}</span></div>
          <div className="flex justify-between text-sm py-0.5"><span className="text-slate-500">GST</span><span>{inr(calc.gst)}</span></div>
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200"><span className="font-bold">Total</span><span className="text-xl font-bold text-brand-700">{inr(calc.grandTotal)}</span></div>
          <button className="btn-primary w-full justify-center mt-4">Save Purchase / GRN</button>
        </div>
      </form>
    </div>
  )
}
