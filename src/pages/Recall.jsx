import CrudModule from '../components/CrudModule'

// Product Recall module — tracks field corrective actions across the recall lifecycle:
// recall classification (FDA Class I / II / III, or EU MDR equivalents), affected batch /
// lot blocking, customer & distributor notification, and regulatory reporting (FDA/EMA).
const config = {
  collection: 'recallActions',
  title: 'Product Recall',
  subtitle: 'Recall classification, batch blocking, customer notification & regulatory reporting',
  icon: '⚠️',
  numberPrefix: 'REC',
  searchKeys: ['product', 'batchNumber', 'reason', 'initiatedBy'],
  filters: [
    { key: 'recallClass', label: 'Recall Class', options: ['Class I', 'Class II', 'Class III'] },
    { key: 'status', label: 'Status', options: ['Draft', 'Notified', 'In Progress', 'Effectiveness Check', 'Closed'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'product', label: 'Product' },
    { key: 'batchNumber', label: 'Batch / Lot' },
    {
      key: 'recallClass', label: 'Class', badge: (r) =>
        r.recallClass === 'Class I' ? ['rose', r.recallClass]
          : r.recallClass === 'Class II' ? ['amber', r.recallClass]
            : ['slate', r.recallClass || '—'],
    },
    { key: 'recallType', label: 'Type' },
    {
      key: 'status', label: 'Status', badge: (r) =>
        r.status === 'Closed' ? ['green', r.status]
          : r.status === 'In Progress' || r.status === 'Effectiveness Check' ? ['blue', r.status]
            : r.status === 'Notified' ? ['amber', r.status]
              : ['slate', r.status || 'Draft'],
    },
    {
      key: 'batchBlocked', label: 'Batch Blocked', badge: (r) =>
        r.batchBlocked === 'Yes' ? ['green', 'Blocked'] : ['rose', 'Not Blocked'],
    },
    { key: 'quantityAffected', label: 'Qty Affected', align: 'right' },
    { key: 'recoveredPct', label: 'Recovered %', align: 'right' },
    { key: 'initiatedDate', label: 'Initiated', type: 'date' },
  ],
  fields: [
    { key: 'product', label: 'Product Name', required: true, full: true },
    { key: 'ndc', label: 'NDC / Product Code' },
    { key: 'batchNumber', label: 'Batch / Lot Number', required: true },
    { key: 'expiryDate', label: 'Batch Expiry Date', type: 'date' },
    { key: 'recallClass', label: 'Recall Classification', type: 'select', options: ['Class I', 'Class II', 'Class III'], required: true },
    { key: 'recallType', label: 'Recall Type', type: 'select', options: ['Voluntary', 'FDA Requested', 'FDA Mandated', 'Market Withdrawal', 'Stock Recovery'], default: 'Voluntary' },
    { key: 'recallLevel', label: 'Recall Depth', type: 'select', options: ['Consumer/User Level', 'Retail Level', 'Wholesale Level', 'Distributor Level'] },
    { key: 'reason', label: 'Reason for Recall', type: 'textarea', full: true, required: true },
    { key: 'healthHazard', label: 'Health Hazard Evaluation', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Notified', 'In Progress', 'Effectiveness Check', 'Closed'], default: 'Draft' },
    { key: 'initiatedBy', label: 'Initiated By' },
    { key: 'initiatedDate', label: 'Initiated Date', type: 'date' },
    { key: 'quantityAffected', label: 'Quantity Affected (units)', type: 'number' },
    { key: 'quantityRecovered', label: 'Quantity Recovered (units)', type: 'number' },
    { key: 'recoveredPct', label: 'Recovered %', type: 'number' },
    { key: 'distributionArea', label: 'Distribution Area', type: 'select', options: ['Local', 'Statewide', 'Regional', 'Nationwide', 'International'] },
    { key: 'batchBlocked', label: 'Batch Blocked in Inventory', type: 'select', options: ['Yes', 'No'], default: 'No' },
    { key: 'customerNotified', label: 'Customers Notified', type: 'select', options: ['Yes', 'No', 'Partial'], default: 'No' },
    { key: 'notificationDate', label: 'Notification Date', type: 'date' },
    { key: 'regulatoryReported', label: 'Reported to Regulator', type: 'select', options: ['Yes', 'No', 'Pending'], default: 'No' },
    { key: 'regulatoryBody', label: 'Regulatory Body', type: 'select', options: ['FDA', 'EMA', 'MHRA', 'TGA', 'Health Canada', 'CDSCO'] },
    { key: 'reportReference', label: 'Regulatory Report Ref #' },
    { key: 'effectivenessCheck', label: 'Effectiveness Check Outcome', type: 'select', options: ['Pending', 'Satisfactory', 'Unsatisfactory'] },
    { key: 'closedDate', label: 'Recall Closed Date', type: 'date' },
    { key: 'capaRef', label: 'Linked CAPA Reference' },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Recalls', value: rows.length },
    { label: 'Class I (Critical)', value: rows.filter((r) => r.recallClass === 'Class I').length },
    { label: 'Open', value: rows.filter((r) => r.status && r.status !== 'Closed').length },
    { label: 'Batches Blocked', value: rows.filter((r) => r.batchBlocked === 'Yes').length },
  ],
}

export default function Recall() {
  return <CrudModule config={config} />
}
