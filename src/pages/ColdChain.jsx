import CrudModule from '../components/CrudModule'

// Cold Chain Monitoring — temperature logs, excursion alerts, refrigerated
// vehicle/GPS tracking for temperature-sensitive pharmaceutical distribution.
const config = {
  collection: 'coldChainLogs',
  title: 'Cold Chain Monitoring',
  subtitle: 'Temperature logs, excursion alerts & refrigerated transport tracking',
  icon: '❄️',
  numberPrefix: 'CCL',
  searchKeys: ['product', 'batch', 'vehicle', 'route', 'dataLogger'],
  filters: [
    { key: 'status', label: 'Status', options: ['In Transit', 'Delivered', 'Excursion', 'On Hold', 'Quarantined'] },
    { key: 'severity', label: 'Severity', options: ['Within Limits', 'Minor', 'Major', 'Critical'] },
    { key: 'storageType', label: 'Storage', options: ['Refrigerated (2-8°C)', 'Frozen (-20°C)', 'Ultra-Low (-70°C)', 'Controlled (15-25°C)'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'product', label: 'Product' },
    { key: 'batch', label: 'Batch/Lot' },
    { key: 'storageType', label: 'Storage Range' },
    {
      key: 'status', label: 'Status', badge: (r) =>
        r.status === 'Delivered' ? ['green', r.status]
          : r.status === 'Excursion' ? ['rose', r.status]
            : r.status === 'Quarantined' ? ['rose', r.status]
              : r.status === 'On Hold' ? ['amber', r.status]
                : ['blue', r.status],
    },
    {
      key: 'severity', label: 'Excursion', badge: (r) =>
        r.severity === 'Critical' ? ['rose', r.severity]
          : r.severity === 'Major' ? ['rose', r.severity]
            : r.severity === 'Minor' ? ['amber', r.severity]
              : ['green', r.severity || 'Within Limits'],
    },
    { key: 'minTemp', label: 'Min °C', align: 'right' },
    { key: 'maxTemp', label: 'Max °C', align: 'right' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'departureTime', label: 'Departure', type: 'date' },
  ],
  fields: [
    { key: 'product', label: 'Product Name', required: true, full: true },
    { key: 'batch', label: 'Batch / Lot No.', required: true },
    { key: 'shipmentId', label: 'Shipment / AWB No.' },
    { key: 'storageType', label: 'Storage Range', type: 'select', options: ['Refrigerated (2-8°C)', 'Frozen (-20°C)', 'Ultra-Low (-70°C)', 'Controlled (15-25°C)'], default: 'Refrigerated (2-8°C)' },
    { key: 'status', label: 'Status', type: 'select', options: ['In Transit', 'Delivered', 'Excursion', 'On Hold', 'Quarantined'], default: 'In Transit' },
    { key: 'severity', label: 'Excursion Severity', type: 'select', options: ['Within Limits', 'Minor', 'Major', 'Critical'], default: 'Within Limits' },
    { key: 'setMin', label: 'Set Point Min (°C)', type: 'number' },
    { key: 'setMax', label: 'Set Point Max (°C)', type: 'number' },
    { key: 'minTemp', label: 'Recorded Min (°C)', type: 'number' },
    { key: 'maxTemp', label: 'Recorded Max (°C)', type: 'number' },
    { key: 'avgTemp', label: 'Average Temp (°C)', type: 'number' },
    { key: 'meanKineticTemp', label: 'MKT (°C)', type: 'number' },
    { key: 'excursionDuration', label: 'Excursion Duration (min)', type: 'number' },
    { key: 'dataLogger', label: 'Data Logger Serial' },
    { key: 'vehicle', label: 'Vehicle / Reefer ID' },
    { key: 'driver', label: 'Driver / Carrier' },
    { key: 'route', label: 'Route' },
    { key: 'gpsLocation', label: 'Last GPS Location' },
    { key: 'origin', label: 'Origin' },
    { key: 'destination', label: 'Destination' },
    { key: 'departureTime', label: 'Departure', type: 'date' },
    { key: 'arrivalTime', label: 'Arrival', type: 'date' },
    { key: 'capaRef', label: 'CAPA / Deviation Ref' },
    { key: 'qaDisposition', label: 'QA Disposition', type: 'select', options: ['Pending', 'Released', 'Rejected', 'Under Review'], default: 'Pending' },
    { key: 'notes', label: 'Notes / Corrective Action', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total Shipments', value: rows.length },
    { label: 'Active Excursions', value: rows.filter((r) => r.status === 'Excursion' || r.severity === 'Critical' || r.severity === 'Major').length, tone: 'rose' },
    { label: 'In Transit', value: rows.filter((r) => r.status === 'In Transit').length, tone: 'blue' },
    { label: 'Quarantined', value: rows.filter((r) => r.status === 'Quarantined' || r.status === 'On Hold').length, tone: 'amber' },
  ],
}

export default function ColdChain() {
  return <CrudModule config={config} />
}
