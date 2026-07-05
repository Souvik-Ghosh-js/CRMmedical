// localStorage-backed reactive database for PharmaERP.
// Each "collection" is a JSON array in localStorage. Components subscribe via useCollection().
// Swap this file for real API calls later — the public API (list/get/insert/update/remove) stays the same.

import moduleSeeds from './moduleSeeds.json'
import { generateHistory } from './seedHistory'

const PREFIX = 'pharmaerp:'
const listeners = new Map() // collection -> Set<fn>

function read(name) {
  try {
    const raw = localStorage.getItem(PREFIX + name)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(name, value) {
  localStorage.setItem(PREFIX + name, JSON.stringify(value))
  const subs = listeners.get(name)
  if (subs) subs.forEach((fn) => fn(value))
}

export function subscribe(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set())
  listeners.get(name).add(fn)
  return () => listeners.get(name)?.delete(fn)
}

export function list(name) {
  return read(name) || []
}

export function get(name, id) {
  return list(name).find((r) => r.id === id)
}

export function uid(prefix = '') {
  // No Math.random/Date.now restriction here (browser runtime), but keep it deterministic-ish + unique.
  return prefix + Math.random().toString(36).slice(2, 9) + (list('__seq').length ? '' : '')
}

export function nextNumber(name, pad = 4) {
  // Sequential doc numbers, e.g. INV-0001
  const counters = read('__counters') || {}
  counters[name] = (counters[name] || 0) + 1
  write('__counters', counters)
  return String(counters[name]).padStart(pad, '0')
}

export function setCounters(patch) {
  write('__counters', { ...(read('__counters') || {}), ...patch })
}

export function insert(name, record) {
  const rows = list(name)
  const row = { id: record.id || crypto.randomUUID(), createdAt: record.createdAt || new Date().toISOString(), ...record }
  rows.unshift(row)
  write(name, rows)
  return row
}

export function update(name, id, patch) {
  const rows = list(name).map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r))
  write(name, rows)
  return rows.find((r) => r.id === id)
}

export function remove(name, id) {
  write(name, list(name).filter((r) => r.id !== id))
}

export function replaceAll(name, rows) {
  write(name, rows)
}

export function resetAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
  seedIfEmpty(true)
  // notify everyone
  listeners.forEach((subs, name) => subs.forEach((fn) => fn(read(name) || [])))
}

// ---- Seed data ---------------------------------------------------------
const SEED_VERSION = 5

