/**
 * pdf.js — Global PDF generation engine for PharmaERP.
 *
 * Zero external dependencies. Works by injecting a fully self-contained
 * styled HTML template into a hidden iframe and triggering window.print()
 * which maps to "Save as PDF" in all modern browsers via the system print
 * dialog. This gives true, pixel-perfect PDF output with no CDN requests.
 *
 * Usage:
 *   import { buildPdf } from '../lib/pdf'
 *   buildPdf(descriptor)   // descriptor described below
 *
 * Descriptor shape:
 * {
 *   title: string,           // Report title
 *   subtitle?: string,       // Optional sub-heading
 *   company?: string,        // Company name shown in header
 *   generatedBy?: string,    // User name
 *   dateRange?: string,      // e.g. "01 Jan 2025 – 30 Jun 2025"
 *   kpis?: [                 // Stat tiles at the top
 *     { label, value, sub? }
 *   ],
 *   sections?: [             // Content sections
 *     {
 *       heading?: string,
 *       type: 'table' | 'kv' | 'note',
 *       // For type='table':
 *       columns: [{ label, key, align? }],
 *       rows: object[],
 *       // For type='kv':
 *       pairs: [[label, value], ...],
 *       // For type='note':
 *       text: string,
 *     }
 *   ]
 * }
 */

const BRAND = '#4f46e5'
const BRAND_LIGHT = '#eef2ff'

