import CrudModule from '../components/CrudModule'

// Stability Studies — ICH Q1A(R2) aligned register of stability protocols, storage
// conditions, sample pull schedules, shelf-life / re-test dating and result status.
const config = {
  collection: 'stabilityStudies',
  title: 'Stability Studies',
  subtitle: 'Protocols, storage conditions, pull schedules, shelf-life & results',
  icon: '🌡️',
  numberPrefix: 'STB',
  searchKeys: ['product', 'batchNo', 'protocolNo', 'owner'],
  filters: [
    { key: 'studyType', label: 'Study Type', options: ['Long-term', 'Intermediate', 'Accelerated', 'In-use', 'Photostability', 'Stress', 'On-going'] },
    { key: 'condition', label: 'Condition', options: ['25°C/60%RH', '30°C/65%RH', '30°C/75%RH', '40°C/75%RH', '5°C ± 3°C', '-20°C', '25°C/40%RH'] },
    { key: 'status', label: 'Status', options: ['Planned', 'In Progress', 'On Hold', 'Completed', 'Discontinued'] },
    { key: 'result', label: 'Result', options: ['Within Spec', 'Trending', 'OOS', 'OOT', 'Pending'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'protocolNo', label: 'Protocol' },
    { key: 'product', label: 'Product' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'studyType', label: 'Study Type' },
    { key: 'condition', label: 'Condition' },
    { key: 'status', label: 'Status', badge: (r) => {
      const map = { Completed: 'green', 'In Progress': 'blue', Planned: 'slate', 'On Hold': 'amber', Discontinued: 'rose' }
      return [map[r.status] || 'slate', r.status]
    } },
    { key: 'result', label: 'Result', badge: (r) => {
      const map = { 'Within Spec': 'green', Trending: 'amber', OOS: 'rose', OOT: 'rose', Pending: 'slate' }
      return [map[r.result] || 'slate', r.result]
    } },
    { key: 'shelfLifeMonths', label: 'Shelf-life (mo)', align: 'right' },
    { key: 'nextPull', label: 'Next Pull', type: 'date' },
  ],
  fields: [
    { key: 'protocolNo', label: 'Protocol No.', required: true },
    { key: 'product', label: 'Product / DP', required: true },
    { key: 'batchNo', label: 'Batch / Lot No.', required: true },
    { key: 'packConfig', label: 'Packaging Configuration', full: true },
    { key: 'studyType', label: 'Study Type', type: 'select', options: ['Long-term', 'Intermediate', 'Accelerated', 'In-use', 'Photostability', 'Stress', 'On-going'], default: 'Long-term' },
    { key: 'condition', label: 'Storage Condition', type: 'select', options: ['25°C/60%RH', '30°C/65%RH', '30°C/75%RH', '40°C/75%RH', '5°C ± 3°C', '-20°C', '25°C/40%RH'] },
    { key: 'orientation', label: 'Storage Orientation', type: 'select', options: ['Upright', 'Inverted', 'Horizontal', 'N/A'], default: 'Upright' },
    { key: 'stationChamber', label: 'Stability Chamber', },
    { key: 'startDate', label: 'Study Start Date', type: 'date' },
    { key: 'pullPoints', label: 'Pull Points (months)', },
    { key: 'nextPull', label: 'Next Pull Date', type: 'date' },
    { key: 'shelfLifeMonths', label: 'Shelf-life / Re-test (months)', type: 'number' },
    { key: 'testParameters', label: 'Test Parameters', full: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'In Progress', 'On Hold', 'Completed', 'Discontinued'], default: 'Planned' },
    { key: 'result', label: 'Latest Result', type: 'select', options: ['Within Spec', 'Trending', 'OOS', 'OOT', 'Pending'], default: 'Pending' },
    { key: 'owner', label: 'Study Owner' },
    { key: 'notes', label: 'Notes / Observations', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Studies', value: rows.length },
    { label: 'In Progress', value: rows.filter((r) => r.status === 'In Progress').length },
    { label: 'OOS / OOT', value: rows.filter((r) => r.result === 'OOS' || r.result === 'OOT').length },
    { label: 'Pull Due ≤30d', value: rows.filter((r) => {
      if (!r.nextPull) return false
      const d = (new Date(r.nextPull) - new Date()) / 86400000
      return d >= 0 && d <= 30
    }).length },
  ],
}

export default function Stability() {
  return <CrudModule config={config} />
}
