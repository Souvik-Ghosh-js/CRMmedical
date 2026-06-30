import * as db from './db'

// Immutable-style audit trail (append-only in localStorage).
export function logAudit(action, detail, user) {
  try {
    const u = user || JSON.parse(sessionStorage.getItem('pharmaerp:session') || 'null')
    db.insert('auditLog', {
      action,
      detail,
      user: u?.username || 'system',
      role: u?.role || '—',
      ts: new Date().toISOString(),
    })
  } catch {
    /* never block app flow on audit */
  }
}
