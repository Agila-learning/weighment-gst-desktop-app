// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect } from 'react';
import { Plus, Search, LayoutList, LayoutGrid, Edit2, Trash2, Truck, Info, Clock, CheckCircle, Scale } from 'lucide-react';
import api from '../../services/api';

const Vehicles = () => {
  const [search, setSearch] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [showModal, setShowModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ id: '', vehicleNumber: '', vehicleType: 'Tipper', transporterName: '', state: '', capacityWeight: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsVehicle, setDetailsVehicle] = useState<any>(null);
  const [detailsSummary, setDetailsSummary] = useState<any>(null);
  const [detailsHistory, setDetailsHistory] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch from Server First (Priority)
      try {
        const res = await api.get('/vehicles');
        setVehicles(res.data);
        setLoading(false);
        return; // Success, exit early
      } catch (serverErr) {
        console.warn('Server fetch failed, falling back to offline', serverErr);
      }

      // 2. Fallback to Local SQLite if offline
      const ipcRenderer = (window as any).ipcRenderer;
      if (ipcRenderer) {
        const response = await ipcRenderer.invoke('db-query', 'SELECT * FROM vehicles');
        if (response.success) setVehicles(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  
  
  
  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      let serverSaved = false;
      let serverErrorMsg = '';

      let payload: any = {};
      payload = { ...newVehicle };
        const idToEdit = newVehicle.id;
        const isEditingFlag = isEditing;
        
      // 1. Attempt Server API Call First (since user prioritizes Postgresql)
      try {
        if (isEditingFlag && idToEdit) {
          await api.put(`/vehicles/${idToEdit}`, payload);
        } else {
          const res = await api.post('/vehicles', payload);
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
          q = 'INSERT OR REPLACE INTO vehicles (id, vehicleNumber, tareWeight) VALUES (?, ?, ?)'; params = [payload.id, payload.vehicleNumber, payload.tareWeight || 0];
          await ipcRenderer.invoke('db-query', q, params);
      } else if (!serverSaved) {
          // Web Mode (no Electron) and Server Failed!
          setErrorMsg(serverErrorMsg || "Could not save to server.");
          return;
      }

      // Success
      if (typeof setShowModal === 'function') setShowModal(false);
      
      if (typeof setIsEditing === 'function') setIsEditing(false);
      fetchVehicles();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unexpected error occurred.');
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
  
  const openDetailsModal = async (vehicle: any) => {
    setDetailsVehicle(vehicle);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    try {
      // First get summary
      const summaryRes = await api.get(`/vehicles/${vehicle.vehicleNumber}/summary`);
      setDetailsSummary(summaryRes.data.summary);
      
      // Get paginated history (first page, limit 50)
      const historyRes = await api.get(`/weighments?vehicleNumber=${vehicle.vehicleNumber}&limit=50`);
      setDetailsHistory(historyRes.data.data || []);
    } catch (err) {
      console.error('Error fetching vehicle details', err);
    } finally {
      setDetailsLoading(false);
    }
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
        await api.delete(`/vehicles/${id}`);
        fetchVehicles();
      } catch (err) {
        console.error('Error deleting vehicle', err);
      }
    }
  };
  
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
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
          <button onClick={openAddModal} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90 shadow-md bg-primary-600 hover:bg-primary-700">
            <Plus size={20} />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Truck className="text-blue-600" />
                {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                  <Info size={16} className="mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              <form id="vehicle-form" onSubmit={handleAddOrEdit} className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                    <Info size={16} /> Vehicle Identification
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number <span className="text-red-500">*</span></label>
                      <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none uppercase font-mono transition-shadow" value={newVehicle.vehicleNumber} onChange={e => setNewVehicle({...newVehicle, vehicleNumber: e.target.value.toUpperCase().replace(/\s/g, '')})} placeholder="e.g. MH12AB1234" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none bg-white transition-shadow" value={newVehicle.vehicleType} onChange={e => setNewVehicle({...newVehicle, vehicleType: e.target.value})}>
                        <option value="Tipper">Tipper</option>
                        <option value="Lorry">Lorry</option>
                        <option value="Tractor">Tractor</option>
                        <option value="Mixer">Mixer</option>
                        <option value="Container">Container</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition-shadow" value={newVehicle.state} onChange={e => setNewVehicle({...newVehicle, state: e.target.value})} placeholder="e.g. Maharashtra" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                    <Scale size={16} /> Capacity & Transporter
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Capacity / Weight (Tons)</label>
                      <input type="number" step="0.1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition-shadow" value={newVehicle.capacityWeight} onChange={e => setNewVehicle({...newVehicle, capacityWeight: e.target.value})} placeholder="e.g. 10.5" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transporter / Owner Info</label>
                      <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition-shadow" value={newVehicle.transporterName} onChange={e => setNewVehicle({...newVehicle, transporterName: e.target.value})} placeholder="e.g. Fast Logistics Pvt Ltd" />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors font-medium shadow-sm">Cancel</button>
              <button type="submit" form="vehicle-form" className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm">Save Vehicle</button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && detailsVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-0 rounded-xl shadow-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Truck className="text-blue-600" />
                  {detailsVehicle.vehicleNumber}
                </h2>
                <p className="text-gray-500 text-sm mt-1">Vehicle Activity & Weighment History</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700 bg-white border border-gray-300 px-3 py-1 rounded-lg">Close</button>
            </div>
            
            {detailsLoading ? (
              <div className="p-12 text-center text-gray-500 flex-1">Loading vehicle data...</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
                
                {detailsSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-blue-100 text-center shadow-sm">
                      <div className="text-xs text-gray-500 font-medium uppercase mb-1 flex items-center justify-center gap-1"><Clock size={14} /> Today's Loads</div>
                      <div className="text-2xl font-bold text-blue-600">{detailsSummary.todaysLoads}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-green-100 text-center shadow-sm">
                      <div className="text-xs text-gray-500 font-medium uppercase mb-1 flex items-center justify-center gap-1"><Scale size={14} /> Today's Weight</div>
                      <div className="text-2xl font-bold text-green-600">{detailsSummary.todaysTotalWeight.toFixed(2)} KG</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-purple-100 text-center shadow-sm">
                      <div className="text-xs text-gray-500 font-medium uppercase mb-1 flex items-center justify-center gap-1"><CheckCircle size={14} /> Total Lifetime Loads</div>
                      <div className="text-2xl font-bold text-purple-600">{detailsSummary.completedWeighments}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 text-center shadow-sm">
                      <div className="text-xs text-gray-500 font-medium uppercase mb-1">Total Lifetime Weight</div>
                      <div className="text-2xl font-bold text-indigo-600">{(detailsSummary.totalHistoricalWeight / 1000).toFixed(2)} TON</div>
                    </div>
                  </div>
                )}
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Recent Weighments</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Slip No</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Material</th>
                          <th className="px-4 py-3 text-right">Gross Wt</th>
                          <th className="px-4 py-3 text-right">Tare Wt</th>
                          <th className="px-4 py-3 text-right">Net Wt</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detailsHistory.map((w: any) => (
                          <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(w.createdAt).toLocaleString()}</td>
                            <td className="px-4 py-3 font-medium">{w.slipNumber || '-'}</td>
                            <td className="px-4 py-3">{w.customer?.name || '-'}</td>
                            <td className="px-4 py-3">{w.material?.name || '-'}</td>
                            <td className="px-4 py-3 text-right">{w.firstWeight || '-'}</td>
                            <td className="px-4 py-3 text-right">{w.secondWeight || '-'}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">{w.netWeight ? `${w.netWeight} ${w.unit}` : '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                                w.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                w.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{w.status.replace(/_/g, ' ')}</span>
                            </td>
                          </tr>
                        ))}
                        {detailsHistory.length === 0 && (
                          <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No weighments found for this vehicle.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
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
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openDetailsModal(vehicle)} className="text-gray-500 hover:text-blue-600 transition-colors p-1" title="Vehicle Details">
                            <Truck size={18} />
                          </button>
                          <button onClick={() => openEditModal(vehicle)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit Vehicle">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(vehicle.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Delete Vehicle">
                            <Trash2 size={18} />
                          </button>
                        </div>
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
                <div key={vehicle.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="mb-3 pr-2">
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
                  
                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                    <div className="flex gap-2 w-full pr-2">
                      <button onClick={() => openDetailsModal(vehicle)} className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 text-sm transition-colors shadow-sm">
                        <Truck size={14} /> Details
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(vehicle)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-100"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(vehicle.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"><Trash2 size={16} /></button>
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