export function seedIfEmpty(force = false) {
  // Seed when never seeded, OR when the seed schema/data version changed.
  // (All data here is demo data, so a version bump fully refreshes the dataset.)
  if (!force && read('__seeded') && read('__seedVersion') === SEED_VERSION) return
  // wipe prior demo data so we don't mix versions / leave stale collections
  if (read('__seeded')) {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k))
  }
  write('__seeded', true)
  write('__seedVersion', SEED_VERSION)

  write('companies', [
    { id: 'co1', name: 'MediCare Pharma Pvt Ltd', gstin: '19ABCDE1234F1Z5', country: 'India',
      currency: 'INR', state: 'West Bengal', dlNo: 'WB-20B-2021/4456', address: '12 Park Street, Kolkata 700016',
      group: 'MediCare Group', parent: true },
    { id: 'co2', name: 'MediCare Distribution Pvt Ltd', gstin: '27ABCDE1234F2Z3', country: 'India',
      currency: 'INR', state: 'Maharashtra', dlNo: 'MH-20B-2021/8821', address: '88 Andheri East, Mumbai 400069',
      group: 'MediCare Group', parent: false },
    { id: 'co3', name: 'MediCare Labs Pvt Ltd', gstin: '29ABCDE1234F3Z1', country: 'India',
      currency: 'INR', state: 'Karnataka', dlNo: 'KA-20B-2021/5567', address: '21 Whitefield, Bengaluru 560066',
      group: 'MediCare Group', parent: false },
  ])

  write('users', [
    { id: 'u1', name: 'Administrator', username: 'admin', password: 'admin', role: 'Admin', email: 'admin@medicare.example', active: true },
    { id: 'u2', name: 'Counter Staff', username: 'staff', password: 'staff', role: 'Pharmacist', email: 'staff@medicare.example', active: true },
  ])

  const products = [
    mkProduct('Paracetamol 500mg', 'Calpol 500', 'Paracetamol', 'Analgesic / Antipyretic', 'N02BE01', '500mg', 'Tablet', '10x10', 'GSK', 'Medicine', 12, '5%', 1.20, 1.80, 'H'),
    mkProduct('Amoxicillin 500mg', 'Mox 500', 'Amoxicillin', 'Antibiotic', 'J01CA04', '500mg', 'Capsule', '10x10', 'Sun Pharma', 'Medicine', 12, '12%', 4.50, 6.50, 'H1'),
    mkProduct('Azithromycin 500mg', 'Azithral 500', 'Azithromycin', 'Antibiotic', 'J01FA10', '500mg', 'Tablet', '1x5', 'Alembic', 'Medicine', 5, '12%', 18.0, 28.0, 'H1'),
    mkProduct('Pantoprazole 40mg', 'Pantop 40', 'Pantoprazole', 'PPI / Antacid', 'A02BC02', '40mg', 'Tablet', '10x15', 'Aristo', 'Medicine', 18, '12%', 3.10, 5.20, 'H'),
    mkProduct('Cetirizine 10mg', 'Alerid', 'Cetirizine', 'Antihistamine', 'R06AE07', '10mg', 'Tablet', '10x10', 'Cipla', 'Medicine', 24, '5%', 0.70, 1.30, '—'),
    mkProduct('Metformin 500mg', 'Glycomet 500', 'Metformin', 'Antidiabetic', 'A10BA02', '500mg', 'Tablet', '10x20', 'USV', 'Medicine', 30, '12%', 1.10, 1.90, 'H'),
    mkProduct('Insulin Glargine 100IU', 'Lantus', 'Insulin Glargine', 'Antidiabetic', 'A10AE04', '100IU/ml', 'Injection', '1x3ml', 'Sanofi', 'Medicine', 8, '5%', 320, 410, 'H', { coldChain: true, storage: '2-8°C' }),
    mkProduct('Vitamin C 500mg', 'Limcee', 'Ascorbic Acid', 'Vitamin / Supplement', 'A11GA01', '500mg', 'Tablet', '15s', 'Abbott', 'Medicine', 40, '12%', 0.90, 1.50, '—'),
    mkProduct('Cough Syrup 100ml', 'Benadryl', 'Diphenhydramine', 'Antitussive', 'R05DA20', '100ml', 'Syrup', '1x100ml', 'J&J', 'Medicine', 15, '12%', 75, 110, '—'),
    mkProduct('Surgical Gloves M', 'NitriCare M', '—', 'Surgical Consumable', '—', 'Medium', 'Pair', '1x100', 'Medline', 'Others', 20, '12%', 4, 7, '—'),
    mkProduct('Digital Thermometer', 'ThermoPro', '—', 'Medical Device', '—', '—', 'Device', '1pc', 'Omron', 'Others', 12, '18%', 95, 180, '—'),
    mkProduct('ORS Powder', 'Electral', 'Oral Rehydration Salts', 'Electrolyte', 'A07CA', '21.8g', 'Powder', '1x21.8g', 'FDC', 'Medicine', 50, '5%', 14, 22, '—'),
  ]
  write('products', products)

  // Batches (FEFO-relevant: varied expiries incl. soon-to-expire)
  const batches = []
  products.forEach((p, i) => {
    const n = 1 + (i % 2)
    for (let b = 0; b < n; b++) {
      const expMonthsOut = [2, 26, 1, 14, 40, 6, -1, 30, 9, 18, 22, 3][(i + b) % 12]
      batches.push({
        id: crypto.randomUUID(),
        productId: p.id,
        batchNo: `${p.brand.slice(0, 3).toUpperCase()}-${1000 + i * 7 + b}`,
        mfgDate: monthsFromNow(-12).slice(0, 10),
        expiryDate: monthsFromNow(expMonthsOut).slice(0, 10),
        qty: [40, 120, 15, 8, 200, 60, 25, 90, 5, 70, 12, 150][(i + b) % 12],
        costPrice: p.purchasePrice,
        mrp: p.mrp,
        supplierId: 'v' + (1 + (i % 3)),
        rackBin: `R${1 + (i % 4)}-B${1 + (b % 3)}`,
      })
    }
  })
  write('batches', batches)

  write('customers', [
    { id: 'c1', name: 'Walk-in Customer', type: 'Walk-in', phone: '', address: '', email: '', gstin: '', balance: 0, doctor: '' },
    { id: 'c2', name: 'Rahul Sharma', type: 'Registered', phone: '9831012345', address: '45 Lake Road, Kolkata', email: 'rahul@example.com', gstin: '', balance: 540, doctor: 'Dr. Bose' },
    { id: 'c3', name: 'City Hospital', type: 'Hospital', phone: '03322334455', address: 'EM Bypass, Kolkata', email: 'pharmacy@cityhosp.in', gstin: '19CITYH1234H1Z2', balance: 12850, doctor: '' },
    { id: 'c4', name: 'Anita Das', type: 'Registered', phone: '9007765432', address: 'Salt Lake Sec V', email: '', gstin: '', balance: 0, doctor: 'Dr. Roy' },
  ])

  write('vendors', [
    { id: 'v1', name: 'Sun Pharma Distributors', phone: '03340001111', gstin: '19SUNPH1234S1Z9', address: 'Howrah', email: 'orders@sunpharma.in', drugLicense: 'WB-21B-1001', balance: 45200, rating: 4.6 },
    { id: 'v2', name: 'Cipla Stockist', phone: '03340002222', gstin: '19CIPLA1234C1Z8', address: 'Dum Dum', email: 'orders@cipla.in', drugLicense: 'WB-21B-1002', balance: 22100, rating: 4.2 },
    { id: 'v3', name: 'MedSupply Wholesale', phone: '03340003333', gstin: '19MEDSU1234M1Z7', address: 'Sealdah', email: 'sales@medsupply.in', drugLicense: 'WB-21B-1003', balance: 0, rating: 3.9 },
  ])

  write('sales', [])
  write('purchases', [])
  write('payments', [])
  write('notes', []) // credit/debit notes
  write('stockMoves', [])
  write('expenses', []) // operating expenses (rent/salaries/electricity/marketing/other)

  // Seed all enterprise module collections (built by workflow).
  for (const [collection, seedRows] of Object.entries(moduleSeeds)) {
    write(collection, (seedRows || []).map((r) => ({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...r })))
  }

  // Generate ~3 months of transactional history (sales/purchase/payments/stock + a few notes).
  try {
    generateHistory({ list, replaceAll, update, setCounters }, 90)
    seedNotes()
  } catch (e) {
    console.warn('history seed skipped:', e)
  }
}

