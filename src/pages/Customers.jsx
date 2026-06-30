import { useMemo, useState } from 'react'
import { useDb } from '../lib/hooks'
import { logAudit } from '../lib/audit'
import { PageHeader, Modal, Field, Toolbar, Empty, Badge } from '../components/ui'
import { inr, exportCSV } from '../lib/format'
import { Pagination, usePagination } from '../components/Pagination'

const BLANK = { name: '', phone: '', address: '', email: '', gstin: '', doctor: '', balance: 0 }

export default function Customers() {
  const { rows, insert, update, remove } = useDb('customers')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)

  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return rows.filter((c) => !s || [c.name, c.phone, c.email, c.gstin].some((v) => (v || '').toLowerCase().includes(s)))
  }, [rows, q])

  const pg = usePagination(filtered, 10)

  const save = (e) => {
    e.preventDefault()
    const payload = { ...form, balance: Number(form.balance) }
    if (editing === 'new') { insert(payload); logAudit('Customer Create', `Added ${payload.name}`) }
    else { update(editing, payload); logAudit('Customer Update', `Edited ${payload.name}`) }
    setEditing(null)
  }

  return (
    <div>
      <PageHeader title="Client Master" subtitle={`${rows.length} clients / customers`} actions={<>
        <button className="btn-ghost" onClick={() => exportCSV('customers', filtered)}>⬇ Excel</button>
        <button className="btn-primary" onClick={() => { setEditing('new'); setForm(BLANK) }}>+ New Customer</button>
      </>} />

      <Toolbar><input className="input max-w-xs" placeholder="Search name, phone, GSTIN…" value={q} onChange={(e) => setQ(e.target.value)} /></Toolbar>

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? <Empty title="No customers" /> : (
          <table className="w-full">
            <thead><tr><th className="th">Name</th><th className="th">Contact</th><th className="th">Address</th><th className="th">GSTIN</th><th className="th">Doctor</th><th className="th text-right">Balance</th><th className="th"></th></tr></thead>
            <tbody>{pg.slice.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="td font-medium">{c.name}</td>
                <td className="td">{c.phone || '—'}<div className="text-xs text-slate-400">{c.email}</div></td>
                <td className="td text-sm text-slate-500 max-w-xs truncate">{c.address || '—'}</td>
                <td className="td font-mono text-xs">{c.gstin || '—'}</td>
                <td className="td">{c.doctor || '—'}</td>
                <td className="td text-right">{c.balance > 0 ? <Badge tone="amber">{inr(c.balance)}</Badge> : <span className="text-slate-400">—</span>}</td>
                <td className="td whitespace-nowrap">
                  <button className="btn-ghost btn-sm" onClick={() => { setEditing(c.id); setForm({ ...BLANK, ...c }) }}>Edit</button>
                  <button className="btn-sm text-rose-600 hover:bg-rose-50 rounded px-2" onClick={() => confirm(`Delete ${c.name}?`) && remove(c.id)}>Del</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <Pagination pg={pg} />
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Customer' : 'Edit Customer'}>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <Field label="Customer Name *" className="sm:col-span-2"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Contact Number"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address" className="sm:col-span-2"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="GSTIN"><input className="input" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></Field>
          <Field label="Referring Doctor"><input className="input" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} /></Field>
          <Field label="Opening Balance"><input type="number" className="input" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
