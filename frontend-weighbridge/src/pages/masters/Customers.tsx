import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, LayoutList, LayoutGrid } from 'lucide-react';
import api from '../../services/api';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {}
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setGstin('');
    setAddress('');
    setStateName('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setGstin(c.gstin || '');
    setAddress(c.address || '');
    setStateName(c.stateName || '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { name, phone, gstin, address, stateName };
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error saving customer');
    }
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Customer Master</h1>
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
          <button onClick={openAddModal} className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center text-sm font-medium hover:bg-slate-700 shadow-sm">
            <Plus size={18} className="mr-2" /> Add Customer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative w-96">
            <input type="text" placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>
        </div>
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{row.gstin || '-'}</td>
                    <td className="px-4 py-3">{row.phone || '-'}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]" title={row.address}>{row.address || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEditModal(row)} className="text-slate-400 hover:text-slate-800">
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-slate-50">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500">No customers found.</div>
            ) : (
              filtered.map((row) => (
                <div key={row.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(row)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" title="Edit">
                      <Edit2 size={14} />
                    </button>
                  </div>
                  
                  <div className="mb-3 pr-8">
                    <h3 className="text-lg font-bold text-slate-800">{row.name}</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-medium text-slate-700">{row.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">GSTIN:</span>
                      <span className="font-medium text-slate-700">{row.gstin || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">State:</span>
                      <span className="font-medium text-slate-700">{row.stateName || 'N/A'}</span>
                    </div>
                    {row.address && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-slate-400 block text-xs">Address:</span>
                        <span className="font-medium text-slate-700">{row.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
                  <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State Name</label>
                <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" rows={3}></textarea>
              </div>
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} disabled={!name} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
