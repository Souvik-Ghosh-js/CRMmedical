// Generates ~3 months of realistic transactional history so every report, the dashboard,
// MIS, GST, outstanding and trial balance have meaningful data on first load.
// Runs in the browser (Math.random / Date are available here).

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Credit', 'Bank Transfer']
const PURCHASE_PAY = ['Bank Transfer', 'NEFT', 'Cheque', 'UPI']
// Scaled to suit this seed dataset's revenue (~₹1-1.5L/month) — a small retail pharmacy, not a chain.
const EXPENSE_CATS = [
  { cat: 'Rent', base: 8000, variance: 0 },
  { cat: 'Salaries', base: 22000, variance: 1500 },
  { cat: 'Electricity', base: 3000, variance: 1000 },
  { cat: 'Marketing', base: 2000, variance: 1500 },
  { cat: 'Other', base: 1500, variance: 800 },
]

const rand = (n) => Math.floor(Math.random() * n)
const pick = (arr) => arr[rand(arr.length)]
const round2 = (n) => Math.round(n * 100) / 100

function dateNDaysAgo(n) {
  const d = new Date()
  d.setHours(10 + rand(8), rand(60), 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

// Build a sales invoice object matching what InvoiceCreate produces.
function buildInvoice(company, products, customers, batchesById, date, seq) {
  const customer = pick(customers)
  const interState = !!(customer.gstin && company.gstin && customer.gstin.slice(0, 2) !== company.gstin.slice(0, 2))
  const lineCount = 1 + rand(4)
  const used = new Set()
  let taxable = 0, gstTotal = 0
  const lines = []

  for (let i = 0; i < lineCount; i++) {
    const p = products[rand(products.length)]
    if (used.has(p.id)) continue
    used.add(p.id)
    const qty = 1 + rand(10)
    const rate = p.mrp
    const discPct = pick([0, 0, 0, 5, 10])
    const gross = qty * rate
    const disc = (gross * discPct) / 100
    const lineTaxable = gross - disc
    const gstAmt = (lineTaxable * p.gst) / 100
    taxable += lineTaxable
    gstTotal += gstAmt
    // allocate against the product's batches (decrement so stock stays plausible)
    const pBatches = batchesById[p.id] || []
    const allocations = []
    let remaining = qty
    for (const b of pBatches) {
      if (remaining <= 0) break
      const take = Math.min(remaining, b._qtyLeft)
      if (take <= 0) continue
      b._qtyLeft -= take
      allocations.push({ batchId: b.id, batchNo: b.batchNo, expiryDate: b.expiryDate, qty: take, mrp: b.mrp })
      remaining -= take
    }
    lines.push({
      key: cryptoId(), productId: p.id, name: p.name, hsn: p.hsn, pack: p.pack,
      batchNo: allocations[0]?.batchNo || pBatches[0]?.batchNo || '—',
      expiryDate: allocations[0]?.expiryDate || '', mrp: p.mrp, qty, rate, discPct, gst: p.gst,
      gross, disc, lineTaxable, gstAmt, allocations,
    })
  }
  if (!lines.length) return null

  const discountPct = 0
  const beforeRound = taxable + gstTotal
  const grandTotal = Math.round(beforeRound)
  const roundOff = round2(grandTotal - beforeRound)
  const payMode = pick(PAY_MODES)

  return {
    id: cryptoId(),
    invoiceNo: `INV-${date.getFullYear()}-${String(seq).padStart(4, '0')}`,
    date: date.toISOString(), createdAt: date.toISOString(),
    customerId: customer.id, customerName: customer.name, customerGstin: customer.gstin || '',
    payMode, interState,
    lines, discountPct,
    taxable: round2(taxable), billDisc: 0, taxableAfterDisc: round2(taxable),
    gstTotal: round2(gstTotal), cgst: round2(gstTotal / 2), sgst: round2(gstTotal / 2),
    igst: round2(gstTotal), roundOff, grandTotal,
    _credit: payMode === 'Credit' ? grandTotal : 0, _customerId: customer.id,
  }
}

function buildPurchase(products, vendors, date, seq) {
  const vendor = pick(vendors)
  const lineCount = 2 + rand(4)
  let taxable = 0, gst = 0
  const lines = []
  for (let i = 0; i < lineCount; i++) {
    const p = products[rand(products.length)]
    const qty = 20 + rand(180)
    const cost = p.purchasePrice
    const t = qty * cost
    taxable += t
    gst += (t * p.gst) / 100
    lines.push({ key: cryptoId(), productId: p.id, name: p.name, batchNo: `${p.brand.slice(0, 3).toUpperCase()}-${2000 + seq * 3 + i}`, expiryDate: '', qty, cost, mrp: p.mrp, gst: p.gst })
  }
  const grandTotal = Math.round(taxable + gst)
  return {
    id: cryptoId(),
    grnNo: `GRN-${date.getFullYear()}-${String(seq).padStart(4, '0')}`,
    billNo: `${vendor.name.slice(0, 3).toUpperCase()}/24-25/${1000 + seq}`,
    date: date.toISOString(), createdAt: date.toISOString(),
    vendorId: vendor.id, vendorName: vendor.name,
    lines, taxable: round2(taxable), gst: round2(gst), grandTotal,
    _vendorId: vendor.id, _amt: grandTotal,
  }
}

function cryptoId() {
  return (crypto?.randomUUID?.() || 'id-' + Math.random().toString(36).slice(2))
}

// Main entry: takes the db module so it can read seeded masters and write history.
export function generateHistory(db, days = 90) {
  const companies = db.list('companies')
  const company = companies[0]
  const companyIds = companies.map((c) => c.id)
  // weight transactions toward the parent company (it's the main pharmacy)
  const companyPool = companyIds.length > 1
    ? [companyIds[0], companyIds[0], companyIds[0], ...companyIds.slice(1)]
    : companyIds
  const forCompany = () => companyPool[rand(companyPool.length)] || company?.id
  const products = db.list('products')
  const customers = db.list('customers')
  const vendors = db.list('vendors')
  if (!company || !products.length || !customers.length) return

  // working copy of batch quantities so we don't drive stock negative
  const batchesById = {}
  db.list('batches').forEach((b) => {
    batchesById[b.productId] = batchesById[b.productId] || []
    batchesById[b.productId].push({ ...b, _qtyLeft: b.qty * 6 }) // headroom: history predates current stock
  })

  const sales = []
  const purchases = []
  const payments = []
  const stockMoves = []
  let invSeq = 0, purSeq = 0, rcptSeq = 0
  const creditByCustomer = {}
  const payableByVendor = {}

  for (let d = days; d >= 0; d--) {
    const dayDate = dateNDaysAgo(d)
    const dow = dayDate.getDay()
    if (dow === 0) continue // closed Sundays
    // 3-9 invoices a day
    const invCount = 3 + rand(7)
    for (let i = 0; i < invCount; i++) {
      const inv = buildInvoice(company, products, customers, batchesById, dateNDaysAgo(d), ++invSeq)
      if (!inv) { invSeq--; continue }
      inv.companyId = forCompany()
      sales.push(inv)
      if (inv._credit) creditByCustomer[inv._customerId] = (creditByCustomer[inv._customerId] || 0) + inv._credit
    }
    // purchase ~ every 4 days
    if (d % 4 === 0) {
      const pur = buildPurchase(products, vendors, dateNDaysAgo(d), ++purSeq)
      pur.companyId = forCompany()
      purchases.push(pur)
      payableByVendor[pur._vendorId] = (payableByVendor[pur._vendorId] || 0) + pur._amt
      pur.lines.forEach((l) => stockMoves.push({ id: cryptoId(), type: 'IN', productId: l.productId, productName: l.name, qty: l.qty, batchNo: l.batchNo, reason: `Purchase ${pur.grnNo}`, date: pur.date }))
    }
    // a few receipts against credit customers ~ every 3 days
    if (d % 3 === 0) {
      const creditCusts = customers.filter((c) => creditByCustomer[c.id] > 0)
      if (creditCusts.length) {
        const c = pick(creditCusts)
        const amt = Math.min(creditByCustomer[c.id], 1000 + rand(8000))
        const mode = pick(PURCHASE_PAY)
        payments.push({
          id: cryptoId(), receiptNo: `RCPT-${String(++rcptSeq).padStart(4, '0')}`,
          companyId: forCompany(),
          partyId: c.id, partyName: c.name, amount: round2(amt), mode,
          utr: mode === 'Cheque' ? `CHQ${100000 + rand(900000)}` : `UTR${Date.now().toString().slice(-6)}${rand(1000)}`,
          date: dateNDaysAgo(d).toISOString(), createdAt: dateNDaysAgo(d).toISOString(),
        })
        creditByCustomer[c.id] -= amt
      }
    }
  }

  // A modest, category-tagged operating-expense trail so P&L views aren't sales/purchases only.
  const expenses = []
  const monthsSeen = new Set()
  for (let d = days; d >= 0; d--) monthsSeen.add(dateNDaysAgo(d).toISOString().slice(0, 7))
  ;[...monthsSeen].sort().forEach((mKey) => {
    EXPENSE_CATS.forEach((e, i) => {
      const amount = round2(e.base + (Math.random() - 0.5) * 2 * e.variance)
      expenses.push({ id: cryptoId(), expenseNo: `EXP-${mKey.replace('-', '')}-${i + 1}`, category: e.cat, date: `${mKey}-05`, amount, note: `${e.cat} — ${mKey}` })
    })
  })

  // newest first (matches insert() which unshifts)
  sales.reverse(); purchases.reverse(); payments.reverse(); stockMoves.reverse(); expenses.reverse()
  db.replaceAll('sales', sales)
  db.replaceAll('purchases', purchases)
  db.replaceAll('payments', payments)
  db.replaceAll('stockMoves', stockMoves)
  db.replaceAll('expenses', expenses)

  // Inter-company transactions between group companies (eliminated on consolidation).
  // Amounts are scaled to actual group revenue so eliminations are a sensible fraction of it
  // (real inter-co transfers are a slice of business, never larger than total revenue).
  if (companyIds.length > 1) {
    const groupRevenue = sales.reduce((s, inv) => s + Number(inv.taxableAfterDisc || inv.taxable || 0), 0)
    const types = ['Stock Transfer', 'Fund Transfer', 'Service Charge', 'Management Fee']
    const COUNT = 10
    // total eliminating-type transfers ≈ 12% of group revenue, spread across the stock/service/mgmt txns
    const elimTypeCount = types.filter((t) => t !== 'Fund Transfer').length // 3 of 4 types eliminate
    const perElimAvg = (groupRevenue * 0.12) / Math.max(1, (COUNT * elimTypeCount / types.length))
    const interco = []
    for (let k = 0; k < COUNT; k++) {
      const from = pick(companyIds)
      const to = pick(companyIds.filter((id) => id !== from))
      const type = types[k % types.length]
      const eliminates = type !== 'Fund Transfer'
      // eliminating transfers scale to revenue; fund transfers are flat cash movements
      const amount = eliminates
        ? Math.max(2000, round2(perElimAvg * (0.6 + Math.random() * 0.8)))
        : 20000 + rand(180000)
      const gstApplicable = type === 'Stock Transfer' || type === 'Service Charge'
      interco.push({
        id: cryptoId(),
        txnNo: `ICT-${String(k + 1).padStart(4, '0')}`,
        date: dateNDaysAgo(rand(days)).toISOString(),
        fromCompanyId: from, toCompanyId: to, type,
        amount: round2(amount),
        gst: gstApplicable ? round2(amount * 0.12) : 0,
        reference: type === 'Stock Transfer' ? `STN-${2000 + k}` : `JV-${3000 + k}`,
        status: pick(['Posted', 'Posted', 'Pending Reconciliation']),
        eliminate: true,
        notes: `${type} within MediCare Group`,
      })
    }
    interco.sort((a, b) => new Date(b.date) - new Date(a.date))
    db.replaceAll('intercoTxns', interco)
  }

  // reflect remaining balances on masters
  db.list('customers').forEach((c) => { if (creditByCustomer[c.id] != null) db.update('customers', c.id, { balance: Math.max(0, round2(creditByCustomer[c.id])) }) })
  db.list('vendors').forEach((v) => { if (payableByVendor[v.id] != null) db.update('vendors', v.id, { balance: round2((v.balance || 0) + (payableByVendor[v.id] || 0)) }) })

  // advance the document counters so new manual docs don't collide
  const counters = { invoice: invSeq, purchase: purSeq, receipt: rcptSeq }
  db.setCounters(counters)
}
