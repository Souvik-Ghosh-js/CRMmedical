import CrudModule from '../components/CrudModule'

// Pharma CRM — field-force / customer relationship management for a pharmaceutical company.
// Tracks the prescriber & trade network (doctors, chemists, hospitals), the medical reps
// who own those relationships, marketing campaigns and physician-sample distribution —
// the core data a pharma CRM / SFE (sales-force effectiveness) system maintains.
const config = {
  collection: 'pharmaCrmContacts',
  title: 'Pharma CRM',
  subtitle: 'Doctors, chemists, hospitals, medical reps, campaigns & sample distribution',
  icon: '🩺',
  numberPrefix: 'CRM',
  searchKeys: ['name', 'speciality', 'territory', 'mrName', 'campaign', 'city', 'mobile'],
  filters: [
    { key: 'type', label: 'Account Type', options: ['Doctor', 'Chemist / Pharmacy', 'Hospital', 'Stockist / Distributor', 'Medical Rep (MR)'] },
    { key: 'status', label: 'Status', options: ['Prospect', 'Active', 'KOL / Key Account', 'Dormant', 'Do Not Visit'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type', badge: (r) => {
      const m = { 'Doctor': 'blue', 'Chemist / Pharmacy': 'brand', 'Hospital': 'slate', 'Stockist / Distributor': 'amber', 'Medical Rep (MR)': 'green' }
      return [m[r.type] || 'slate', r.type || '—']
    } },
    { key: 'speciality', label: 'Speciality / Segment' },
    { key: 'territory', label: 'Territory' },
    { key: 'mrName', label: 'Owner (MR)' },
    { key: 'rxPotential', label: 'Rx Potential', badge: (r) => {
      const m = { 'Low': 'slate', 'Medium': 'blue', 'High': 'amber', 'Very High': 'rose' }
      return [m[r.rxPotential] || 'slate', r.rxPotential || '—']
    } },
    { key: 'samplesIssued', label: 'Samples', align: 'right' },
    { key: 'lastVisit', label: 'Last Visit', type: 'date' },
    { key: 'status', label: 'Status', badge: (r) => {
      const m = { 'Active': 'green', 'KOL / Key Account': 'brand', 'Prospect': 'blue', 'Dormant': 'amber', 'Do Not Visit': 'rose' }
      return [m[r.status] || 'slate', r.status || '—']
    } },
  ],
  fields: [
    { key: 'name', label: 'Contact / Account Name', required: true, full: true },
    { key: 'type', label: 'Account Type', type: 'select', required: true, options: ['Doctor', 'Chemist / Pharmacy', 'Hospital', 'Stockist / Distributor', 'Medical Rep (MR)'], default: 'Doctor' },
    { key: 'status', label: 'Status', type: 'select', options: ['Prospect', 'Active', 'KOL / Key Account', 'Dormant', 'Do Not Visit'], default: 'Active' },
    { key: 'speciality', label: 'Speciality / Segment', full: true }, // e.g. Cardiology, Retail Chemist, Multispeciality
    { key: 'qualification', label: 'Qualification / Degree' }, // MBBS, MD, DM
    { key: 'mciNumber', label: 'MCI / Registration No.' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'clinicName', label: 'Clinic / Pharmacy / Hospital' },
    { key: 'address', label: 'Address', full: true },
    { key: 'city', label: 'City' },
    { key: 'territory', label: 'Territory / Beat' },
    { key: 'mrName', label: 'Assigned MR (Owner)' },
    { key: 'rxPotential', label: 'Rx / Sales Potential', type: 'select', options: ['Low', 'Medium', 'High', 'Very High'], default: 'Medium' },
    { key: 'preferredBrands', label: 'Focus Brands / Products', full: true },
    { key: 'visitFrequency', label: 'Call Frequency / Month', type: 'number' },
    { key: 'lastVisit', label: 'Last Visit Date', type: 'date' },
    { key: 'nextVisit', label: 'Next Planned Visit', type: 'date' },
    { key: 'campaign', label: 'Linked Campaign' },
    { key: 'samplesIssued', label: 'Samples Issued (units)', type: 'number' },
    { key: 'lastSample', label: 'Last Sample Item' },
    { key: 'monthlyRx', label: 'Est. Monthly Rx Value (INR)', type: 'number' },
    { key: 'notes', label: 'Notes / Call Remarks', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Contacts', value: rows.length },
    { label: 'Doctors', value: rows.filter((r) => r.type === 'Doctor').length },
    { label: 'KOL / Key Accounts', value: rows.filter((r) => r.status === 'KOL / Key Account').length },
    { label: 'Samples Issued', value: rows.reduce((s, r) => s + Number(r.samplesIssued || 0), 0) },
  ],
}

export default function PharmaCrm() {
  return <CrudModule config={config} />
}
