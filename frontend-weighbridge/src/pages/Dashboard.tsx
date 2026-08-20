import { useState, useEffect } from 'react';
import { Truck, Clock, CheckCircle, Scale, Activity, PlusCircle, ClipboardList, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayVehicles: 0,
    firstWeights: 0,
    pending: 0,
    completed: 0,
    totalLoad: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/weighment-reports/dashboard');
        setStats(response.data);
        
        const ipcRenderer = (window as any).ipcRenderer;
        if (ipcRenderer) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const res = await ipcRenderer.invoke('db-query', `
            SELECT w.*, c.name as customerName, m.name as materialName
            FROM weighments w
            LEFT JOIN customers c ON w.customerId = c.id
            LEFT JOIN materials m ON w.materialId = m.id
            WHERE w.date >= ?
            ORDER BY w.updatedAt DESC LIMIT 5
          `, [today.toISOString()]);
          
          if (res.success) {
            setRecentTransactions(res.data);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard stats', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Weighbridge Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of today's weighing operations</p>
        </div>
        <div className="flex gap-3">
          <Link to="/weighment" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-colors">
            <PlusCircle size={20} /> NEW WEIGHMENT
          </Link>
          <Link to="/pending" className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-colors">
            <ClipboardList size={20} /> PENDING WEIGHMENTS
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="Today's Vehicles" value={stats.todayVehicles} icon={Truck} color="text-blue-500" bg="bg-blue-100" />
        <StatCard title="Active Weighments" value={stats.firstWeights} icon={Activity} color="text-indigo-500" bg="bg-indigo-100" />
        <StatCard title="Pending Second Weights" value={stats.pending} icon={Clock} color="text-amber-500" bg="bg-amber-100" />
        <StatCard title="Completed Weighments" value={stats.completed} icon={CheckCircle} color="text-emerald-500" bg="bg-emerald-100" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-medium mb-1">Total Net Weight (Today)</p>
            <p className="text-4xl font-bold text-cyan-400 font-mono">{stats.totalLoad} <span className="text-xl text-cyan-700">KG</span></p>
          </div>
          <Scale size={48} className="text-slate-700" />
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">System Status</h2>
          <div className="flex gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wifi className="text-emerald-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Internet</p>
                <p className="font-semibold text-slate-800">ONLINE</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Scale className="text-emerald-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Device</p>
                <p className="font-semibold text-slate-800">CONNECTED</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-700">Today's Recent Activity</h2>
          <Link to="/history" className="text-sm font-medium text-primary-600 hover:text-primary-700">View All History &rarr;</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-6 py-3 font-medium">Vehicle</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Material</th>
                <th className="px-6 py-3 font-medium text-right">Net Weight</th>
                <th className="px-6 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                    {new Date(tx.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap font-bold text-slate-800">{tx.vehicleNumber}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-slate-600">{tx.customerName || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-slate-600">{tx.materialName || '-'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-right font-mono font-bold text-cyan-600">
                    {tx.netWeight ? `${tx.netWeight} KG` : '-'}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {tx.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No transactions recorded today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
      <div className={`p-4 rounded-xl ${bg} ${color}`}>
        <Icon size={28} />
      </div>
    </div>
  );
}
