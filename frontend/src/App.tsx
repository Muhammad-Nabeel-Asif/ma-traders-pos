import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './store/auth';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Towns from './pages/masters/Towns';
import Salesmen from './pages/masters/Salesmen';
import Accounts from './pages/masters/Accounts';
import Products from './pages/masters/Products';
import Sale from './pages/Sale';
import SalesList from './pages/SalesList';
import CashVoucher from './pages/CashVoucher';
import Ledger from './pages/reports/Ledger';
import SalesmanLedger from './pages/reports/SalesmanLedger';
import AllBalance from './pages/reports/AllBalance';
import DailyReport from './pages/reports/DailyReport';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const initialized = useAuth((s) => s.initialized);
  if (!initialized) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const loadSession = useAuth((s) => s.loadSession);
  const initialized = useAuth((s) => s.initialized);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (!initialized) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="towns" element={<Towns />} />
        <Route path="salesmen" element={<Salesmen />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="products" element={<Products />} />
        <Route path="sale" element={<Sale />} />
        <Route path="sales" element={<SalesList />} />
        <Route path="cash-receive" element={<CashVoucher type="RECEIVE" />} />
        <Route path="cash-payment" element={<CashVoucher type="PAYMENT" />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="salesman-ledger" element={<SalesmanLedger />} />
        <Route path="all-balance" element={<AllBalance />} />
        <Route path="daily-report" element={<DailyReport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
