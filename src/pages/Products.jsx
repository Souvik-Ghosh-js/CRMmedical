import { useMemo, useState } from 'react'
import { useDb, useCollection } from '../lib/hooks'
import { productStock } from '../lib/stock'
import { logAudit } from '../lib/audit'
import { PageHeader, Modal, Field, Badge, Toolbar, Empty } from '../components/ui'
import { inr, exportCSV } from '../lib/format'
import { Pagination, usePagination } from '../components/Pagination'

const BLANK = {
  code: '', name: '', brand: '', molecule: '', category: '', atc: '', strength: '', form: 'Tablet',
  pack: '', manufacturer: '', group: 'Medicine', hsn: '3004', gst: 12, purchasePrice: 0, mrp: 0,
  schedule: '—', reorderLevel: 20, rackBin: '', storage: 'Room temp', coldChain: false, regNo: '',
  controlledCategory: 'None', regStatus: 'Approved', maNo: '', active: true,
}

const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Powder', 'Ointment', 'Drops', 'Device', 'Pair', 'Other']
const SCHEDULES = ['—', 'H', 'H1', 'X', 'G']
const CONTROLLED = ['None', 'Narcotic (NDPS)', 'Psychotropic', 'Schedule X', 'Habit-forming']
const REG_STATUS = ['Approved', 'Pending', 'Under Review', 'Suspended', 'Withdrawn']
const GST_RATES = [0, 5, 12, 18, 28]

