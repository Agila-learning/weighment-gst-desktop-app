import { useState, useEffect } from 'react';
import { Plus, Search, LayoutList, LayoutGrid, Edit2, Trash2 } from 'lucide-react';
import apiClient from '../api/client';

const Materials = () => {
  const [search, setSearch] = useState('');
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [showModal, setShowModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ id: '', name: '', hsnCode: '', defaultRate: '', unit: 'TON', gstRateId: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [taxRates, setTaxRates] = useState<any[]>([]);

  useEffect(() => {
    fetchMaterials();
    fetchTaxRates();
  }, []);

  const fetchTaxRates = async () => {
    try {
      const res = await apiClient.get('/settings/taxes');
      setTaxRates(res.data);
      if (res.data.length > 0) {
        setNewMaterial(prev => ({...prev, gstRateId: res.data[0].id}));
      }
    } catch (e) {}
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/materials');
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.gstRateId) {
      setErrorMsg('Please select a GST rate.');
      return;
    }
    setErrorMsg('');
    try {
      const payload = { ...newMaterial, defaultRate: Number(newMaterial.defaultRate) };
      if (isEditing && newMaterial.id) {
        await apiClient.put(`/materials/${newMaterial.id}`, payload);
      } else {
        await apiClient.post('/materials', payload);
      }
      setShowModal(false);
      setIsEditing(false);
      setNewMaterial({ id: '', name: '', hsnCode: '', defaultRate: '', unit: 'TON', gstRateId: taxRates[0]?.id || '' });
      fetchMaterials();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error saving material');
      console.error('Error saving material', err);
    }
  };
  
  const openEditModal = (material: any) => {
    setNewMaterial({
      id: material.id,
      name: material.name || '',
      hsnCode: material.hsnCode || '',
      defaultRate: material.defaultRate || '',
      unit: material.unit || 'TON',
      gstRateId: material.gstRateId || (taxRates[0]?.id || '')
    });
    setIsEditing(true);
    setErrorMsg('');
    setShowModal(true);
  };
  
  const openAddModal = () => {
    setNewMaterial({ id: '', name: '', hsnCode: '', defaultRate: '', unit: 'TON', gstRateId: taxRates[0]?.id || '' });
    setIsEditing(false);
    setErrorMsg('');
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate or remove this material?')) {
      try {
        await apiClient.delete(`/materials/${id}`);
        fetchMaterials();
      } catch (err) {
        console.error('Error deleting material', err);
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
          <p className="text-gray-500">Manage M-Sand, Jelly, and other construction materials</p>
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
          <button onClick={openAddModal} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90 shadow-md" style={{ backgroundColor: 'var(--color-primary)' }}>
            <Plus size={20} />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{isEditing ? 'Edit Material' : 'Add Material'}</h2>
            
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleAddOrEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="e.g. M-Sand" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.hsnCode} onChange={e => setNewMaterial({...newMaterial, hsnCode: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}>
                    <option value="TON">Ton</option>
                    <option value="KG">Kg</option>
                    <option value="LOAD">Load</option>
                    <option value="CFT">CFT</option>
                    <option value="BAG">Bag</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Rate (₹) *</label>
                  <input required type="number" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.defaultRate} onChange={e => setNewMaterial({...newMaterial, defaultRate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Tax Rate *</label>
                  <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newMaterial.gstRateId} onChange={e => setNewMaterial({...newMaterial, gstRateId: e.target.value})}>
                    <option value="">Select Rate</option>
                    {taxRates.map(tr => (
                      <option key={tr.id} value={tr.id}>{tr.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-sm" style={{ backgroundColor: 'var(--color-primary)' }}>Save Material</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-colors"
            />
          </div>
        </div>
        
        
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">HSN Code</th>
                  <th className="px-6 py-4">Default Rate (₹)</th>
                  <th className="px-6 py-4">Unit</th>
                  <th className="px-6 py-4">GST Rate</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Loading materials...
                    </td>
                  </tr>
                ) : materials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No materials found.
                    </td>
                  </tr>
                ) : (
                  materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).map((material) => (
                    <tr key={material.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{material.name}</td>
                      <td className="px-6 py-4">{material.hsnCode || '-'}</td>
                      <td className="px-6 py-4">₹{material.defaultRate}</td>
                      <td className="px-6 py-4">{material.unit || 'TON'}</td>
                      <td className="px-6 py-4">{material.taxRate?.name || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditModal(material)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        <button onClick={() => handleDelete(material.id)} className="text-red-500 hover:text-red-700 font-medium ml-4">Remove</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-gray-50/50">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-500">Loading materials...</div>
            ) : materials.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">No materials found.</div>
            ) : (
              materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).map((material) => (
                <div key={material.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => openEditModal(material)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(material.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="mb-3 pr-16">
                    <h3 className="text-lg font-bold text-gray-900">{material.name}</h3>
                    {material.hsnCode && (
                      <p className="text-sm font-medium text-gray-500 inline-block mt-1">HSN: {material.hsnCode}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Default Rate:</span>
                      <span className="font-semibold text-gray-900 text-base">₹{material.defaultRate} <span className="text-sm font-normal text-gray-500">/ {material.unit}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">GST Rate:</span>
                      <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{material.taxRate?.name || 'N/A'}</span>
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
};

export default Materials;
