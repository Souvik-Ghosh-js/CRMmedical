import { useState } from 'react'
import * as db from '../lib/db'
import { productStock } from '../lib/stock'
import { PageHeader, Badge } from '../components/ui'
import { inr, daysUntil, fmtDate, today } from '../lib/format'

// Rule-based natural-language assistant over local data. No backend — pattern-matches
// the question and answers from localStorage. A production build would call the Claude API.
function answer(qRaw) {
  const q = qRaw.toLowerCase()
  const products = db.list('products')
  const batches = db.list('batches')
  const sales = db.list('sales')
  const customers = db.list('customers')

  if (/expir/.test(q)) {
    const win = /month/.test(q) ? 30 : /week/.test(q) ? 7 : 90
    const rows = batches.filter((b) => b.qty > 0 && daysUntil(b.expiryDate) <= win && daysUntil(b.expiryDate) >= -3650)
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
    return { text: `${rows.length} batch(es) expiring within ${win} days:`, table: rows.slice(0, 15).map((b) => ({ Product: products.find((p) => p.id === b.productId)?.name, Batch: b.batchNo, Expiry: fmtDate(b.expiryDate), Qty: b.qty })) }
  }
  if (/low stock|reorder|out of stock/.test(q)) {
    const rows = products.filter((p) => productStock(p.id, batches) <= p.reorderLevel)
    return { text: `${rows.length} product(s) at or below reorder level:`, table: rows.map((p) => ({ Product: p.name, Stock: productStock(p.id, batches), Reorder: p.reorderLevel })) }
  }
  if (/today.*sale|sale.*today|today.*revenue/.test(q)) {
    const t = sales.filter((s) => (s.date || '').slice(0, 10) === today())
    return { text: `Today you have ${t.length} invoice(s) totalling ${inr(t.reduce((s, i) => s + i.grandTotal, 0))}.` }
  }
  if (/total sale|revenue|how much.*sold/.test(q)) {
    return { text: `Total sales across ${sales.length} invoices: ${inr(sales.reduce((s, i) => s + i.grandTotal, 0))}.` }
  }
  if (/top.*(custom|client)|best custom/.test(q)) {
    const by = {}
    sales.forEach((s) => { by[s.customerName] = (by[s.customerName] || 0) + s.grandTotal })
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { text: 'Top customers by sales value:', table: rows.map(([Customer, v]) => ({ Customer, Sales: inr(v) })) }
  }
  if (/how many product|total product|product count/.test(q)) {
    return { text: `You have ${products.length} products (${products.filter((p) => p.group === 'Medicine').length} medicines, ${products.filter((p) => p.group === 'Others').length} others).` }
  }
  if (/stock value|inventory value/.test(q)) {
    return { text: `Total stock value at cost: ${inr(batches.reduce((s, b) => s + b.qty * b.costPrice, 0))}.` }
  }
  if (/outstanding|receivable|due/.test(q)) {
    const due = customers.filter((c) => c.balance > 0)
    return { text: `Total receivable: ${inr(due.reduce((s, c) => s + c.balance, 0))} across ${due.length} parties.`, table: due.map((c) => ({ Customer: c.name, Due: inr(c.balance) })) }
  }
  return { text: "I can answer questions about expiring batches, low stock, today's sales, total revenue, top customers, product count, stock value and outstanding dues. Try one of the suggestions below." }
}

const SUGGESTIONS = ['Show batches expiring this month', "What are today's sales?", 'Which products are low on stock?', 'Top customers', 'Total stock value', 'Outstanding receivables']

export default function Copilot() {
  const [input, setInput] = useState('')
  const [thread, setThread] = useState([{ role: 'bot', ...answer('hello') }])

  const ask = (text) => {
    const q = text ?? input
    if (!q.trim()) return
    setThread((t) => [...t, { role: 'user', text: q }, { role: 'bot', ...answer(q) }])
    setInput('')
  }

  return (
    <div>
      <PageHeader title="AI Copilot" subtitle="Ask questions about your pharmacy in plain English" />
      <div className="card p-5 max-w-3xl">
        <div className="space-y-3 max-h-[55vh] overflow-y-auto mb-4">
          {thread.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                <div>{m.text}</div>
                {m.table && m.table.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="text-xs bg-white rounded-lg overflow-hidden">
                      <thead><tr>{Object.keys(m.table[0]).map((h) => <th key={h} className="px-2 py-1 bg-slate-200 text-left">{h}</th>)}</tr></thead>
                      <tbody>{m.table.map((r, j) => <tr key={j} className="border-b border-slate-100">{Object.values(r).map((v, k) => <td key={k} className="px-2 py-1">{v}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => <button key={s} className="btn-sm bg-brand-50 text-brand-700 rounded-full px-3 hover:bg-brand-100" onClick={() => ask(s)}>{s}</button>)}
        </div>

        <div className="flex gap-2">
          <input className="input" placeholder="Ask anything about your inventory, sales, expiry…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} />
          <button className="btn-primary" onClick={() => ask()}>Ask</button>
        </div>
        <p className="text-xs text-slate-400 mt-3">Rule-based assistant over your local data. Connect the Claude API later for open-ended natural-language answers.</p>
      </div>
    </div>
  )
}
