import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { NAV } from '../nav'
import { useAuth } from '../lib/auth'

export default function Layout({ children }) {
  const [open, setOpen] = useState(true)
  const { user, logout, company } = useAuth()
  const loc = useLocation()

  const activeItem = NAV.flatMap((s) => s.items).find((i) => i.to === loc.pathname)

  return (
    <div className="h-full flex" style={{ background: '#f6f8fb' }}>
      {/* Sidebar */}
      <aside className={`no-print ${open ? 'w-[260px]' : 'w-0'} transition-all duration-200 shrink-0 overflow-hidden flex flex-col bg-slate-50 border-r border-slate-200/70`}>
        <div className="h-16 flex items-center gap-2.5 px-5 shrink-0">
          <div className="w-9 h-9 rounded-xl grid place-items-center text-white font-bold text-lg shadow-sm" style={{ background: 'linear-gradient(135deg,#6366f1,#4338ca)' }}>℞</div>
          <div className="leading-tight">
            <div className="font-bold text-slate-800 text-[15px]">PharmaERP</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-[0.12em] font-semibold">Life Sciences Suite</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {NAV.map((sec) => (
            <div key={sec.group}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] px-3 mb-1.5">{sec.group}</div>
              <div className="space-y-0.5">
                {sec.items.map((it) => (
                  <NavLink key={it.to} to={it.to} end={it.end}
                    className={({ isActive }) => `pill-nav ${isActive ? 'pill-nav-active' : ''}`}>
                    <span className="nav-ico w-7 h-7 rounded-lg grid place-items-center text-base bg-white border border-slate-200/70 shrink-0 transition-colors">{it.icon}</span>
                    <span className="truncate flex-1">{it.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200/70">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl">
            <div className="w-9 h-9 rounded-full grid place-items-center font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg,#818cf8,#4f46e5)' }}>{user?.name?.[0] || 'U'}</div>
            <div className="leading-tight min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-slate-700 truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{user?.role}</div>
            </div>
            <button className="text-slate-400 hover:text-rose-600 transition" onClick={logout} title="Logout">⏻</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print h-16 bg-white/80 backdrop-blur border-b border-slate-200/70 flex items-center gap-3 px-5 shrink-0 sticky top-0 z-20">
          <button className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 transition" onClick={() => setOpen((o) => !o)} title="Toggle menu">
            <Bars />
          </button>
          <div className="hidden md:block">
            <div className="text-[15px] font-bold text-slate-800 leading-tight">{activeItem?.label || 'Dashboard'}</div>
            <div className="text-[11px] text-slate-400">{company?.name}</div>
          </div>
          <div className="flex-1" />
          <div className="relative hidden sm:block">
            <input className="input pl-9 w-56 lg:w-72" placeholder="Search…" />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </div>
          <button className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 transition relative" title="Notifications">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6" key={loc.pathname}>
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}

function Bars() {
  return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
}
