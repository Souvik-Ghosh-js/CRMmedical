import CrudModule from '../components/CrudModule'

// Electronic Document Management System (EDMS)
// Controlled documents: SOPs, work instructions, specifications, protocols, forms.
// Tracks version control, e-signature / approval workflow, periodic review and
// effective / retirement dates per GxP (21 CFR Part 11, EU GMP Annex 11) practice.
const config = {
  collection: 'edmsControlledDocuments',
  title: 'EDMS — Controlled Documents',
  subtitle: 'SOPs, version control, e-signatures and approval workflow for GxP documents',
  icon: '📄',
  numberPrefix: 'DOC',
  searchKeys: ['code', 'title', 'docType', 'department', 'author', 'owner'],
  filters: [
    {
      key: 'status',
      label: 'Workflow Status',
      options: ['Draft', 'In Review', 'Pending Approval', 'Approved', 'Effective', 'Superseded', 'Obsolete'],
    },
    {
      key: 'docType',
      label: 'Document Type',
      options: ['SOP', 'Work Instruction', 'Policy', 'Specification', 'Protocol', 'Form / Template', 'Validation Report', 'Master Batch Record'],
    },
  ],
  columns: [
    { key: 'code', label: 'Doc ID' },
    { key: 'title', label: 'Title' },
    { key: 'docType', label: 'Type' },
    { key: 'version', label: 'Ver' },
    { key: 'department', label: 'Department' },
    {
      key: 'status',
      label: 'Status',
      badge: (r) => {
        const map = {
          Draft: ['slate', 'Draft'],
          'In Review': ['blue', 'In Review'],
          'Pending Approval': ['amber', 'Pending Approval'],
          Approved: ['brand', 'Approved'],
          Effective: ['green', 'Effective'],
          Superseded: ['amber', 'Superseded'],
          Obsolete: ['rose', 'Obsolete'],
        }
        return map[r.status] || ['slate', r.status || '—']
      },
    },
    { key: 'effectiveDate', label: 'Effective', type: 'date' },
    { key: 'nextReviewDate', label: 'Next Review', type: 'date' },
    { key: 'owner', label: 'Owner' },
  ],
  fields: [
    { key: 'title', label: 'Document Title', required: true, full: true },
    { key: 'docType', label: 'Document Type', type: 'select', required: true, options: ['SOP', 'Work Instruction', 'Policy', 'Specification', 'Protocol', 'Form / Template', 'Validation Report', 'Master Batch Record'], default: 'SOP' },
    { key: 'version', label: 'Version (e.g. 1.0)', required: true, default: '1.0' },
    { key: 'status', label: 'Workflow Status', type: 'select', required: true, options: ['Draft', 'In Review', 'Pending Approval', 'Approved', 'Effective', 'Superseded', 'Obsolete'], default: 'Draft' },
    { key: 'department', label: 'Owning Department', type: 'select', options: ['Quality Assurance', 'Quality Control', 'Manufacturing', 'Regulatory Affairs', 'Warehouse / Logistics', 'Engineering', 'R&D', 'IT'], default: 'Quality Assurance' },
    { key: 'classification', label: 'GxP Classification', type: 'select', options: ['GMP', 'GLP', 'GCP', 'GDP', 'Non-GxP'], default: 'GMP' },
    { key: 'author', label: 'Author', required: true },
    { key: 'reviewer', label: 'Reviewer (QA Review)' },
    { key: 'approver', label: 'Approver (e-Signature)' },
    { key: 'owner', label: 'Document Owner' },
    { key: 'effectiveDate', label: 'Effective Date', type: 'date' },
    { key: 'reviewPeriodMonths', label: 'Review Cycle (months)', type: 'number', default: 24 },
    { key: 'nextReviewDate', label: 'Next Periodic Review', type: 'date' },
    { key: 'supersedes', label: 'Supersedes (prior Doc ID)' },
    { key: 'changeReason', label: 'Reason for Change / Change Control Ref', type: 'textarea', full: true },
    { key: 'notes', label: 'Notes / Distribution', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Documents', value: rows.length },
    { label: 'Effective', value: rows.filter((r) => r.status === 'Effective').length },
    { label: 'Pending Approval', value: rows.filter((r) => r.status === 'Pending Approval' || r.status === 'In Review').length },
    {
      label: 'Review Overdue',
      value: rows.filter((r) => r.nextReviewDate && new Date(r.nextReviewDate) < new Date() && r.status === 'Effective').length,
    },
  ],
}

export default function Edms() {
  return <CrudModule config={config} />
}
