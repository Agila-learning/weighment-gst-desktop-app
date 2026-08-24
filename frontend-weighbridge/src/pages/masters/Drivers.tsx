// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, LayoutList, LayoutGrid } from 'lucide-react';
import api from '../../services/api';

export default function Drivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // @ts-ignore
  const [errorMsg, setErrorMsg] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [transporterName, setTransporterName] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      // 1. Fetch from Server First
      try {
        const res = await api.get('/drivers');
        setDrivers(res.data);
        return;
      } catch (serverErr) {
        console.warn('Server fetch failed, falling back to offline');
      }

      // 2. Fallback
      const ipcRenderer = (window as any).ipcRenderer;
      if (ipcRenderer) {
        const response = await ipcRenderer.invoke('db-query', 'SELECT * FROM drivers');
        if (response.success) setDrivers(response.data);
      }
    } catch (err) {}
  };

  const openAddModal = () => {
    setEditingDriver(null);
    setName('');
    setMobile('');
    setLicenseNumber('');
    setLicenseExpiry('');
    setTransporterName('');
    setIsModalOpen(true);
  };

  
  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      let serverSaved = false;
      let serverErrorMsg = '';

      let payload: any = {};
      payload = { name, mobile, licenseNumber, licenseExpiry: licenseExpiry ? new Date(licenseExpiry).toISOString() : null, transporterName };
        const idToEdit = editingDriver ? editingDriver.id : null;
        const isEditingFlag = !!editingDriver;
        
      // 1. Attempt Server API Call First (since user prioritizes Postgresql)
      try {
        if (isEditingFlag && idToEdit) {
          await api.put(`/drivers/${idToEdit}`, payload);
        } else {
          const res = await api.post('/drivers', payload);
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
          q = 'INSERT OR REPLACE INTO drivers (id, name) VALUES (?, ?)'; params = [payload.id, payload.name];
          await ipcRenderer.invoke('db-query', q, params);
      } else if (!serverSaved) {
          // Web Mode (no Electron) and Server Failed!
          setErrorMsg(serverErrorMsg || "Could not save to server.");
          return;
      }

      // Success
      
      if (typeof setIsModalOpen === 'function') setIsModalOpen(false);
      
      fetchDrivers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unexpected error occurred.');
    }
  };

  const openEditModal = (c: any) => {
    setEditingDriver(c);
    setName(c.name);
    setMobile(c.mobile || '');
    setLicenseNumber(c.licenseNumber || '');
    setLicenseExpiry(c.licenseExpiry ? new Date(c.licenseExpiry).toISOString().split('T')[0] : '');
    setTransporterName(c.transporterName || '');
    setIsModalOpen(true);
  };

  

  const filtered = drivers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Driver Master</h1>
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
            <Plus size={18} className="mr-2" /> Add Driver
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative w-96">
            <input type="text" placeholder="Search drivers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>
        </div>
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">License No</th>
                  <th className="px-4 py-3">Transporter</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{row.name}</td>
                    <td className="px-4 py-3">{row.mobile || '-'}</td>
                    <td className="px-4 py-3">{row.licenseNumber || '-'}</td>
                    <td className="px-4 py-3">{row.transporterName || '-'}</td>
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
              <div className="col-span-full text-center py-8 text-slate-500">No drivers found.</div>
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
                      <span className="text-slate-400">Mobile:</span>
                      <span className="font-medium text-slate-700">{row.mobile || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">License No:</span>
                      <span className="font-medium text-slate-700">{row.licenseNumber || 'N/A'}</span>
                    </div>
                    {row.licenseExpiry && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Expires:</span>
                        <span className="font-medium text-slate-700">{new Date(row.licenseExpiry).toLocaleDateString()}</span>
                      </div>
                    )}
                    {row.transporterName && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Transporter:</span>
                        <span className="font-medium text-slate-700">{row.transporterName}</span>
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
            <h2 className="text-xl font-bold text-slate-800 mb-6">{editingDriver ? 'Edit Driver' : 'Add Driver'}</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile</label>
                  <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
                  <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">License Expiry</label>
                  <input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Transporter Name</label>
                  <input type="text" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={handleAddOrEdit} disabled={!name} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
