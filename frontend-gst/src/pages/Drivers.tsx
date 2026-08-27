import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, LayoutList, LayoutGrid } from 'lucide-react';
import apiClient from '../api/client';

export default function Drivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null);

  const fetchDrivers = async () => {
    try {
      const res = await apiClient.get('/drivers');
      setDrivers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      mobile: formData.get('mobile'),
      licenseNumber: formData.get('licenseNumber'),
      licenseExpiry: formData.get('licenseExpiry') || undefined,
      address: formData.get('address'),
      transporterName: formData.get('transporterName'),
      signatureImageUrl: signatureImageUrl,
    };

    try {
      if (currentDriver) {
        await apiClient.put(`/drivers/${currentDriver.id}`, data);
      } else {
        await apiClient.post('/drivers', data);
      }
      setShowModal(false);
      setCurrentDriver(null);
      fetchDrivers();
    } catch (err) {
      alert('Failed to save driver');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    try {
      await apiClient.delete(`/drivers/${id}`);
      fetchDrivers();
    } catch (err) {
      alert('Failed to delete driver');
    }
  };

  const filtered = drivers.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    (d.licenseNumber && d.licenseNumber.toLowerCase().includes(search.toLowerCase())) ||
    (d.transporterName && d.transporterName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drivers & Transporters</h1>
          <p className="text-gray-500">Manage drivers and transport details</p>
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
          <button
            onClick={() => { setCurrentDriver(null); setSignatureImageUrl(null); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-colors bg-primary-600 hover:bg-primary-700"
          >
            <Plus size={20} /> Add Driver
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search drivers..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm font-medium">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Mobile</th>
                  <th className="p-4">License No</th>
                  <th className="p-4">Expiry</th>
                  <th className="p-4">Transporter</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{d.name}</td>
                    <td className="p-4 text-gray-600">{d.mobile || '-'}</td>
                    <td className="p-4 text-gray-600">{d.licenseNumber || '-'}</td>
                    <td className="p-4 text-gray-600">{d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString() : '-'}</td>
                    <td className="p-4 text-gray-600">{d.transporterName || '-'}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => { setCurrentDriver(d); setSignatureImageUrl(d.signatureImageUrl || null); setShowModal(true); }} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">No drivers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-gray-50/50">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">No drivers found.</div>
            ) : (
              filtered.map((d) => (
                <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => { setCurrentDriver(d); setShowModal(true); }} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="mb-3 pr-16">
                    <h3 className="text-lg font-bold text-gray-900">{d.name}</h3>
                    {d.transporterName && (
                      <p className="text-sm font-medium text-gray-500 inline-block mt-1">Transporter: {d.transporterName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mobile:</span>
                      <span className="font-medium text-gray-700">{d.mobile || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">License No:</span>
                      <span className="font-medium text-gray-700">{d.licenseNumber || 'N/A'}</span>
                    </div>
                    {d.licenseExpiry && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">License Expiry:</span>
                        <span className={`font-medium ${new Date(d.licenseExpiry) < new Date() ? 'text-red-600' : 'text-gray-700'}`}>
                          {new Date(d.licenseExpiry).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{currentDriver ? 'Edit Driver' : 'Add Driver'}</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                <input required name="name" defaultValue={currentDriver?.name} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                  <input name="mobile" defaultValue={currentDriver?.mobile} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transporter Name</label>
                  <input name="transporterName" defaultValue={currentDriver?.transporterName} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License No</label>
                  <input name="licenseNumber" defaultValue={currentDriver?.licenseNumber} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry</label>
                  <input name="licenseExpiry" defaultValue={currentDriver?.licenseExpiry ? currentDriver.licenseExpiry.substring(0, 10) : ''} type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea name="address" defaultValue={currentDriver?.address} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Electronic Signature (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setSignatureImageUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full border rounded px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 outline-none"
                />
                {signatureImageUrl && (
                  <div className="mt-2">
                    <img src={signatureImageUrl} alt="Signature Preview" className="h-12 object-contain border p-1 rounded" />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm bg-primary-600 hover:bg-primary-700">Save Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
