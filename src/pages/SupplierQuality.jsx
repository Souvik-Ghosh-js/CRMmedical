import CrudModule from '../components/CrudModule'

// Supplier Quality Management — supplier qualification, vendor audits,
// performance scoring, approved supplier list (ASL) and risk rating.
// Reflects GMP/ICH Q10 + GDP supplier governance practice.
const config = {
  collection: 'supplierQuality',
  title: 'Supplier Quality',
  subtitle: 'Qualification, audits, performance scoring & approved supplier list',
  icon: '🏭',
  numberPrefix: 'SUP',
  searchKeys: ['supplier', 'material', 'category', 'qualityContact', 'leadAuditor'],
  filters: [
    { key: 'qualStatus', label: 'Qualification', options: ['Pending', 'Provisional', 'Approved', 'Conditional', 'Suspended', 'Disqualified'] },
    { key: 'riskRating', label: 'Risk Rating', options: ['Low', 'Medium', 'High', 'Critical'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'category', label: 'Category' },
    { key: 'material', label: 'Material / Service' },
    { key: 'qualStatus', label: 'Qualification', badge: (r) => {
      const m = { Approved: 'green', Provisional: 'blue', Conditional: 'amber', Pending: 'slate', Suspended: 'rose', Disqualified: 'rose' }
      return [m[r.qualStatus] || 'slate', r.qualStatus]
    } },
    { key: 'riskRating', label: 'Risk', badge: (r) => {
      const m = { Low: 'green', Medium: 'amber', High: 'rose', Critical: 'rose' }
      return [m[r.riskRating] || 'slate', r.riskRating]
    } },
    { key: 'auditType', label: 'Last Audit' },
    { key: 'auditOutcome', label: 'Outcome', badge: (r) => {
      const m = { Satisfactory: 'green', 'Minor Findings': 'amber', 'Major Findings': 'rose', Critical: 'rose', 'Not Audited': 'slate' }
      return [m[r.auditOutcome] || 'slate', r.auditOutcome || '—']
    } },
    { key: 'lastAuditDate', label: 'Audit Date', type: 'date' },
    { key: 'reauditDue', label: 'Re-audit Due', type: 'date' },
    { key: 'scorecard', label: 'Score', align: 'right' },
  ],
  fields: [
    { key: 'supplier', label: 'Supplier / Vendor Name', required: true, full: true },
    { key: 'category', label: 'Supplier Category', type: 'select', options: ['API Manufacturer', 'Excipient Supplier', 'Primary Packaging', 'Secondary Packaging', 'Contract Manufacturer (CMO)', 'Contract Lab (CRO/CTL)', 'Raw Material', 'Equipment / Calibration', 'Logistics / Distribution', 'Cleaning / Service'], required: true },
    { key: 'material', label: 'Material / Service Supplied', full: true },
    { key: 'gmpCritical', label: 'GMP Criticality', type: 'select', options: ['Critical (Direct Product Contact)', 'Major', 'Minor', 'Non-GMP'], default: 'Major' },
    { key: 'qualStatus', label: 'Qualification Status', type: 'select', options: ['Pending', 'Provisional', 'Approved', 'Conditional', 'Suspended', 'Disqualified'], default: 'Pending', required: true },
    { key: 'qualMethod', label: 'Qualification Method', type: 'select', options: ['Questionnaire', 'On-site Audit', 'Remote / Desktop Audit', 'Paper Assessment', '3rd-Party Certificate'] },
    { key: 'riskRating', label: 'Risk Rating', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    { key: 'auditType', label: 'Latest Audit Type', type: 'select', options: ['Initial Qualification', 'Routine / Periodic', 'For-Cause', 'Re-qualification', 'Not Audited'], default: 'Not Audited' },
    { key: 'auditOutcome', label: 'Audit Outcome', type: 'select', options: ['Not Audited', 'Satisfactory', 'Minor Findings', 'Major Findings', 'Critical'], default: 'Not Audited' },
    { key: 'leadAuditor', label: 'Lead Auditor' },
    { key: 'lastAuditDate', label: 'Last Audit Date', type: 'date' },
    { key: 'reauditDue', label: 'Re-audit Due', type: 'date' },
    { key: 'openCapas', label: 'Open CAPAs', type: 'number' },
    { key: 'scorecard', label: 'Performance Score (0-100)', type: 'number' },
    { key: 'otifPct', label: 'On-Time-In-Full (%)', type: 'number' },
    { key: 'rejectRatePct', label: 'Lot Reject Rate (%)', type: 'number' },
    { key: 'qaAgreement', label: 'Quality Agreement', type: 'select', options: ['Not Required', 'In Draft', 'Under Review', 'Executed', 'Expired'], default: 'In Draft' },
    { key: 'qualityContact', label: 'Supplier QA Contact' },
    { key: 'country', label: 'Country of Origin' },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Suppliers', value: rows.length },
    { label: 'Approved (ASL)', value: rows.filter((r) => r.qualStatus === 'Approved').length },
    { label: 'High / Critical Risk', value: rows.filter((r) => r.riskRating === 'High' || r.riskRating === 'Critical').length },
    { label: 'Re-audit Overdue', value: rows.filter((r) => r.reauditDue && new Date(r.reauditDue) < new Date()).length },
  ],
}

export default function SupplierQuality() {
  return <CrudModule config={config} />
}
