import { useState, useEffect } from 'react';
import { CreditCard, Search, FileText, Trash2, History, Banknote, MessageCircle } from 'lucide-react';
import apiClient from '../api/client';

export default function Payments() {
  const [activeTab, setActiveTab] = useState<'outstanding' | 'history'>('outstanding');
  
  const [outstanding, setOutstanding] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [search, setSearch] = useState('');
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    date: new Date().toISOString().substring(0, 10)
  });

  const fetchData = async () => {
    try {
      if (activeTab === 'outstanding') {
        const res = await apiClient.get('/payments/outstanding');
        setOutstanding(res.data);
      } else {
        const res = await apiClient.get('/payments');
        setHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/payments', {
        customerId: currentInvoice.customerId,
        invoiceId: currentInvoice.id,
        amount: Number(paymentData.amount),
        method: paymentData.method,
        reference: paymentData.reference,
        date: paymentData.date
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to record payment');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment record? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/payments/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete payment');
    }
  };

  const handleSendReminder = (inv: any) => {
    if (!inv.customer?.phone) {
      alert('No phone number available for this customer. Please update customer profile.');
      return;
    }
    
    if (!confirm(`Send payment reminder for Invoice ${inv.invoiceNumber} via WhatsApp?`)) return;

    const message = `Dear ${inv.customer.name},\n\nThis is a reminder regarding invoice *${inv.invoiceNumber}*.\n\n*Outstanding Amount:*\n₹${inv.outstandingAmount.toFixed(2)}\n\nThank you.`;
    const encodedMessage = encodeURIComponent(message);
    
    // Format phone (assuming 10 digits gets 91 prefixed)
    const phone = inv.customer.phone.replace(/[^0-9]/g, '');
    const finalPhone = phone.length === 10 ? '91' + phone : phone;
    
    window.open(`https://wa.me/${finalPhone}?text=${encodedMessage}`, '_blank');
  };

  const filteredOutstanding = outstanding.filter(inv => 
    inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || 
    (inv.customer?.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredHistory = history.filter(p => 
    p.invoice?.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || 
    p.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.method?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments & Ledger</h1>
          <p className="text-gray-500">Track outstanding invoices and payment history</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${activeTab === 'outstanding' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => { setActiveTab('outstanding'); setSearch(''); }}
          >
            <Banknote size={18} /> Outstanding Invoices
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => { setActiveTab('history'); setSearch(''); }}
          >
            <History size={18} /> Payment History
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'outstanding' ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm font-medium">
                <tr>
                  <th className="p-4">Invoice No</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Invoice Total</th>
                  <th className="p-4 text-right">Paid</th>
                  <th className="p-4 text-right">Balance</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOutstanding.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-blue-600 flex items-center gap-2">
                      <FileText size={16} />
                      {inv.invoiceNumber}
                    </td>
                    <td className="p-4 text-gray-700 font-medium">{inv.customer?.name}</td>
                    <td className="p-4 text-gray-600">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="p-4 text-right">₹{inv.grandTotal.toFixed(2)}</td>
                    <td className="p-4 text-right text-green-600">₹{inv.paidAmount.toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-red-600">₹{inv.outstandingAmount.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setCurrentInvoice(inv);
                            setPaymentData({ ...paymentData, amount: inv.outstandingAmount.toFixed(2) });
                            setShowModal(true);
                          }} 
                          className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center gap-1"
                          title="Record Payment"
                        >
                          <CreditCard size={14} /> Pay
                        </button>
                        <button 
                          onClick={() => handleSendReminder(inv)}
                          className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
                          title="Send WhatsApp Reminder"
                        >
                          <MessageCircle size={14} /> Remind
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOutstanding.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-500">No outstanding invoices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm font-medium">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Against Invoice</th>
                  <th className="p-4">Mode</th>
                  <th className="p-4">Reference</th>
                  <th className="p-4 text-right">Amount Paid</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-600">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="p-4 text-gray-900 font-medium">{p.customer?.name}</td>
                    <td className="p-4 text-blue-600 font-medium">{p.invoice?.invoiceNumber || '-'}</td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold tracking-wider">{p.method}</span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">{p.reference || '-'}</td>
                    <td className="p-4 text-right font-bold text-green-600">₹{p.amount.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDeletePayment(p.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-500">No payment history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showModal && currentInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Record Payment</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Invoice:</span>
                <span className="font-bold">{currentInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Customer:</span>
                <span className="font-bold text-gray-900">{currentInvoice.customer?.name}</span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                <span className="text-gray-700 font-medium">Outstanding Balance:</span>
                <span className="font-bold text-red-600">₹{currentInvoice.outstandingAmount.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹) *</label>
                <input required type="number" step="0.01" max={currentInvoice.outstandingAmount} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value})}>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input required type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference No (Optional)</label>
                <input type="text" placeholder="Cheque / UPI UTR No" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={paymentData.reference} onChange={e => setPaymentData({...paymentData, reference: e.target.value})} />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
