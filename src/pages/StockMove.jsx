import { useState } from 'react'
import { useCollection } from '../lib/hooks'
import * as db from '../lib/db'
import { addStock, deductFEFO, productStock, fefoBatches } from '../lib/stock'
import { logAudit } from '../lib/audit'
import { PageHeader, Field, Badge, Empty } from '../components/ui'
import { fmtDateTime, today } from '../lib/format'

export default function StockMove({ mode }) {
  const isIn = mode === 'in'
  const products = useCollection('products')
  const moves = useCollection('stockMoves')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [reason, setReason] = useState(isIn ? 'Purchase / opening' : 'Sale adjustment')
  const [msg, setMsg] = useState('')

  const product = products.find((p) => p.id === productId)
  const available = productId ? productStock(productId) : 0

  const submit = (e) => {
    e.preventDefault()
    const q = Number(qty)
    if (!productId || q <= 0) return
    if (isIn) {
      if (!batchNo) return setMsg('Batch number is required for stock in.')
      addStock(productId, batchNo, q, { expiryDate, mrp: product.mrp, costPrice: product.purchasePrice })
    } else {
      if (q > available) return setMsg(`Only ${available} units available.`)
      const { allocations } = deductFEFO(productId, q)
      logAudit('Stock Out', `${product.name} -${q} via ${allocations.map((a) => a.batchNo).join(', ')}`)
    }
    db.insert('stockMoves', { type: isIn ? 'IN' : 'OUT', productId, productName: product.name, qty: q, batchNo: isIn ? batchNo : '(FEFO)', reason, date: new Date().toISOString() })
    if (isIn) logAudit('Stock In', `${product.name} +${q} batch ${batchNo}`)
    setMsg(`${isIn ? 'Added' : 'Removed'} ${q} units of ${product.name}.`)
    setQty(''); setBatchNo(''); setExpiryDate('')
  }

  const recent = moves.filter((m) => m.type === (isIn ? 'IN' : 'OUT')).slice(0, 10)

  return (
    <div>
      <PageHeader title={isIn ? 'Stock In' : 'Stock Out'} subtitle={isIn ? 'Receive stock into a batch' : 'Issue / adjust stock (FEFO auto-allocation)'} />

      <div className="grid lg:grid-cols-2 gap-5">
        <form onSubmit={submit} className="card p-5 space-y-4">
          <Field label="Product *">
            <select required className="input" value={productId} onChange={(e) => { setProductId(e.target.value); setMsg('') }}>
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>)}
            </select>
          </Field>
          {product && <div className="text-sm text-slate-500">Current stock: <Badge tone="brand">{available} units</Badge> · Reorder {product.reorderLevel}</div>}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity *"><input required type="number" min="1" className="input" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            {isIn && <Field label="Batch No. *"><input required className="input" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} /></Field>}
          </div>
          {isIn && <Field label="Expiry Date"><input type="date" className="input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></Field>}
          <Field label="Reason / Reference"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>

          {!isIn && product && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="font-semibold mb-1">FEFO allocation preview</div>
              {fefoBatches(productId).slice(0, 4).map((b) => <div key={b.id}>{b.batchNo} — {b.qty} units · exp {b.expiryDate}</div>)}
            </div>
          )}

          {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2">{msg}</div>}
          <button className={isIn ? 'btn-primary w-full justify-center' : 'btn-danger w-full justify-center'}>{isIn ? 'Add Stock' : 'Issue Stock'}</button>
        </form>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Recent {isIn ? 'Stock-In' : 'Stock-Out'} Movements</h3>
          {recent.length === 0 ? <Empty title="No movements yet" /> : (
            <div className="space-y-2">{recent.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm">
                <div><div className="font-medium">{m.productName}</div><div className="text-xs text-slate-400">{m.reason} · {fmtDateTime(m.date)}</div></div>
                <Badge tone={isIn ? 'green' : 'rose'}>{isIn ? '+' : '−'}{m.qty} {m.batchNo}</Badge>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  )
}
