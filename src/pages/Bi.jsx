import { useMemo } from 'react'
import CrudModule from '../components/CrudModule'
import { useCollection } from '../lib/hooks'
import { LineChart, BarChart, DonutChart, ChartCard } from '../components/charts'
import { Stat } from '../components/ui'
import { inr, num } from '../lib/format'

// Business Intelligence / KPI Registry — the governed catalogue of executive
// performance indicators used across pharma operations. Each record defines a
// single KPI: its business perspective, the metric definition & unit, target vs
// current actual, calculated variance/RAG status, the accountable owner, the
// source system / dashboard it surfaces on, and how often it is refreshed.
// This is what a real KPI catalogue / metric dictionary tracks for governance.
const config = {
  collection: 'biKpiRegistry',
  title: 'BI / KPI Registry',
  subtitle: 'Executive KPIs, targets vs actual, owners, refresh cadence & dashboards',
  icon: '📊',
  numberPrefix: 'KPI',
  searchKeys: ['title', 'owner', 'dashboard', 'sourceSystem', 'definition'],
  filters: [
    { key: 'perspective', label: 'Perspective', options: ['Financial', 'Customer', 'Operations', 'Quality', 'Supply Chain', 'Regulatory', 'People', 'Sales & Marketing'] },
    { key: 'status', label: 'RAG Status', options: ['On Track', 'At Risk', 'Off Track', 'No Data'] },
    { key: 'cadence', label: 'Cadence', options: ['Real-time', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'] },
  ],
  columns: [
    { key: 'code', label: 'ID' },
    { key: 'title', label: 'KPI' },
    { key: 'perspective', label: 'Perspective', badge: (r) => {
      const map = { Financial: 'green', Customer: 'blue', Operations: 'brand', Quality: 'amber', 'Supply Chain': 'slate', Regulatory: 'rose', People: 'slate', 'Sales & Marketing': 'blue' }
      return [map[r.perspective] || 'slate', r.perspective || '—']
    } },
    { key: 'target', label: 'Target', align: 'right' },
    { key: 'actual', label: 'Actual', align: 'right' },
    { key: 'unit', label: 'Unit' },
    { key: 'status', label: 'RAG', badge: (r) => {
      const map = { 'On Track': 'green', 'At Risk': 'amber', 'Off Track': 'rose', 'No Data': 'slate' }
      return [map[r.status] || 'slate', r.status || '—']
    } },
    { key: 'owner', label: 'Owner' },
    { key: 'cadence', label: 'Cadence' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'lastRefresh', label: 'Last Refresh', type: 'date' },
  ],
  fields: [
    { key: 'title', label: 'KPI Name', required: true, full: true },
    { key: 'definition', label: 'Metric Definition / Formula', type: 'textarea', full: true },
    { key: 'perspective', label: 'Business Perspective', type: 'select', required: true, options: ['Financial', 'Customer', 'Operations', 'Quality', 'Supply Chain', 'Regulatory', 'People', 'Sales & Marketing'], default: 'Operations' },
    { key: 'category', label: 'Category', type: 'select', options: ['Leading', 'Lagging', 'Diagnostic', 'Compliance'], default: 'Lagging' },
    { key: 'unit', label: 'Unit of Measure', type: 'select', options: ['%', 'Days', 'Hours', 'Count', 'Ratio', 'Currency (₹)', 'Currency ($)', 'Score', 'PPM'], default: '%' },
    { key: 'direction', label: 'Better Direction', type: 'select', options: ['Higher is better', 'Lower is better', 'Within range'], default: 'Higher is better' },
    { key: 'target', label: 'Target', type: 'number' },
    { key: 'actual', label: 'Current Actual', type: 'number' },
    { key: 'threshold', label: 'At-Risk Threshold', type: 'number' },
    { key: 'status', label: 'RAG Status', type: 'select', options: ['On Track', 'At Risk', 'Off Track', 'No Data'], default: 'No Data' },
    { key: 'cadence', label: 'Refresh Cadence', type: 'select', options: ['Real-time', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'], default: 'Monthly' },
    { key: 'lastRefresh', label: 'Last Refresh Date', type: 'date' },
    { key: 'owner', label: 'KPI Owner (Accountable)' },
    { key: 'dataSteward', label: 'Data Steward' },
    { key: 'sourceSystem', label: 'Source System', type: 'select', options: ['ERP', 'LIMS', 'MES', 'QMS', 'CRM', 'WMS', 'Data Warehouse', 'Manual / Spreadsheet'] },
    { key: 'dashboard', label: 'Dashboard / Report' },
    { key: 'reportingLevel', label: 'Reporting Level', type: 'select', options: ['Board / Executive', 'Site / Plant', 'Department', 'Team'], default: 'Site / Plant' },
    { key: 'fiscalPeriod', label: 'Fiscal Period' },
    { key: 'notes', label: 'Notes / Commentary', type: 'textarea', full: true },
  ],
  stats: (rows) => [
    { label: 'Total KPIs', value: rows.length },
    { label: 'On Track', value: rows.filter((r) => r.status === 'On Track').length },
    { label: 'At Risk / Off Track', value: rows.filter((r) => ['At Risk', 'Off Track'].includes(r.status)).length },
    { label: 'No Data', value: rows.filter((r) => r.status === 'No Data' || !r.status).length },
  ],
}

export default function Bi() {
  const sales = useCollection('sales')
  const products = useCollection('products')
  const customers = useCollection('customers')

  const viz = useMemo(() => {
    const monMap = {}
    sales.forEach((s) => { const k = (s.date || '').slice(0, 7); monMap[k] = (monMap[k] || 0) + Number(s.grandTotal || 0) })
    const months = Object.entries(monMap).sort().slice(-6).map(([k, v]) => ({ label: k.slice(5), value: Math.round(v) }))

    const catMap = {}
    sales.forEach((s) => (s.lines || []).forEach((l) => {
      const p = products.find((x) => x.id === l.productId)
      const cat = p?.category || 'Other'
      catMap[cat] = (catMap[cat] || 0) + (l.lineTaxable || 0)
    }))
    const byCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value: Math.round(value) }))

    const custMap = {}
    sales.forEach((s) => { custMap[s.customerName] = (custMap[s.customerName] || 0) + Number(s.grandTotal || 0) })
    const topCustomers = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value: Math.round(value) }))

    const revenue = sales.reduce((s, i) => s + Number(i.grandTotal || 0), 0)
    const aov = sales.length ? revenue / sales.length : 0
    return { months, byCategory, topCustomers, revenue, aov }
  }, [sales, products, customers])

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Group Revenue" value={inr(viz.revenue)} icon="📈" tone="brand" spark={viz.months.map((m) => m.value)} />
        <Stat label="Avg Order Value" value={inr(viz.aov)} icon="🧾" tone="green" />
        <Stat label="Active Products" value={num(products.length)} icon="💊" tone="amber" />
        <Stat label="Clients" value={num(customers.length)} icon="🧑" tone="slate" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard className="lg:col-span-2" title="Revenue Trend" subtitle="Executive view — monthly"><LineChart data={viz.months} height={240} color="#8b5cf6" /></ChartCard>
        <ChartCard title="Sales by Category"><DonutChart data={viz.byCategory} centerValue={viz.byCategory.length} centerLabel="categories" /></ChartCard>
      </div>
      <ChartCard title="Top Clients" subtitle="By revenue"><BarChart data={viz.topCustomers} horizontal /></ChartCard>
      <CrudModule config={config} />
    </div>
  )
}
