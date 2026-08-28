import { useState, useEffect } from 'react';
import { FileClock, Search, Download, XCircle, Trash2, FileText, Info } from 'lucide-react';
import apiClient from '../api/client';
import PdfPreviewModal from '../components/PdfPreviewModal';
import { fetchInvoicePdf } from '../utils/pdfHelper';
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
  const [customerId, setCustomerId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  
  // Masters for dropdowns
  const [customers, setCustomers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  
  // Summary Stats
  const [summary, setSummary] = useState({ totalInvoices: 0, todaySales: 0, totalSales: 0, pendingAmount: 0 });

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewBuffer, setPreviewBuffer] = useState<ArrayBuffer | null>(null);

  // Invoice Details Modal
  const [detailsModalInvoice, setDetailsModalInvoice] = useState<any | null>(null);


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
      if (customerId) params.append('customerId', customerId);
      if (materialId) params.append('materialId', materialId);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);
      
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
  }, [search, status, startDate, endDate, customerId, materialId, paymentStatus]);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [cRes, mRes] = await Promise.all([
          apiClient.get('/customers'),
          apiClient.get('/materials')
        ]);
        setCustomers(cRes.data);
        setMaterials(mRes.data);
      } catch (err) {
        console.error('Failed to fetch masters', err);
      }
    };
    fetchMasters();
  }, []);

  const handleExportCSV = () => {
    if (invoices.length === 0) return;
    
    const headers = ['Date', 'Invoice Number', 'Customer', 'GSTIN', 'Bill To', 'Vehicle Number', 'Driver', 'Material', 'HSN', 'Quantity', 'Unit', 'Rate', 'Subtotal', 'CGST %', 'CGST Amount', 'SGST %', 'SGST Amount', 'IGST %', 'IGST Amount', 'Tax Total', 'Grand Total', 'Status'];
    
    const rows: any[] = [];
    invoices.forEach(i => {
      const date = i.date ? i.date.split('T')[0] : '';
      const invNo = i.invoiceNumber;
      const cust = i.customer?.name || '';
      const gstin = i.buyerGstin || i.customer?.gstin || '';
      const billTo = i.buyerName || i.customer?.name || '';
      const veh = i.snapshotVehicleNumber || i.vehicle?.vehicleNumber || '';
      const driver = i.vehicle?.driver?.name || '';
      
      if (i.items && i.items.length > 0) {
        i.items.forEach((item: any, index: number) => {
          rows.push([
            index === 0 ? date : '',
            index === 0 ? invNo : '',
            index === 0 ? cust : '',
            index === 0 ? gstin : '',
            index === 0 ? billTo : '',
            index === 0 ? veh : '',
            index === 0 ? driver : '',
            item.materialName || item.material?.name || '',
            item.hsnCode || item.material?.hsnCode || '',
            item.quantity || 0,
            item.unit || item.material?.unit || '',
            item.rate || 0,
            item.amount || 0,
            item.cgstRate || 0,
            item.cgstAmount || 0,
            item.sgstRate || 0,
            item.sgstAmount || 0,
            item.igstRate || 0,
            item.igstAmount || 0,
            index === 0 ? i.taxTotal || 0 : '',
            index === 0 ? i.grandTotal || 0 : '',
            index === 0 ? i.status : ''
          ]);
        });
      } else {
        rows.push([date, invNo, cust, gstin, billTo, veh, driver, '', '', 0, '', 0, i.subTotal || 0, 0, 0, 0, 0, 0, 0, i.taxTotal || 0, i.grandTotal || 0, i.status]);
      }
    });
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 w-full">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <input 
              type="text" 
              placeholder="Search invoice or customer..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 lg:col-span-2">
            <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:border-blue-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-gray-500">-</span>
            <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:border-blue-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          {/* Status */}
          <select 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:border-blue-500 text-sm lg:col-span-1"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="FINALIZED">Finalized</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Payment Status */}
          <select 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:border-blue-500 text-sm lg:col-span-1"
            value={paymentStatus}
            onChange={e => setPaymentStatus(e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          {/* Customer */}
          <select 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:border-blue-500 text-sm lg:col-span-2"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
          >
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          {/* Material */}
          <select 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:border-blue-500 text-sm lg:col-span-2"
            value={materialId}
            onChange={e => setMaterialId(e.target.value)}
          >
            <option value="">All Materials</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          {/* Actions - Span remaining space in grid or push to right */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 flex gap-2 justify-end items-center">
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={() => navigate('/billing')} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium bg-primary-600 hover:bg-primary-700 shadow-sm">
              + Create Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Invoice No</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 font-medium text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-right">Rate</th>
                <th className="px-4 py-3 font-medium text-right">CGST</th>
                <th className="px-4 py-3 font-medium text-right">SGST</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
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
                    <td className="px-4 py-3">{inv.date ? inv.date.split('T')[0] : '-'}</td>
                    <td className="px-4 py-3 font-medium text-blue-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 truncate max-w-[150px]" title={inv.buyerName || inv.customer?.name}>{inv.buyerName || inv.customer?.name}</td>
                    <td className="px-4 py-3">{inv.snapshotVehicleNumber || inv.vehicle?.vehicleNumber || '-'}</td>
                    <td className="px-4 py-3 truncate max-w-[100px]" title={inv.vehicle?.driver?.name || '-'}>{inv.vehicle?.driver?.name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[150px]" title={inv.items?.map((i: any) => i.materialName || i.material?.name).join(', ')}>
                      {inv.items?.map((i: any) => i.materialName || i.material?.name).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">{inv.items?.map((i: any) => i.quantity + ' ' + (i.unit || 'TON')).join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-right">{inv.items?.map((i: any) => formatCurrency(i.rate)).join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{inv.items?.map((i: any) => formatCurrency(i.cgstAmount || 0)).join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{inv.items?.map((i: any) => formatCurrency(i.sgstAmount || 0)).join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(inv.grandTotal)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inv.status === 'FINALIZED' ? 'bg-green-100 text-green-700' : 
                        inv.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button title="View Details" onClick={() => setDetailsModalInvoice(inv)} className="text-gray-400 hover:text-blue-600"><Info size={16} /></button>
                        {inv.status === 'FINALIZED' && (
                          <>
                            <button title="Download PDF" onClick={async () => {
                              try {
                                const { buffer } = await fetchInvoicePdf(inv.id);
                                const ipcRenderer = (window as any).ipcRenderer;
                                if (ipcRenderer && buffer) {
                                  const saveResult = await ipcRenderer.invoke('save-pdf-dialog', {
                                    buffer: Array.from(new Uint8Array(buffer)),
                                    defaultFilename: `Invoice_${inv.invoiceNumber}.pdf`
                                  });
                                  if (!saveResult.success && saveResult.error && !saveResult.canceled) {
                                    alert('Error saving PDF: ' + saveResult.error);
                                  }
                                }
                              } catch (err: any) {
                                alert('Error downloading PDF: ' + String(err?.message || err));
                              }
                            }} className="text-gray-400 hover:text-green-600"><Download size={16} /></button>
                            <button title="Cancel Invoice" onClick={() => { setCancelModalInvoiceId(inv.id); setCancelReason(''); }} className="text-gray-400 hover:text-red-600"><XCircle size={16} /></button>
                          </>
                        )}
                        {inv.status === 'DRAFT' && (
                          <button title="Delete Draft" onClick={() => handleDeleteInvoice(inv.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                        )}
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
          onDownload={async () => {
            const ipcRenderer = (window as any).ipcRenderer;
            if (ipcRenderer && previewBuffer) {
              const saveResult = await ipcRenderer.invoke('save-pdf-dialog', {
                buffer: Array.from(new Uint8Array(previewBuffer)),
                defaultFilename: `Invoice_${detailsModalInvoice?.invoiceNumber || ''}.pdf`
              });
              if (!saveResult.success && saveResult.error && !saveResult.canceled) alert('Error saving PDF: ' + saveResult.error);
            }
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

      
      {/* INVOICE DETAILS MODAL */}
      {detailsModalInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Invoice Details</h2>
                <p className="text-sm text-slate-500">{detailsModalInvoice.invoiceNumber} • {detailsModalInvoice.date ? detailsModalInvoice.date.split('T')[0] : ''}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        detailsModalInvoice.status === 'FINALIZED' ? 'bg-green-100 text-green-700' : 
                        detailsModalInvoice.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                  {detailsModalInvoice.status}
                </span>
                <button onClick={() => setDetailsModalInvoice(null)} className="text-gray-400 hover:text-gray-700"><XCircle size={24} /></button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bill To */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b pb-2">Bill To</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500 font-medium w-24 inline-block">Customer:</span> <span className="font-semibold text-gray-900">{detailsModalInvoice.buyerName || detailsModalInvoice.customer?.name}</span></p>
                    <p><span className="text-gray-500 font-medium w-24 inline-block">GSTIN:</span> {detailsModalInvoice.buyerGstin || detailsModalInvoice.customer?.gstin || '-'}</p>
                    <p><span className="text-gray-500 font-medium w-24 inline-block">Address:</span> {detailsModalInvoice.buyerAddress || detailsModalInvoice.customer?.address || '-'}</p>
                    <p><span className="text-gray-500 font-medium w-24 inline-block">State:</span> {detailsModalInvoice.buyerState || detailsModalInvoice.customer?.stateName || '-'} ({detailsModalInvoice.buyerStateCode || detailsModalInvoice.customer?.stateCode || '-'})</p>
                  </div>
                </div>

                {/* Vehicle & Delivery */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b pb-2">Vehicle / Delivery</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500 font-medium w-24 inline-block">Vehicle No:</span> <span className="font-semibold text-gray-900">{detailsModalInvoice.snapshotVehicleNumber || detailsModalInvoice.vehicle?.vehicleNumber || '-'}</span></p>
                    <p><span className="text-gray-500 font-medium w-24 inline-block">Driver:</span> {detailsModalInvoice.vehicle?.driver?.name || '-'}</p>
                    <p><span className="text-gray-500 font-medium w-24 inline-block">Transporter:</span> {detailsModalInvoice.dispatchedThrough || '-'}</p>
                    <p><span className="text-gray-500 font-medium w-24 inline-block">Destination:</span> {detailsModalInvoice.destination || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Item Details</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="px-4 py-2 font-medium">Material</th>
                        <th className="px-4 py-2 font-medium">HSN</th>
                        <th className="px-4 py-2 font-medium text-right">Qty</th>
                        <th className="px-4 py-2 font-medium">Unit</th>
                        <th className="px-4 py-2 font-medium text-right">Rate</th>
                        <th className="px-4 py-2 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {detailsModalInvoice.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-gray-900">{item.materialName || item.material?.name}</td>
                          <td className="px-4 py-3 text-gray-600">{item.hsnCode || item.material?.hsnCode || '-'}</td>
                          <td className="px-4 py-3 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-gray-600">{item.unit || item.material?.unit}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.rate)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tax Details & Totals */}
              <div className="flex justify-end">
                <div className="w-full md:w-1/2 lg:w-1/3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(detailsModalInvoice.subTotal)}</span>
                    </div>
                    {/* Sum up taxes from items to display a clean summary */}
                    <div className="flex justify-between text-gray-600">
                      <span>CGST:</span>
                      <span className="font-medium">{formatCurrency(detailsModalInvoice.items?.reduce((sum: number, i: any) => sum + (i.cgstAmount || 0), 0) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>SGST:</span>
                      <span className="font-medium">{formatCurrency(detailsModalInvoice.items?.reduce((sum: number, i: any) => sum + (i.sgstAmount || 0), 0) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>IGST:</span>
                      <span className="font-medium">{formatCurrency(detailsModalInvoice.items?.reduce((sum: number, i: any) => sum + (i.igstAmount || 0), 0) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 border-t border-gray-200 pt-2">
                      <span>Total Tax:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(detailsModalInvoice.taxTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-300 pt-3 mt-3">
                      <span className="font-bold text-gray-900">Grand Total:</span>
                      <span className="text-xl font-bold text-blue-600">{formatCurrency(detailsModalInvoice.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              {detailsModalInvoice.status === 'FINALIZED' && (
                <>
                  <button onClick={async () => {
                              try {
                                const { blobUrl, buffer } = await fetchInvoicePdf(detailsModalInvoice.id);
                                setPreviewBlobUrl(blobUrl);
                                setPreviewBuffer(buffer);
                              } catch (err: any) {
                                alert('Error generating PDF: ' + String(err?.message || err));
                              }
                            }} className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                    <FileText size={16} /> Preview PDF
                  </button>
                  <button onClick={async () => {
                              try {
                                const { buffer } = await fetchInvoicePdf(detailsModalInvoice.id);
                                const ipcRenderer = (window as any).ipcRenderer;
                                if (ipcRenderer && buffer) {
                                  const saveResult = await ipcRenderer.invoke('save-pdf-dialog', {
                                    buffer: Array.from(new Uint8Array(buffer)),
                                    defaultFilename: `Invoice_${detailsModalInvoice.invoiceNumber}.pdf`
                                  });
                                  if (!saveResult.success && saveResult.error && !saveResult.canceled) alert('Error saving PDF: ' + saveResult.error);
                                }
                              } catch (err) {
                                alert('Error downloading PDF');
                              }
                            }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm">
                    <Download size={16} /> Download PDF
                  </button>
                </>
              )}
              <button onClick={() => setDetailsModalInvoice(null)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
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
