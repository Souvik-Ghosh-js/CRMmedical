import { useState } from 'react'
import { useDb } from '../lib/hooks'
import { logAudit } from '../lib/audit'
import { PageHeader, Modal, Field, Badge, Empty } from '../components/ui'

const ROLES = ['Admin', 'Pharmacist', 'Accountant', 'Store Manager', 'Auditor', 'QA Manager']
const BLANK = { name: '', username: '', password: '', role: 'Pharmacist', email: '', active: true }

export default function Users() {
  const { rows, insert, update, remove } = useDb('users')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)

  const save = (e) => {
    e.preventDefault()
    if (editing === 'new') { insert(form); logAudit('User Create', `Added user ${form.username} (${form.role})`) }
    else { update(editing, form); logAudit('User Update', `Edited user ${form.username}`) }
    setEditing(null)
  }

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Role-based access control" actions={<button className="btn-primary" onClick={() => { setEditing('new'); setForm(BLANK) }}>+ New User</button>} />
      <div className="card overflow-x-auto">
        {rows.length === 0 ? <Empty title="No users" /> : (
          <table className="w-full">
            <thead><tr><th className="th">Name</th><th className="th">Username</th><th className="th">Role</th><th className="th">Email</th><th className="th">Status</th><th className="th"></th></tr></thead>
            <tbody>{rows.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="td font-medium">{u.name}</td>
                <td className="td font-mono text-xs">{u.username}</td>
                <td className="td"><Badge tone="brand">{u.role}</Badge></td>
                <td className="td">{u.email || '—'}</td>
                <td className="td"><Badge tone={u.active ? 'green' : 'slate'}>{u.active ? 'Active' : 'Disabled'}</Badge></td>
                <td className="td whitespace-nowrap">
                  <button className="btn-ghost btn-sm" onClick={() => { setEditing(u.id); setForm({ ...BLANK, ...u }) }}>Edit</button>
                  {u.username !== 'admin' && <button className="btn-sm text-rose-600 hover:bg-rose-50 rounded px-2" onClick={() => confirm(`Delete ${u.username}?`) && remove(u.id)}>Del</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New User' : 'Edit User'}>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <Field label="Full Name *"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Username *"><input required className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="Password *"><input required className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Role"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Email" className="sm:col-span-2"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100"><button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary">Save</button></div>
        </form>
      </Modal>
    </div>
  )
}
