import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Materials from './pages/Materials';
import Vehicles from './pages/Vehicles';
import Billing from './pages/Billing';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DataCenter from './pages/DataCenter';
import Drivers from './pages/Drivers';
import Payments from './pages/Payments';

function App() {
  return (
    <HashRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="materials" element={<Materials />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="billing" element={<Billing />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="data-center" element={<DataCenter />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
