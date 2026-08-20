import { useState, useEffect } from 'react';
import { Search, Filter, Eye, XCircle, Printer, Download, ChevronLeft, ChevronRight, Ban } from 'lucide-react';
import api from '../services/api';
import WeighmentSlip from '../components/WeighmentSlip';
import { logAudit } from '../utils/audit';

export default function History() {
  const [history, setHistory] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    fromDate: '',
    toDate: '',
    weightSource: ''
  });

  const [selectedWeighment, setSelectedWeighment] = useState<any>(null);
  const [viewDetails, setViewDetails] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [showCorrectionPrompt, setShowCorrectionPrompt] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchHistory();
  }, [page, limit, debouncedSearch, filters]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      if (!ipcRenderer) return;

      let query = `
        SELECT w.*, c.name as customerName, m.name as materialName, d.name as driverName, t.name as transporterName 
        FROM weighments w
        LEFT JOIN customers c ON w.customerId = c.id
        LEFT JOIN materials m ON w.materialId = m.id
        LEFT JOIN drivers d ON w.driverId = d.id
        LEFT JOIN transporters t ON w.transporterId = t.id
      `;
      let countQuery = "SELECT count(*) as count FROM weighments w";
      let conditions: string[] = [];
      let params: any[] = [];

      if (debouncedSearch) {
        conditions.push("(w.vehicleNumber LIKE ? OR w.slipNumber LIKE ?)");
        params.push(`%${debouncedSearch}%`, `%${debouncedSearch}%`);
      }
      if (filters.status) {
        conditions.push("w.status = ?");
        params.push(filters.status);
      }
      if (filters.weightSource) {
        conditions.push("(w.firstWeightSource = ? OR w.secondWeightSource = ?)");
        params.push(filters.weightSource, filters.weightSource);
      }

      if (conditions.length > 0) {
        const whereClause = " WHERE " + conditions.join(" AND ");
        query += whereClause;
        countQuery += whereClause;
      }

      query += " ORDER BY w.date DESC LIMIT ? OFFSET ?";
      
      const countRes = await ipcRenderer.invoke('db-query', countQuery, params);
      const res = await ipcRenderer.invoke('db-query', query, [...params, limit, (page - 1) * limit]);
      
      if (res.success && countRes.success) {
        setHistory(res.data);
        const t = countRes.data[0].count;
        setTotal(t);
        setTotalPages(Math.ceil(t / limit));
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (history.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = ['Slip No', 'Date', 'Time', 'Vehicle', 'Customer', 'Material', 'Load Type', 'Gross', 'Net (KG)', 'Status'];
    const rows = history.map(row => [
      row.slipNumber || '',
      new Date(row.createdAt).toLocaleDateString(),
      new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      row.vehicleNumber,
      row.customerName || '',
      row.materialName || '',
      row.loadType || '',
      row.firstWeight || '',
      row.netWeight || '',
      row.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Weighment_History_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        ...(debouncedSearch && { vehicleNumber: debouncedSearch }),
        ...(filters.status && { status: filters.status }),
        ...(filters.fromDate && { fromDate: filters.fromDate }),
        ...(filters.toDate && { toDate: filters.toDate }),
        ...(filters.weightSource && { weightSource: filters.weightSource })
      });

      const res = await api.get(`/weighment-exports/excel?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Weighment_History_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to export Excel. Please use the CSV export as a fallback.");
    }
  };

  const handleCancelWeighment = async () => {
    if (!cancelReason.trim()) {
      alert("Cancellation reason is required.");
      return;
    }
    
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      if (!ipcRenderer) return;

      const q = "UPDATE weighments SET status = 'CANCELLED', cancellationReason = ?, syncStatus = 'PENDING_SYNC', updatedAt = ? WHERE id = ?";
      const res = await ipcRenderer.invoke('db-query', q, [cancelReason, new Date().toISOString(), selectedWeighment.id]);

      if (!res.success) {
        throw new Error(res.error);
      }

      await logAudit(
        'CANCEL', 
        'WEIGHMENT', 
        selectedWeighment.id, 
        `Cancelled weighment. Reason: ${cancelReason}`
      );

      alert("Weighment cancelled successfully.");
      setShowCancelPrompt(false);
      setViewDetails(false);
      setSelectedWeighment(null);
      fetchHistory();
    } catch (err: any) {
      alert(err.message || "Failed to cancel weighment");
    }
  };

  const handleRequestCorrection = async () => {
    if (!correctionReason.trim()) {
      alert("Correction reason is required.");
      return;
    }
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      if (!ipcRenderer) return;

      // Duplicate the record with a new ID, setting it as a correction
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const insertQ = `
        INSERT INTO weighments (
          id, slipNumber, vehicleId, vehicleNumber, customerId, customerName, materialId, materialName, driverId, driverName, transporterId, transporterName, 
          firstWeight, secondWeight, netWeight, status, syncStatus, date, createdAt, updatedAt, loadType, firstWeightDate, secondWeightDate, firstWeightSource, secondWeightSource,
          originalWeighmentId, isCorrection
        )
        SELECT 
          ?, slipNumber, vehicleId, vehicleNumber, customerId, customerName, materialId, materialName, driverId, driverName, transporterId, transporterName, 
          firstWeight, secondWeight, netWeight, 'COMPLETED', 'PENDING_SYNC', date, ?, ?, loadType, firstWeightDate, secondWeightDate, firstWeightSource, secondWeightSource,
          id, 1
        FROM weighments WHERE id = ?
      `;
      const insertRes = await ipcRenderer.invoke('db-query', insertQ, [newId, now, now, selectedWeighment.id]);
      
      if (!insertRes.success) throw new Error(insertRes.error);

      // Mark original as CORRECTED
      const updateQ = "UPDATE weighments SET status = 'CORRECTED', cancellationReason = ?, syncStatus = 'PENDING_SYNC', updatedAt = ? WHERE id = ?";
      await ipcRenderer.invoke('db-query', updateQ, [correctionReason, now, selectedWeighment.id]);

      await logAudit('CORRECT', 'WEIGHMENT', selectedWeighment.id, `Corrected weighment. Reason: ${correctionReason}`);

      alert("Correction version created successfully. Original retained.");
      setShowCorrectionPrompt(false);
      setViewDetails(false);
      setSelectedWeighment(null);
      fetchHistory();
    } catch (err: any) {
      alert(err.message || "Failed to create correction");
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset page on filter change
  };

  const clearFilters = () => {
    setFilters({ status: '', fromDate: '', toDate: '', weightSource: '' });
    setSearchTerm('');
    setPage(1);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Weighment History</h1>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
          >
            <Download size={18} className="mr-2" /> Export CSV
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            <Download size={18} className="mr-2" /> Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="relative w-96">
            <input 
              type="text"
              placeholder="Search Vehicle or Slip No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 uppercase"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 border rounded-lg font-medium transition-colors ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter size={18} className="mr-2" /> Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 border-b border-slate-200 bg-white grid grid-cols-5 gap-4 shrink-0">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-primary-500">
                <option value="">All</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
              <input type="date" value={filters.fromDate} onChange={(e) => handleFilterChange('fromDate', e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
              <input type="date" value={filters.toDate} onChange={(e) => handleFilterChange('toDate', e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Weight Source</label>
              <select value={filters.weightSource} onChange={(e) => handleFilterChange('weightSource', e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-primary-500">
                <option value="">All</option>
                <option value="DEVICE">Device</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={clearFilters} className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded hover:bg-slate-200 w-full">Clear Filters</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-slate-400">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-slate-500">No weighments found for the selected filters.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs sticky top-0 border-b border-slate-200 shadow-sm z-10">
                <tr>
                  <th className="px-4 py-3">Slip No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Load Type</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Net (KG)</th>
                  <th className="px-4 py-3 text-center">Invoice Ref</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.slipNumber || '-'}</td>
                    <td className="px-4 py-3">{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.vehicleNumber}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]">{row.customerName || '-'}</td>
                    <td className="px-4 py-3">{row.materialName || '-'}</td>
                    <td className="px-4 py-3">{row.loadType || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.firstWeight || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{row.netWeight || '-'}</td>
                    <td className="px-4 py-3 text-center text-blue-600 font-medium">{row.invoiceReference || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        row.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        row.status === 'CANCELLED' || row.status === 'CORRECTED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {row.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => {
                          setSelectedWeighment(row);
                          setViewDetails(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} className="mr-1.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">{(page - 1) * limit + (total > 0 ? 1 : 0)}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> records
          </div>
          <div className="flex items-center space-x-4">
            <select 
              value={limit} 
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="text-sm border border-slate-300 rounded px-2 py-1"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div className="flex space-x-1">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 border border-slate-300 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 py-1 text-sm font-medium">Page {page} of {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="p-1 border border-slate-300 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {viewDetails && selectedWeighment && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">Weighment Details {selectedWeighment.slipNumber && `- ${selectedWeighment.slipNumber}`}</h2>
              <button onClick={() => setViewDetails(false)} className="text-slate-500 hover:text-slate-800"><XCircle size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {showCancelPrompt ? (
                <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center"><Ban className="mr-2" /> Cancel Weighment</h3>
                  <p className="text-red-700 mb-4">Are you sure you want to cancel this weighment? This action requires authorization and will be audited.</p>
                  <label className="block text-sm font-medium text-red-900 mb-1">Reason for Cancellation *</label>
                  <textarea 
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    className="w-full border border-red-300 rounded-lg p-2 mb-4 focus:ring-red-500"
                    rows={3}
                    placeholder="e.g., Duplicate entry, incorrect vehicle..."
                  />
                  <div className="flex space-x-3 justify-end">
                    <button onClick={() => setShowCancelPrompt(false)} className="px-4 py-2 border border-slate-300 bg-white rounded-lg hover:bg-slate-50">Back</button>
                    <button onClick={handleCancelWeighment} disabled={!cancelReason.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Confirm Cancellation</button>
                  </div>
                </div>
              ) : showCorrectionPrompt ? (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-amber-800 mb-2 flex items-center">Request Correction</h3>
                  <p className="text-amber-700 mb-4">You are about to create a correction version of this weighment. The original record will be retained for audit purposes.</p>
                  <label className="block text-sm font-medium text-amber-900 mb-1">Reason for Correction *</label>
                  <textarea 
                    value={correctionReason}
                    onChange={e => setCorrectionReason(e.target.value)}
                    className="w-full border border-amber-300 rounded-lg p-2 mb-4 focus:ring-amber-500"
                    rows={3}
                    placeholder="e.g., Incorrect vehicle selected, wrong material..."
                  />
                  <div className="flex space-x-3 justify-end">
                    <button onClick={() => setShowCorrectionPrompt(false)} className="px-4 py-2 border border-slate-300 bg-white rounded-lg hover:bg-slate-50">Back</button>
                    <button onClick={handleRequestCorrection} disabled={!correctionReason.trim()} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">Create Correction</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Vehicle Information</h3>
                    <div className="space-y-3 text-sm">
                      <p><span className="text-slate-500 w-32 inline-block">Vehicle No:</span> <span className="font-bold text-lg">{selectedWeighment.vehicleNumber}</span></p>
                      <p><span className="text-slate-500 w-32 inline-block">Customer:</span> <span className="font-medium">{selectedWeighment.customerName || 'N/A'}</span></p>
                      <p><span className="text-slate-500 w-32 inline-block">Material:</span> <span className="font-medium">{selectedWeighment.materialName || 'N/A'}</span></p>
                      <p><span className="text-slate-500 w-32 inline-block">Load Type:</span> <span className="font-medium">{selectedWeighment.loadType || 'N/A'}</span></p>
                      <p><span className="text-slate-500 w-32 inline-block">Driver:</span> <span className="font-medium">{selectedWeighment.driverName || 'N/A'}</span></p>
                      <p><span className="text-slate-500 w-32 inline-block">Transporter:</span> <span className="font-medium">{selectedWeighment.transporterName || 'N/A'}</span></p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Weight Details</h3>
                    <div className="space-y-3 text-sm">
                      <p><span className="text-slate-500 w-32 inline-block">First Weight:</span> <span className="font-mono font-medium">{selectedWeighment.firstWeight || 'Pending'} KG</span> <span className="text-xs text-slate-400 ml-2">({selectedWeighment.firstWeightSource})</span></p>
                      <p><span className="text-slate-500 w-32 inline-block">First Time:</span> <span className="font-medium">{selectedWeighment.firstWeightDate ? new Date(selectedWeighment.firstWeightDate).toLocaleString() : 'N/A'}</span></p>
                      
                      <p className="mt-4"><span className="text-slate-500 w-32 inline-block">Second Weight:</span> <span className="font-mono font-medium">{selectedWeighment.secondWeight || 'Pending'} KG</span> <span className="text-xs text-slate-400 ml-2">({selectedWeighment.secondWeightSource})</span></p>
                      <p><span className="text-slate-500 w-32 inline-block">Second Time:</span> <span className="font-medium">{selectedWeighment.secondWeightDate ? new Date(selectedWeighment.secondWeightDate).toLocaleString() : 'N/A'}</span></p>
                      
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p><span className="text-slate-500 w-32 inline-block">NET WEIGHT:</span> <span className="font-mono font-bold text-xl text-emerald-700">{selectedWeighment.netWeight || '0'} KG</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">System Audit</h3>
                    <div className="space-y-2 text-sm grid grid-cols-2">
                      <p><span className="text-slate-500 w-24 inline-block">Status:</span> <span className="font-bold">{selectedWeighment.status}</span></p>
                      <p><span className="text-slate-500 w-24 inline-block">Operator:</span> <span className="font-medium">{selectedWeighment.operator?.name || 'System'}</span></p>
                      {selectedWeighment.invoiceReference && (
                        <p className="col-span-2"><span className="text-slate-500 w-32 inline-block">GST Invoice:</span> <span className="font-bold text-blue-600">{selectedWeighment.invoiceReference}</span></p>
                      )}
                      {(selectedWeighment.status === 'CANCELLED' || selectedWeighment.status === 'CORRECTED') && (
                        <>
                          <p><span className="text-slate-500 w-24 inline-block">Action By:</span> <span className="font-bold text-red-600">{selectedWeighment.cancelledBy || 'Admin'}</span></p>
                          <p className="col-span-2"><span className="text-slate-500 w-24 inline-block">Reason:</span> <span className="font-medium text-red-600">{selectedWeighment.cancellationReason}</span></p>
                        </>
                      )}
                      {selectedWeighment.isCorrection === 1 && (
                        <p className="col-span-2"><span className="text-slate-500 w-32 inline-block">Corrects ID:</span> <span className="font-medium text-amber-600">{selectedWeighment.originalWeighmentId}</span></p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between">
              <div>
                {(selectedWeighment.status === 'COMPLETED' || selectedWeighment.status === 'PENDING') && (
                  <div className="flex space-x-2">
                    <button onClick={() => setShowCancelPrompt(true)} className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium">Cancel Weighment</button>
                    {selectedWeighment.status === 'COMPLETED' && (
                      <button onClick={() => setShowCorrectionPrompt(true)} className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium">Request Correction</button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <button onClick={() => setViewDetails(false)} className="px-4 py-2 border border-slate-300 bg-white rounded-lg hover:bg-slate-50">Close</button>
                {selectedWeighment.status === 'COMPLETED' && (
                  <button onClick={() => { setViewDetails(false); setSelectedWeighment(selectedWeighment); }} className="flex items-center px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium">
                    <Printer size={18} className="mr-2" /> Print Slip
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slip Print Modal - Separate state to allow direct print popup */}
      {selectedWeighment && !viewDetails && selectedWeighment.status === 'COMPLETED' && (
        <WeighmentSlip weighment={selectedWeighment} onClose={() => setSelectedWeighment(null)} />
      )}
    </div>
  );
}
