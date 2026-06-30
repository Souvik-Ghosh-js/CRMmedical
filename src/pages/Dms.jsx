import CrudModule from '../components/CrudModule'

// Distributor Management System (DMS) — tracks the secondary distribution network
// of a pharma company: distributors/stockists, retailers, secondary sales primary
// transactions, trade schemes, sales-rep incentives and beat/route coverage.
const config = {
  collection: 'dmsDistributors',
  title: 'Distributor Management (DMS)',
  subtitle: 'Distributors, retailers, secondary sales, schemes, incentives & routes',
  icon: '🚚',
  numberPrefix: 'DMS',
  searchKeys: ['name', 'firm', 'territory', 'beat', 'drugLicense', 'gstin', 'asm'],
  filters: [
    { key: 'type', label: 'Channel Type', options: ['Super Stockist', 'C&F Agent', 'Distributor', 'Wholesaler', 'Retailer', 'Chemist'] },
    { key: 'status', label: 'Status', options: ['Active', 'On Hold', 'Credit Blocked', 'License Expired', 'Inactive'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'name', label: 'Distributor / Retailer' },
    { key: 'firm', label: 'Firm Name' },
    { key: 'type', label: 'Channel', badge: (r) => {
      const tone = r.type === 'Retailer' || r.type === 'Chemist' ? 'blue'
        : r.type === 'Distributor' || r.type === 'Wholesaler' ? 'brand' : 'slate'
      return [tone, r.type]
    } },
    { key: 'territory', label: 'Territory' },
    { key: 'beat', label: 'Beat / Route' },
    { key: 'status', label: 'Status', badge: (r) => {
      const map = { 'Active': 'green', 'On Hold': 'amber', 'Credit Blocked': 'rose', 'License Expired': 'rose', 'Inactive': 'slate' }
      return [map[r.status] || 'slate', r.status]
    } },
    { key: 'licenseExpiry', label: 'DL Expiry', type: 'date' },
    { key: 'creditLimit', label: 'Credit Limit', align: 'right' },
    { key: 'outstanding', label: 'Outstanding', align: 'right' },
    { key: 'secondarySalesMtd', label: 'Sec. Sales MTD', align: 'right' },
  ],
  fields: [
    { key: 'name', label: 'Contact / Owner Name', required: true },
    { key: 'firm', label: 'Firm / Trade Name', required: true },
    { key: 'type', label: 'Channel Type', type: 'select', required: true, options: ['Super Stockist', 'C&F Agent', 'Distributor', 'Wholesaler', 'Retailer', 'Chemist'], default: 'Distributor' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Hold', 'Credit Blocked', 'License Expired', 'Inactive'], default: 'Active' },
    { key: 'territory', label: 'Territory / Region', required: true },
    { key: 'beat', label: 'Beat / Route Name' },
    { key: 'phone', label: 'Phone / Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'drugLicense', label: 'Drug License No. (20B/21B)' },
    { key: 'licenseExpiry', label: 'Drug License Expiry', type: 'date' },
    { key: 'asm', label: 'Area Sales Manager' },
    { key: 'creditDays', label: 'Credit Period (Days)', type: 'number', default: 30 },
    { key: 'creditLimit', label: 'Credit Limit (₹)', type: 'number' },
    { key: 'outstanding', label: 'Outstanding (₹)', type: 'number' },
    { key: 'marginPct', label: 'Trade Margin (%)', type: 'number', default: 10 },
    { key: 'scheme', label: 'Active Scheme', type: 'select', options: ['None', 'QPS - Quantity Purchase', 'Trade Discount 5%', 'Trade Discount 10%', 'Free Goods 10+1', 'Free Goods 5+1', 'Festive Bonus', 'Slow Mover Liquidation'], default: 'None' },
    { key: 'targetMonthly', label: 'Monthly Sales Target (₹)', type: 'number' },
    { key: 'secondarySalesMtd', label: 'Secondary Sales MTD (₹)', type: 'number' },
    { key: 'incentiveEarned', label: 'Incentive Earned (₹)', type: 'number' },
    { key: 'address', label: 'Address', type: 'textarea', full: true },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ],
  stats: (rows) => {
    const active = rows.filter((r) => r.status === 'Active').length
    const secSales = rows.reduce((s, r) => s + Number(r.secondarySalesMtd || 0), 0)
    const outstanding = rows.reduce((s, r) => s + Number(r.outstanding || 0), 0)
    const blocked = rows.filter((r) => r.status === 'Credit Blocked' || r.status === 'License Expired').length
    return [
      { label: 'Total Partners', value: rows.length },
      { label: 'Active', value: active },
      { label: 'Secondary Sales MTD', value: '₹' + secSales.toLocaleString('en-IN') },
      { label: 'Outstanding', value: '₹' + outstanding.toLocaleString('en-IN') },
      { label: 'Blocked / Expired', value: blocked },
    ]
  },
}

export default function Dms() {
  return <CrudModule config={config} />
}
