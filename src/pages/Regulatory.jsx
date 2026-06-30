import CrudModule from '../components/CrudModule'

// Regulatory Affairs — product registrations / marketing authorizations by country,
// submissions (NDA/ANDA/MAA/variations), licenses and renewal tracking.
const config = {
  collection: 'regulatoryRegistrations',
  title: 'Regulatory Affairs',
  subtitle: 'Product registrations, licenses, submissions and renewals by country',
  icon: '📜',
  numberPrefix: 'REG',
  searchKeys: ['product', 'country', 'authorityRef', 'owner', 'marketingAuthHolder'],
  filters: [
    { key: 'status', label: 'Status', options: ['Planned', 'In Preparation', 'Submitted', 'Under Review', 'Deficiency/RFI', 'Approved', 'Rejected', 'Withdrawn', 'Expired'] },
    { key: 'submissionType', label: 'Type', options: ['New Registration', 'NDA', 'ANDA', 'MAA', 'Type II Variation', 'Type IB Variation', 'Type IA Variation', 'Renewal', 'License Amendment'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'product', label: 'Product' },
    { key: 'country', label: 'Country' },
    { key: 'authority', label: 'Authority' },
    { key: 'submissionType', label: 'Type' },
    { key: 'status', label: 'Status', badge: (r) => {
      const map = {
        Approved: 'green', Submitted: 'blue', 'Under Review': 'blue',
        'In Preparation': 'amber', Planned: 'slate', 'Deficiency/RFI': 'amber',
        Rejected: 'rose', Withdrawn: 'rose', Expired: 'rose',
      }
      return [map[r.status] || 'slate', r.status]
    } },
    { key: 'approvalDate', label: 'Approved', type: 'date' },
    { key: 'expiryDate', label: 'Expiry / Renewal', type: 'date' },
  ],
  fields: [
    { key: 'product', label: 'Product (Brand / INN)', required: true, full: true },
    { key: 'dosageForm', label: 'Dosage Form & Strength', full: true },
    { key: 'country', label: 'Country / Region', required: true },
    { key: 'authority', label: 'Health Authority', type: 'select', options: ['FDA', 'EMA', 'MHRA', 'PMDA', 'Health Canada', 'TGA', 'CDSCO', 'ANVISA', 'NMPA', 'SAHPRA', 'Swissmedic', 'SFDA'] },
    { key: 'submissionType', label: 'Submission Type', type: 'select', options: ['New Registration', 'NDA', 'ANDA', 'MAA', 'Type II Variation', 'Type IB Variation', 'Type IA Variation', 'Renewal', 'License Amendment'] },
    { key: 'procedureType', label: 'Procedure', type: 'select', options: ['National', 'Centralised', 'Mutual Recognition (MRP)', 'Decentralised (DCP)', '505(b)(1)', '505(b)(2)', '505(j) ANDA'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'In Preparation', 'Submitted', 'Under Review', 'Deficiency/RFI', 'Approved', 'Rejected', 'Withdrawn', 'Expired'], default: 'Planned' },
    { key: 'authorityRef', label: 'Authority / Application No.' },
    { key: 'marketingAuthHolder', label: 'Marketing Auth. Holder (MAH)' },
    { key: 'submissionDate', label: 'Submission Date', type: 'date' },
    { key: 'approvalDate', label: 'Approval Date', type: 'date' },
    { key: 'expiryDate', label: 'Expiry / Next Renewal', type: 'date' },
    { key: 'ectdSequence', label: 'eCTD Sequence' },
    { key: 'owner', label: 'RA Lead / Owner' },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ],
  stats: (rows) => {
    const now = new Date()
    const in90 = new Date(now.getTime() + 90 * 86400000)
    return [
      { label: 'Total Registrations', value: rows.length },
      { label: 'Approved', value: rows.filter((r) => r.status === 'Approved').length },
      { label: 'Under Review', value: rows.filter((r) => ['Submitted', 'Under Review', 'Deficiency/RFI'].includes(r.status)).length },
      { label: 'Renewals Due (90d)', value: rows.filter((r) => r.expiryDate && new Date(r.expiryDate) <= in90 && new Date(r.expiryDate) >= now).length },
    ]
  },
}

export default function Regulatory() {
  return <CrudModule config={config} />
}
