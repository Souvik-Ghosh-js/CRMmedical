// Full module map for the pharmaceutical ERP. Grouped like Marg / SAP Life Sciences.
// `live: true` = fully functional screen. Others render a structured scope screen.
export const NAV = [
  {
    group: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: '📊', live: true, end: true }],
  },
  {
    group: 'Masters',
    items: [
      { to: '/products', label: 'Product Master', icon: '💊', live: true },
      { to: '/batches', label: 'Batch & Expiry', icon: '🏷️', live: true },
      { to: '/customers', label: 'Client Master', icon: '🧑', live: true },
      { to: '/vendors', label: 'Suppliers / Vendors', icon: '🏭', live: true },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { to: '/stock', label: 'Current Stock', icon: '📦', live: true },
      { to: '/stock/in', label: 'Stock In', icon: '⬇️', live: true },
      { to: '/stock/out', label: 'Stock Out', icon: '⬆️', live: true },
      { to: '/wms', label: 'Warehouse (WMS)', icon: '🏬', live: true, features: ['Bin & zone management', 'FEFO picking', 'Barcode / RFID scan', 'Cold-chain zones', 'Cycle counting', 'Put-away rules'] },
      { to: '/coldchain', label: 'Cold Chain', icon: '❄️', live: true, features: ['Temperature logging', 'Excursion alerts', 'GPS vehicle tracking', 'Compliance reports', 'Sensor integration'] },
    ],
  },
  {
    group: 'Sales',
    items: [
      { to: '/sales/new', label: 'Create Invoice', icon: '🧾', live: true },
      { to: '/sales', label: 'Sales History', icon: '📃', live: true },
      { to: '/dms', label: 'Distributor (DMS)', icon: '🚚', live: true, features: ['Distributor & retailer portal', 'Sales-rep app', 'Route optimization', 'Scheme & incentive mgmt', 'Secondary sales capture'] },
      { to: '/crm', label: 'Pharma CRM', icon: '👥', live: true, features: ['Doctor & chemist master', 'MR tracking', 'Hospital management', 'Campaign management', 'Sample distribution'] },
    ],
  },
  {
    group: 'Purchase',
    items: [
      { to: '/purchase/new', label: 'Purchase Entry', icon: '🛒', live: true },
      { to: '/purchase', label: 'Purchase History', icon: '📥', live: true },
      { to: '/supplier-quality', label: 'Supplier Quality', icon: '⭐', live: true, features: ['Supplier qualification', 'Vendor audits', 'Performance scoring', 'Approved supplier list', 'Risk rating'] },
    ],
  },
  {
    group: 'Accounting',
    items: [
      { to: '/payments', label: 'Payment Receipt', icon: '💰', live: true },
      { to: '/receipt-register', label: 'Receipt Register', icon: '📒', live: true },
      { to: '/notes', label: 'Credit / Debit Note', icon: '🧮', live: true },
      { to: '/outstanding', label: 'Day-wise Outstanding', icon: '📆', live: true },
      { to: '/trial-balance', label: 'Trial Balance', icon: '⚖️', live: true },
      { to: '/consolidated', label: 'Consolidated Statements', icon: '🏢', live: true },
    ],
  },
  {
    group: 'Reports',
    items: [
      { to: '/reports/sales', label: 'Sales Report', icon: '📈', live: true },
      { to: '/reports/stock', label: 'Stock Report', icon: '📉', live: true },
      { to: '/reports/expiry', label: 'Expiry Report', icon: '⏰', live: true },
      { to: '/reports/gst', label: 'GST Report', icon: '🏛️', live: true },
      { to: '/reports/mis', label: 'Consolidated MIS', icon: '🗂️', live: true },
      { to: '/bi', label: 'BI Dashboard', icon: '📡', live: true, features: ['Executive KPIs', 'Predictive analytics', 'Power BI integration', 'Data warehouse', 'Real-time drilldown'] },
    ],
  },
  {
    group: 'Compliance & Quality',
    items: [
      { to: '/qms', label: 'Quality (QMS)', icon: '✅', live: true, features: ['Deviation & incident logging', 'CAPA tracking', 'Change control', 'Non-conformance', 'Complaint management'] },
      { to: '/regulatory', label: 'Regulatory Affairs', icon: '📜', live: true, features: ['Country-wise registration', 'License management', 'Submission tracking', 'Renewal reminders', 'Document repository'] },
      { to: '/edms', label: 'Documents (eDMS)', icon: '🗄️', live: true, features: ['SOP management', 'Version control', 'Digital signatures', 'Approval workflows', 'Controlled documents'] },
      { to: '/audit-mgmt', label: 'Audit Management', icon: '🔍', live: true, features: ['Internal & external audits', 'Audit checklists', 'Observations', 'CAPA linkage', 'Supplier audits'] },
      { to: '/recall', label: 'Recall Management', icon: '⚠️', live: true, features: ['Level 1/2/3 recall', 'Batch blocking', 'Customer notifications', 'Recall reports', 'Regulatory reporting'] },
      { to: '/pv', label: 'Pharmacovigilance', icon: '🩺', live: true, features: ['Adverse event management', 'Case processing', 'Safety reporting', 'Signal detection', 'Risk management'] },
      { to: '/serialization', label: 'Serialization', icon: '🔢', live: true, features: ['GS1 compliance', 'Unique serials & QR', 'Data Matrix codes', 'Package/carton/pallet', 'Anti-counterfeit verify'] },
    ],
  },
  {
    group: 'Manufacturing',
    items: [
      { to: '/mes', label: 'Manufacturing (MES)', icon: '⚙️', live: true, features: ['Production planning', 'eBMR / eBPR', 'Shop-floor monitoring', 'PLC / SCADA integration', 'Real-time dashboard'] },
      { to: '/formula', label: 'Formula & Recipe', icon: '🧪', live: true, features: ['Formula versioning', 'Approval workflow', 'Formula costing', 'Yield calculation', 'Revision history'] },
      { to: '/validation', label: 'Validation', icon: '🧰', live: true, features: ['IQ / OQ / PQ', 'Computer system validation', 'Process validation', 'Cleaning validation', 'Method validation'] },
      { to: '/stability', label: 'Stability Studies', icon: '🌡️', live: true, features: ['Stability protocols', 'Sample tracking', 'Testing schedule', 'Shelf-life calculation', 'Auto reminders'] },
    ],
  },
  {
    group: 'People & AI',
    items: [
      { to: '/lms', label: 'Training (LMS)', icon: '🎓', live: true, features: ['Employee & SOP training', 'Compliance exams', 'Certifications', 'Retraining alerts', 'Training records'] },
      { to: '/forecast', label: 'Demand Forecast (AI)', icon: '🔮', live: true, features: ['Seasonal forecasting', 'ML predictions', 'Purchase recommendations', 'Inventory optimization', 'Production planning'] },
      { to: '/copilot', label: 'AI Copilot', icon: '🤖', live: true },
    ],
  },
  {
    group: 'Administration',
    items: [
      { to: '/users', label: 'Users & Roles', icon: '🔐', live: true },
      { to: '/companies', label: 'Companies', icon: '🏢', live: true },
      { to: '/inter-company', label: 'Inter-Company Txns', icon: '🔁', live: true },
      { to: '/audit-log', label: 'Audit Log', icon: '🧾', live: true },
      { to: '/settings', label: 'Settings', icon: '⚙️', live: true },
    ],
  },
]
