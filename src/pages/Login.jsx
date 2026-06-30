import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login, company } = useAuth()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!login(username.trim(), password)) setErr('Invalid username or password.')
  }

  return (
    <div className="h-full grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-brand-700 text-white p-12">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center text-2xl font-bold">℞</div>
          <div>
            <div className="text-xl font-bold">PharmaERP</div>
            <div className="text-brand-200 text-sm">Life Sciences Suite</div>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight">Enterprise Pharmaceutical ERP</h1>
          <p className="text-brand-100 mt-3 max-w-md">
            Inventory, GST billing, batch traceability, quality, compliance, manufacturing and AI analytics — one suite.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {['ERP', 'WMS', 'QMS', 'MES', 'CRM', 'BI', 'Pharmacovigilance', 'Serialization'].map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-white/10 text-sm">{t}</span>
            ))}
          </div>
        </div>
        <div className="text-brand-200 text-xs">© 2026 {company?.name} · GSTIN {company?.gstin}</div>
      </div>

      <div className="flex items-center justify-center p-8 bg-slate-100">
        <form onSubmit={submit} className="card w-full max-w-sm p-8">
          <h2 className="text-xl font-bold text-slate-800">Sign in</h2>
          <p className="text-sm text-slate-500 mb-6">Access your pharmacy management console.</p>

          <label className="label">Username</label>
          <input className="input mb-4" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />

          <label className="label">Password</label>
          <input className="input mb-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {err && <div className="text-rose-600 text-sm mb-3">{err}</div>}

          <button className="btn-primary w-full justify-center">Sign in</button>

          <div className="mt-5 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="font-semibold text-slate-600 mb-1">Demo logins</div>
            Admin — <b>admin / admin</b><br />
            Pharmacist — <b>staff / staff</b>
          </div>
        </form>
      </div>
    </div>
  )
}
