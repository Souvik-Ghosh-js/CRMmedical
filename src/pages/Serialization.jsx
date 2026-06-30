import CrudModule from '../components/CrudModule'

// GS1 serialization & aggregation register for pharmaceutical track-and-trace.
// Tracks unique serial numbers (sNDC/GTIN + serial), 2D DataMatrix/QR encoding,
// the packaging aggregation hierarchy (item → carton → pallet/SSCC) and the
// serial lifecycle status used for anti-counterfeit verification and reporting.
const config = {
  collection: 'serializationSerials',
  title: 'Serialization',
  subtitle: 'GS1 serial numbers, 2D barcodes, packaging aggregation & anti-counterfeit verification',
  icon: '🔖',
  numberPrefix: 'SER',
  searchKeys: ['product', 'gtin', 'serial', 'sscc', 'lot', 'parentId'],
  filters: [
    { key: 'status', label: 'Status', options: ['Commissioned', 'Packed', 'Aggregated', 'Shipped', 'Dispensed', 'Decommissioned', 'Quarantined'] },
    { key: 'level', label: 'Pack Level', options: ['Item / Unit (Each)', 'Bundle / Inner', 'Carton / Case', 'Pallet (SSCC)'] },
    { key: 'verification', label: 'Verification', options: ['Pending', 'Verified', 'Suspect', 'Counterfeit'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'product', label: 'Product' },
    { key: 'gtin', label: 'GTIN' },
    { key: 'serial', label: 'Serial No.' },
    { key: 'lot', label: 'Lot / Batch' },
    { key: 'level', label: 'Pack Level' },
    {
      key: 'status', label: 'Status', badge: (r) => {
        const map = {
          Commissioned: ['blue', r.status],
          Packed: ['blue', r.status],
          Aggregated: ['brand', r.status],
          Shipped: ['amber', r.status],
          Dispensed: ['green', r.status],
          Decommissioned: ['slate', r.status],
          Quarantined: ['rose', r.status],
        }
        return map[r.status] || ['slate', r.status || '—']
      },
    },
    {
      key: 'verification', label: 'Verification', badge: (r) => {
        const map = {
          Verified: ['green', r.verification],
          Pending: ['amber', r.verification],
          Suspect: ['rose', r.verification],
          Counterfeit: ['rose', r.verification],
        }
        return map[r.verification] || ['slate', r.verification || '—']
      },
    },
    { key: 'expiry', label: 'Expiry', type: 'date' },
  ],
  fields: [
    { key: 'product', label: 'Product / Trade Name', required: true, full: true },
    { key: 'gtin', label: 'GTIN-14 (Company Prefix + Item Ref)', required: true },
    { key: 'serial', label: 'Serial Number (AI 21)', required: true },
    { key: 'lot', label: 'Lot / Batch (AI 10)', required: true },
    { key: 'expiry', label: 'Expiry Date (AI 17)', type: 'date', required: true },
    { key: 'level', label: 'Packaging Level', type: 'select', options: ['Item / Unit (Each)', 'Bundle / Inner', 'Carton / Case', 'Pallet (SSCC)'], default: 'Item / Unit (Each)' },
    { key: 'sscc', label: 'SSCC (AI 00 — case/pallet)' },
    { key: 'parentId', label: 'Parent Aggregation ID (carton/pallet)' },
    { key: 'barcodeType', label: 'Barcode Symbology', type: 'select', options: ['GS1 DataMatrix', 'GS1 QR Code', 'GS1-128 (linear)'], default: 'GS1 DataMatrix' },
    { key: 'status', label: 'Serial Status', type: 'select', options: ['Commissioned', 'Packed', 'Aggregated', 'Shipped', 'Dispensed', 'Decommissioned', 'Quarantined'], default: 'Commissioned' },
    { key: 'verification', label: 'Verification Result', type: 'select', options: ['Pending', 'Verified', 'Suspect', 'Counterfeit'], default: 'Pending' },
    { key: 'market', label: 'Destination Market / Regulation', type: 'select', options: ['US DSCSA', 'EU FMD', 'India DGFT', 'Brazil ANVISA', 'Saudi SFDA', 'Russia Chestny ZNAK', 'Other'] },
    { key: 'line', label: 'Packaging Line / Workstation' },
    { key: 'commissionedAt', label: 'Commissioned On', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Serials', value: rows.length },
    { label: 'Active (Commissioned/Packed/Aggregated)', value: rows.filter((r) => ['Commissioned', 'Packed', 'Aggregated'].includes(r.status)).length },
    { label: 'Shipped', value: rows.filter((r) => r.status === 'Shipped').length },
    { label: 'Suspect / Counterfeit', value: rows.filter((r) => ['Suspect', 'Counterfeit'].includes(r.verification)).length },
  ],
}

export default function Serialization() {
  return <CrudModule config={config} />
}
