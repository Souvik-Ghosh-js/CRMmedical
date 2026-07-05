import * as db from '../lib/db'
import { inr, fmtDate } from '../lib/format'

export default function InvoicePrint({ inv }) {
  const company = db.list('companies')[0]
  const customer = db.get('customers', inv.customerId)

  return (
    <div id="print-area" className="bg-white text-slate-800 text-sm">
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
        <div>
          <div className="text-lg font-bold">{company?.name}</div>
          <div className="text-xs text-slate-500 max-w-xs">{company?.address}</div>
          <div className="text-xs">GSTIN: {company?.gstin} · DL No: {company?.dlNo}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-base">TAX INVOICE</div>
          <div className="text-xs">No: <b>{inv.invoiceNo}</b></div>
          <div className="text-xs">Date: {fmtDate(inv.date)}</div>
          <div className="text-xs">Mode: {inv.payMode}{inv.payMode === 'Card' && inv.cardLast4 ? ` (•••• ${inv.cardLast4})` : ''}</div>
        </div>
      </div>

      <div className="flex justify-between py-3 text-xs">
        <div>
          <div className="font-semibold text-slate-500 uppercase">Bill To</div>
          <div className="font-medium text-sm">{inv.customerName}</div>
          {customer?.address && <div>{customer.address}</div>}
          {customer?.phone && <div>Ph: {customer.phone}</div>}
          {inv.customerGstin && <div>GSTIN: {inv.customerGstin}</div>}
        </div>
        <div className="text-right text-slate-500">
          <div>Tax type: {inv.interState ? 'IGST' : 'CGST + SGST'}</div>
        </div>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100">
            {['#', 'Item', 'HSN', 'Batch', 'Exp', 'Qty', 'MRP', 'Rate', 'Disc%', 'GST%', 'Amount'].map((h) => (
              <th key={h} className="border border-slate-300 px-2 py-1 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={l.key || i}>
              <td className="border border-slate-300 px-2 py-1">{i + 1}</td>
              <td className="border border-slate-300 px-2 py-1">{l.name}</td>
              <td className="border border-slate-300 px-2 py-1">{l.hsn}</td>
              <td className="border border-slate-300 px-2 py-1">{l.batchNo}</td>
              <td className="border border-slate-300 px-2 py-1">{(l.expiryDate || '').slice(0, 7) || '—'}</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{l.qty}</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{inr(l.mrp)}</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{inr(l.rate)}</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{l.discPct}%</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{l.gst}%</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{inr(l.lineTaxable + l.gstAmt)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between mt-3">
        <div className="text-xs text-slate-500 max-w-sm">
          <div className="font-semibold">Terms & Notes</div>
          <div>Goods once sold cannot be returned without valid reason. Subject to local jurisdiction. E.&O.E.</div>
          <div className="mt-6">Prescription verified: ____________________</div>
        </div>
        <div className="w-64 text-xs">
          <Row label="Taxable Value" value={inr(inv.taxable)} />
          {inv.billDisc > 0 && <Row label="Discount" value={'− ' + inr(inv.billDisc)} />}
          {inv.interState
            ? <Row label="IGST" value={inr(inv.igst)} />
            : <><Row label="CGST" value={inr(inv.cgst)} /><Row label="SGST" value={inr(inv.sgst)} /></>}
          <Row label="Round Off" value={inr(inv.roundOff)} />
          <div className="flex justify-between font-bold text-sm border-t-2 border-slate-800 mt-1 pt-1">
            <span>Grand Total</span><span>{inr(inv.grandTotal)}</span>
          </div>
          <div className="text-right mt-8 border-t border-slate-300 pt-1">For {company?.name}<br /><span className="text-slate-400">Authorised Signatory</span></div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return <div className="flex justify-between py-0.5"><span>{label}</span><span>{value}</span></div>
}
