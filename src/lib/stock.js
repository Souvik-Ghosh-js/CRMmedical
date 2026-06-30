import * as db from './db'

// Current stock for a product = sum of batch quantities.
export function productStock(productId, batches) {
  const bs = batches || db.list('batches')
  return bs.filter((b) => b.productId === productId).reduce((s, b) => s + Number(b.qty || 0), 0)
}

// FEFO order: earliest expiry first, only batches with qty > 0.
export function fefoBatches(productId, batches) {
  const bs = batches || db.list('batches')
  return bs
    .filter((b) => b.productId === productId && Number(b.qty) > 0)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
}

// Deduct qty across batches FEFO. Returns the per-batch allocation used (for invoice lines).
export function deductFEFO(productId, qty) {
  let remaining = qty
  const allocations = []
  for (const b of fefoBatches(productId)) {
    if (remaining <= 0) break
    const take = Math.min(remaining, b.qty)
    db.update('batches', b.id, { qty: b.qty - take })
    allocations.push({ batchId: b.id, batchNo: b.batchNo, expiryDate: b.expiryDate, qty: take, mrp: b.mrp })
    remaining -= take
  }
  return { allocations, shortfall: remaining }
}

// Return previously-allocated units to their original batches (used when editing/cancelling an invoice).
export function restoreAllocations(lines) {
  for (const l of lines || []) {
    for (const a of l.allocations || []) {
      const b = db.get('batches', a.batchId)
      if (b) db.update('batches', a.batchId, { qty: Number(b.qty) + Number(a.qty) })
    }
  }
}

export function addStock(productId, batchNo, qty, extra = {}) {
  const existing = db.list('batches').find((b) => b.productId === productId && b.batchNo === batchNo)
  if (existing) {
    db.update('batches', existing.id, { qty: Number(existing.qty) + Number(qty), ...extra })
    return existing.id
  }
  const row = db.insert('batches', { productId, batchNo, qty: Number(qty), ...extra })
  return row.id
}
