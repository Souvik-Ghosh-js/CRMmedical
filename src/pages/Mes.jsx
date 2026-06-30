import CrudModule from '../components/CrudModule'

// Manufacturing Execution System (MES)
// Tracks production/batch orders, electronic batch & production records (eBMR/eBPR),
// shop-floor execution status, line/equipment assignment and yield reconciliation.
const config = {
  collection: 'mesProductionOrders',
  title: 'Manufacturing Execution (MES)',
  subtitle: 'Production orders, eBMR/eBPR, shop-floor status & equipment',
  icon: '🏭',
  numberPrefix: 'PO',
  searchKeys: ['code', 'product', 'batchNo', 'workCenter', 'equipment', 'operator'],
  filters: [
    { key: 'status', label: 'Order Status', options: ['Planned', 'Released', 'In Process', 'On Hold', 'Completed', 'Reviewed', 'Closed'] },
    { key: 'recordType', label: 'Record Type', options: ['eBMR', 'eBPR'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'batchNo', label: 'Batch / Lot' },
    { key: 'product', label: 'Product' },
    { key: 'recordType', label: 'Record', badge: (r) => [r.recordType === 'eBMR' ? 'blue' : 'brand', r.recordType || '—'] },
    { key: 'workCenter', label: 'Work Center / Line' },
    { key: 'equipment', label: 'Equipment' },
    {
      key: 'status', label: 'Status', badge: (r) => {
        const t = { Planned: 'slate', Released: 'blue', 'In Process': 'amber', 'On Hold': 'rose', Completed: 'brand', Reviewed: 'brand', Closed: 'green' }
        return [t[r.status] || 'slate', r.status || '—']
      },
    },
    { key: 'yieldPct', label: 'Yield %', align: 'right' },
    { key: 'plannedQty', label: 'Plan Qty', align: 'right' },
    { key: 'startDate', label: 'Start', type: 'date' },
  ],
  fields: [
    { key: 'product', label: 'Product / Material', required: true, full: true },
    { key: 'batchNo', label: 'Batch / Lot Number', required: true },
    { key: 'recordType', label: 'Batch Record Type', type: 'select', options: ['eBMR', 'eBPR'], default: 'eBMR' },
    { key: 'status', label: 'Order Status', type: 'select', options: ['Planned', 'Released', 'In Process', 'On Hold', 'Completed', 'Reviewed', 'Closed'], default: 'Planned' },
    { key: 'workCenter', label: 'Work Center / Line', required: true },
    { key: 'equipment', label: 'Equipment / Asset ID' },
    { key: 'operationStep', label: 'Current Operation Step', options: ['Dispensing', 'Granulation', 'Blending', 'Compression', 'Coating', 'Encapsulation', 'Filling', 'Inspection', 'Packaging', 'Labeling'], type: 'select' },
    { key: 'dosageForm', label: 'Dosage Form', type: 'select', options: ['Tablet', 'Capsule', 'Oral Liquid', 'Injectable', 'Cream/Ointment', 'API'] },
    { key: 'plannedQty', label: 'Planned Qty', type: 'number' },
    { key: 'actualQty', label: 'Actual Qty Produced', type: 'number' },
    { key: 'uom', label: 'Unit of Measure', type: 'select', options: ['units', 'tablets', 'capsules', 'kg', 'L', 'vials'], default: 'units' },
    { key: 'yieldPct', label: 'Yield %', type: 'number' },
    { key: 'operator', label: 'Lead Operator' },
    { key: 'reviewedBy', label: 'Reviewed By (QA)' },
    { key: 'startDate', label: 'Planned Start', type: 'date' },
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'deviationRef', label: 'Linked Deviation Ref' },
    { key: 'notes', label: 'Batch Notes / Comments', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Orders', value: rows.length },
    { label: 'In Process', value: rows.filter((r) => r.status === 'In Process').length },
    { label: 'On Hold', value: rows.filter((r) => r.status === 'On Hold').length },
    {
      label: 'Avg Yield %',
      value: (() => {
        const v = rows.map((r) => Number(r.yieldPct || 0)).filter((n) => n > 0)
        return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0
      })(),
    },
  ],
}

export default function Mes() {
  return <CrudModule config={config} />
}