export default function Products() {
  const { rows, insert, update, remove } = useDb('products')
  const batches = useCollection('batches')
  const [q, setQ] = useState('')
  const [grp, setGrp] = useState('All')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)

  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return rows.filter(
      (p) =>
        (grp === 'All' || p.group === grp) &&
        (!s || [p.name, p.brand, p.molecule, p.code, p.manufacturer, p.category].some((v) => (v || '').toLowerCase().includes(s)))
    )
  }, [rows, q, grp])

  const pg = usePagination(filtered, 10)

  const openNew = () => { setEditing('new'); setForm(BLANK) }
  const openEdit = (p) => { setEditing(p.id); setForm({ ...BLANK, ...p }) }

  const save = (e) => {
    e.preventDefault()
    const payload = { ...form, gst: Number(form.gst), mrp: Number(form.mrp), purchasePrice: Number(form.purchasePrice), reorderLevel: Number(form.reorderLevel) }
    if (editing === 'new') {
      const code = payload.code || 'P' + Math.floor(1000 + Math.random() * 8999)
      insert({ ...payload, code })
      logAudit('Product Create', `Added product ${payload.name}`)
    } else {
      update(editing, payload)
      logAudit('Product Update', `Edited product ${payload.name}`)
    }
    setEditing(null)
  }

  const del = (p) => {
    if (confirm(`Delete "${p.name}"? This does not delete its batches.`)) {
      remove(p.id)
      logAudit('Product Delete', `Deleted product ${p.name}`)
    }
  }

  const cols = [
    { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'brand', label: 'Brand' },
    { key: 'molecule', label: 'Molecule' }, { key: 'category', label: 'Category' }, { key: 'strength', label: 'Strength' },
    { key: 'form', label: 'Form' }, { key: 'pack', label: 'Pack' }, { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'hsn', label: 'HSN' }, { key: 'gst', label: 'GST%' }, { key: 'schedule', label: 'Schedule' },
    { key: 'purchasePrice', label: 'Purchase' }, { key: 'mrp', label: 'MRP' },
    { key: 'stock', label: 'Stock', value: (p) => productStock(p.id, batches) },
  ]

  return (
    <div>
      <PageHeader
        title="Product Master"
        subtitle={`${rows.length} products — full pharmaceutical item master`}
        actions={
          <>
            <button className="btn-ghost" onClick={() => exportCSV('products', filtered, cols)}>⬇ Excel</button>
            <button className="btn-primary" onClick={openNew}>+ New Product</button>
          </>
        }
      />

      <Toolbar>
        <input className="input max-w-xs" placeholder="Search name, brand, molecule, code…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[160px]" value={grp} onChange={(e) => setGrp(e.target.value)}>
          {['All', 'Medicine', 'Others'].map((g) => <option key={g}>{g}</option>)}
        </select>
        <span className="text-sm text-slate-400">{filtered.length} shown</span>
      </Toolbar>

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? (
          <Empty title="No products found" hint="Adjust your search or add a new product." />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Code</th><th className="th">Product</th><th className="th">Molecule</th>
                <th className="th">Strength / Form</th><th className="th">Pack</th><th className="th">HSN</th>
                <th className="th">GST</th><th className="th">Sch.</th><th className="th text-right">MRP</th>
                <th className="th text-right">Stock</th><th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {pg.slice.map((p) => {
                const stock = productStock(p.id, batches)
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs">{p.code}</td>
                    <td className="td">
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.brand} · {p.manufacturer}{p.coldChain && ' · ❄️'}</div>
                    </td>
                    <td className="td">{p.molecule}</td>
                    <td className="td">{p.strength} · {p.form}</td>
                    <td className="td">{p.pack}</td>
                    <td className="td">{p.hsn}</td>
                    <td className="td">{p.gst}%</td>
                    <td className="td">{p.schedule !== '—' ? <Badge tone="rose">{p.schedule}</Badge> : '—'}</td>
                    <td className="td text-right font-semibold">{inr(p.mrp)}</td>
                    <td className="td text-right">
                      <Badge tone={stock <= p.reorderLevel ? 'amber' : 'green'}>{stock}</Badge>
                    </td>
                    <td className="td whitespace-nowrap">
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn-sm text-rose-600 hover:bg-rose-50 rounded px-2" onClick={() => del(p)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <Pagination pg={pg} />
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New Product' : 'Edit Product'} wide>
        <form onSubmit={save} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Product Code"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Auto if blank" /></Field>
          <Field label="Product Name *" className="lg:col-span-2"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Brand Name"><input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
          <Field label="Generic / Molecule"><input className="input" value={form.molecule} onChange={(e) => setForm({ ...form, molecule: e.target.value })} /></Field>
          <Field label="Therapeutic Category"><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="ATC Classification"><input className="input" value={form.atc} onChange={(e) => setForm({ ...form, atc: e.target.value })} /></Field>
          <Field label="Strength"><input className="input" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} placeholder="500mg" /></Field>
          <Field label="Dosage Form">
            <select className="input" value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })}>{FORMS.map((f) => <option key={f}>{f}</option>)}</select>
          </Field>
          <Field label="Pack Size"><input className="input" value={form.pack} onChange={(e) => setForm({ ...form, pack: e.target.value })} placeholder="10x10" /></Field>
          <Field label="Manufacturer"><input className="input" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></Field>
          <Field label="Group">
            <select className="input" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}><option>Medicine</option><option>Others</option></select>
          </Field>
          <Field label="HSN Code"><input className="input" value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} /></Field>
          <Field label="GST Rate">
            <select className="input" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })}>{GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}</select>
          </Field>
          <Field label="Drug Schedule">
            <select className="input" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })}>{SCHEDULES.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <Field label="Purchase Price"><input type="number" step="0.01" className="input" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /></Field>
          <Field label="MRP"><input type="number" step="0.01" className="input" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} /></Field>
          <Field label="Reorder Level"><input type="number" className="input" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></Field>
          <Field label="Rack / Bin"><input className="input" value={form.rackBin} onChange={(e) => setForm({ ...form, rackBin: e.target.value })} /></Field>
          <Field label="Storage Conditions"><input className="input" value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} /></Field>
          <Field label="Registration No."><input className="input" value={form.regNo} onChange={(e) => setForm({ ...form, regNo: e.target.value })} /></Field>
          <Field label="Market Authorization No."><input className="input" value={form.maNo} onChange={(e) => setForm({ ...form, maNo: e.target.value })} /></Field>
          <Field label="Controlled Drug Category">
            <select className="input" value={form.controlledCategory} onChange={(e) => setForm({ ...form, controlledCategory: e.target.value })}>{CONTROLLED.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Regulatory Approval Status">
            <select className="input" value={form.regStatus} onChange={(e) => setForm({ ...form, regStatus: e.target.value })}>{REG_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.coldChain} onChange={(e) => setForm({ ...form, coldChain: e.target.checked })} /> Cold chain (2–8°C)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          </div>
          <div className="lg:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary">Save Product</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
