import { useState } from 'react'
import { useCollection } from '../lib/hooks'
import * as db from '../lib/db'
import { logAudit } from '../lib/audit'
import { PageHeader, Field, Badge, Empty } from '../components/ui'
import { inr, fmtDate, today } from '../lib/format'

export default function Payments() {
  const customers = useCollection('customers')
  const payments = useCollection('payments')
  const [party, setParty] = useState('')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('UPI')
  const [utr, setUtr] = useState('')
  const [date, setDate] = useState(today())
  const [warn, setWarn] = useState('')
  const [msg, setMsg] = useState('')

  const customer = customers.find((c) => c.id === party)

  // UTR repetition alert for payment booking
  const checkUtr = (val) => {
    setUtr(val)
    const dup = payments.find((p) => p.utr && p.utr.trim() === val.trim() && val.trim())
    setWarn(dup ? `⚠ UTR ${val} already booked on ${fmtDate(dup.date)} for ${dup.partyName} (${inr(dup.amount)}).` : '')
  }

  const submit = (e) => {
    e.preventDefault()
    if ((mode === 'UPI' || mode === 'Bank Transfer' || mode === 'NEFT') && !utr.trim()) return setMsg('UTR / reference number is required for this mode.')
    const dup = payments.find((p) => p.utr && p.utr.trim() === utr.trim() && utr.trim())
    if (dup && !confirm(`This UTR is already booked (${inr(dup.amount)} for ${dup.partyName}). Book anyway?`)) return
    const seq = db.nextNumber('receipt')
    const receiptNo = `RCPT-${seq}`
    db.insert('payments', { receiptNo, partyId: party, partyName: customer?.name || 'Walk-in', amount: Number(amount), mode, utr: utr.trim(), date })
    if (customer) db.update('customers', customer.id, { balance: Math.max(0, Number(customer.balance || 0) - Number(amount)) })
    logAudit('Payment Receipt', `${receiptNo} ${inr(amount)} from ${customer?.name} via ${mode}${utr ? ' UTR ' + utr : ''}`)
    setMsg(`Receipt ${receiptNo} booked.`)
    setAmount(''); setUtr(''); setWarn('')
  }

  const recent = payments.slice(0, 8)

  return (
    <div>
      <PageHeader title="Payment Receipt" subtitle="Book customer receipts with UTR duplicate detection" />
      <div className="grid lg:grid-cols-2 gap-5">
        <form onSubmit={submit} className="card p-5 space-y-4">
          <Field label="Customer / Party *">
            <select required className="input" value={party} onChange={(e) => setParty(e.target.value)}>
              <option value="">Select…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.balance > 0 ? ` — due ${inr(c.balance)}` : ''}</option>)}
            </select>
          </Field>
          {customer && customer.balance > 0 && <div className="text-sm">Outstanding: <Badge tone="amber">{inr(customer.balance)}</Badge></div>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount *"><input required type="number" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mode"><select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>{['UPI', 'Bank Transfer', 'NEFT', 'Cash', 'Cheque', 'Card'].map((m) => <option key={m}>{m}</option>)}</select></Field>
            <Field label="UTR / Reference No."><input className="input" value={utr} onChange={(e) => checkUtr(e.target.value)} placeholder="Transaction ref" /></Field>
          </div>
          {warn && <div className="text-sm text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">{warn}</div>}
          {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2">{msg}</div>}
          <button className="btn-primary w-full justify-center">Book Receipt</button>
        </form>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Recent Receipts</h3>
          {recent.length === 0 ? <Empty title="No receipts yet" /> : (
            <div className="space-y-2">{recent.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm">
                <div><div className="font-medium">{p.partyName}</div><div className="text-xs text-slate-400">{p.receiptNo} · {p.mode} {p.utr && `· ${p.utr}`} · {fmtDate(p.date)}</div></div>
                <Badge tone="green">{inr(p.amount)}</Badge>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  )
}
