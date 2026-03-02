import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import InvoicePage from './components/InvoicePage'
import InvoicesListPage from './components/InvoicesListPage'
import InvoiceDetailPage from './components/InvoiceDetailPage'
import InventoryPage from './components/InventoryPage'
import BillPage from './components/BillPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/invoices" replace />} />
        <Route path="/invoice" element={<InvoicePage />} />
        <Route path="/invoices" element={<InvoicesListPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/bill" element={<BillPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
