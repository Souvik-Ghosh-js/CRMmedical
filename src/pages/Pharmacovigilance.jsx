import CrudModule from '../components/CrudModule'

// Pharmacovigilance — Individual Case Safety Reports (ICSR), adverse drug event
// intake, case processing, seriousness/causality assessment, regulatory reporting
// (E2B / MedWatch / CIOMS) and signal detection. Fields mirror ICH E2B(R3) and
// GVP Module VI concepts used by real drug-safety operations.
const config = {
  collection: 'pvAdverseEvents',
  title: 'Pharmacovigilance',
  subtitle: 'Adverse drug events, ICSR case processing, safety reports & signal detection',
  icon: '🛡️',
  numberPrefix: 'AE',
  searchKeys: ['suspectDrug', 'reaction', 'reporter', 'caseProcessor', 'meddraPt'],
  filters: [
    { key: 'seriousness', label: 'Seriousness', options: ['Serious', 'Non-Serious'] },
    { key: 'status', label: 'Case Status', options: ['Intake', 'Data Entry', 'Medical Review', 'QC Review', 'Submitted', 'Closed', 'Follow-up Required'] },
    { key: 'causality', label: 'Causality', options: ['Certain', 'Probable', 'Possible', 'Unlikely', 'Unassessable', 'Not Related'] },
  ],
  columns: [
    { key: 'code', label: 'Case ID' },
    { key: 'suspectDrug', label: 'Suspect Drug' },
    { key: 'meddraPt', label: 'MedDRA PT' },
    { key: 'seriousness', label: 'Seriousness', badge: (r) => r.seriousness === 'Serious' ? ['rose', r.seriousness] : ['slate', r.seriousness || '—'] },
    { key: 'severity', label: 'Severity', badge: (r) => {
      const map = { Mild: 'green', Moderate: 'amber', Severe: 'rose', 'Life-threatening': 'rose', Fatal: 'rose' }
      return [map[r.severity] || 'slate', r.severity || '—']
    } },
    { key: 'causality', label: 'Causality', badge: (r) => {
      const strong = ['Certain', 'Probable', 'Possible']
      return [strong.includes(r.causality) ? 'amber' : 'slate', r.causality || '—']
    } },
    { key: 'expectedness', label: 'Listedness', badge: (r) => r.expectedness === 'Unexpected' ? ['rose', r.expectedness] : ['slate', r.expectedness || '—'] },
    { key: 'status', label: 'Status', badge: (r) => {
      const map = { Closed: 'green', Submitted: 'blue', 'Medical Review': 'amber', 'QC Review': 'amber', 'Follow-up Required': 'rose', Intake: 'slate', 'Data Entry': 'slate' }
      return [map[r.status] || 'slate', r.status || '—']
    } },
    { key: 'reportType', label: 'Report Type' },
    { key: 'receiptDate', label: 'Receipt Date', type: 'date' },
    { key: 'reportingDueDate', label: 'Reg. Due', type: 'date' },
  ],
  fields: [
    { key: 'suspectDrug', label: 'Suspect Drug (Product)', required: true, full: true },
    { key: 'reaction', label: 'Reported Reaction (verbatim)', required: true, full: true },
    { key: 'meddraPt', label: 'MedDRA Preferred Term (PT)' },
    { key: 'meddraSoc', label: 'MedDRA System Organ Class (SOC)', type: 'select', options: [
      'Blood and lymphatic system disorders', 'Cardiac disorders', 'Gastrointestinal disorders',
      'General disorders and administration site conditions', 'Hepatobiliary disorders',
      'Immune system disorders', 'Infections and infestations', 'Nervous system disorders',
      'Psychiatric disorders', 'Renal and urinary disorders', 'Respiratory disorders',
      'Skin and subcutaneous tissue disorders', 'Vascular disorders', 'Other',
    ] },
    { key: 'reportType', label: 'Report Type', type: 'select', options: ['Spontaneous', 'Solicited', 'Clinical Trial', 'Literature', 'Regulatory Authority', 'Patient Support Program'], default: 'Spontaneous' },
    { key: 'reporterType', label: 'Reporter Qualification', type: 'select', options: ['Physician', 'Pharmacist', 'Other Health Professional', 'Consumer/Patient', 'Lawyer'] },
    { key: 'reporter', label: 'Reporter Name / Source' },
    { key: 'country', label: 'Country of Occurrence' },
    { key: 'patientAge', label: 'Patient Age', type: 'number' },
    { key: 'patientSex', label: 'Patient Sex', type: 'select', options: ['Male', 'Female', 'Unknown'] },
    { key: 'doseRoute', label: 'Dose / Route / Frequency' },
    { key: 'indication', label: 'Indication for Use' },
    { key: 'seriousness', label: 'Seriousness', type: 'select', options: ['Serious', 'Non-Serious'], default: 'Non-Serious', required: true },
    { key: 'seriousnessCriteria', label: 'Seriousness Criteria', type: 'select', options: ['Death', 'Life-threatening', 'Hospitalization / Prolonged', 'Disability / Incapacity', 'Congenital Anomaly', 'Other Medically Important', 'Not Applicable'] },
    { key: 'severity', label: 'Severity / Intensity', type: 'select', options: ['Mild', 'Moderate', 'Severe', 'Life-threatening', 'Fatal'] },
    { key: 'outcome', label: 'Outcome', type: 'select', options: ['Recovered/Resolved', 'Recovering/Resolving', 'Not Recovered', 'Recovered with Sequelae', 'Fatal', 'Unknown'] },
    { key: 'causality', label: 'Causality Assessment', type: 'select', options: ['Certain', 'Probable', 'Possible', 'Unlikely', 'Unassessable', 'Not Related'] },
    { key: 'expectedness', label: 'Expectedness (vs CCDS/Label)', type: 'select', options: ['Expected', 'Unexpected'] },
    { key: 'dechallenge', label: 'Dechallenge', type: 'select', options: ['Positive', 'Negative', 'Not Done', 'Unknown'] },
    { key: 'rechallenge', label: 'Rechallenge', type: 'select', options: ['Positive', 'Negative', 'Not Done', 'Unknown'] },
    { key: 'status', label: 'Case Status', type: 'select', options: ['Intake', 'Data Entry', 'Medical Review', 'QC Review', 'Submitted', 'Closed', 'Follow-up Required'], default: 'Intake' },
    { key: 'caseProcessor', label: 'Case Processor / Owner' },
    { key: 'receiptDate', label: 'Initial Receipt Date', type: 'date' },
    { key: 'awarenessDate', label: 'Company Awareness Date', type: 'date' },
    { key: 'reportingDueDate', label: 'Regulatory Reporting Due Date', type: 'date' },
    { key: 'submissionPathway', label: 'Submission Pathway', type: 'select', options: ['FDA FAERS (E2B)', 'FDA MedWatch 3500A', 'EMA EudraVigilance', 'MHRA Yellow Card', 'CIOMS I', 'PMDA', 'Not Yet Submitted'] },
    { key: 'signalFlag', label: 'Signal Detection Flag', type: 'select', options: ['No Signal', 'Under Evaluation', 'Validated Signal', 'Refuted', 'Designated Medical Event (DME)'], default: 'No Signal' },
    { key: 'narrative', label: 'Case Narrative', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Cases', value: rows.length },
    { label: 'Serious Cases', value: rows.filter((r) => r.seriousness === 'Serious').length },
    { label: 'Open (not Closed/Submitted)', value: rows.filter((r) => !['Closed', 'Submitted'].includes(r.status)).length },
    { label: 'Validated Signals', value: rows.filter((r) => r.signalFlag === 'Validated Signal').length },
  ],
}

export default function Pharmacovigilance() {
  return <CrudModule config={config} />
}
