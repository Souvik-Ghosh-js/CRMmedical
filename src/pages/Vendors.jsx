import { useMemo, useState } from 'react'
import { useDb } from '../lib/hooks'
import { logAudit } from '../lib/audit'
import { PageHeader, Modal, Field, Toolbar, Empty, Badge } from '../components/ui'
import { inr, exportCSV } from '../lib/format'
import { Pagination, usePagination } from '../components/Pagination'

const BLANK = { name: '', phone: '', email: '', address: '', gstin: '', drugLicense: '', balance: 0, rating: 4 }

export default function Vendors() {
  const { rows, insert, update, remove } = useDb('vendors')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)

  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return rows.filter((v) => !s || [v.name, v.phone, v.gstin, v.drugLicense].some((x) => (x || '').toLowerCase().includes(s)))
  }, [rows, q])
  const pg = usePagination(filtered, 10)

  const save = (e) => {
    e.preventDefault()
    const payload = { ...form, balance: Number(form.balance), rating: Number(form.rating) }
    if (editing === 'new') { insert(payload); logAudit('Vendor Create', `Added ${payload.name}`) }
    else { update(editing, payload); logAudit('Vendor Update', `Edited ${payload.name}`) }
    setEditing(null)
  }

  return (
    <div>
      <PageHeader title="Supplier / Vendor Master" subtitle={`${rows.length} suppliers with drug-license & GST details`} actions={<>
        <button className="btn-ghost" onClick={() => exportCSV('vendors', filtered)}>⬇ Excel</button>
        <button className="btn-primary" onClick={() => { setEditing('new'); setForm(BLANK) }}>+ New Supplier</button>
      </>} />

      <Toolbar><input className="input max-w-xs" placeholder="Search supplier, GSTIN, DL…" value={q} onChange={(e) => setQ(e.target.value)} /></Toolbar>

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? <Empty title="No suppliers" /> : (
          <table className="w-full">
            <thead><tr><th className="th">Supplier</th><th className="th">Contact</th><th className="th">GSTIN</th><th className="th">Drug License</th><th className="th">Rating</th><th className="th text-right">Payable</th><th className="th"></th></tr></thead>
            <tbody>{pg.slice.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="td font-medium">{v.name}<div className="text-xs text-slate-400">{v.address}</div></td>
                <td className="td">{v.phone}<div className="text-xs text-slate-400">{v.email}</div></td>
                <td className="td font-mono text-xs">{v.gstin || '—'}</td>
                <td className="td font-mono text-xs">{v.drugLicense || '—'}</td>
                <td className="td"><Badge tone={v.rating >= 4.5 ? 'green' : v.rating >= 4 ? 'blue' : 'amber'}>★ {v.rating}</Badge></td>
                <td className="td text-right">{v.balance > 0 ? <Badge tone="rose">{inr(v.balance)}</Badge> : <span className="text-slate-400">—</span>}</td>
                <td className="td whitespace-nowrap">
                  <button className="btn-ghost btn-sm" onClick={() => { setEditing(v.id); setForm({ ...BLANK, ...v }) }}>Edit</button>
                  <button className="btn-sm text-rose-600 hover:bg-rose-50 rounded px-2" onClick={() => confirm(`Delete ${v.name}?`) && remove(v.id)}>Del</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <Pagination pg={pg} />
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Supplier' : 'Edit Supplier'}>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <Field label="Supplier Name *" className="sm:col-span-2"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address" className="sm:col-span-2"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="GSTIN"><input className="input" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></Field>
          <Field label="Drug License No."><input className="input" value={form.drugLicense} onChange={(e) => setForm({ ...form, drugLicense: e.target.value })} /></Field>
          <Field label="Opening Payable"><input type="number" className="input" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></Field>
          <Field label="Rating (0-5)"><input type="number" step="0.1" min="0" max="5" className="input" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
