import { useState, useEffect } from 'react';
import { Download, Printer, Filter, Calendar, Search, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

type Tab = 'dashboard' | 'daily' | 'vehicles' | 'materials' | 'customers' | 'drivers' | 'transporters';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Pending filters state
  const [filters, setFilters] = useState({ fromDate: '', toDate: '' });
  // Applied filters state (triggers fetch)
  const [appliedFilters, setAppliedFilters] = useState({ fromDate: '', toDate: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab, appliedFilters]);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    const reset = { fromDate: '', toDate: '' };
    setFilters(reset);
    setAppliedFilters(reset);
  };

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
      if (appliedFilters.fromDate && appliedFilters.toDate) {
        dateFilter = " AND date >= ? AND date <= ?";
        params.push(appliedFilters.fromDate + "T00:00:00.000Z", appliedFilters.toDate + "T23:59:59.999Z");
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
        let query = `
          SELECT w.slipNumber, w.vehicleNumber, c.name as customerName, m.name as materialName, w.firstWeight, w.secondWeight, w.netWeight, w.status
          FROM weighments w
          LEFT JOIN customers c ON w.customerId = c.id
          LEFT JOIN materials m ON w.materialId = m.id
          WHERE 1=1
        `;
        if (appliedFilters.fromDate && appliedFilters.toDate) {
            query += dateFilter;
        } else {
            query += ` AND w.date LIKE ?`;
            params = [`${today}%`];
        }
        query += ` ORDER BY w.date DESC`;
        
        const rows = await runQuery(query, params);
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
    if (!data || !Array.isArray(data)) return;
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[140px]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Load Today</p>
          <p className="text-3xl font-bold text-emerald-600 mt-auto">{data?.totalLoad?.toFixed(2) || '0.00'} TON</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[140px]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Completed Trips</p>
          <p className="text-3xl font-bold text-slate-800 mt-auto">{data?.completed || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[140px]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pending Weighments</p>
          <p className="text-3xl font-bold text-amber-600 mt-auto">{data?.pending || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[140px]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cancelled</p>
          <p className="text-3xl font-bold text-red-600 mt-auto">{data?.cancelled || 0}</p>
        </div>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-emerald-800 shadow-sm">
        <h3 className="font-bold text-lg mb-2">Weighbridge Status</h3>
        <p>Your weighbridge is operating normally. You have {data?.pending || 0} vehicles currently inside the premises waiting for their second weight.</p>
      </div>
    </div>
  );

  const renderTable = () => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl h-full">
          <AlertCircle size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No Records Found</h3>
          <p className="text-slate-500">There is no data matching the selected filters.</p>
        </div>
      );
    }

    const columns = Object.keys(data[0]).filter(k => !k.toLowerCase().includes('id') && !k.includes('_'));

    return (
      <div className="overflow-x-auto h-full rounded-xl">
        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap border-collapse">
          <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {columns.map(col => <th key={col} className="px-6 py-4">{col.replace(/([A-Z])/g, ' $1').trim()}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                {columns.map(col => (
                  <td key={col} className="px-6 py-4">
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
    <div className="p-8 h-full flex flex-col space-y-6 pb-12 overflow-y-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Analyze weighbridge operations</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => window.print()} className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg flex items-center text-sm font-medium hover:bg-slate-50 transition-colors">
            <Printer size={16} className="mr-2" /> Print
          </button>
          {activeTab !== 'dashboard' && (
            <button onClick={handleExport} className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg flex items-center text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
              <Download size={16} className="mr-2" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0 overflow-hidden">
        <div className="flex overflow-x-auto">
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
              className={`px-6 py-4 font-medium text-sm transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab.id 
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50' 
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Section */}
      {activeTab !== 'dashboard' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex items-center gap-2 mb-4 text-slate-700 font-medium">
            <Filter size={18} />
            <h2>Report Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="date" 
                  value={filters.fromDate} 
                  onChange={(e) => setFilters(f => ({ ...f, fromDate: e.target.value }))} 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition-all" 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="date" 
                  value={filters.toDate} 
                  onChange={(e) => setFilters(f => ({ ...f, toDate: e.target.value }))} 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition-all" 
                />
              </div>
            </div>
            
            <div className="lg:col-span-2 flex items-center justify-end gap-3 h-[42px]">
              <button 
                onClick={handleResetFilters}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-white text-slate-600 border border-slate-300 px-6 py-2.5 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm disabled:opacity-50"
              >
                <RefreshCw size={16} /> Reset
              </button>
              <button 
                onClick={handleApplyFilters}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 shadow-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full bg-slate-50/50 py-20">
            <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Generating Report Data...</p>
          </div>
        ) : (
          activeTab === 'dashboard' ? (
            <div className="p-6 h-full bg-slate-50/50">
              {renderDashboard()}
            </div>
          ) : (
            <div className="h-full">
              {renderTable()}
            </div>
          )
        )}
      </div>
    </div>
  );
}
