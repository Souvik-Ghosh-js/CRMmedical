import { resetAll } from '../lib/db'
import { PageHeader, Badge } from '../components/ui'

export default function Settings() {
  const reset = () => {
    if (confirm('Reset ALL data to demo seed? This clears every product, invoice, customer and transaction you have entered.')) {
      resetAll()
      location.reload()
    }
  }

  const features = [
    ['GST E-Invoice (IRN/QR)', 'Scaffolded'], ['E-Way Bill', 'Scaffolded'], ['Two-Factor Auth', 'Planned'],
    ['Single Sign-On (SSO)', 'Planned'], ['Field-level permissions', 'Planned'], ['Multi-currency', 'Config ready'],
    ['Barcode / QR scanning', 'Planned'], ['OCR invoice scanning', 'Planned'], ['Power BI integration', 'Planned'],
  ]

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration & data management" />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Enterprise Capabilities</h3>
          <div className="space-y-2">
            {features.map(([f, status]) => (
              <div key={f} className="flex items-center justify-between text-sm border-b border-slate-100 pb-1.5">
                <span>{f}</span>
                <Badge tone={status === 'Config ready' ? 'green' : status === 'Scaffolded' ? 'blue' : 'amber'}>{status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-2">Data Management</h3>
          <p className="text-sm text-slate-500 mb-4">All data is stored locally in your browser (localStorage). It persists across refreshes and survives closing the tab. Export any module to Excel from its screen.</p>
          <button className="btn-danger" onClick={reset}>↺ Reset to Demo Data</button>
          <div className="mt-4 text-xs text-slate-400">
            Storage backend: <b>localStorage</b> · No server required.<br />
            Swap <code>src/lib/db.js</code> for API calls to connect a real backend later — the rest of the app is unchanged.
          </div>
        </div>
      </div>
    </div>
  )
}
