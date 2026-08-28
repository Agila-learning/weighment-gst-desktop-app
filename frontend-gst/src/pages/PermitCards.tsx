import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileBadge, Plus, FileDown, Copy, Search, Eye, XCircle, Edit } from 'lucide-react';
import apiClient from '../api/client';

const PermitCards = () => {
  const [permits, setPermits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsModalPermit, setDetailsModalPermit] = useState<any | null>(null);
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
        const text = await res.data.text();
        if (ipcRenderer) {
          const pdfGen = await ipcRenderer.invoke('generate-pdf', text);
          if (!pdfGen.success) throw new Error('Local PDF Generation Error: ' + pdfGen.error);

          const saveResult = await ipcRenderer.invoke('save-pdf-dialog', { 
            buffer: Array.from(pdfGen.buffer.data || pdfGen.buffer), 
            defaultFilename: `${permit.permitReference}.pdf` 
          });
          if (!saveResult.success && saveResult.error && !saveResult.canceled) {
            alert('Error saving PDF: ' + saveResult.error);
          }
        } else {
          const blob = new Blob([text], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const printWindow = window.open(url, '_blank');
          if (printWindow) {
            printWindow.onload = () => {
              setTimeout(() => printWindow.print(), 500);
            };
          } else {
             alert('Please allow popups to download this permit card.');
          }
        }
        return;
      }

      if (ipcRenderer) {
        const arrayBuffer = await res.data.arrayBuffer();
        const saveResult = await ipcRenderer.invoke('save-pdf-dialog', {
          buffer: Array.from(new Uint8Array(arrayBuffer)),
          defaultFilename: `${permit.permitReference}.pdf`
        });
        if (!saveResult.success && saveResult.error && !saveResult.canceled) {
          alert('Error saving PDF: ' + saveResult.error);
        }
      } else {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${permit.permitReference}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      }
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
                      <button onClick={() => setDetailsModalPermit(permit)} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                        <Eye size={18} />
                      </button>
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

      {/* PERMIT CARD DETAILS MODAL */}
      {detailsModalPermit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Permit Card Details</h2>
                <p className="text-sm text-slate-500">{detailsModalPermit.permitReference} • {detailsModalPermit.date ? new Date(detailsModalPermit.date).toLocaleDateString() : ''}</p>
              </div>
              <button onClick={() => setDetailsModalPermit(null)} className="text-gray-400 hover:text-gray-700"><XCircle size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Purchaser Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b pb-2">Purchaser Info</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Name:</span> <span className="font-semibold text-gray-900">{detailsModalPermit.purchaserName}</span></p>
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Destination:</span> {detailsModalPermit.purchaserDestination || '-'}</p>
                  </div>
                </div>

                {/* Vehicle & Driver Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b pb-2">Vehicle & Driver</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Vehicle No:</span> <span className="font-semibold text-gray-900">{detailsModalPermit.vehicleNumber}</span></p>
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Driver Name:</span> {detailsModalPermit.driverName || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Material Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b pb-2">Material Info</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Material:</span> <span className="font-semibold text-gray-900">{detailsModalPermit.materialName}</span></p>
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Quantity:</span> {detailsModalPermit.quantity} {detailsModalPermit.quantityUnit}</p>
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Amount:</span> ₹{Number(detailsModalPermit.amount || 0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b pb-2">Additional Info</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Security Paper:</span> {detailsModalPermit.securityPaperNumber || '-'}</p>
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Transit Pass:</span> {detailsModalPermit.transitPassNumber || '-'}</p>
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Dispatch Time:</span> {detailsModalPermit.dispatchTime || '-'}</p>
                    <p><span className="text-gray-500 font-medium w-32 inline-block">Time (Start-End):</span> {detailsModalPermit.timeStart} - {detailsModalPermit.timeEnd}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => navigate(`/permit-cards/create?id=${detailsModalPermit.id}`)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                <Edit size={16} /> Edit
              </button>
              <button onClick={() => navigate(`/permit-cards/create?duplicateId=${detailsModalPermit.id}`)} className="flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium">
                <Copy size={16} /> Duplicate
              </button>
              <button onClick={() => handleDownloadPdf(detailsModalPermit)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
                <FileDown size={16} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermitCards;
