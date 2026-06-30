import { useMemo, useState } from 'react'
import * as db from '../lib/db'
import { restoreAllocations, deductFEFO, productStock } from '../lib/stock'
import { logAudit } from '../lib/audit'
import { Field } from './ui'
import { inr } from '../lib/format'

// Edit an existing invoice within the 1-day window. Adjust qty / rate / line-discount and
// bill discount, then recompute, restore the old stock allocations and re-deduct FEFO.
export default function InvoiceEdit({ inv, onClose, onSaved }) {
  const company = db.list('companies')[0]
  const customer = db.get('customers', inv.customerId)
  const interState = inv.interState

  const [lines, setLines] = useState(() => inv.lines.map((l) => ({ ...l, key: l.key || crypto.randomUUID() })))
  const [discountPct, setDiscountPct] = useState(inv.discountPct || 0)

  // available = current batch stock + what this invoice already holds (so editing isn't blocked by its own deduction)
  const heldByLine = useMemo(() => {
    const m = {}
    inv.lines.forEach((l) => { m[l.productId] = (m[l.productId] || 0) + Number(l.qty || 0) })
    return m
  }, [inv])

  const upd = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const del = (key) => setLines((ls) => ls.filter((l) => l.key !== key))

  const calc = useMemo(() => {
    let taxable = 0, gstTotal = 0
    const rows = lines.map((l) => {
      const gross = l.qty * l.rate
      const disc = (gross * l.discPct) / 100
      const lineTaxable = gross - disc
      const gstAmt = (lineTaxable * l.gst) / 100
      taxable += lineTaxable; gstTotal += gstAmt
      return { ...l, gross, disc, lineTaxable, gstAmt }
    })
    const billDisc = (taxable * discountPct) / 100
    const taxableAfterDisc = taxable - billDisc
    const gstAfter = taxable ? gstTotal * (taxableAfterDisc / taxable) : 0
    const beforeRound = taxableAfterDisc + gstAfter
    const grandTotal = Math.round(beforeRound)
    return { rows, taxable, billDisc, taxableAfterDisc, gstTotal: gstAfter, cgst: gstAfter / 2, sgst: gstAfter / 2, igst: gstAfter, roundOff: grandTotal - beforeRound, grandTotal }
  }, [lines, discountPct])

  const save = () => {
    if (!lines.length) return alert('An invoice must have at least one item.')
    // validate against (current stock + held by this invoice)
    for (const l of calc.rows) {
      const avail = productStock(l.productId) + (heldByLine[l.productId] || 0)
      if (l.qty > avail) return alert(`${l.name}: only ${avail} available (incl. this invoice's stock).`)
    }
    // 1) restore old stock, 2) re-deduct new quantities FEFO
    restoreAllocations(inv.lines)
    const finalLines = calc.rows.map((l) => {
      const { allocations } = deductFEFO(l.productId, l.qty)
      const first = allocations[0]
      return { ...l, allocations, batchNo: first?.batchNo || l.batchNo, expiryDate: first?.expiryDate || l.expiryDate }
    })
    // 3) adjust customer credit balance if Credit invoice (delta)
    if (inv.payMode === 'Credit' && customer) {
      const delta = calc.grandTotal - Number(inv.grandTotal || 0)
      db.update('customers', customer.id, { balance: Math.max(0, Number(customer.balance || 0) + delta) })
    }
    db.update('sales', inv.id, { lines: finalLines, discountPct: Number(discountPct), ...calc, editedAt: new Date().toISOString() })
    logAudit('Invoice Edit', `${inv.invoiceNo} revised to ${inr(calc.grandTotal)}`)
    onSaved?.()
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div className="text-sm text-slate-500">Editing <b>{inv.invoiceNo}</b> · {inv.customerName} · {company?.state}</div>
        <Field label="Bill Discount %" className="ml-auto w-40"><input type="number" min="0" max="100" className="input" value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))} /></Field>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead><tr>
            <th className="th">Item</th><th className="th">Batch</th><th className="th text-right">Qty</th>
            <th className="th text-right">Rate</th><th className="th text-right">Disc%</th><th className="th text-right">GST%</th>
            <th className="th text-right">Amount</th><th className="th"></th>
          </tr></thead>
          <tbody>
            {calc.rows.map((l) => (
              <tr key={l.key}>
                <td className="td font-medium">{l.name}</td>
                <td className="td font-mono text-xs">{l.batchNo}</td>
                <td className="td text-right"><input type="number" min="1" className="input w-16 text-right py-1" value={l.qty} onChange={(e) => upd(l.key, { qty: Number(e.target.value) })} /></td>
                <td className="td text-right"><input type="number" step="0.01" className="input w-20 text-right py-1" value={l.rate} onChange={(e) => upd(l.key, { rate: Number(e.target.value) })} /></td>
                <td className="td text-right"><input type="number" className="input w-14 text-right py-1" value={l.discPct} onChange={(e) => upd(l.key, { discPct: Number(e.target.value) })} /></td>
                <td className="td text-right">{l.gst}%</td>
                <td className="td text-right font-semibold">{inr(l.lineTaxable + l.gstAmt)}</td>
                <td className="td"><button className="text-rose-600 px-2" onClick={() => del(l.key)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <div className="w-64 text-sm">
          <Row label="Taxable" value={inr(calc.taxable)} />
          {calc.billDisc > 0 && <Row label={`Discount (${discountPct}%)`} value={'− ' + inr(calc.billDisc)} />}
          {interState ? <Row label="IGST" value={inr(calc.igst)} /> : <><Row label="CGST" value={inr(calc.cgst)} /><Row label="SGST" value={inr(calc.sgst)} /></>}
          <Row label="Round Off" value={inr(calc.roundOff)} />
          <div className="flex justify-between font-bold pt-2 mt-1 border-t border-slate-200"><span>Grand Total</span><span className="text-brand-700">{inr(calc.grandTotal)}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save}>Save Changes</button>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return <div className="flex justify-between py-0.5"><span className="text-slate-500">{label}</span><span className="font-medium">{value}</span></div>
}
