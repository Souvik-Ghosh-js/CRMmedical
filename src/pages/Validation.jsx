import CrudModule from '../components/CrudModule'

// Validation & Qualification register — covers the full GxP validation lifecycle:
// equipment/facility qualification (DQ/IQ/OQ/PQ), Computer System Validation (CSV,
// per GAMP 5 / 21 CFR Part 11), and Process / Cleaning / Analytical Method validation.
// In real pharma operations these share a common lifecycle (planning → protocol
// approval → execution → deviation/discrepancy handling → report → periodic review)
// with a validation master plan reference, GAMP category, criticality/risk, lifecycle
// stage, validation lead, QA approval and revalidation due date — modelled here as one
// configurable record type distinguished by a "Validation Type" field.
const config = {
  collection: 'validationRecords',
  title: 'Validation & Qualification',
  subtitle: 'IQ/OQ/PQ, computer system, process, cleaning & method validation',
  icon: '✅',
  numberPrefix: 'VAL',
  searchKeys: ['title', 'system', 'owner', 'protocolNo', 'vmpRef', 'validationType'],
  filters: [
    { key: 'validationType', label: 'Type', options: ['Equipment Qualification (DQ/IQ/OQ/PQ)', 'Computer System Validation (CSV)', 'Process Validation', 'Cleaning Validation', 'Analytical Method Validation', 'Facility/Utility Qualification'] },
    { key: 'status', label: 'Status', options: ['Planned', 'Protocol Draft', 'Protocol Approved', 'In Execution', 'Discrepancy Open', 'Report in Review', 'Approved', 'Revalidation Due', 'Retired'] },
    { key: 'criticality', label: 'Criticality', options: ['Low', 'Medium', 'High', 'Critical'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'validationType', label: 'Type', badge: (r) => {
      const map = { 'Equipment Qualification (DQ/IQ/OQ/PQ)': 'blue', 'Computer System Validation (CSV)': 'brand', 'Process Validation': 'amber', 'Cleaning Validation': 'slate', 'Analytical Method Validation': 'green', 'Facility/Utility Qualification': 'slate' }
      return [map[r.validationType] || 'slate', r.validationType || '—']
    } },
    { key: 'title', label: 'Title' },
    { key: 'system', label: 'System / Equipment' },
    { key: 'protocolNo', label: 'Protocol No.' },
    { key: 'criticality', label: 'Criticality', badge: (r) => {
      const map = { Critical: 'rose', High: 'amber', Medium: 'blue', Low: 'slate' }
      return [map[r.criticality] || 'slate', r.criticality || '—']
    } },
    { key: 'status', label: 'Status', badge: (r) => {
      if (r.status === 'Approved') return ['green', r.status]
      if (r.status === 'Retired') return ['slate', r.status]
      if (r.status === 'Discrepancy Open' || r.status === 'Revalidation Due') return ['rose', r.status]
      if (r.status === 'Report in Review' || r.status === 'Protocol Approved') return ['blue', r.status]
      return ['amber', r.status || '—']
    } },
    { key: 'owner', label: 'Validation Lead' },
    { key: 'execEndDate', label: 'Completed', type: 'date' },
    { key: 'revalDate', label: 'Reval Due', type: 'date' },
  ],
  fields: [
    { key: 'title', label: 'Title / Description', required: true, full: true },
    { key: 'validationType', label: 'Validation Type', type: 'select', required: true, options: ['Equipment Qualification (DQ/IQ/OQ/PQ)', 'Computer System Validation (CSV)', 'Process Validation', 'Cleaning Validation', 'Analytical Method Validation', 'Facility/Utility Qualification'], default: 'Equipment Qualification (DQ/IQ/OQ/PQ)' },
    { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'Protocol Draft', 'Protocol Approved', 'In Execution', 'Discrepancy Open', 'Report in Review', 'Approved', 'Revalidation Due', 'Retired'], default: 'Planned' },
    { key: 'phase', label: 'Qualification Phase', type: 'select', options: ['N/A', 'DQ', 'IQ', 'OQ', 'PQ', 'IQ/OQ', 'OQ/PQ', 'PV Stage 1 (Design)', 'PV Stage 2 (PPQ)', 'PV Stage 3 (Continued Verification)'], default: 'N/A' },
    { key: 'system', label: 'System / Equipment / Product' },
    { key: 'assetId', label: 'Asset / Tag No.' },
    { key: 'protocolNo', label: 'Protocol No.' },
    { key: 'vmpRef', label: 'VMP / VRA Reference' },
    { key: 'gampCategory', label: 'GAMP 5 Category (CSV)', type: 'select', options: ['N/A', 'Cat 1 - Infrastructure', 'Cat 3 - Non-configured', 'Cat 4 - Configured', 'Cat 5 - Custom/Bespoke'], default: 'N/A' },
    { key: 'criticality', label: 'Criticality / Risk', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    { key: 'gxpImpact', label: 'GxP Impact', type: 'select', options: ['Non-GxP', 'Indirect Impact', 'Direct Impact'], default: 'Direct Impact' },
    { key: 'part11', label: '21 CFR Part 11 Applicable', type: 'select', options: ['N/A', 'No', 'Yes'], default: 'N/A' },
    { key: 'department', label: 'Department', type: 'select', options: ['Production', 'QA', 'QC', 'Engineering', 'IT', 'Warehouse', 'R&D', 'Regulatory'] },
    { key: 'owner', label: 'Validation Lead' },
    { key: 'qaApprover', label: 'QA Approver' },
    { key: 'protocolApprovalDate', label: 'Protocol Approved', type: 'date' },
    { key: 'execStartDate', label: 'Execution Start', type: 'date' },
    { key: 'execEndDate', label: 'Execution / Completion Date', type: 'date' },
    { key: 'revalDate', label: 'Revalidation Due Date', type: 'date' },
    { key: 'acceptanceCriteria', label: 'Acceptance Criteria', type: 'textarea', full: true },
    { key: 'discrepancies', label: 'Deviations / Discrepancies', type: 'textarea', full: true },
    { key: 'notes', label: 'Summary / Conclusion', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Records', value: rows.length },
    { label: 'In Progress', value: rows.filter((r) => !['Approved', 'Retired'].includes(r.status)).length },
    { label: 'Open Discrepancies', value: rows.filter((r) => r.status === 'Discrepancy Open').length },
    { label: 'Revalidation Due', value: rows.filter((r) => r.revalDate && r.status !== 'Retired' && new Date(r.revalDate) < new Date()).length },
  ],
}

export default function Validation() {
  return <CrudModule config={config} />
}
