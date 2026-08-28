// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect } from 'react';
import { Search, LayoutList, LayoutGrid, Plus, Edit2 } from 'lucide-react';
import api from '../../services/api';

export default function Materials() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ id: '', name: '', unit: 'TON', hsnCode: '', pricingType: 'PER_TON', billingUnit: 'TON', defaultRate: 0, gstRateId: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [taxRates, setTaxRates] = useState<any[]>([]);

  useEffect(() => {
    fetchMaterials();
    fetchTaxRates();
  }, []);

  const fetchTaxRates = async () => {
    try {
      const res = await api.get('/settings/taxes');
      setTaxRates(res.data);
      if (res.data.length > 0) {
        setNewMaterial(prev => ({...prev, gstRateId: res.data[0].id}));
      }
    } catch (e) {}
  };


  const fetchMaterials = async () => {
    try {
      const res = await api.get('/materials');
      setMaterials(res.data);
    } catch (err) {}
  };

  const validateForm = () => {
    if (newMaterial.name.length < 2) return "Name must be at least 2 characters.";
    if (!newMaterial.gstRateId) return "GST Rate is required.";
    return null;
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof validateForm === 'function') {
        const error = validateForm();
        if (error) {
          setErrorMsg(error);
          return;
        }
    }
    setErrorMsg('');
    
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      let serverSaved = false;
      let serverErrorMsg = '';

      let payload: any = { ...newMaterial };
      const idToEdit = newMaterial.id;
      const isEditingFlag = isEditing;
        
      // 1. Attempt Server API Call First
      try {
        if (isEditingFlag && idToEdit) {
          await api.put(`/materials/${idToEdit}`, payload);
        } else {
          const res = await api.post('/materials', payload);
          if (res.data && res.data.id) payload.id = res.data.id;
        }
        serverSaved = true;
      } catch (err: any) {
        console.warn("Server API Error:", err);
        serverErrorMsg = err.response?.data?.message || err.message || 'Server error';
        if (!payload.id) {
           payload.id = uuidv4();
        }
      }

      // 2. Attempt Local SQLite (Offline Mode)
      if (ipcRenderer) {
          let q = '';
          let params: any[] = [];
          q = 'INSERT OR REPLACE INTO materials (id, name, pricingType, billingUnit, defaultRate) VALUES (?, ?, ?, ?, ?)'; params = [payload.id, payload.name, payload.pricingType || 'PER_TON', payload.billingUnit || 'TON', payload.defaultRate || 0];
          await ipcRenderer.invoke('db-query', q, params);
      } else if (!serverSaved) {
          setErrorMsg(serverErrorMsg || "Could not save to server.");
          return;
      }

      // Success
      setShowModal(false);
      setIsEditing(false);
      fetchMaterials();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unexpected error occurred.');
    }
  };

  const openAddModal = () => {
    setNewMaterial({ id: '', name: '', unit: 'TON', hsnCode: '', pricingType: 'PER_TON', billingUnit: 'TON', defaultRate: 0, gstRateId: '' });
    setIsEditing(false);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (m: any) => {
    setNewMaterial({
      id: m.id,
      name: m.name || '',
      unit: m.unit || 'TON',
      hsnCode: m.hsnCode || '',
      pricingType: m.pricingType || 'PER_TON',
      billingUnit: m.billingUnit || 'TON',
      defaultRate: m.defaultRate || 0,
      gstRateId: m.gstRateId || ''
    });
    setIsEditing(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const filtered = materials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
          <p className="text-gray-500">Manage materials and products</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="List View"
            >
              <LayoutList size={18} />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90 shadow-md bg-primary-600 hover:bg-primary-700">
            <Plus size={20} />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Material' : 'Add New Material'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                  {errorMsg}
                </div>
              )}
              
              <form onSubmit={handleAddOrEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
                  <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}>
                    <option value="TON">TON</option>
                    <option value="KG">KG</option>
                    <option value="NOS">NOS</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Type</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.pricingType} onChange={e => setNewMaterial({...newMaterial, pricingType: e.target.value})}>
                      <option value="PER_UNIT">Per Unit</option>
                      <option value="FIXED">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Unit</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.billingUnit} onChange={e => setNewMaterial({...newMaterial, billingUnit: e.target.value})}>
                      <option value="TON">TON</option>
                      <option value="KG">KG</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Rate (₹)</label>
                    <input type="number" min="0" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.defaultRate} onChange={e => setNewMaterial({...newMaterial, defaultRate: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate *</label>
                    <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.gstRateId} onChange={e => setNewMaterial({...newMaterial, gstRateId: e.target.value})}>
                      <option value="">Select GST Rate</option>
                      {taxRates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.cgst + t.sgst + t.igst}%)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors">
                    Save Material
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{row.name}</td>
                    <td className="px-4 py-3">{row.unit || 'TON'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditModal(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No materials found.</td></tr>
                )}
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
                  <button onClick={() => openEditModal(row)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
