export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const num = (n) => Number(n || 0).toLocaleString('en-IN')

export const fmtDate = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date)) return d
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const fmtDateTime = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000)

export const today = () => new Date().toISOString().slice(0, 10)

// Export array-of-objects to a CSV file (opens as Excel).
export function exportCSV(filename, rows, columns) {
  if (!rows.length) {
    alert('No data to export.')
    return
  }
  const cols = columns || Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const header = cols.map((c) => esc(c.label)).join(',')
  const body = rows.map((r) => cols.map((c) => esc(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(',')).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}
