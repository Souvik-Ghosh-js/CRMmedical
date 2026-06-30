import CrudModule from '../components/CrudModule'

// Quality Management System (QMS) — single register covering the core GMP quality
// events: Deviations, CAPA, Change Control, Non-Conformance and Complaints.
// In real pharma operations each of these shares a common lifecycle (initiate →
// investigate/assess → action → review → approve → close) with risk classification,
// QA ownership, regulatory impact and effectiveness verification, so we model them
// as one configurable record type distinguished by a "Record Type" field.
const config = {
  collection: 'qmsRecords',
  title: 'Quality Management (QMS)',
  subtitle: 'Deviations, CAPA, change control, non-conformance & complaints',
  icon: '🛡️',
  numberPrefix: 'QMS',
  searchKeys: ['title', 'owner', 'product', 'recordType', 'rootCause'],
  filters: [
    { key: 'recordType', label: 'Type', options: ['Deviation', 'CAPA', 'Change Control', 'Non-Conformance', 'Complaint'] },
    { key: 'status', label: 'Status', options: ['Open', 'Under Investigation', 'Pending Approval', 'Implemented', 'Verifying Effectiveness', 'Closed', 'Rejected'] },
    { key: 'severity', label: 'Severity', options: ['Minor', 'Major', 'Critical'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'recordType', label: 'Type', badge: (r) => {
      const map = { Deviation: 'amber', CAPA: 'blue', 'Change Control': 'brand', 'Non-Conformance': 'rose', Complaint: 'slate' }
      return [map[r.recordType] || 'slate', r.recordType || '—']
    } },
    { key: 'title', label: 'Title' },
    { key: 'product', label: 'Product / Area' },
    { key: 'severity', label: 'Severity', badge: (r) => {
      const map = { Critical: 'rose', Major: 'amber', Minor: 'slate' }
      return [map[r.severity] || 'slate', r.severity || '—']
    } },
    { key: 'status', label: 'Status', badge: (r) => {
      if (r.status === 'Closed' || r.status === 'Implemented') return ['green', r.status]
      if (r.status === 'Rejected') return ['rose', r.status]
      if (r.status === 'Pending Approval' || r.status === 'Verifying Effectiveness') return ['blue', r.status]
      return ['amber', r.status || '—']
    } },
    { key: 'owner', label: 'QA Owner' },
    { key: 'dateRaised', label: 'Raised', type: 'date' },
    { key: 'targetClosure', label: 'Target Close', type: 'date' },
  ],
  fields: [
    { key: 'title', label: 'Title / Summary', required: true, full: true },
    { key: 'recordType', label: 'Record Type', type: 'select', required: true, options: ['Deviation', 'CAPA', 'Change Control', 'Non-Conformance', 'Complaint'], default: 'Deviation' },
    { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Under Investigation', 'Pending Approval', 'Implemented', 'Verifying Effectiveness', 'Closed', 'Rejected'], default: 'Open' },
    { key: 'severity', label: 'Severity / Risk', type: 'select', options: ['Minor', 'Major', 'Critical'], default: 'Minor' },
    { key: 'classification', label: 'Classification', type: 'select', options: ['Planned', 'Unplanned', 'Product Quality', 'Process', 'Facility/Utility', 'Documentation', 'Supplier'] },
    { key: 'product', label: 'Product / Process Area' },
    { key: 'batchNo', label: 'Batch / Lot No.' },
    { key: 'department', label: 'Department', type: 'select', options: ['Production', 'QA', 'QC', 'Warehouse', 'Engineering', 'Regulatory', 'Packaging', 'R&D'] },
    { key: 'owner', label: 'QA Owner / Assignee' },
    { key: 'initiator', label: 'Initiated By' },
    { key: 'dateRaised', label: 'Date Raised', type: 'date' },
    { key: 'targetClosure', label: 'Target Closure Date', type: 'date' },
    { key: 'rootCause', label: 'Root Cause' },
    { key: 'capaType', label: 'CAPA Type', type: 'select', options: ['—', 'Corrective', 'Preventive', 'Both'], default: '—' },
    { key: 'regulatoryImpact', label: 'Regulatory Impact', type: 'select', options: ['None', 'Notification Required', 'Prior Approval Required', 'Field Alert / Recall'], default: 'None' },
    { key: 'effectivenessCheck', label: 'Effectiveness Check', type: 'select', options: ['Not Required', 'Pending', 'Verified - Effective', 'Verified - Not Effective'], default: 'Not Required' },
    { key: 'descriptionDetail', label: 'Description / Investigation', type: 'textarea', full: true },
    { key: 'actionPlan', label: 'Action Plan / CAPA', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Records', value: rows.length },
    { label: 'Open / In Progress', value: rows.filter((r) => !['Closed', 'Rejected'].includes(r.status)).length },
    { label: 'Critical', value: rows.filter((r) => r.severity === 'Critical').length },
    { label: 'Overdue', value: rows.filter((r) => r.targetClosure && !['Closed', 'Rejected'].includes(r.status) && new Date(r.targetClosure) < new Date()).length },
  ],
}

export default function Qms() {
  return <CrudModule config={config} />
}
