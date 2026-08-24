import { useState, useEffect } from 'react';
import { Plus, Search, LayoutList, LayoutGrid, Edit2, Trash2, User, Phone, MapPin, Building, Info, Download } from 'lucide-react';
import apiClient, { API_BASE_URL } from '../api/client';
import { getStateFromGstin, getStateFromName } from '../utils/indianStates';

const Customers = () => {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ id: '', name: '', gstin: '', countryCode: '+91', phone: '', mobile1: '', mobile2: '', email: '', address: '', stateName: '', stateCode: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Unified Customer Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'invoices' | 'ledger' | 'weighments'>('profile');
  const [detailsCustomer, setDetailsCustomer] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Tab Data
  const [invoiceSummary, setInvoiceSummary] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [ledgerData, setLedgerData] = useState<any>({ summary: {}, transactions: [] });
  const [weighmentsData, setWeighmentsData] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const downloadInvoicePdf = async (invId: string, invNumber: string) => {
    try {
      const pdfRes = await apiClient.get(`/invoices/${invId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([pdfRes.data], { type: 'text/html' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invNumber}.html`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF', err);
      alert('Could not download invoice PDF. Please try again.');
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (newCustomer.name.length < 3) return "Name must be at least 3 characters long.";
    if (newCustomer.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(newCustomer.gstin)) return "Invalid GSTIN format. Example: 29ABCDE1234F1Z5";
    if (newCustomer.phone && !/^\d{10}$/.test(newCustomer.phone)) return "Mobile number must be exactly 10 digits.";
    if (newCustomer.mobile1 && !/^\d{10}$/.test(newCustomer.mobile1)) return "Mobile 1 must be exactly 10 digits.";
    if (newCustomer.mobile2 && !/^\d{10}$/.test(newCustomer.mobile2)) return "Mobile 2 must be exactly 10 digits.";
    if (newCustomer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email)) return "Invalid Email address.";
    if (newCustomer.address && newCustomer.address.length < 5) return "Address must be at least 5 characters long.";
    return null;
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setErrorMsg(error);
      return;
    }
    setErrorMsg('');
    try {
      const cleanPayload = {
        name: newCustomer.name.trim(),
        gstin: newCustomer.gstin.trim() || null,
        phone: newCustomer.phone.trim() ? `${newCustomer.countryCode} ${newCustomer.phone.trim()}` : null,
        email: newCustomer.email.trim() || null,
        address: newCustomer.address.trim() || null,
        stateName: newCustomer.stateName.trim() || null,
        stateCode: newCustomer.stateCode.trim() || null,
        mobile1: newCustomer.mobile1.trim() || null,
        mobile2: newCustomer.mobile2.trim() || null,
      };
      
      if (isEditing && newCustomer.id) {
        await apiClient.put(`/customers/${newCustomer.id}`, cleanPayload);
      } else {
        await apiClient.post('/customers', cleanPayload);
      }
      setShowModal(false);
      setNewCustomer({ id: '', name: '', gstin: '', countryCode: '+91', phone: '', mobile1: '', mobile2: '', email: '', address: '', stateName: '', stateCode: '' });
      setIsEditing(false);
      fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error saving customer');
      console.error('Error saving customer', err);
    }
  };
  
  const openEditModal = (customer: any) => {
    let parsedPhone = customer.phone || '';
    let parsedCountryCode = '+91';
    
    if (parsedPhone.includes(' ')) {
      const parts = parsedPhone.split(' ');
      parsedCountryCode = parts[0];
      parsedPhone = parts.slice(1).join('');
    } else if (parsedPhone.startsWith('+')) {
      parsedCountryCode = parsedPhone.substring(0, 3); // simple parse for +91
      parsedPhone = parsedPhone.substring(3);
    }
    
    setNewCustomer({
      id: customer.id,
      name: customer.name || '',
      gstin: customer.gstin || '',
      countryCode: parsedCountryCode,
      phone: parsedPhone,
      mobile1: customer.mobile1 || '',
      mobile2: customer.mobile2 || '',
      email: customer.email || '',
      address: customer.address || '',
      stateName: customer.stateName || '',
      stateCode: customer.stateCode || ''
    });
    setIsEditing(true);
    setErrorMsg('');
    setShowModal(true);
  };
  
  const openAddModal = () => {
    setNewCustomer({ id: '', name: '', gstin: '', countryCode: '+91', phone: '', mobile1: '', mobile2: '', email: '', address: '', stateName: '', stateCode: '' });
    setIsEditing(false);
    setErrorMsg('');
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate or remove this customer?')) {
      try {
        await apiClient.delete(`/customers/${id}`);
        fetchCustomers();
      } catch (err) {
        console.error('Error deleting customer', err);
      }
    }
  };

  const openDetailsModal = async (customer: any) => {
    setDetailsCustomer(customer);
    setActiveTab('profile');
    setShowDetailsModal(true);
    setDetailsLoading(true);
    try {
      // Fetch Invoices
      const invRes = await apiClient.get(`/invoices/customer/${customer.id}/history`);
      setInvoices(invRes.data.invoices || []);
      setInvoiceSummary(invRes.data.summary);
      
      // Fetch Ledger
      const ledgRes = await apiClient.get(`/customers/${customer.id}/ledger`);
      setLedgerData(ledgRes.data);
      
      // Fetch Weighments
      const weighRes = await apiClient.get(`/customers/${customer.id}/weighments?limit=100`);
      setWeighmentsData(weighRes.data.data || []);
    } catch (err) {
      console.error('Error fetching customer details', err);
    } finally {
      setDetailsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500">Manage your business clients and their GST details</p>
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
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building className="text-blue-600" />
                {isEditing ? 'Edit Customer' : 'Add New Customer'}
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
              
              <form id="customer-form" onSubmit={handleAddOrEdit} className="space-y-8">
                
                {/* SECTION 1: CUSTOMER INFORMATION */}
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                    <User size={16} /> Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
                      <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition-shadow" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="e.g. Acme Corporation" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                      <input 
                        type="text" 
                        maxLength={15}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none uppercase transition-shadow font-mono" 
                        value={newCustomer.gstin} 
                        onChange={e => {
                          const val = e.target.value.toUpperCase().trim();
                          const state = getStateFromGstin(val);
                          setNewCustomer({
                            ...newCustomer, 
                            gstin: val,
                            stateName: state ? state.name : newCustomer.stateName,
                            stateCode: state ? state.code : newCustomer.stateCode
                          });
                        }} 
                        placeholder="29ABCDE1234F1Z5" 
                      />
                      <p className="text-xs text-gray-500 mt-1">State and State Code will be automatically populated from a valid GSTIN.</p>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: CONTACT INFORMATION */}
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                    <Phone size={16} /> Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                      <div className="flex">
                        <select 
                          className="w-24 px-2 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:border-blue-500 outline-none bg-gray-50 border-r-0"
                          value={newCustomer.countryCode}
                          onChange={e => setNewCustomer({...newCustomer, countryCode: e.target.value})}
                        >
                          <option value="+91">+91 (IND)</option>
                          <option value="+1">+1 (USA)</option>
                          <option value="+44">+44 (UK)</option>
                        </select>
                        <input 
                          type="text" 
                          maxLength={10}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:border-blue-500 outline-none font-mono ${newCustomer.phone.length > 0 && newCustomer.phone.length !== 10 ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`} 
                          value={newCustomer.phone} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                            setNewCustomer({...newCustomer, phone: val});
                          }} 
                          placeholder="9876543210" 
                        />
                      </div>
                      {newCustomer.phone.length > 0 && newCustomer.phone.length !== 10 && (
                        <p className="text-xs text-red-500 mt-1">Mobile number must contain exactly 10 digits.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
                      <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition-shadow" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value.trim()})} placeholder="contact@company.com" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile 1 (Optional)</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                          +91
                        </span>
                        <input type="text" maxLength={10} className={`w-full px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:border-blue-500 outline-none font-mono ${newCustomer.mobile1.length > 0 && newCustomer.mobile1.length !== 10 ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`} value={newCustomer.mobile1} onChange={e => { const val = e.target.value.replace(/\D/g, '').substring(0, 10); setNewCustomer({...newCustomer, mobile1: val}); }} placeholder="9876543210" />
                      </div>
                      {newCustomer.mobile1.length > 0 && newCustomer.mobile1.length !== 10 && <p className="text-xs text-red-500 mt-1">Must be exactly 10 digits.</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile 2 (Optional)</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                          +91
                        </span>
                        <input type="text" maxLength={10} className={`w-full px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:border-blue-500 outline-none font-mono ${newCustomer.mobile2.length > 0 && newCustomer.mobile2.length !== 10 ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`} value={newCustomer.mobile2} onChange={e => { const val = e.target.value.replace(/\D/g, '').substring(0, 10); setNewCustomer({...newCustomer, mobile2: val}); }} placeholder="9876543210" />
                      </div>
                      {newCustomer.mobile2.length > 0 && newCustomer.mobile2.length !== 10 && <p className="text-xs text-red-500 mt-1">Must be exactly 10 digits.</p>}
                    </div>
                  </div>
                </div>

                {/* SECTION 3: ADDRESS INFORMATION */}
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                    <MapPin size={16} /> Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition-shadow" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="e.g. 123 Business St, Industrial Area" rows={2}></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      {newCustomer.gstin && newCustomer.gstin.length >= 2 ? (
                        <input type="text" readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 outline-none cursor-not-allowed" value={newCustomer.stateName} />
                      ) : (
                        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none transition-shadow" value={newCustomer.stateName} onChange={e => {
                          const val = e.target.value;
                          const state = getStateFromName(val);
                          setNewCustomer({...newCustomer, stateName: val, stateCode: state ? state.code : ''});
                        }} placeholder="e.g. Maharashtra" />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State Code</label>
                      <input type="text" readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 outline-none cursor-not-allowed font-mono" value={newCustomer.stateCode} placeholder="Auto-filled" />
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors font-medium shadow-sm">Cancel</button>
              <button type="submit" form="customer-form" className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm">Save Customer</button>
            </div>
          </div>
        </div>
      )}
      
      {showDetailsModal && detailsCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-0 rounded-xl shadow-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{detailsCustomer.name}</h2>
                <p className="text-gray-500 text-sm">Customer Profile & History</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700 bg-white border border-gray-300 px-3 py-1 rounded-lg">Close</button>
            </div>
            
            <div className="flex border-b border-gray-200 bg-white shrink-0 px-6 pt-4 space-x-6">
              <button onClick={() => setActiveTab('profile')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Profile Summary</button>
              <button onClick={() => setActiveTab('invoices')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Invoices</button>
              <button onClick={() => setActiveTab('ledger')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ledger' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Ledger</button>
              <button onClick={() => setActiveTab('weighments')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'weighments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Weighments</button>
            </div>
            
            {detailsLoading ? (
              <div className="p-12 text-center text-gray-500 flex-1">Loading customer data...</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Contact Info</h3>
                        <div className="space-y-2">
                          <p><span className="text-gray-500 w-24 inline-block">Mobile:</span> <span className="font-medium">{detailsCustomer.phone || 'N/A'}</span></p>
                          <p><span className="text-gray-500 w-24 inline-block">Email:</span> <span className="font-medium">{detailsCustomer.email || 'N/A'}</span></p>
                          <p><span className="text-gray-500 w-24 inline-block">GSTIN:</span> <span className="font-medium uppercase">{detailsCustomer.gstin || 'N/A'}</span></p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Address Info</h3>
                        <div className="space-y-2">
                          <p><span className="text-gray-500 w-24 inline-block align-top">Address:</span> <span className="font-medium inline-block w-48">{detailsCustomer.address || 'N/A'}</span></p>
                          <p><span className="text-gray-500 w-24 inline-block">State:</span> <span className="font-medium">{detailsCustomer.stateName || 'N/A'}</span></p>
                          <p><span className="text-gray-500 w-24 inline-block">State Code:</span> <span className="font-medium">{detailsCustomer.stateCode || 'N/A'}</span></p>
                        </div>
                      </div>
                    </div>
                    {invoiceSummary && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-blue-100 text-center shadow-sm">
                          <div className="text-xs text-gray-500 font-medium uppercase mb-1">Total Invoices</div>
                          <div className="text-2xl font-bold text-blue-600">{invoiceSummary.totalInvoices}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-green-100 text-center shadow-sm">
                          <div className="text-xs text-gray-500 font-medium uppercase mb-1">Total Billing</div>
                          <div className="text-2xl font-bold text-green-600">₹{invoiceSummary.totalBilling.toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-purple-100 text-center shadow-sm">
                          <div className="text-xs text-gray-500 font-medium uppercase mb-1">Total Paid</div>
                          <div className="text-2xl font-bold text-purple-600">₹{invoiceSummary.totalPaid.toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-red-100 text-center shadow-sm">
                          <div className="text-xs text-gray-500 font-medium uppercase mb-1">Outstanding</div>
                          <div className="text-2xl font-bold text-red-600">₹{invoiceSummary.outstanding.toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'invoices' && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Invoice No</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3 text-right">Invoice Total</th>
                          <th className="px-4 py-3 text-right">Paid Amount</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-blue-600">{inv.invoiceNumber}</td>
                            <td className="px-4 py-3 text-gray-600">{new Date(inv.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right">₹{inv.grandTotal.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right text-green-600">₹{(inv.amountPaid || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-600">₹{(inv.balance || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => downloadInvoicePdf(inv.id, inv.invoiceNumber)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline">
                                <Download size={14} /> Download PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                        {invoices.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No finalized invoices found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {activeTab === 'ledger' && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Reference No</th>
                          <th className="px-4 py-3 text-right">Debit (Sales)</th>
                          <th className="px-4 py-3 text-right">Credit (Paid)</th>
                          <th className="px-4 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ledgerData.transactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-600">{new Date(tx.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                tx.type === 'INVOICE' ? 'bg-blue-100 text-blue-700' :
                                tx.type === 'PAYMENT' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>{tx.type}</span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-700">{tx.referenceNumber || '-'}</td>
                            <td className="px-4 py-3 text-right font-medium text-red-600">{tx.debit > 0 ? `₹${tx.debit.toFixed(2)}` : '-'}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">{tx.credit > 0 ? `₹${tx.credit.toFixed(2)}` : '-'}</td>
                            <td className="px-4 py-3 text-gray-500">{tx.remarks || tx.paymentMethod || '-'}</td>
                          </tr>
                        ))}
                        {ledgerData.transactions.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No transactions found in ledger.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'weighments' && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Slip No</th>
                          <th className="px-4 py-3">Vehicle No</th>
                          <th className="px-4 py-3">Material</th>
                          <th className="px-4 py-3 text-right">Net Wt</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {weighmentsData.map((w: any) => (
                          <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-600">{new Date(w.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-medium">{w.slipNumber || '-'}</td>
                            <td className="px-4 py-3">{w.vehicleNumber}</td>
                            <td className="px-4 py-3">{w.material?.name || '-'}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">{w.netWeight ? `${w.netWeight} ${w.unit}` : '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                w.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                w.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{w.status.replace(/_/g, ' ')}</span>
                            </td>
                          </tr>
                        ))}
                        {weighmentsData.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No weighments found for this customer.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
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
              placeholder="Search customers..."
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
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">GSTIN</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No customers found. Click "Add Customer" to create one.
                    </td>
                  </tr>
                ) : (
                  customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                      <td className="px-6 py-4">{customer.gstin || '-'}</td>
                      <td className="px-6 py-4">{customer.email || '-'}</td>
                      <td className="px-6 py-4">{customer.address || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => openDetailsModal(customer)} className="text-gray-500 hover:text-blue-600 transition-colors p-1" title="Customer Details">
                            <User size={18} />
                          </button>
                          <button onClick={() => openEditModal(customer)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit Customer">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(customer.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Delete Customer">
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
              <div className="col-span-full text-center py-8 text-gray-500">Loading customers...</div>
            ) : customers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">No customers found.</div>
            ) : (
              customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map((customer) => (
                <div key={customer.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="mb-3 pr-2">
                      <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                      {customer.gstin && (
                        <p className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded mt-1 inline-block">GSTIN: {customer.gstin}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Phone:</span>
                        <span className="font-medium text-gray-700">{customer.phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="font-medium text-gray-700 truncate ml-2">{customer.email || 'N/A'}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100 mt-2">
                        <span className="block text-xs text-gray-400 mb-0.5">Address</span>
                        <span className="font-medium text-gray-800 line-clamp-2">{customer.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                    <div className="flex gap-2 w-full pr-2">
                      <button onClick={() => openDetailsModal(customer)} className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 text-sm transition-colors shadow-sm">
                        <User size={14} /> Details
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(customer)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-100"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(customer.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"><Trash2 size={16} /></button>
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

export default Customers;