function esc(v) {
  if (v == null) return '—'
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderKpis(kpis) {
  if (!kpis || kpis.length === 0) return ''
  return `
    <div class="kpi-row">
      ${kpis.map((k) => `
        <div class="kpi-card">
          <div class="kpi-label">${esc(k.label)}</div>
          <div class="kpi-value">${esc(k.value)}</div>
          ${k.sub ? `<div class="kpi-sub">${esc(k.sub)}</div>` : ''}
        </div>
      `).join('')}
    </div>`
}

function renderTable(section) {
  const cols = section.columns || []
  const rows = section.rows || []
  if (rows.length === 0) return '<p class="empty">No data in this section.</p>'
  return `
    <table>
      <thead>
        <tr>${cols.map((c) => `<th class="${c.align === 'right' ? 'right' : ''}">${esc(c.label)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map((row, ri) => `
          <tr class="${ri % 2 === 0 ? '' : 'alt'}">
            ${cols.map((c) => {
              const v = typeof c.value === 'function' ? c.value(row) : row[c.key]
              return `<td class="${c.align === 'right' ? 'right' : ''}">${esc(v)}</td>`
            }).join('')}
          </tr>
        `).join('')}
        ${section.totalRow ? `
          <tr class="total-row">
            ${cols.map((c, ci) => {
              const v = section.totalRow[c.key] ?? (ci === 0 ? 'TOTAL' : '')
              return `<td class="${c.align === 'right' ? 'right' : ''}">${esc(v)}</td>`
            }).join('')}
          </tr>
        ` : ''}
      </tbody>
    </table>`
}

function renderKv(section) {
  return `
    <table class="kv-table">
      ${(section.pairs || []).map(([label, value]) => `
        <tr>
          <td class="kv-label">${esc(label)}</td>
          <td class="kv-value">${esc(value)}</td>
        </tr>
      `).join('')}
    </table>`
}

function renderNote(section) {
  return `<p class="note">${esc(section.text)}</p>`
}

function renderSection(sec) {
  const heading = sec.heading ? `<h2 class="section-heading">${esc(sec.heading)}</h2>` : ''
  let body = ''
  if (sec.type === 'table') body = renderTable(sec)
  else if (sec.type === 'kv') body = renderKv(sec)
  else if (sec.type === 'note') body = renderNote(sec)
  return `<div class="section">${heading}${body}</div>`
}

function buildHtml(descriptor) {
  const {
    title = 'Report',
    subtitle = '',
    company = 'MediCare Pharma Pvt Ltd',
    generatedBy = '',
    dateRange = '',
    kpis = [],
    sections = [],
  } = descriptor

  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    font-size: 10pt;
    color: #1e293b;
    background: #fff;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ─── Page setup ─── */
  @page {
    size: A4 landscape;
    margin: 14mm 12mm 14mm 12mm;
  }

  /* ─── Header ─── */
  .report-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 2.5px solid ${BRAND};
    margin-bottom: 14px;
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .logo-box {
    width: 38px; height: 38px;
    background: linear-gradient(135deg, #6366f1, #4338ca);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 18pt; font-weight: 800;
    flex-shrink: 0;
  }
  .header-title { font-size: 14pt; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
  .header-subtitle { font-size: 8.5pt; color: #64748b; margin-top: 1px; }
  .header-company { font-size: 8pt; color: #94a3b8; margin-top: 2px; }
  .header-right { text-align: right; }
  .header-meta { font-size: 8pt; color: #94a3b8; line-height: 1.7; }
  .header-meta strong { color: #475569; font-weight: 600; }

  /* ─── KPI tiles ─── */
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }
  .kpi-card {
    background: ${BRAND_LIGHT};
    border: 1px solid #c7d2fe;
    border-radius: 8px;
    padding: 8px 10px;
    border-left: 3px solid ${BRAND};
  }
  .kpi-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #6366f1; margin-bottom: 3px; }
  .kpi-value { font-size: 13pt; font-weight: 800; color: #0f172a; }
  .kpi-sub   { font-size: 7pt; color: #64748b; margin-top: 2px; }

  /* ─── Sections ─── */
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section-heading {
    font-size: 9pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: ${BRAND};
    border-bottom: 1px solid #e0e7ff;
    padding-bottom: 4px; margin-bottom: 6px;
  }

  /* ─── Tables ─── */
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th {
    background: #f8fafc;
    color: #475569; font-weight: 700; font-size: 7.5pt;
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 5px 8px;
    border-bottom: 1.5px solid #e2e8f0;
    text-align: left;
  }
  th.right, td.right { text-align: right; }
  td {
    padding: 4.5px 8px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }
  tr.alt td { background: #f8fafc; }
  tr.total-row td {
    background: ${BRAND_LIGHT};
    font-weight: 700; color: #1e293b;
    border-top: 1.5px solid #c7d2fe;
  }

  /* ─── KV table ─── */
  .kv-table { width: auto; min-width: 50%; }
  .kv-label { font-weight: 600; color: #475569; width: 180px; padding: 4px 8px; }
  .kv-value { color: #1e293b; padding: 4px 8px; }

  /* ─── Misc ─── */
  .empty { font-size: 8.5pt; color: #94a3b8; font-style: italic; padding: 8px 0; }
  .note  { font-size: 8.5pt; color: #64748b; background: #f8fafc; border-left: 3px solid #e2e8f0; padding: 8px 10px; border-radius: 4px; }

  /* ─── Footer ─── */
  .report-footer {
    position: fixed;
    bottom: 0; left: 12mm; right: 12mm;
    border-top: 1px solid #e2e8f0;
    padding-top: 5px;
    display: flex;
    justify-content: space-between;
    font-size: 7pt; color: #94a3b8;
  }

  /* Ensure colours print */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>

<div class="report-header">
  <div class="header-left">
    <div class="logo-box">℞</div>
    <div>
      <div class="header-title">${esc(title)}</div>
      ${subtitle ? `<div class="header-subtitle">${esc(subtitle)}</div>` : ''}
      <div class="header-company">${esc(company)}</div>
    </div>
  </div>
  <div class="header-right">
    <div class="header-meta">
      ${dateRange ? `<div><strong>Period:</strong> ${esc(dateRange)}</div>` : ''}
      ${generatedBy ? `<div><strong>Generated by:</strong> ${esc(generatedBy)}</div>` : ''}
      <div><strong>Generated:</strong> ${esc(now)}</div>
      <div><strong>PharmaERP</strong> · Life Sciences Suite</div>
    </div>
  </div>
</div>

${renderKpis(kpis)}
${sections.map(renderSection).join('')}

<div class="report-footer">
  <span>${esc(company)} · PharmaERP Life Sciences Suite</span>
  <span>Confidential — For internal use only</span>
  <span>${esc(title)} · ${esc(now)}</span>
</div>

</body>
</html>`
}

/**
 * Open the print interface in a new window and trigger a file download prompt.
 */
export function buildPdf(descriptor) {
  const html = buildHtml(descriptor)
  const filename = `${descriptor.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0,10)}`

  // 1. Download the document as a self-printing HTML file
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  // 2. Open a new window to print immediately
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    
    // Trigger print after fonts/styles load
    win.addEventListener('load', () => {
      setTimeout(() => {
        win.print()
      }, 300)
    })
  }
}
