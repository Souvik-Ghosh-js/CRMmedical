import { createContext, useContext, useEffect, useState } from 'react'
import * as db from './db'
import { logAudit } from './audit'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('pharmaerp:session') || 'null') } catch { return null }
  })

  const company = db.list('companies')[0]

  const login = (username, password) => {
    const u = db.list('users').find((x) => x.username === username && x.password === password && x.active)
    if (!u) return false
    const session = { id: u.id, name: u.name, role: u.role, username: u.username }
    sessionStorage.setItem('pharmaerp:session', JSON.stringify(session))
    setUser(session)
    logAudit('Login', `User ${u.username} logged in`, session)
    return true
  }

  const logout = () => {
    logAudit('Logout', `User ${user?.username} logged out`, user)
    sessionStorage.removeItem('pharmaerp:session')
    setUser(null)
  }

  return <AuthCtx.Provider value={{ user, company, login, logout }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
