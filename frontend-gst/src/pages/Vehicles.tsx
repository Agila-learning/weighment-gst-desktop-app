import { useState, useEffect } from 'react';
import { Plus, Search, LayoutList, LayoutGrid, Edit2, Trash2 } from 'lucide-react';
import apiClient from '../api/client';

const Vehicles = () => {
  const [search, setSearch] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [showModal, setShowModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ id: '', vehicleNumber: '', vehicleType: 'Tipper', transporterName: '', state: '', capacityWeight: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/vehicles');
      setVehicles(response.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (isEditing && newVehicle.id) {
        await apiClient.put(`/vehicles/${newVehicle.id}`, newVehicle);
      } else {
        await apiClient.post('/vehicles', newVehicle);
      }
      setShowModal(false);
      setNewVehicle({ id: '', vehicleNumber: '', vehicleType: 'Tipper', transporterName: '', state: '', capacityWeight: '' });
      setIsEditing(false);
      fetchVehicles();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error saving vehicle');
      console.error('Error saving vehicle', err);
    }
  };
  
  const openEditModal = (vehicle: any) => {
    setNewVehicle({
      id: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber || '',
      vehicleType: vehicle.vehicleType || 'Tipper',
      transporterName: vehicle.transporterInfo || '',
      state: vehicle.state || '',
      capacityWeight: vehicle.capacityWeight ? vehicle.capacityWeight.toString() : ''
    });
    setIsEditing(true);
    setErrorMsg('');
    setShowModal(true);
  };
  
  const openAddModal = () => {
    setNewVehicle({ id: '', vehicleNumber: '', vehicleType: 'Tipper', transporterName: '', state: '', capacityWeight: '' });
    setIsEditing(false);
    setErrorMsg('');
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate or remove this vehicle?')) {
      try {
        await apiClient.delete(`/vehicles/${id}`);
        fetchVehicles();
      } catch (err) {
        console.error('Error deleting vehicle', err);
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="text-gray-500">Manage transport vehicles and tracking</p>
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
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{isEditing ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
            
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleAddOrEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number *</label>
                <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newVehicle.vehicleNumber} onChange={e => setNewVehicle({...newVehicle, vehicleNumber: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newVehicle.vehicleType} onChange={e => setNewVehicle({...newVehicle, vehicleType: e.target.value})}>
                    <option value="Tipper">Tipper</option>
                    <option value="Lorry">Lorry</option>
                    <option value="Tractor">Tractor</option>
                    <option value="Mixer">Mixer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newVehicle.state} onChange={e => setNewVehicle({...newVehicle, state: e.target.value})} placeholder="e.g. Karnataka" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity / Weight (Tons)</label>
                  <input type="number" step="0.1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newVehicle.capacityWeight} onChange={e => setNewVehicle({...newVehicle, capacityWeight: e.target.value})} placeholder="e.g. 10.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transporter / Owner</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newVehicle.transporterName} onChange={e => setNewVehicle({...newVehicle, transporterName: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-sm" style={{ backgroundColor: 'var(--color-primary)' }}>Save Vehicle</button>
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
              placeholder="Search vehicles..."
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
                  <th className="px-6 py-4">Vehicle No.</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">State</th>
                  <th className="px-6 py-4">Capacity</th>
                  <th className="px-6 py-4">Transporter</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-4">Loading vehicles...</td></tr>
                ) : vehicles.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4">No vehicles found.</td></tr>
                ) : (
                  vehicles.filter(v => v.vehicleNumber.toLowerCase().includes(search.toLowerCase())).map((vehicle: any) => (
                    <tr key={vehicle.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{vehicle.vehicleNumber}</td>
                      <td className="px-6 py-4">{vehicle.vehicleType || '-'}</td>
                      <td className="px-6 py-4">{vehicle.state || '-'}</td>
                      <td className="px-6 py-4">{vehicle.capacityWeight ? `${vehicle.capacityWeight} Tons` : '-'}</td>
                      <td className="px-6 py-4">{vehicle.transporterInfo || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditModal(vehicle)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        <button onClick={() => handleDelete(vehicle.id)} className="text-red-500 hover:text-red-700 font-medium ml-4">Remove</button>
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
              <div className="col-span-full text-center py-8 text-gray-500">Loading vehicles...</div>
            ) : vehicles.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">No vehicles found.</div>
            ) : (
              vehicles.filter(v => v.vehicleNumber.toLowerCase().includes(search.toLowerCase())).map((vehicle: any) => (
                <div key={vehicle.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => openEditModal(vehicle)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(vehicle.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="mb-3 pr-16">
                    <h3 className="text-lg font-bold text-gray-900">{vehicle.vehicleNumber}</h3>
                    <p className="text-sm font-medium text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded mt-1">{vehicle.vehicleType || 'Vehicle'}</p>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Capacity:</span>
                      <span className="font-medium text-gray-700">{vehicle.capacityWeight ? `${vehicle.capacityWeight} Tons` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">State:</span>
                      <span className="font-medium text-gray-700">{vehicle.state || 'N/A'}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 mt-2">
                      <span className="block text-xs text-gray-400 mb-0.5">Transporter / Owner</span>
                      <span className="font-medium text-gray-800 truncate block">{vehicle.transporterInfo || 'N/A'}</span>
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

export default Vehicles;
