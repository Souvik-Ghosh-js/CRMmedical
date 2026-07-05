import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollection } from '../lib/hooks'
import * as db from '../lib/db'
import { fefoBatches, deductFEFO, productStock } from '../lib/stock'
import { logAudit } from '../lib/audit'
import { useAuth } from '../lib/auth'
import { PageHeader, Field, Badge, Modal } from '../components/ui'
import { inr, today } from '../lib/format'

const CUSTOMER_TYPES = ['Walk-in', 'Registered', 'Corporate', 'Hospital']
const BUSINESS_TYPES = ['Corporate', 'Hospital'] // these types unlock the GSTIN field
const BLANK_CUSTOMER = { name: '', type: 'Walk-in', phone: '', gstin: '', address: '' }
const STATUS_OPTIONS = ['Pending', 'Settled', 'Cancelled', 'Returned', 'Payment Issue']
const SERIES_BY_TYPE = { Hospital: 'Hospital', Corporate: 'Wholesale' } // default (Walk-in/Registered) is Retail
const SERIES_CODE = { Retail: 'RET', Wholesale: 'WS', Hospital: 'HOS' }

// April–March Indian financial year for a given invoice date.
function financialYear(dateStr) {
  const d = new Date(dateStr)
  const startYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

export default function InvoiceCreate() {
  const nav = useNavigate()
  const { user } = useAuth()
  const products = useCollection('products')
  const customers = useCollection('customers')
  const batches = useCollection('batches')
  const company = db.list('companies')[0]

  const [customerId, setCustomerId] = useState(customers[0]?.id || '')
  const [date, setDate] = useState(today())
  const [payMode, setPayMode] = useState('Cash')
  const [status, setStatus] = useState('Settled')
  const [cardLast4, setCardLast4] = useState('')
  const [cardTxnRef, setCardTxnRef] = useState('')
  const [discountPct, setDiscountPct] = useState(0)
  const [lines, setLines] = useState([])
  const [pick, setPick] = useState('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState(BLANK_CUSTOMER)

  // Credit sales default to Pending until settled; everything else is paid at the counter.
  useEffect(() => { setStatus(payMode === 'Credit' ? 'Pending' : 'Settled') }, [payMode])

  const customer = customers.find((c) => c.id === customerId)
  const invoiceSeries = SERIES_BY_TYPE[customer?.type] || 'Retail'
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

  const saveNewCustomer = (e) => {
    e.preventDefault()
    const isBusiness = BUSINESS_TYPES.includes(newCustomer.type)
    const id = `CUST-${db.nextNumber('customer', 4)}`
    const c = db.insert('customers', {
      id, name: newCustomer.name.trim(), type: newCustomer.type, phone: newCustomer.phone,
      address: newCustomer.address, email: '', gstin: isBusiness ? newCustomer.gstin : '', balance: 0, doctor: '',
    })
    logAudit('Customer Create', `Added ${c.name} (${c.type}) from invoice screen`)
    setCustomerId(c.id)
    setNewCustomer(BLANK_CUSTOMER)
    setShowAddCustomer(false)
  }

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
    if (payMode === 'Card' && !cardLast4.trim()) return alert('Enter the last 4 digits of the card used.')
    const seriesCode = SERIES_CODE[invoiceSeries]
    const fy = financialYear(date)
    const seq = db.nextNumber(`invoice-${seriesCode}`)
    const invoiceNo = `${seriesCode}-${fy}-${seq}`
    const branchId = company?.id || 'BR-01'
    const posId = user?.username ? `POS-${user.username}` : 'POS-1'
    const now = new Date().toISOString()
    // Cancelled-at-creation invoices don't move stock or ledger balances.
    const finalLines = status === 'Cancelled' ? calc.rows : calc.rows.map((l) => {
      const { allocations } = deductFEFO(l.productId, l.qty)
      return { ...l, allocations }
    })
    const inv = db.insert('sales', {
      invoiceNo, date, customerId, customerName: customer?.name || 'Walk-in', customerType: customer?.type || 'Walk-in',
      customerGstin: customer?.gstin || '', payMode, interState: !!interState,
      lines: finalLines, ...calc, discountPct: Number(discountPct),
      status, financialYear: fy, invoiceSeries, branchId, posId, createdAt: now, updatedAt: now,
      ...(payMode === 'Card' ? { cardLast4: cardLast4.trim(), cardTxnRef: cardTxnRef.trim() } : {}),
    })
    logAudit('Invoice Create', `${invoiceNo} ${inr(calc.grandTotal)} to ${customer?.name} · ${status}`)
    // Only outstanding (unsettled) credit invoices should add to the customer's owed balance.
    if (payMode === 'Credit' && customer && ['Pending', 'Payment Issue'].includes(status)) {
      db.update('customers', customer.id, { balance: Number(customer.balance || 0) + calc.grandTotal })
    }
    nav(`/sales?open=${inv.id}`)
  }

  return (
    <div>
      <PageHeader title="Create Invoice" subtitle="GST tax invoice with batch-wise FEFO billing" />

      <form onSubmit={save}>
        <div className="card p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Field label="Customer">
            <div className="flex gap-2">
              <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.type ? ` · ${c.type}` : ''}</option>)}
              </select>
              <button type="button" className="btn-ghost whitespace-nowrap" onClick={() => setShowAddCustomer(true)}>+ Add customer type</button>
            </div>
          </Field>
          <Field label="Invoice Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Payment Mode">
            <select className="input" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
              {['Cash', 'UPI', 'Card', 'Credit', 'Bank Transfer'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Bill Discount %"><input type="number" min="0" max="100" className="input" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /></Field>
          <Field label="Invoice Status *">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          {payMode === 'Card' && (
            <>
              <Field label="Card Last 4 Digits *">
                <input required maxLength={4} className="input" placeholder="e.g. 4242" value={cardLast4} onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              </Field>
              <Field label="Card Auth / Txn Ref No.">
                <input className="input" placeholder="Approval / reference code" value={cardTxnRef} onChange={(e) => setCardTxnRef(e.target.value)} />
              </Field>
            </>
          )}
          <div className="sm:col-span-2 lg:col-span-4 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-2 mt-1 border-t border-slate-100">
            <span>Series: <b className="text-slate-600">{invoiceSeries}</b></span>
            <span>Financial Year: <b className="text-slate-600">{financialYear(date)}</b></span>
            <span>Branch: <b className="text-slate-600">{company?.id || 'BR-01'}</b></span>
            <span>Counter: <b className="text-slate-600">{user?.username ? `POS-${user.username}` : 'POS-1'}</b></span>
          </div>
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

      <Modal open={showAddCustomer} onClose={() => { setShowAddCustomer(false); setNewCustomer(BLANK_CUSTOMER) }} title="Add Customer Type">
        <form onSubmit={saveNewCustomer} className="grid sm:grid-cols-2 gap-4">
          <Field label="Customer Name *" className="sm:col-span-2">
            <input required className="input" value={newCustomer.name} onChange={(e) => setNewCustomer((n) => ({ ...n, name: e.target.value }))} />
          </Field>
          <Field label="Customer Type *">
            <select className="input" value={newCustomer.type} onChange={(e) => setNewCustomer((n) => ({ ...n, type: e.target.value, gstin: BUSINESS_TYPES.includes(e.target.value) ? n.gstin : '' }))}>
              {CUSTOMER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Phone">
            <input className="input" value={newCustomer.phone} onChange={(e) => setNewCustomer((n) => ({ ...n, phone: e.target.value }))} />
          </Field>
          <Field label="GSTIN" className="sm:col-span-2">
            <input
              className="input disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              disabled={!BUSINESS_TYPES.includes(newCustomer.type)}
              placeholder={BUSINESS_TYPES.includes(newCustomer.type) ? '22AAAAA0000A1Z5' : 'Blocked — only for business customers (Corporate / Hospital)'}
              value={newCustomer.gstin}
              onChange={(e) => setNewCustomer((n) => ({ ...n, gstin: e.target.value }))}
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input className="input" value={newCustomer.address} onChange={(e) => setNewCustomer((n) => ({ ...n, address: e.target.value }))} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" className="btn-ghost" onClick={() => { setShowAddCustomer(false); setNewCustomer(BLANK_CUSTOMER) }}>Cancel</button>
            <button className="btn-primary">Save Customer</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Row({ label, value }) {
  return <div className="flex justify-between text-sm py-0.5"><span className="text-slate-500">{label}</span><span className="font-medium">{value}</span></div>
}
