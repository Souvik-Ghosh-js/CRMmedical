import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Batches from './pages/Batches'
import Customers from './pages/Customers'
import Vendors from './pages/Vendors'
import Stock from './pages/Stock'
import StockMove from './pages/StockMove'
import InvoiceCreate from './pages/InvoiceCreate'
import SalesHistory from './pages/SalesHistory'
import PurchaseCreate from './pages/PurchaseCreate'
import PurchaseHistory from './pages/PurchaseHistory'
import Payments from './pages/Payments'
import ReceiptRegister from './pages/ReceiptRegister'
import Notes from './pages/Notes'
import Outstanding from './pages/Outstanding'
import TrialBalance from './pages/TrialBalance'
import { SalesReport, StockReport, ExpiryReport, GstReport, MisReport } from './pages/Reports'
import Copilot from './pages/Copilot'
import Users from './pages/Users'
import Companies from './pages/Companies'
import AuditLog from './pages/AuditLog'
import Settings from './pages/Settings'
import StubRouter from './pages/StubRouter'
// Enterprise modules (built by workflow)
import Wms from './pages/Wms'
import ColdChain from './pages/ColdChain'
import Dms from './pages/Dms'
import PharmaCrm from './pages/PharmaCrm'
import SupplierQuality from './pages/SupplierQuality'
import Qms from './pages/Qms'
import Regulatory from './pages/Regulatory'
import Edms from './pages/Edms'
import AuditMgmt from './pages/AuditMgmt'
import Recall from './pages/Recall'
import Pharmacovigilance from './pages/Pharmacovigilance'
import Serialization from './pages/Serialization'
import Mes from './pages/Mes'
import Formula from './pages/Formula'
import Validation from './pages/Validation'
import Stability from './pages/Stability'
import Lms from './pages/Lms'
import Forecast from './pages/Forecast'
import Bi from './pages/Bi'
import InterCompany from './pages/InterCompany'
import Consolidated from './pages/Consolidated'

export default function App() {
  const { user } = useAuth()
  if (!user) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/batches" element={<Batches />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/stock/in" element={<StockMove mode="in" />} />
        <Route path="/stock/out" element={<StockMove mode="out" />} />
        <Route path="/sales/new" element={<InvoiceCreate />} />
        <Route path="/sales" element={<SalesHistory />} />
        <Route path="/purchase/new" element={<PurchaseCreate />} />
        <Route path="/purchase" element={<PurchaseHistory />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/receipt-register" element={<ReceiptRegister />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/outstanding" element={<Outstanding />} />
        <Route path="/trial-balance" element={<TrialBalance />} />
        <Route path="/reports/sales" element={<SalesReport />} />
        <Route path="/reports/stock" element={<StockReport />} />
        <Route path="/reports/expiry" element={<ExpiryReport />} />
        <Route path="/reports/gst" element={<GstReport />} />
        <Route path="/reports/mis" element={<MisReport />} />
        <Route path="/copilot" element={<Copilot />} />
        <Route path="/users" element={<Users />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/inter-company" element={<InterCompany />} />
        <Route path="/consolidated" element={<Consolidated />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/settings" element={<Settings />} />
        {/* Enterprise modules */}
        <Route path="/wms" element={<Wms />} />
        <Route path="/coldchain" element={<ColdChain />} />
        <Route path="/dms" element={<Dms />} />
        <Route path="/crm" element={<PharmaCrm />} />
        <Route path="/supplier-quality" element={<SupplierQuality />} />
        <Route path="/qms" element={<Qms />} />
        <Route path="/regulatory" element={<Regulatory />} />
        <Route path="/edms" element={<Edms />} />
        <Route path="/audit-mgmt" element={<AuditMgmt />} />
        <Route path="/recall" element={<Recall />} />
        <Route path="/pv" element={<Pharmacovigilance />} />
        <Route path="/serialization" element={<Serialization />} />
        <Route path="/mes" element={<Mes />} />
        <Route path="/formula" element={<Formula />} />
        <Route path="/validation" element={<Validation />} />
        <Route path="/stability" element={<Stability />} />
        <Route path="/lms" element={<Lms />} />
        <Route path="/forecast" element={<Forecast />} />
        <Route path="/bi" element={<Bi />} />
        {/* Fallback */}
        <Route path="*" element={<StubRouter />} />
      </Routes>
    </Layout>
  )
}
