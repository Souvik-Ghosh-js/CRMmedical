import CrudModule from '../components/CrudModule'

// Formula & Recipe (Master Formula Record / Bill of Materials) — the controlled,
// versioned master document that defines how a product is manufactured. In real
// pharma operations each formula carries a version/revision number, an approval
// lifecycle (Draft → Review → Approved → Effective → Superseded/Obsolete),
// standard batch size, dosage form, theoretical & actual yield, costing per batch
// and a full revision history with change-control linkage. We model the master
// record here; line-level BOM ingredients are captured in the ingredients/notes
// detail so the module stays a single configurable register.
const config = {
  collection: 'formulaRecords',
  title: 'Formula & Recipe',
  subtitle: 'Versioned master formulas (MFR/BOM) with approval, costing, yield & revision history',
  icon: '🧪',
  numberPrefix: 'FRM',
  searchKeys: ['productName', 'owner', 'dosageForm', 'changeControlRef', 'strength'],
  filters: [
    { key: 'status', label: 'Status', options: ['Draft', 'Under Review', 'Approved', 'Effective', 'Superseded', 'Obsolete', 'Rejected'] },
    { key: 'dosageForm', label: 'Dosage Form', options: ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injectable', 'Ointment', 'Cream', 'Gel', 'Sachet', 'Solution', 'Powder'] },
    { key: 'severity', label: 'Change Class', options: ['No Change', 'Minor', 'Major', 'Critical'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'productName', label: 'Product' },
    { key: 'strength', label: 'Strength' },
    { key: 'dosageForm', label: 'Dosage Form' },
    { key: 'version', label: 'Ver.' },
    { key: 'status', label: 'Status', badge: (r) => {
      if (r.status === 'Approved' || r.status === 'Effective') return ['green', r.status]
      if (r.status === 'Rejected' || r.status === 'Obsolete') return ['rose', r.status]
      if (r.status === 'Superseded') return ['slate', r.status]
      if (r.status === 'Under Review') return ['blue', r.status]
      return ['amber', r.status || '—']
    } },
    { key: 'severity', label: 'Change Class', badge: (r) => {
      const map = { Critical: 'rose', Major: 'amber', Minor: 'blue', 'No Change': 'slate' }
      return [map[r.severity] || 'slate', r.severity || '—']
    } },
    { key: 'batchSize', label: 'Batch Size', align: 'right' },
    { key: 'costPerBatch', label: 'Cost / Batch', align: 'right' },
    { key: 'effectiveDate', label: 'Effective', type: 'date' },
  ],
  fields: [
    { key: 'productName', label: 'Product Name', required: true, full: true },
    { key: 'strength', label: 'Strength / Potency' },
    { key: 'dosageForm', label: 'Dosage Form', type: 'select', options: ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injectable', 'Ointment', 'Cream', 'Gel', 'Sachet', 'Solution', 'Powder'], default: 'Tablet' },
    { key: 'version', label: 'Version / Revision No.', default: '1.0' },
    { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Under Review', 'Approved', 'Effective', 'Superseded', 'Obsolete', 'Rejected'], default: 'Draft' },
    { key: 'severity', label: 'Change Classification', type: 'select', options: ['No Change', 'Minor', 'Major', 'Critical'], default: 'No Change' },
    { key: 'formulaType', label: 'Formula Type', type: 'select', options: ['Commercial', 'R&D / Trial', 'Pilot / Scale-up', 'Exhibit', 'Stability'], default: 'Commercial' },
    { key: 'batchSize', label: 'Standard Batch Size', type: 'number' },
    { key: 'batchUom', label: 'Batch UOM', type: 'select', options: ['Units', 'kg', 'g', 'L', 'mL', 'Tablets', 'Capsules'], default: 'kg' },
    { key: 'theoreticalYield', label: 'Theoretical Yield', type: 'number' },
    { key: 'actualYield', label: 'Actual Yield', type: 'number' },
    { key: 'yieldPct', label: 'Yield %', type: 'number' },
    { key: 'rawMaterialCost', label: 'Raw Material Cost', type: 'number' },
    { key: 'packagingCost', label: 'Packaging Cost', type: 'number' },
    { key: 'costPerBatch', label: 'Total Cost / Batch', type: 'number' },
    { key: 'costPerUnit', label: 'Cost / Unit', type: 'number' },
    { key: 'owner', label: 'Formula Owner (R&D/QA)' },
    { key: 'approvedBy', label: 'Approved By' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date' },
    { key: 'reviewDate', label: 'Next Review Date', type: 'date' },
    { key: 'changeControlRef', label: 'Change Control Ref.' },
    { key: 'supersedesVersion', label: 'Supersedes Version' },
    { key: 'ingredients', label: 'Ingredients / BOM (qty per batch)', type: 'textarea', full: true },
    { key: 'manufacturingProcess', label: 'Manufacturing Process / Instructions', type: 'textarea', full: true },
    { key: 'revisionHistory', label: 'Revision History / Reason for Change', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Formulas', value: rows.length },
    { label: 'Effective', value: rows.filter((r) => r.status === 'Effective').length },
    { label: 'Pending Approval', value: rows.filter((r) => ['Draft', 'Under Review'].includes(r.status)).length },
    { label: 'Review Overdue', value: rows.filter((r) => r.reviewDate && !['Obsolete', 'Superseded'].includes(r.status) && new Date(r.reviewDate) < new Date()).length },
  ],
}

export default function Formula() {
  return <CrudModule config={config} />
}
