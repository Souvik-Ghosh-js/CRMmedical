import CrudModule from '../components/CrudModule'

// Warehouse Management System — bins, zones, FEFO put-away, cycle counts,
// barcode/RFID location tracking for pharma inventory storage.
const config = {
  collection: 'wmsLocations',
  title: 'Warehouse Management',
  subtitle: 'Bins, zones, FEFO put-away, cycle counts & barcode/RFID location tracking',
  icon: '🏬',
  numberPrefix: 'LOC',
  searchKeys: ['binCode', 'product', 'batchNo', 'barcode', 'rfidTag'],
  filters: [
    { key: 'status', label: 'Status', options: ['Available', 'Occupied', 'Reserved', 'Quarantine', 'Blocked', 'Picking'] },
    { key: 'zone', label: 'Zone', options: ['Ambient', 'Cold Chain (2-8°C)', 'Frozen (-20°C)', 'Controlled (CDSCO)', 'Quarantine', 'Reject', 'Dispatch'] },
    { key: 'countStatus', label: 'Cycle Count', options: ['Not Due', 'Due', 'Counting', 'Reconciled', 'Variance'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'binCode', label: 'Bin' },
    { key: 'zone', label: 'Zone' },
    { key: 'product', label: 'Product' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'expiry', label: 'Expiry (FEFO)', type: 'date' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'status', label: 'Status', badge: (r) => {
      const map = { Available: 'green', Occupied: 'blue', Reserved: 'amber', Quarantine: 'amber', Blocked: 'rose', Picking: 'brand' }
      return [map[r.status] || 'slate', r.status]
    } },
    { key: 'countStatus', label: 'Count', badge: (r) => {
      const map = { 'Not Due': 'slate', Due: 'amber', Counting: 'blue', Reconciled: 'green', Variance: 'rose' }
      return [map[r.countStatus] || 'slate', r.countStatus]
    } },
  ],
  fields: [
    { key: 'binCode', label: 'Bin / Location Code', required: true },
    { key: 'aisle', label: 'Aisle' },
    { key: 'rack', label: 'Rack' },
    { key: 'level', label: 'Level / Shelf' },
    { key: 'zone', label: 'Storage Zone', type: 'select', options: ['Ambient', 'Cold Chain (2-8°C)', 'Frozen (-20°C)', 'Controlled (CDSCO)', 'Quarantine', 'Reject', 'Dispatch'], default: 'Ambient' },
    { key: 'status', label: 'Bin Status', type: 'select', options: ['Available', 'Occupied', 'Reserved', 'Quarantine', 'Blocked', 'Picking'], default: 'Available' },
    { key: 'product', label: 'Product', full: true },
    { key: 'batchNo', label: 'Batch / Lot No.' },
    { key: 'mfgDate', label: 'Mfg Date', type: 'date' },
    { key: 'expiry', label: 'Expiry Date (FEFO)', type: 'date' },
    { key: 'qty', label: 'Quantity On Hand', type: 'number' },
    { key: 'uom', label: 'Unit of Measure', type: 'select', options: ['Each', 'Box', 'Carton', 'Pallet', 'Strip', 'Vial', 'Bottle'], default: 'Each' },
    { key: 'capacity', label: 'Bin Capacity', type: 'number' },
    { key: 'putAwayRule', label: 'Put-Away Rule', type: 'select', options: ['FEFO', 'FIFO', 'LIFO', 'Fixed Bin', 'Dynamic'], default: 'FEFO' },
    { key: 'barcode', label: 'Barcode (GS1)' },
    { key: 'rfidTag', label: 'RFID Tag (EPC)' },
    { key: 'countStatus', label: 'Cycle Count Status', type: 'select', options: ['Not Due', 'Due', 'Counting', 'Reconciled', 'Variance'], default: 'Not Due' },
    { key: 'lastCount', label: 'Last Counted', type: 'date' },
    { key: 'temperature', label: 'Recorded Temp (°C)', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Bins', value: rows.length },
    { label: 'Available', value: rows.filter((r) => r.status === 'Available').length },
    { label: 'Count Variances', value: rows.filter((r) => r.countStatus === 'Variance').length },
    { label: 'Quarantine / Blocked', value: rows.filter((r) => r.status === 'Quarantine' || r.status === 'Blocked').length },
  ],
}

export default function Wms() {
  return <CrudModule config={config} />
}
