# PharmaERP — Pharmaceutical ERP (Frontend)

A React + Vite + Tailwind frontend for an enterprise pharmaceutical ERP. No backend — all
data is seeded and persisted in the browser's `localStorage`, so everything works offline and
survives refresh.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
```

**Demo logins:** `admin / admin` (Admin) · `staff / staff` (Pharmacist)

## What's fully working

- **Dashboard** — products, stock, today's sales, low-stock & expiry alerts
- **Product Master** — full pharma columns (molecule, ATC, strength, form, pack, HSN, GST, schedule H/H1/X, cold-chain, reorder, rack/bin) with add/edit/delete + Excel export
- **Batch & Expiry** — batch-wise stock, FEFO, mfg/expiry, rack/bin, expiry filters
- **Stock** — current stock with FEFO next-expiry, Stock In (creates batches), Stock Out (FEFO auto-deduct)
- **Customers & Suppliers** — masters with GSTIN, drug license, balances
- **Sales** — GST invoice (CGST/SGST vs IGST auto, line discounts, round-off, FEFO batch billing), sales history, **printable bill**, 1-day edit limit
- **Purchase** — purchase entry / GRN (adds stock + vendor payable), purchase history
- **Accounting** — Payment Receipt with **UTR duplicate alert**, Receipt Register, Credit/Debit Notes, Day-wise Outstanding (ageing), Trial Balance
- **Reports** — Sales, Stock, Expiry, GST (GSTR-1 summary), Consolidated MIS — all with Excel (CSV) export
- **AI Copilot** — rule-based natural-language queries over your data
- **Admin** — Users & Roles, Companies (multi-company), immutable Audit Log, Settings (reset)

## Enterprise modules (all live — full CRUD + Excel export + seeded data)

All built on the shared config-driven engine `src/components/CrudModule.jsx`, each with
industry-standard columns, add/edit/delete, search, status filters, stats and Excel export:

WMS (bins/zones/FEFO/RFID), Cold Chain (temp logs, excursions, GPS), DMS (distributors,
schemes, incentives), Pharma CRM (doctors, chemists, MR, samples), Supplier Quality, QMS
(deviations, CAPA, change control), Regulatory (registrations, licenses, submissions), eDMS
(SOPs, versions, e-sign), Audit Management, Recall (L1/L2/L3, batch blocking), Pharmacovigilance
(adverse events, signals), Serialization (GS1, QR/DataMatrix), MES (production orders, eBMR/eBPR),
Formula & Recipe, Validation (IQ/OQ/PQ), Stability Studies, LMS (training, certs), Demand
Forecast, BI/KPI registry.

Each module's screen is one config file in `src/pages/`; data seeds from `src/lib/moduleSeeds.json`.

## Architecture

- `src/lib/db.js` — localStorage collection store (swap for an API later; the public API stays the same)
- `src/lib/hooks.js` — reactive `useCollection` / `useDb`
- `src/lib/stock.js` — FEFO allocation & stock math
- `src/nav.js` — single source of truth for all modules & routing
- `src/pages/*` — one screen per module
