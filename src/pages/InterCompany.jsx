import { useMemo } from 'react'
import CrudModule from '../components/CrudModule'
import { useCollection } from '../lib/hooks'
import { inr } from '../lib/format'

export default function InterCompany() {
  const companies = useCollection('companies')
  const nameById = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies])
  const companyNames = companies.map((c) => c.name)

  // helper: resolve a company name from either an id (seeded) or a name (entered via form)
  const resolve = (v) => nameById[v] || v || '—'

  const config = {
    collection: 'intercoTxns',
    title: 'Inter-Company Transactions',
    subtitle: 'Transfers between group companies — eliminated on consolidation',
    icon: '🔁',
    numberPrefix: 'ICT',
    searchKeys: ['txnNo', 'type', 'reference', 'notes'],
    filters: [
      { key: 'type', label: 'Type', options: ['Stock Transfer', 'Fund Transfer', 'Service Charge', 'Management Fee', 'Loan'] },
      { key: 'status', label: 'Status', options: ['Posted', 'Pending Reconciliation', 'Cancelled'] },
    ],
    columns: [
      { key: 'txnNo', label: 'Txn No' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'type', label: 'Type' },
      { key: 'fromCompanyId', label: 'From', render: (r) => resolve(r.fromCompanyId) },
      { key: 'toCompanyId', label: 'To', render: (r) => resolve(r.toCompanyId) },
      { key: 'amount', label: 'Amount', align: 'right', render: (r) => inr(r.amount) },
      { key: 'gst', label: 'GST', align: 'right', render: (r) => inr(r.gst) },
      { key: 'status', label: 'Status', badge: (r) => [r.status === 'Posted' ? 'green' : r.status === 'Cancelled' ? 'rose' : 'amber', r.status] },
      { key: 'eliminate', label: 'Eliminate', badge: (r) => [r.eliminate === false ? 'slate' : 'blue', r.eliminate === false ? 'No' : 'Yes'] },
    ],
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'type', label: 'Transaction Type', type: 'select', options: ['Stock Transfer', 'Fund Transfer', 'Service Charge', 'Management Fee', 'Loan'], default: 'Stock Transfer' },
      { key: 'fromCompanyId', label: 'From Company', type: 'select', options: companyNames, required: true },
      { key: 'toCompanyId', label: 'To Company', type: 'select', options: companyNames, required: true },
      { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
      { key: 'gst', label: 'GST (₹)', type: 'number' },
      { key: 'reference', label: 'Reference (STN/JV No.)' },
      { key: 'status', label: 'Status', type: 'select', options: ['Posted', 'Pending Reconciliation', 'Cancelled'], default: 'Posted' },
      { key: 'eliminate', label: 'Eliminate on consolidation', type: 'select', options: ['Yes', 'No'], default: 'Yes' },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    stats: (rows) => [
      { label: 'Transactions', value: rows.length },
      { label: 'Total Value', value: inr(rows.reduce((s, r) => s + Number(r.amount || 0), 0)) },
      { label: 'To Eliminate', value: rows.filter((r) => r.eliminate !== false && r.eliminate !== 'No').length },
      { label: 'Pending Recon', value: rows.filter((r) => r.status === 'Pending Reconciliation').length },
    ],
  }

  return <CrudModule config={config} />
}
