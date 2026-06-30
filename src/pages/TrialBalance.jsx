import { useMemo } from 'react'
import { useCollection } from '../lib/hooks'
import { PageHeader, Empty } from '../components/ui'
import { inr, exportCSV } from '../lib/format'

// Simplified trial balance derived from transactional data (no double-entry ledger in this build).
export default function TrialBalance() {
  const sales = useCollection('sales')
  const purchases = useCollection('purchases')
  const payments = useCollection('payments')
  const customers = useCollection('customers')
  const vendors = useCollection('vendors')
  const batches = useCollection('batches')
  const notes = useCollection('notes')

  const acc = useMemo(() => {
    const salesTaxable = sales.reduce((s, i) => s + Number(i.taxable || 0), 0)
    const outputGst = sales.reduce((s, i) => s + Number(i.gstTotal || 0), 0)
    const purchaseTaxable = purchases.reduce((s, p) => s + Number(p.taxable || 0), 0)
    const inputGst = purchases.reduce((s, p) => s + Number(p.gst || 0), 0)
    const receipts = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const receivable = customers.reduce((s, c) => s + Number(c.balance || 0), 0)
    const payable = vendors.reduce((s, v) => s + Number(v.balance || 0), 0)
    const closingStock = batches.reduce((s, b) => s + Number(b.qty || 0) * Number(b.costPrice || 0), 0)
    const creditNotes = notes.filter((n) => n.type === 'Credit').reduce((s, n) => s + Number(n.total || 0), 0)
    const debitNotes = notes.filter((n) => n.type === 'Debit').reduce((s, n) => s + Number(n.total || 0), 0)

    // Debit balances (assets/expenses), Credit balances (liabilities/income)
    const rows = [
      { account: 'Sales Account', debit: 0, credit: salesTaxable },
      { account: 'Output GST Payable', debit: 0, credit: outputGst },
      { account: 'Purchase Account', debit: purchaseTaxable, credit: 0 },
      { account: 'Input GST Credit', debit: inputGst, credit: 0 },
      { account: 'Sundry Debtors (Receivable)', debit: receivable, credit: 0 },
      { account: 'Sundry Creditors (Payable)', debit: 0, credit: payable },
      { account: 'Cash / Bank (Receipts)', debit: receipts, credit: 0 },
      { account: 'Closing Stock', debit: closingStock, credit: 0 },
      { account: 'Credit Notes Issued', debit: creditNotes, credit: 0 },
      { account: 'Debit Notes Issued', debit: 0, credit: debitNotes },
    ]
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
    // balancing figure → P&L / capital
    const diff = totalDebit - totalCredit
    if (Math.abs(diff) > 0.5) rows.push({ account: diff > 0 ? 'Net Profit / Capital (Cr)' : 'Net Loss (Dr)', debit: diff < 0 ? -diff : 0, credit: diff > 0 ? diff : 0 })
    return { rows, totalDebit: rows.reduce((s, r) => s + r.debit, 0), totalCredit: rows.reduce((s, r) => s + r.credit, 0) }
  }, [sales, purchases, payments, customers, vendors, batches, notes])

  return (
    <div>
      <PageHeader title="Trial Balance" subtitle="Account balances derived from transactions (indicative)" actions={
        <button className="btn-ghost" onClick={() => exportCSV('trial-balance', acc.rows)}>⬇ Excel</button>
      } />
      <div className="card overflow-x-auto max-w-3xl">
        {acc.rows.length === 0 ? <Empty title="No data" /> : (
          <table className="w-full">
            <thead><tr><th className="th">Account Head</th><th className="th text-right">Debit (₹)</th><th className="th text-right">Credit (₹)</th></tr></thead>
            <tbody>
              {acc.rows.map((r) => (
                <tr key={r.account} className="hover:bg-slate-50">
                  <td className="td font-medium">{r.account}</td>
                  <td className="td text-right">{r.debit ? inr(r.debit) : '—'}</td>
                  <td className="td text-right">{r.credit ? inr(r.credit) : '—'}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td className="td">Total</td>
                <td className="td text-right">{inr(acc.totalDebit)}</td>
                <td className="td text-right">{inr(acc.totalCredit)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-3 max-w-3xl">Note: This is a simplified, derived trial balance for the no-backend build. A production system would post double-entry journal vouchers to a full general ledger.</p>
    </div>
  )
}
