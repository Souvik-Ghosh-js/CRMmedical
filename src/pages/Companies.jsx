import { useState } from 'react'
import { useDb } from '../lib/hooks'
import { logAudit } from '../lib/audit'
import { PageHeader, Modal, Field, Badge, Empty } from '../components/ui'

const BLANK = { name: '', gstin: '', dlNo: '', country: 'India', currency: 'INR', state: '', address: '' }

export default function Companies() {
  const { rows, insert, update, remove } = useDb('companies')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)

  const save = (e) => {
    e.preventDefault()
    if (editing === 'new') { insert(form); logAudit('Company Create', `Added company ${form.name}`) }
    else { update(editing, form); logAudit('Company Update', `Edited ${form.name}`) }
    setEditing(null)
  }

  return (
    <div>
      <PageHeader title="Companies" subtitle="Multi-company / multi-tenant configuration" actions={<button className="btn-primary" onClick={() => { setEditing('new'); setForm(BLANK) }}>+ New Company</button>} />
      <div className="grid md:grid-cols-2 gap-4">
        {rows.length === 0 && <Empty title="No companies" />}
        {rows.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex justify-between items-start">
              <div><div className="font-bold text-slate-800">{c.name}</div><div className="text-sm text-slate-500">{c.address}</div></div>
              <Badge tone="brand">{c.currency}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
              <Info label="GSTIN" value={c.gstin} /><Info label="Drug License" value={c.dlNo} />
              <Info label="State" value={c.state} /><Info label="Country" value={c.country} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-ghost btn-sm" onClick={() => { setEditing(c.id); setForm({ ...BLANK, ...c }) }}>Edit</button>
              {rows.length > 1 && <button className="btn-sm text-rose-600 hover:bg-rose-50 rounded px-2" onClick={() => confirm('Delete company?') && remove(c.id)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Company' : 'Edit Company'}>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <Field label="Company Name *" className="sm:col-span-2"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="GSTIN"><input className="input" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></Field>
          <Field label="Drug License No."><input className="input" value={form.dlNo} onChange={(e) => setForm({ ...form, dlNo: e.target.value })} /></Field>
          <Field label="State"><input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          <Field label="Country"><input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
          <Field label="Currency"><input className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
          <Field label="Address" className="sm:col-span-2"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100"><button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary">Save</button></div>
        </form>
      </Modal>
    </div>
  )
}

function Info({ label, value }) {
  return <div><div className="text-xs text-slate-400 uppercase">{label}</div><div className="font-medium font-mono text-xs">{value || '—'}</div></div>
}
