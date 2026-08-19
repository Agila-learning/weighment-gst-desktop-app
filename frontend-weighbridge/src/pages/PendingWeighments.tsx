import { useState, useEffect } from 'react';
import { PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function PendingWeighments() {
  const [pending, setPending] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await api.get('/weighments/pending');
      setPending(res.data);
    } catch (err) {
      console.error("Failed to load pending weighments", err);
    }
  };

  const handleContinue = (vehicleNumber: string) => {
    // Navigate to Second Weight with vehicle number prefilled
    // Wait, react-router-dom state could be used, or just storing it in localStorage/zustand.
    // Since we don't have a parameter in route right now, we can just navigate. In a real app we'd pass state.
    navigate('/second-weight', { state: { vehicleNumber } });
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Pending Weighments</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3 text-right">First (KG)</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No pending weighments at the moment.
                  </td>
                </tr>
              ) : (
                pending.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{row.vehicleNumber}</td>
                    <td className="px-4 py-3">{row.customer?.name || '-'}</td>
                    <td className="px-4 py-3">{row.material?.name || '-'}</td>
                    <td className="px-4 py-3">{row.driver?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{row.firstWeight}</td>
                    <td className="px-4 py-3">{new Date(row.firstWeightDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{new Date(row.firstWeightDate).toLocaleTimeString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold whitespace-nowrap">
                        Waiting
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleContinue(row.vehicleNumber)}
                        className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg font-medium transition-colors"
                      >
                        <PlayCircle size={16} className="mr-1.5" /> Continue
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
