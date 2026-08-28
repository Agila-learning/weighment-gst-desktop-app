import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileBadge, Plus, FileDown, Copy, Search } from 'lucide-react';
import apiClient from '../api/client';

const PermitCards = () => {
  const [permits, setPermits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const ipcRenderer = (window as any).ipcRenderer;

  useEffect(() => {
    fetchPermits();
  }, []);

  const fetchPermits = async () => {
    try {
      const res = await apiClient.get('/permit-cards');
      setPermits(res.data);
    } catch (error) {
      console.error('Failed to fetch permit cards', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPermits = permits.filter(p => 
    p.permitReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.purchaserName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadPdf = async (permit: any) => {
    try {
      const res = await apiClient.post('/permit-cards/generate-pdf', permit, { responseType: 'blob' });
      
      if (res.headers['x-fallback-html'] === 'true') {
        // Fallback to local Electron IPC
        if (!ipcRenderer) throw new Error('PDF Generation failed on server and no local IPC found.');
        const text = await res.data.text();
        
        const pdfGen = await ipcRenderer.invoke('generate-pdf', text);
        if (!pdfGen.success) throw new Error('Local PDF Generation Error: ' + pdfGen.error);

        const saveResult = await ipcRenderer.invoke('save-pdf-dialog', { 
          buffer: pdfGen.buffer, 
          defaultFilename: `${permit.permitReference}.pdf` 
        });
        if (!saveResult.success && saveResult.error) {
          alert('Error saving PDF: ' + saveResult.error);
        } else if (saveResult.success) {
          alert('Permit Card PDF Saved Successfully!');
        }
        return;
      }

      // Standard blob download in browser if backend puppeteer succeeded
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${permit.permitReference}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error: any) {
      console.error(error);
      alert('Error downloading PDF: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Permit Cards History</h1>
        <div className="flex gap-4">
          <Link to="/permit-cards/settings" className="px-4 py-2 border rounded bg-white hover:bg-gray-50 flex items-center gap-2">
            <FileBadge size={18} />
            Template Settings
          </Link>
          <Link to="/permit-cards/create" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2">
            <Plus size={18} />
            Create Permit Card
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search Reference, Vehicle, Purchaser..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference / Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle & Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material & Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchaser</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : filteredPermits.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">No permit cards found.</td></tr>
              ) : (
                filteredPermits.map((permit) => (
                  <tr key={permit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{permit.permitReference}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(permit.date).toLocaleDateString()} {permit.dispatchTime}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{permit.vehicleNumber}</div>
                      <div className="text-sm text-gray-500">{permit.driverName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{permit.materialName}</div>
                      <div className="text-sm text-gray-500">{permit.quantity} {permit.quantityUnit}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{permit.purchaserName}</div>
                      <div className="text-sm text-gray-500">{permit.purchaserDestination}</div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => navigate(`/permit-cards/create?duplicateId=${permit.id}`)} className="text-indigo-600 hover:text-indigo-900 p-1" title="Duplicate (Create New)">
                        <Copy size={18} />
                      </button>
                      <button onClick={() => handleDownloadPdf(permit)} className="text-blue-600 hover:text-blue-900 p-1" title="Download PDF">
                        <FileDown size={18} />
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
};

export default PermitCards;
