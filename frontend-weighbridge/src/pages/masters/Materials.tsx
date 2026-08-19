import { useState, useEffect } from 'react';
import { Search, LayoutList, LayoutGrid } from 'lucide-react';
import api from '../../services/api';

export default function Materials() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  // GST fields are hidden for weighbridge operator but might be required by backend
  // In a real app we'd fetch a default tax rate or let backend handle it, or it's just not created here

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/materials');
      setMaterials(res.data);
    } catch (err) {}
  };

  const filtered = materials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Material Master</h1>
        <div className="flex gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <LayoutList size={18} />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative w-96">
            <input type="text" placeholder="Search materials..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>
        </div>
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">HSN Code</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Tax Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{row.hsnCode || '-'}</td>
                    <td className="px-4 py-3">{row.unit || 'TON'}</td>
                    <td className="px-4 py-3">{row.taxRate?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-slate-50">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500">No materials found.</div>
            ) : (
              filtered.map((row) => (
                <div key={row.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="mb-3 pr-8">
                    <h3 className="text-lg font-bold text-slate-800">{row.name}</h3>
                    <p className="text-sm font-medium text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded mt-1">
                      {row.unit || 'TON'}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">HSN Code:</span>
                      <span className="font-medium text-slate-700">{row.hsnCode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tax Rate:</span>
                      <span className="font-medium text-slate-700">{row.taxRate?.name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
