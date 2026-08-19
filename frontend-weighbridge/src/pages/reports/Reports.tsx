import { useState, useEffect } from 'react';
import { Download, Printer } from 'lucide-react';
import api from '../../services/api';

type Tab = 'dashboard' | 'daily' | 'vehicles' | 'materials' | 'customers' | 'drivers' | 'transporters';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ fromDate: '', toDate: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      if (!ipcRenderer) {
        setData([]);
        return;
      }

      let dateFilter = "";
      let params: any[] = [];
      if (filters.fromDate && filters.toDate) {
        dateFilter = " AND date >= ? AND date <= ?";
        params.push(filters.fromDate + "T00:00:00.000Z", filters.toDate + "T23:59:59.999Z");
      }

      const runQuery = async (q: string, p: any[] = []) => {
        const res = await ipcRenderer.invoke('db-query', q, p);
        if (res.success) return res.data;
        throw new Error(res.error);
      };

      if (activeTab === 'dashboard') {
        const today = new Date().toISOString().split('T')[0];
        const [loadRes] = await runQuery("SELECT SUM(netWeight) as totalLoad FROM weighments WHERE status = 'COMPLETED' AND date LIKE ?", [`${today}%`]);
        const [compRes] = await runQuery("SELECT COUNT(*) as c FROM weighments WHERE status = 'COMPLETED' AND date LIKE ?", [`${today}%`]);
        const [pendRes] = await runQuery("SELECT COUNT(*) as c FROM weighments WHERE status = 'FIRST_WEIGHT'");
        const [cancRes] = await runQuery("SELECT COUNT(*) as c FROM weighments WHERE status = 'CANCELLED' AND date LIKE ?", [`${today}%`]);
        
        setData({
          totalLoad: (loadRes?.totalLoad || 0) / 1000,
          completed: compRes?.c || 0,
          pending: pendRes?.c || 0,
          cancelled: cancRes?.c || 0
        });
      }
      else if (activeTab === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        const rows = await runQuery(`
          SELECT w.slipNumber, w.vehicleNumber, c.name as customerName, m.name as materialName, w.firstWeight, w.secondWeight, w.netWeight, w.status
          FROM weighments w
          LEFT JOIN customers c ON w.customerId = c.id
          LEFT JOIN materials m ON w.materialId = m.id
          WHERE w.date LIKE ? ORDER BY w.date DESC
        `, [`${today}%`]);
        setData(rows);
      }
      else if (activeTab === 'vehicles') {
        const rows = await runQuery(`
          SELECT vehicleNumber as "Vehicle Number", COUNT(*) as "Total Trips", SUM(netWeight) as "Total Load (KG)"
          FROM weighments WHERE status = 'COMPLETED' ${dateFilter}
          GROUP BY vehicleNumber ORDER BY "Total Trips" DESC
        `, params);
        setData(rows);
      }
      else if (activeTab === 'materials') {
        const rows = await runQuery(`
          SELECT m.name as "Material Name", COUNT(w.id) as "Total Trips", SUM(w.netWeight) as "Total Load (KG)"
          FROM weighments w
          LEFT JOIN materials m ON w.materialId = m.id
          WHERE w.status = 'COMPLETED' ${dateFilter}
          GROUP BY m.name ORDER BY "Total Trips" DESC
        `, params);
        setData(rows);
      }
      else if (activeTab === 'customers') {
        const rows = await runQuery(`
          SELECT c.name as "Customer Name", COUNT(w.id) as "Total Trips", SUM(w.netWeight) as "Total Load (KG)"
          FROM weighments w
          LEFT JOIN customers c ON w.customerId = c.id
          WHERE w.status = 'COMPLETED' ${dateFilter}
          GROUP BY c.name ORDER BY "Total Trips" DESC
        `, params);
        setData(rows);
      }
      else if (activeTab === 'drivers') {
        const rows = await runQuery(`
          SELECT d.name as "Driver Name", COUNT(w.id) as "Total Trips", SUM(w.netWeight) as "Total Load (KG)"
          FROM weighments w
          LEFT JOIN drivers d ON w.driverId = d.id
          WHERE w.status = 'COMPLETED' ${dateFilter}
          GROUP BY d.name ORDER BY "Total Trips" DESC
        `, params);
        setData(rows);
      }
      else if (activeTab === 'transporters') {
        const rows = await runQuery(`
          SELECT t.name as "Transporter Name", COUNT(w.id) as "Total Trips", SUM(w.netWeight) as "Total Load (KG)"
          FROM weighments w
          LEFT JOIN transporters t ON w.transporterId = t.id
          WHERE w.status = 'COMPLETED' ${dateFilter}
          GROUP BY t.name ORDER BY "Total Trips" DESC
        `, params);
        setData(rows);
      }
    } catch (err) {
      console.error(`Failed to fetch ${activeTab} report`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Basic export for current table view
    if (!data || !Array.isArray(data)) return;
    
    // Construct CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTab}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Load Today</p>
          <p className="text-3xl font-bold text-emerald-600">{data?.totalLoad?.toFixed(2) || '0.00'} TON</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Completed Trips</p>
          <p className="text-3xl font-bold text-slate-800">{data?.completed || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Pending Weighments</p>
          <p className="text-3xl font-bold text-amber-600">{data?.pending || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Cancelled</p>
          <p className="text-3xl font-bold text-red-600">{data?.cancelled || 0}</p>
        </div>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-emerald-800">
        <h3 className="font-bold text-lg mb-2">Weighbridge Status</h3>
        <p>Your weighbridge is operating normally. You have {data?.pending || 0} vehicles currently inside the premises waiting for their second weight.</p>
      </div>
    </div>
  );

  const renderTable = () => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return <div className="p-8 text-center text-slate-500">No data found for this report.</div>;
    }

    const columns = Object.keys(data[0]).filter(k => !k.toLowerCase().includes('id') && !k.includes('_'));

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200">
            <tr>
              {columns.map(col => <th key={col} className="px-4 py-3">{col.replace(/([A-Z])/g, ' $1').trim()}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                {columns.map(col => (
                  <td key={col} className="px-4 py-3">
                    {row[col] === null ? '-' : row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Reports Dashboard</h1>
        <div className="flex space-x-3">
          <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg flex items-center text-sm font-medium hover:bg-slate-50">
            <Printer size={18} className="mr-2" /> Print
          </button>
          {activeTab !== 'dashboard' && (
            <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center text-sm font-medium hover:bg-emerald-700">
              <Download size={18} className="mr-2" /> Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 shrink-0 border-b border-slate-200">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'daily', label: 'Daily Log' },
          { id: 'vehicles', label: 'Vehicle Report' },
          { id: 'materials', label: 'Material Report' },
          { id: 'customers', label: 'Customer Report' },
          { id: 'drivers', label: 'Driver Report' },
          { id: 'transporters', label: 'Transporter Report' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors border-b-2 ${
              activeTab === tab.id ? 'border-primary-600 text-primary-700 bg-primary-50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'dashboard' && activeTab !== 'daily' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-end space-x-4 shrink-0">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
            <input type="date" value={filters.fromDate} onChange={(e) => setFilters(f => ({ ...f, fromDate: e.target.value }))} className="px-3 py-1.5 border border-slate-300 rounded focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
            <input type="date" value={filters.toDate} onChange={(e) => setFilters(f => ({ ...f, toDate: e.target.value }))} className="px-3 py-1.5 border border-slate-300 rounded focus:ring-primary-500" />
          </div>
          <button onClick={() => setFilters({ fromDate: '', toDate: '' })} className="px-4 py-1.5 border border-slate-300 text-slate-600 rounded hover:bg-slate-50 text-sm font-medium">Clear</button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-400">Loading report...</div>
        ) : (
          activeTab === 'dashboard' ? renderDashboard() : 
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full overflow-hidden flex flex-col">
            {renderTable()}
          </div>
        )}
      </div>
    </div>
  );
}
