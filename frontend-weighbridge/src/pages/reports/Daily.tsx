import { useState, useEffect } from 'react';
import { Download, Printer } from 'lucide-react';
import api from '../../services/api';

export default function DailyReport() {
  const [reportData, setReportData] = useState<any[]>([]);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await api.get('/weighment-reports/daily');
      setReportData(res.data);
    } catch (err) {
      console.error("Failed to fetch daily report", err);
    }
  };

  const totalLoad = reportData.reduce((sum, row) => sum + (row.netWeight || 0), 0);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Daily Weighment Report</h1>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg flex items-center text-sm font-medium hover:bg-slate-50">
            <Printer size={18} className="mr-2" /> Print
          </button>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center text-sm font-medium hover:bg-emerald-700">
            <Download size={18} className="mr-2" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Date</p>
          <p className="text-2xl font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Vehicles</p>
          <p className="text-2xl font-bold text-slate-800">{reportData.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Net Load</p>
          <p className="text-2xl font-bold text-emerald-600">{(totalLoad / 1000).toFixed(2)} TON</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Slip No</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3 text-right">Gross (KG)</th>
                <th className="px-4 py-3 text-right">Tare (KG)</th>
                <th className="px-4 py-3 text-right">Net (KG)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportData.map((row) => {
                const gross = row.secondWeight ? Math.max(row.firstWeight, row.secondWeight) : row.firstWeight;
                const tare = row.secondWeight ? Math.min(row.firstWeight, row.secondWeight) : 0;
                
                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.slipNumber || '-'}</td>
                    <td className="px-4 py-3">{new Date(row.createdAt).toLocaleTimeString()}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.vehicleNumber}</td>
                    <td className="px-4 py-3">{row.material?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{gross || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{tare || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{row.netWeight || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        row.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        row.status === 'WAITING_FOR_SECOND_WEIGHT' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {row.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