// A handful of credit/debit notes referencing real recent invoices.
function seedNotes() {
  const recentSales = list('sales').slice(0, 8)
  const reasons = ['Sales return — damaged strip', 'Short expiry return', 'Rate difference', 'Scheme adjustment', 'Breakage in transit']
  const notes = recentSales.slice(0, 5).map((s, i) => {
    const amount = Math.round((s.taxable || 100) * (0.05 + Math.random() * 0.1))
    const gst = 12
    const gstAmt = (amount * gst) / 100
    return {
      id: crypto.randomUUID(), createdAt: s.date,
      noteNo: `${i % 2 === 0 ? 'CN' : 'DN'}-${String(i + 1).padStart(4, '0')}`,
      type: i % 2 === 0 ? 'Credit' : 'Debit', partyType: 'Customer',
      partyId: s.customerId, partyName: s.customerName, refInvoice: s.invoiceNo,
      reason: reasons[i % reasons.length], date: s.date,
      amount, gst, gstAmt, total: amount + gstAmt,
    }
  })
  write('notes', notes)
}

function mkProduct(name, brand, molecule, category, atc, strength, form, pack, mfr, group, openingStock, gst, purchasePrice, mrp, schedule, extra = {}) {
  const gstRate = parseFloat(gst) || 0
  return {
    id: crypto.randomUUID(),
    code: 'P' + Math.floor(1000 + Math.random() * 8999),
    name, brand, molecule, category, atc, strength, form, pack,
    manufacturer: mfr,
    group, // Medicine | Others
    hsn: form === 'Device' ? '9018' : '3004',
    gst: gstRate,
    purchasePrice, mrp,
    schedule, // H / H1 / X / —
    reorderLevel: 20,
    rackBin: '',
    storage: extra.storage || 'Room temp',
    coldChain: !!extra.coldChain,
    regNo: 'MA-' + Math.floor(10000 + Math.random() * 89999),
    active: true,
    ...extra,
  }
}

function monthsFromNow(m) {
  const d = new Date()
  d.setMonth(d.getMonth() + m)
  return d.toISOString()
}
