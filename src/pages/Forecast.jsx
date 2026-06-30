import CrudModule from '../components/CrudModule'

// Demand forecasting module for pharmaceutical supply planning.
// Tracks per-SKU forecast vs actual demand, forecast accuracy (MAPE / bias),
// reorder recommendations against safety stock, seasonality drivers and the
// statistical confidence of each forecast period.
const config = {
  collection: 'demandForecasts',
  title: 'Demand Forecasting',
  subtitle: 'SKU-level forecast vs actual, reorder signals, seasonality & confidence',
  icon: '📈',
  numberPrefix: 'FC',
  searchKeys: ['sku', 'product', 'planner', 'category'],
  filters: [
    { key: 'reorderFlag', label: 'Reorder Signal', options: ['Reorder Now', 'Watch', 'Sufficient', 'Overstock'] },
    { key: 'method', label: 'Method', options: ['Moving Average', 'Exponential Smoothing', 'ARIMA', 'Holt-Winters', 'Regression', 'Manual'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'sku', label: 'SKU' },
    { key: 'product', label: 'Product' },
    { key: 'period', label: 'Period' },
    { key: 'forecastQty', label: 'Forecast', align: 'right' },
    { key: 'actualQty', label: 'Actual', align: 'right' },
    {
      key: 'mape',
      label: 'MAPE %',
      align: 'right',
      badge: (r) => {
        const v = Number(r.mape) || 0
        if (v <= 10) return ['green', `${v}%`]
        if (v <= 25) return ['amber', `${v}%`]
        return ['rose', `${v}%`]
      },
    },
    {
      key: 'confidence',
      label: 'Confidence',
      badge: (r) =>
        r.confidence === 'High' ? ['green', r.confidence] : r.confidence === 'Medium' ? ['amber', r.confidence] : ['rose', r.confidence],
    },
    {
      key: 'reorderFlag',
      label: 'Signal',
      badge: (r) => {
        if (r.reorderFlag === 'Reorder Now') return ['rose', r.reorderFlag]
        if (r.reorderFlag === 'Watch') return ['amber', r.reorderFlag]
        if (r.reorderFlag === 'Overstock') return ['blue', r.reorderFlag]
        return ['green', r.reorderFlag]
      },
    },
    { key: 'reorderQty', label: 'Reorder Qty', align: 'right' },
  ],
  fields: [
    { key: 'sku', label: 'SKU', required: true },
    { key: 'product', label: 'Product Name', required: true, full: true },
    { key: 'category', label: 'Therapeutic Category', type: 'select', options: ['Antibiotics', 'Analgesics', 'Cardiovascular', 'Oncology', 'Vaccines', 'Respiratory', 'Dermatology', 'OTC'] },
    { key: 'period', label: 'Forecast Period (e.g. 2026-Q3)', required: true },
    { key: 'forecastQty', label: 'Forecast Qty (units)', type: 'number' },
    { key: 'actualQty', label: 'Actual Demand (units)', type: 'number' },
    { key: 'method', label: 'Forecast Method', type: 'select', options: ['Moving Average', 'Exponential Smoothing', 'ARIMA', 'Holt-Winters', 'Regression', 'Manual'], default: 'Holt-Winters' },
    { key: 'seasonality', label: 'Seasonality Pattern', type: 'select', options: ['None', 'Flu Season', 'Allergy Season', 'Year-End', 'Summer Peak', 'Tender-Driven'] },
    { key: 'seasonalIndex', label: 'Seasonal Index', type: 'number' },
    { key: 'mape', label: 'MAPE (%)', type: 'number' },
    { key: 'bias', label: 'Forecast Bias (units)', type: 'number' },
    { key: 'confidence', label: 'Confidence Level', type: 'select', options: ['High', 'Medium', 'Low'], default: 'Medium' },
    { key: 'onHand', label: 'On-Hand Stock (units)', type: 'number' },
    { key: 'safetyStock', label: 'Safety Stock (units)', type: 'number' },
    { key: 'reorderPoint', label: 'Reorder Point (units)', type: 'number' },
    { key: 'leadTimeDays', label: 'Lead Time (days)', type: 'number' },
    { key: 'reorderFlag', label: 'Reorder Signal', type: 'select', options: ['Reorder Now', 'Watch', 'Sufficient', 'Overstock'], default: 'Sufficient' },
    { key: 'reorderQty', label: 'Recommended Reorder Qty', type: 'number' },
    { key: 'planner', label: 'Demand Planner' },
    { key: 'notes', label: 'Planning Notes', type: 'textarea', full: true },
  ],
  stats: (rows) => {
    const reorder = rows.filter((r) => r.reorderFlag === 'Reorder Now').length
    const mapes = rows.map((r) => Number(r.mape) || 0).filter((v) => v > 0)
    const avgMape = mapes.length ? Math.round(mapes.reduce((a, b) => a + b, 0) / mapes.length) : 0
    return [
      { label: 'SKUs Forecast', value: rows.length },
      { label: 'Reorder Now', value: reorder, tone: 'rose' },
      { label: 'Avg MAPE %', value: `${avgMape}%` },
    ]
  },
}

export default function Forecast() {
  return <CrudModule config={config} />
}
