import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollection } from '../lib/hooks'
import * as db from '../lib/db'
import { fefoBatches, deductFEFO, productStock } from '../lib/stock'
import { logAudit } from '../lib/audit'
import { PageHeader, Field, Badge } from '../components/ui'
import { inr, today } from '../lib/format'

export default function InvoiceCreate() {
  const nav = useNavigate()
  const products = useCollection('products')
  const customers = useCollection('customers')
  const batches = useCollection('batches')
  const company = db.list('companies')[0]

  const [customerId, setCustomerId] = useState(customers[0]?.id || '')
  const [date, setDate] = useState(today())
  const [payMode, setPayMode] = useState('Cash')
  const [discountPct, setDiscountPct] = useState(0)
  const [lines, setLines] = useState([])
  const [pick, setPick] = useState('')

  const customer = customers.find((c) => c.id === customerId)
  // Intra-state (same GST state code) → CGST+SGST; else IGST.
  const interState = customer?.gstin && company?.gstin && customer.gstin.slice(0, 2) !== company.gstin.slice(0, 2)

  const addLine = (productId) => {
    const p = products.find((x) => x.id === productId)
    if (!p) return
    const fefo = fefoBatches(productId, batches)
    const batch = fefo[0]
    setLines((ls) => [...ls, {
      key: crypto.randomUUID(), productId, name: p.name, hsn: p.hsn, pack: p.pack,
      batchNo: batch?.batchNo || '—', expiryDate: batch?.expiryDate || '', mrp: p.mrp,
      qty: 1, rate: p.mrp, discPct: 0, gst: p.gst, available: productStock(productId, batches),
    }])
    setPick('')
  }

  const upd = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const del = (key) => setLines((ls) => ls.filter((l) => l.key !== key))

  const calc = useMemo(() => {
    let taxable = 0, gstTotal = 0
    const rows = lines.map((l) => {
      const gross = l.qty * l.rate
      const disc = (gross * l.discPct) / 100
      const lineTaxable = gross - disc
      const gstAmt = (lineTaxable * l.gst) / 100
      taxable += lineTaxable
      gstTotal += gstAmt
      return { ...l, gross, disc, lineTaxable, gstAmt }
    })
    const billDisc = (taxable * discountPct) / 100
    const taxableAfterDisc = taxable - billDisc
    // recompute gst proportionally after bill-level discount
    const gstAfter = lines.length ? gstTotal * (taxableAfterDisc / (taxable || 1)) : 0
    const beforeRound = taxableAfterDisc + gstAfter
    const grandTotal = Math.round(beforeRound)
    const roundOff = grandTotal - beforeRound
    return { rows, taxable, billDisc, taxableAfterDisc, gstTotal: gstAfter, cgst: gstAfter / 2, sgst: gstAfter / 2, igst: gstAfter, roundOff, grandTotal }
  }, [lines, discountPct])

  const save = (e) => {
    e.preventDefault()
    if (!lines.length) return alert('Add at least one item.')
    for (const l of calc.rows) {
      if (l.qty > l.available) return alert(`${l.name}: only ${l.available} in stock.`)
    }
    const seq = db.nextNumber('invoice')
    const invoiceNo = `INV-${new Date(date).getFullYear()}-${seq}`
    // deduct stock FEFO and capture real batch allocations
    const finalLines = calc.rows.map((l) => {
      const { allocations } = deductFEFO(l.productId, l.qty)
      return { ...l, allocations }
    })
    const inv = db.insert('sales', {
      invoiceNo, date, customerId, customerName: customer?.name || 'Walk-in',
      customerGstin: customer?.gstin || '', payMode, interState: !!interState,
      lines: finalLines, ...calc, discountPct: Number(discountPct),
    })
    logAudit('Invoice Create', `${invoiceNo} ${inr(calc.grandTotal)} to ${customer?.name}`)
    if (payMode === 'Credit' && customer) db.update('customers', customer.id, { balance: Number(customer.balance || 0) + calc.grandTotal })
    nav(`/sales?open=${inv.id}`)
  }

  return (
    <div>
      <PageHeader title="Create Invoice" subtitle="GST tax invoice with batch-wise FEFO billing" />

      <form onSubmit={save}>
        <div className="card p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Field label="Customer">
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Invoice Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Payment Mode">
            <select className="input" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
              {['Cash', 'UPI', 'Card', 'Credit', 'Bank Transfer'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Bill Discount %"><input type="number" min="0" max="100" className="input" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /></Field>
        </div>

        <div className="card p-5 mb-4">
          <Field label="Add Item">
            <select className="input max-w-md" value={pick} onChange={(e) => addLine(e.target.value)}>
              <option value="">Search & select medicine to add…</option>
              {products.filter((p) => productStock(p.id, batches) > 0).map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.brand} · stock {productStock(p.id, batches)} · {inr(p.mrp)}</option>
              ))}
            </select>
          </Field>

          <div className="overflow-x-auto mt-4">
            <table className="w-full min-w-[860px]">
              <thead><tr>
                <th className="th">#</th><th className="th">Item</th><th className="th">HSN</th><th className="th">Batch</th>
                <th className="th text-right">Qty</th><th className="th text-right">MRP/Rate</th><th className="th text-right">Disc%</th>
                <th className="th text-right">GST%</th><th className="th text-right">Taxable</th><th className="th text-right">Amount</th><th className="th"></th>
              </tr></thead>
              <tbody>
                {calc.rows.length === 0 && <tr><td colSpan="11" className="td text-center text-slate-400 py-8">No items added yet.</td></tr>}
                {calc.rows.map((l, i) => (
                  <tr key={l.key}>
                    <td className="td">{i + 1}</td>
                    <td className="td font-medium">{l.name}<div className="text-xs text-slate-400">{l.pack} · exp {l.expiryDate?.slice(0, 7) || '—'} {l.qty > l.available && <span className="text-rose-600">· over stock!</span>}</div></td>
                    <td className="td">{l.hsn}</td>
                    <td className="td font-mono text-xs">{l.batchNo}</td>
                    <td className="td text-right"><input type="number" min="1" className="input w-16 text-right py-1" value={l.qty} onChange={(e) => upd(l.key, { qty: Number(e.target.value) })} /></td>
                    <td className="td text-right"><input type="number" step="0.01" className="input w-20 text-right py-1" value={l.rate} onChange={(e) => upd(l.key, { rate: Number(e.target.value) })} /></td>
                    <td className="td text-right"><input type="number" className="input w-14 text-right py-1" value={l.discPct} onChange={(e) => upd(l.key, { discPct: Number(e.target.value) })} /></td>
                    <td className="td text-right">{l.gst}%</td>
                    <td className="td text-right">{inr(l.lineTaxable)}</td>
                    <td className="td text-right font-semibold">{inr(l.lineTaxable + l.gstAmt)}</td>
                    <td className="td"><button type="button" className="text-rose-600 hover:bg-rose-50 rounded px-2" onClick={() => del(l.key)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card p-4 lg:col-span-2 text-sm text-slate-500">
            <div className="font-semibold text-slate-700 mb-1">Tax type: {interState ? 'IGST (inter-state)' : 'CGST + SGST (intra-state)'}</div>
            Company GSTIN {company?.gstin} · {company?.state}. Stock is deducted FEFO (earliest expiry first) on save. Schedule H/H1/X items require a valid prescription record at counter.
          </div>
          <div className="card p-4">
            <Row label="Taxable" value={inr(calc.taxable)} />
            {calc.billDisc > 0 && <Row label={`Bill Discount (${discountPct}%)`} value={'− ' + inr(calc.billDisc)} />}
            {interState
              ? <Row label="IGST" value={inr(calc.igst)} />
              : <><Row label="CGST" value={inr(calc.cgst)} /><Row label="SGST" value={inr(calc.sgst)} /></>}
            <Row label="Round Off" value={inr(calc.roundOff)} />
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200">
              <span className="font-bold text-slate-800">Grand Total</span>
              <span className="text-xl font-bold text-brand-700">{inr(calc.grandTotal)}</span>
            </div>
            <button className="btn-primary w-full justify-center mt-4">Save & Print Invoice</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Row({ label, value }) {
  return <div className="flex justify-between text-sm py-0.5"><span className="text-slate-500">{label}</span><span className="font-medium">{value}</span></div>
}
