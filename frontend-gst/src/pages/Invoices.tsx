import { useState, useEffect } from 'react';
import { FileClock, Search, Download, Edit2, XCircle, Copy, Trash2, FileText } from 'lucide-react';
import apiClient from '../api/client';
import PdfPreviewModal from '../components/PdfPreviewModal';
import { useNavigate } from 'react-router-dom';

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Summary Stats
  const [summary, setSummary] = useState({ totalInvoices: 0, todaySales: 0, totalSales: 0, pendingAmount: 0 });

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Cancellation Modal State
  const [cancelModalInvoiceId, setCancelModalInvoiceId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const fetchInvoices = async (page = 1) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const res = await apiClient.get(`/invoices?${params.toString()}`);
      setInvoices(res.data.data);
      setMeta(res.data.meta);
      
      // Calculate summary metrics on the client (for simplicity on this dataset)
      const allRes = await apiClient.get('/invoices'); // Get all for summary
      const all = allRes.data.data;
      const today = new Date().toISOString().split('T')[0];
      setSummary({
        totalInvoices: all.length,
        todaySales: all.filter((i: any) => i.date?.startsWith(today) && i.status === 'FINALIZED').reduce((sum: number, i: any) => sum + i.grandTotal, 0),
        totalSales: all.filter((i: any) => i.status === 'FINALIZED').reduce((sum: number, i: any) => sum + i.grandTotal, 0),
        pendingAmount: 0 // Placeholder if you had payments
      });
      
    } catch (err) {
      console.error('Error fetching invoices', err);
    }
  };

  useEffect(() => {
    fetchInvoices(1);
  }, [search, status, startDate, endDate]);

  const handleExportCSV = () => {
    if (invoices.length === 0) return;
    
    const headers = ['Invoice No', 'Date', 'Customer', 'Vehicle Number', 'Cost', 'GST Amount', 'Total Amount', 'Status'];
    const rows = invoices.map(i => [
      i.invoiceNumber,
      i.date ? i.date.split('T')[0] : '',
      i.customer?.name || i.buyerName || '',
      i.vehicle?.vehicleNumber || i.snapshotVehicleNumber || '',
      i.subTotal,
      i.taxTotal,
      i.grandTotal,
      i.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancelInvoice = async () => {
    if (!cancelModalInvoiceId || !cancelReason.trim()) return;
    try {
      await apiClient.put(`/invoices/${cancelModalInvoiceId}/cancel`, { cancelReason });
      fetchInvoices(meta.page);
      setCancelModalInvoiceId(null);
      setCancelReason('');
    } catch (err) {
      alert('Error cancelling invoice');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this invoice?')) return;
    try {
      await apiClient.delete(`/invoices/${id}`);
      fetchInvoices(meta.page);
    } catch (err) {
      alert('Error deleting draft');
    }
  };

  const formatCurrency = (val: number) => `₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoice Register</h1>
        <p className="text-gray-500">Manage, view, and track all your generated invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Invoices</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalInvoices}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500 mb-1">Today's Sales</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.todaySales)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Sales</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalSales)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500 mb-1">Pending Amount</div>
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.pendingAmount)}</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search invoice or customer..." 
              className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:border-blue-500 text-sm"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="FINALIZED">Finalized</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-gray-500">-</span>
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => navigate('/billing')} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium bg-primary-600 hover:bg-primary-700">
            + Create Invoice
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Invoice No</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium text-right">Cost</th>
                <th className="px-6 py-4 font-medium text-right">GST</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-center">Payment</th>
                <th className="px-6 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileClock size={32} className="text-gray-300 mb-2" />
                      <p>No invoices found matching your criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-blue-600">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4">{inv.date ? inv.date.split('T')[0] : '-'}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{inv.buyerName || inv.customer?.name}</div>
                      <div className="text-xs text-gray-500">{inv.buyerGstin || inv.customer?.gstin}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(inv.subTotal)}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(inv.taxTotal)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inv.status === 'FINALIZED' ? 'bg-green-100 text-green-700' : 
                        inv.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {inv.status === 'FINALIZED' ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                            inv.paymentStatus === 'PARTIAL' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {inv.paymentStatus || 'UNPAID'}
                          </span>
                          {inv.paymentStatus !== 'PAID' && (
                            <span className="text-[10px] text-gray-500">Bal: ₹{inv.balance?.toFixed(2) || inv.grandTotal.toFixed(2)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {inv.status === 'FINALIZED' && (
                          <>
                            <button title="Preview PDF" onClick={async () => {
                              try {
                                const pdfRes = await apiClient.get(`/invoices/${inv.id}/pdf`, { responseType: 'blob' });
                                const blob = new Blob([pdfRes.data], { type: 'text/html' });
                                setPreviewBlobUrl(URL.createObjectURL(blob));
                              } catch (err) {
                                alert('Error generating PDF');
                              }
                            }} className="text-gray-400 hover:text-blue-600"><FileText size={16} /></button>
                            <button title="Cancel Invoice" onClick={() => { setCancelModalInvoiceId(inv.id); setCancelReason(''); }} className="text-gray-400 hover:text-red-600"><XCircle size={16} /></button>
                          </>
                        )}
                        {inv.status === 'DRAFT' && (
                          <>
                            <button title="Edit Draft" onClick={() => navigate(`/billing?editId=${inv.id}`)} className="text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                            <button title="Delete Draft" onClick={() => handleDeleteInvoice(inv.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                          </>
                        )}
                        {inv.status === 'CANCELLED' && (
                          <span className="text-[10px] text-gray-400 italic">No Actions</span>
                        )}
                        <button title="Duplicate" onClick={() => navigate(`/billing?duplicateId=${inv.id}`)} className="text-gray-400 hover:text-green-600"><Copy size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">Showing page {meta.page} of {meta.totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => fetchInvoices(meta.page - 1)} 
                disabled={meta.page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={() => fetchInvoices(meta.page + 1)} 
                disabled={meta.page === meta.totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {/* PDF PREVIEW MODAL */}
      {previewBlobUrl && (
        <PdfPreviewModal 
          isOpen={true}
          isLoading={false}
          blobUrl={previewBlobUrl} 
          onClose={() => setPreviewBlobUrl(null)} 
          onDownload={() => {
            const link = document.createElement('a');
            link.href = previewBlobUrl;
            link.download = `Invoice.html`;
            link.click();
          }}
          onPrint={() => {
            const printWindow = window.open(previewBlobUrl);
            if (printWindow) {
              printWindow.onload = () => {
                printWindow.print();
              };
            }
          }}
        />
      )}

      {/* CANCEL INVOICE MODAL */}
      {cancelModalInvoiceId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Cancel Invoice</h2>
            <p className="text-sm text-slate-600 mb-4">Are you sure you want to cancel this invoice? Please provide a reason for cancellation.</p>
            <textarea
              className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:border-red-500 mb-4 text-sm"
              rows={4}
              placeholder="Enter reason..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setCancelModalInvoiceId(null); setCancelReason(''); }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelInvoice}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
