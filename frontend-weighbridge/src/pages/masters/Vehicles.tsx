import { useState, useEffect } from 'react';
import { Plus, Search, LayoutList, LayoutGrid, Edit2, Trash2, Truck, Info, Clock, CheckCircle, Scale, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

const Vehicles = () => {
  const [search, setSearch] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const [showModal, setShowModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ id: '', vehicleNumber: '', vehicleType: 'Tipper', transporterId: '', state: '', capacityWeight: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsVehicle, setDetailsVehicle] = useState<any>(null);
  const [detailsSummary, setDetailsSummary] = useState<any>(null);
  const [detailsHistory, setDetailsHistory] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchMasters();
    fetchVehicles();
  }, []);

  const fetchMasters = async () => {
    try {
      const [tRes] = await Promise.all([
        api.get('/transporters')
      ]);
      setTransporters(Array.isArray(tRes.data) ? tRes.data : tRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching masters', err);
    }
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vehicles?status=all');
      setVehicles(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to local SQLite if offline
      const ipcRenderer = (window as any).ipcRenderer;
      if (ipcRenderer) {
        const response = await ipcRenderer.invoke('db-query', 'SELECT * FROM vehicles');
        if (response.success) setVehicles(response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    try {
      let payload = {
        ...newVehicle,
        capacityWeight: newVehicle.capacityWeight ? parseFloat(newVehicle.capacityWeight) : null,
        transporterId: newVehicle.transporterId || null
      };
      
      let res: any;
      if (isEditing && newVehicle.id) {
        res = await api.put(`/vehicles/${newVehicle.id}`, payload);
      } else {
        res = await api.post('/vehicles', payload);
      }

      setShowModal(false);
      const savedNumber = newVehicle.vehicleNumber;
      setIsEditing(false);
      fetchVehicles();
      if (res?.data?.restored) {
        setSuccessMsg(`Vehicle ${res.data.vehicleNumber} was previously deleted and has now been successfully reactivated!`);
      } else {
        setSuccessMsg(`Vehicle ${savedNumber} saved successfully.`);
      }
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Unexpected error occurred.');
    }
  };

  const handleRestore = async (id: string, vehicleNum?: string) => {
    try {
      await api.post(`/vehicles/${id}/restore`);
      setSuccessMsg(`Vehicle ${vehicleNum || ''} restored successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchVehicles();
    } catch (err) {
      console.error('Error restoring vehicle', err);
    }
  };

  const openEditModal = (vehicle: any) => {
    setNewVehicle({
      id: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber || '',
      vehicleType: vehicle.vehicleType || 'Tipper',
      transporterId: vehicle.transporterId || '',
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
      const summaryRes = await api.get(`/vehicles/${vehicle.vehicleNumber}/summary`);
      setDetailsSummary(summaryRes.data.summary);
      
      const historyRes = await api.get(`/weighments?vehicleNumber=${vehicle.vehicleNumber}&limit=50`);
      setDetailsHistory(historyRes.data.data || []);
    } catch (err) {
      console.error('Error fetching vehicle details', err);
    } finally {
      setDetailsLoading(false);
    }
  };
  
  const openAddModal = () => {
    setNewVehicle({ id: '', vehicleNumber: '', vehicleType: 'Tipper', transporterId: '', state: '', capacityWeight: '' });
    setIsEditing(false);
    setErrorMsg('');
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate or remove this vehicle?')) {
      try {
        await api.delete(`/vehicles/${id}`);
        setSuccessMsg('Vehicle deleted/deactivated successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchVehicles();
      } catch (err) {
        console.error('Error deleting vehicle', err);
      }
    }
  };

  const activeCount = vehicles.filter(v => v.isActive).length;
  const inactiveCount = vehicles.filter(v => !v.isActive).length;
  const allCount = vehicles.length;

  const filteredVehicles = vehicles.filter(v => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || 
      (v.vehicleNumber && v.vehicleNumber.toLowerCase().includes(q)) ||
      (v.transporter?.name && v.transporter.name.toLowerCase().includes(q)) ||
      (v.state && v.state.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return v.isActive;
    if (statusFilter === 'inactive') return !v.isActive;
    return true;
  });

  const matchingInactiveVehicles = search.trim() 
    ? vehicles.filter(v => !v.isActive && v.vehicleNumber.toLowerCase().includes(search.trim().toLowerCase())) 
    : [];

  const getVehicleTypeBadge = (type?: string) => {
    const t = (type || '').trim().toLowerCase();
    switch (t) {
      case 'tipper':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'lorry':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'tractor':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'mixer':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'container':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'tanker':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'trailer':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
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
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutList size={18} /></button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={18} /></button>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90 shadow-md bg-blue-600 hover:bg-blue-700">
            <Plus size={20} />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
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
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2"><Info size={16} /> Vehicle Identification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number <span className="text-red-500">*</span></label>
                      <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none uppercase font-mono" value={newVehicle.vehicleNumber} onChange={e => setNewVehicle({...newVehicle, vehicleNumber: e.target.value.toUpperCase().replace(/\s/g, '')})} placeholder="e.g. MH12AB1234" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none bg-white" value={newVehicle.vehicleType} onChange={e => setNewVehicle({...newVehicle, vehicleType: e.target.value})}>
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
                      <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newVehicle.state} onChange={e => setNewVehicle({...newVehicle, state: e.target.value})} placeholder="e.g. Maharashtra" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2"><Scale size={16} /> Additional Details</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Empty Weight (KG)</label>
                      <input type="number" step="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newVehicle.capacityWeight} onChange={e => setNewVehicle({...newVehicle, capacityWeight: e.target.value})} placeholder="e.g. 2500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transporter</label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newVehicle.transporterId} onChange={e => setNewVehicle({...newVehicle, transporterId: e.target.value})}>
                        <option value="">-- No Transporter --</option>
                        {transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium shadow-sm">Cancel</button>
              <button type="submit" form="vehicle-form" className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow-sm">Save Vehicle</button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && detailsVehicle && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
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
                      <div className="text-2xl font-bold text-blue-600">{detailsSummary.todaysLoads || 0}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-green-100 text-center shadow-sm">
                      <div className="text-xs text-gray-500 font-medium uppercase mb-1 flex items-center justify-center gap-1"><Scale size={14} /> Today's Weight</div>
                      <div className="text-2xl font-bold text-green-600">{(detailsSummary.todaysTotalWeight || 0).toFixed(2)} KG</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-purple-100 text-center shadow-sm">
                      <div className="text-xs text-gray-500 font-medium uppercase mb-1 flex items-center justify-center gap-1"><CheckCircle size={14} /> Total Lifetime Loads</div>
                      <div className="text-2xl font-bold text-purple-600">{detailsSummary.completedWeighments || 0}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 text-center shadow-sm">
                      <div className="text-xs text-gray-500 font-medium uppercase mb-1">Total Lifetime Weight</div>
                      <div className="text-2xl font-bold text-indigo-600">{((detailsSummary.totalHistoricalWeight || 0) / 1000).toFixed(2)} TON</div>
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

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4">✕</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by vehicle number, transporter, state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-colors text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Active</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                {activeCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === 'inactive' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Deleted / Inactive</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'inactive' ? 'bg-rose-100 text-rose-700' : 'bg-gray-200 text-gray-700'}`}>
                {inactiveCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>All</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'all' ? 'bg-gray-300 text-gray-800' : 'bg-gray-200 text-gray-700'}`}>
                {allCount}
              </span>
            </button>
          </div>
        </div>

        {statusFilter === 'active' && matchingInactiveVehicles.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <span>
                Found <strong>{matchingInactiveVehicles.length}</strong> previously deleted/inactive vehicle(s) matching "<strong>{search}</strong>" ({matchingInactiveVehicles.map(v => v.vehicleNumber).join(', ')}).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter('inactive')}
                className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold px-2.5 py-1.5 rounded transition-colors"
              >
                View Inactive
              </button>
              {matchingInactiveVehicles.length === 1 && (
                <button
                  onClick={() => handleRestore(matchingInactiveVehicles[0].id, matchingInactiveVehicles[0].vehicleNumber)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded transition-colors flex items-center gap-1 shadow-sm"
                >
                  <RotateCcw size={13} />
                  Restore {matchingInactiveVehicles[0].vehicleNumber}
                </button>
              )}
            </div>
          </div>
        )}
        
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Vehicle No.</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Capacity</th>
                  <th className="px-6 py-4">Transporter</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-4">Loading vehicles...</td></tr>
                ) : filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No vehicles found {search && `matching "${search}"`}.
                      {statusFilter === 'active' && inactiveCount > 0 && (
                        <div className="mt-2">
                          <button onClick={() => setStatusFilter('all')} className="text-blue-600 hover:underline font-semibold text-xs">
                            Check Inactive/Deleted Vehicles ({inactiveCount})
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle: any) => (
                    <tr key={vehicle.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!vehicle.isActive ? 'bg-rose-50/20' : ''}`}>
                      <td className="px-6 py-4 font-medium text-gray-900">{vehicle.vehicleNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getVehicleTypeBadge(vehicle.vehicleType)}`}>
                          {vehicle.vehicleType || 'Other'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{vehicle.capacityWeight ? `${vehicle.capacityWeight} Tons` : '-'}</td>
                      <td className="px-6 py-4">{vehicle.transporter?.name || '-'}</td>
                      <td className="px-6 py-4">
                        {vehicle.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Deleted
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end items-center">
                          <button onClick={() => openDetailsModal(vehicle)} className="text-gray-500 hover:text-blue-600 transition-colors p-1" title="Vehicle Details"><Truck size={18} /></button>
                          {vehicle.isActive ? (
                            <>
                              <button onClick={() => openEditModal(vehicle)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit Vehicle"><Edit2 size={18} /></button>
                              <button onClick={() => handleDelete(vehicle.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Delete Vehicle"><Trash2 size={18} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleRestore(vehicle.id, vehicle.vehicleNumber)} className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded px-2 py-1 transition-colors flex items-center gap-1 font-semibold text-xs border border-emerald-200" title="Restore Vehicle">
                                <RotateCcw size={14} />
                                <span>Restore</span>
                              </button>
                              <button onClick={() => handleDelete(vehicle.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Permanently Delete">
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
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
            ) : filteredVehicles.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No vehicles found {search && `matching "${search}"`}.
                {statusFilter === 'active' && inactiveCount > 0 && (
                  <div className="mt-2">
                    <button onClick={() => setStatusFilter('all')} className="text-blue-600 hover:underline font-semibold text-xs">
                      Check Inactive/Deleted Vehicles ({inactiveCount})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredVehicles.map((vehicle: any) => (
                <div key={vehicle.id} className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between ${!vehicle.isActive ? 'border-rose-200 bg-rose-50/10' : 'border-gray-200'}`}>
                  <div>
                    <div className="mb-3 pr-2 flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{vehicle.vehicleNumber}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mt-1 ${getVehicleTypeBadge(vehicle.vehicleType)}`}>
                          {vehicle.vehicleType || 'Other'}
                        </span>
                      </div>
                      <div>
                        {vehicle.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Deleted
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Capacity:</span>
                        <span className="font-medium text-gray-700">{vehicle.capacityWeight ? `${vehicle.capacityWeight} Tons` : 'N/A'}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100 mt-2">
                        <span className="block text-xs text-gray-400 mb-0.5">Transporter</span>
                        <span className="font-medium text-gray-800 truncate block">{vehicle.transporter?.name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                    <div className="flex gap-2 w-full pr-2">
                      <button onClick={() => openDetailsModal(vehicle)} className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 text-sm transition-colors shadow-sm">
                        <Truck size={14} /> Details
                      </button>
                    </div>
                    <div className="flex gap-2 items-center">
                      {vehicle.isActive ? (
                        <>
                          <button onClick={() => openEditModal(vehicle)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(vehicle.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleRestore(vehicle.id, vehicle.vehicleNumber)} className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200" title="Restore"><RotateCcw size={16} /></button>
                          <button onClick={() => handleDelete(vehicle.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                        </>
                      )}
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
