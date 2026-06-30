import CrudModule from '../components/CrudModule'

const config = {
  collection: 'auditMgmt',
  title: 'Audit Management',
  subtitle: 'Internal, external & supplier audits with checklists, observations and CAPA linkage',
  icon: '🔍',
  numberPrefix: 'AUD',
  searchKeys: ['title', 'auditee', 'leadAuditor', 'scope'],
  filters: [
    { key: 'auditType', label: 'Audit Type', options: ['Internal', 'External / Regulatory', 'Supplier / Vendor', 'For-Cause', 'Mock / Pre-Approval'] },
    { key: 'status', label: 'Status', options: ['Planned', 'Scheduled', 'In Progress', 'Report Pending', 'Closed', 'Cancelled'] },
    { key: 'severity', label: 'Worst Finding', options: ['None', 'Minor', 'Major', 'Critical'] },
  ],
  columns: [
    { key: 'code', label: 'Audit ID' },
    { key: 'title', label: 'Audit Title' },
    {
      key: 'auditType', label: 'Type',
      badge: (r) => r.auditType === 'External / Regulatory' ? ['rose', r.auditType]
        : r.auditType === 'Supplier / Vendor' ? ['blue', r.auditType]
        : r.auditType === 'For-Cause' ? ['amber', r.auditType]
        : ['slate', r.auditType],
    },
    { key: 'auditee', label: 'Auditee / Site' },
    { key: 'leadAuditor', label: 'Lead Auditor' },
    { key: 'scheduledDate', label: 'Audit Date', type: 'date' },
    {
      key: 'status', label: 'Status',
      badge: (r) => r.status === 'Closed' ? ['green', r.status]
        : r.status === 'In Progress' ? ['blue', r.status]
        : r.status === 'Report Pending' ? ['amber', r.status]
        : r.status === 'Cancelled' ? ['slate', r.status]
        : ['brand', r.status],
    },
    {
      key: 'severity', label: 'Worst Finding',
      badge: (r) => r.severity === 'Critical' ? ['rose', r.severity]
        : r.severity === 'Major' ? ['amber', r.severity]
        : r.severity === 'Minor' ? ['blue', r.severity]
        : ['green', r.severity || 'None'],
    },
    { key: 'observationsCount', label: 'Obs.', align: 'right' },
    { key: 'capaRef', label: 'CAPA Ref' },
  ],
  fields: [
    { key: 'title', label: 'Audit Title', required: true, full: true },
    { key: 'auditType', label: 'Audit Type', type: 'select', options: ['Internal', 'External / Regulatory', 'Supplier / Vendor', 'For-Cause', 'Mock / Pre-Approval'], default: 'Internal' },
    { key: 'standard', label: 'Standard / Regulation', type: 'select', options: ['EU GMP', 'US FDA 21 CFR 210/211', 'WHO GMP', 'ICH Q7 (API)', 'ISO 9001', 'ISO 13485', 'Schedule M', 'PIC/S'] },
    { key: 'auditee', label: 'Auditee / Site / Supplier', required: true },
    { key: 'department', label: 'Department / Area', type: 'select', options: ['Production', 'Quality Control', 'Quality Assurance', 'Warehouse', 'Engineering / Utilities', 'Microbiology', 'Packaging', 'Regulatory Affairs', 'Whole Site'] },
    { key: 'scope', label: 'Audit Scope', type: 'textarea', full: true },
    { key: 'leadAuditor', label: 'Lead Auditor' },
    { key: 'auditTeam', label: 'Audit Team Members' },
    { key: 'scheduledDate', label: 'Scheduled / Audit Date', type: 'date' },
    { key: 'reportDueDate', label: 'Report Due Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'Scheduled', 'In Progress', 'Report Pending', 'Closed', 'Cancelled'], default: 'Planned' },
    { key: 'checklistRef', label: 'Checklist / Protocol Ref' },
    { key: 'observationsCount', label: 'No. of Observations', type: 'number' },
    { key: 'criticalCount', label: 'Critical Findings', type: 'number' },
    { key: 'majorCount', label: 'Major Findings', type: 'number' },
    { key: 'minorCount', label: 'Minor Findings', type: 'number' },
    { key: 'severity', label: 'Worst Finding Severity', type: 'select', options: ['None', 'Minor', 'Major', 'Critical'], default: 'None' },
    { key: 'capaRef', label: 'Linked CAPA Ref', },
    { key: 'capaStatus', label: 'CAPA Status', type: 'select', options: ['Not Required', 'Open', 'In Progress', 'Verification Pending', 'Closed'] },
    { key: 'closureDate', label: 'Closure Date', type: 'date' },
    { key: 'notes', label: 'Observations / Notes', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Audits', value: rows.length },
    { label: 'Open / In Progress', value: rows.filter((r) => ['Planned', 'Scheduled', 'In Progress', 'Report Pending'].includes(r.status)).length },
    { label: 'Critical Findings', value: rows.reduce((s, r) => s + (Number(r.criticalCount) || 0), 0) },
    { label: 'Open CAPAs', value: rows.filter((r) => ['Open', 'In Progress', 'Verification Pending'].includes(r.capaStatus)).length },
  ],
}

export default function AuditMgmt() {
  return <CrudModule config={config} />
}
