import { useMemo, useState } from 'react'
import { useCollection } from '../lib/hooks'
import * as db from '../lib/db'
import { logAudit } from '../lib/audit'
import { PageHeader, Toolbar, Modal, Field, Badge, Empty } from '../components/ui'
import { Pagination, usePagination } from '../components/Pagination'
import { inr, fmtDate, today, exportCSV } from '../lib/format'

const BLANK = { type: 'Credit', partyType: 'Customer', partyId: '', refInvoice: '', reason: 'Sales return', amount: 0, gst: 12, date: '' }

export default function Notes() {
  const notes = useCollection('notes')
  const customers = useCollection('customers')
  const vendors = useCollection('vendors')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [filter, setFilter] = useState('All')

  const parties = form.partyType === 'Customer' ? customers : vendors

  const save = (e) => {
    e.preventDefault()
    const party = parties.find((p) => p.id === form.partyId)
    const amount = Number(form.amount)
    const gstAmt = (amount * Number(form.gst)) / 100
    const total = amount + gstAmt
    const seq = db.nextNumber(form.type === 'Credit' ? 'cnote' : 'dnote')
    const noteNo = `${form.type === 'Credit' ? 'CN' : 'DN'}-${seq}`
    db.insert('notes', { ...form, noteNo, partyName: party?.name, amount, gstAmt, total })
    logAudit(`${form.type} Note`, `${noteNo} ${inr(total)} ${party?.name}`)
    setOpen(false)
  }

  const filtered = useMemo(() => notes.filter((n) => filter === 'All' || n.type === filter), [notes, filter])
  const pg = usePagination(filtered, 10)

  return (
    <div>
      <PageHeader title="Credit / Debit Notes" subtitle="Sales returns, purchase returns & adjustments" actions={<>
        <button className="btn-ghost" onClick={() => exportCSV('notes', filtered)}>⬇ Excel</button>
        <button className="btn-primary" onClick={() => { setForm({ ...BLANK, date: today() }); setOpen(true) }}>+ New Note</button>
      </>} />

      <Toolbar>{['All', 'Credit', 'Debit'].map((f) => (
        <button key={f} className={`btn-sm rounded-lg ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setFilter(f)}>{f}{f !== 'All' ? ' Note' : ''}</button>
      ))}</Toolbar>

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? <Empty title="No notes" /> : (
          <table className="w-full">
            <thead><tr><th className="th">Note No.</th><th className="th">Type</th><th className="th">Date</th><th className="th">Party</th><th className="th">Ref Invoice</th><th className="th">Reason</th><th className="th text-right">Amount</th><th className="th text-right">GST</th><th className="th text-right">Total</th></tr></thead>
            <tbody>{pg.slice.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50">
                <td className="td font-mono text-xs">{n.noteNo}</td>
                <td className="td"><Badge tone={n.type === 'Credit' ? 'green' : 'rose'}>{n.type}</Badge></td>
                <td className="td">{fmtDate(n.date)}</td>
                <td className="td font-medium">{n.partyName}</td>
                <td className="td">{n.refInvoice || '—'}</td>
                <td className="td text-sm text-slate-500">{n.reason}</td>
                <td className="td text-right">{inr(n.amount)}</td>
                <td className="td text-right">{inr(n.gstAmt)}</td>
                <td className="td text-right font-semibold">{inr(n.total)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <Pagination pg={pg} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Credit / Debit Note">
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <Field label="Note Type"><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Credit</option><option>Debit</option></select></Field>
          <Field label="Party Type"><select className="input" value={form.partyType} onChange={(e) => setForm({ ...form, partyType: e.target.value, partyId: '' })}><option>Customer</option><option>Vendor</option></select></Field>
          <Field label="Party *" className="sm:col-span-2"><select required className="input" value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}><option value="">Select…</option>{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Reference Invoice / Bill"><input className="input" value={form.refInvoice} onChange={(e) => setForm({ ...form, refInvoice: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Reason" className="sm:col-span-2"><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          <Field label="Amount (taxable)"><input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="GST %"><input type="number" className="input" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100"><button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary">Save Note</button></div>
        </form>
      </Modal>
    </div>
  )
}
