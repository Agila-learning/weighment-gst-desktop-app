import { useState, useEffect } from 'react';
import { Plus, Search, LayoutList, LayoutGrid, Edit2, Trash2, Clock } from 'lucide-react';
import apiClient, { API_BASE_URL } from '../api/client';

const Customers = () => {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ id: '', name: '', gstin: '', countryCode: '+91', phone: '', email: '', address: '', stateName: '', stateCode: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<any>(null);
  const [historySummary, setHistorySummary] = useState<any>(null);
  const [historyInvoices, setHistoryInvoices] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

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
      const payload = {
        ...newCustomer,
        phone: newCustomer.phone ? `${newCustomer.countryCode} ${newCustomer.phone}` : ''
      };
      
      if (isEditing && newCustomer.id) {
        await apiClient.put(`/customers/${newCustomer.id}`, payload);
      } else {
        await apiClient.post('/customers', payload);
      }
      setShowModal(false);
      setNewCustomer({ id: '', name: '', gstin: '', countryCode: '+91', phone: '', email: '', address: '', stateName: '', stateCode: '' });
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
    setNewCustomer({ id: '', name: '', gstin: '', countryCode: '+91', phone: '', email: '', address: '', stateName: '', stateCode: '' });
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

  const openHistoryModal = async (customer: any) => {
    setHistoryCustomer(customer);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const response = await apiClient.get(`/invoices/customer/${customer.id}/history`);
      setHistoryInvoices(response.data.invoices || []);
      setHistorySummary(response.data.summary);
    } catch (err) {
      console.error('Error fetching history', err);
    } finally {
      setHistoryLoading(false);
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
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h2>
            
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleAddOrEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="Acme Corp" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newCustomer.gstin} onChange={e => setNewCustomer({...newCustomer, gstin: e.target.value.toUpperCase()})} placeholder="29ABCDE1234F1Z5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <div className="flex">
                    <select 
                      className="w-1/3 px-2 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:border-blue-500 outline-none bg-gray-50 border-r-0"
                      value={newCustomer.countryCode}
                      onChange={e => setNewCustomer({...newCustomer, countryCode: e.target.value})}
                    >
                      <option value="+91">+91 (IND)</option>
                      <option value="+1">+1 (USA)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+61">+61 (AUS)</option>
                      <option value="+971">+971 (UAE)</option>
                    </select>
                    <input 
                      type="text" 
                      maxLength={10}
                      className="w-2/3 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:border-blue-500 outline-none" 
                      value={newCustomer.phone} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setNewCustomer({...newCustomer, phone: val});
                      }} 
                      placeholder="9876543210" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
                  <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} placeholder="contact@company.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State Name</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newCustomer.stateName} onChange={e => setNewCustomer({...newCustomer, stateName: e.target.value})} placeholder="Maharashtra" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State Code</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newCustomer.stateCode} onChange={e => setNewCustomer({...newCustomer, stateCode: e.target.value})} placeholder="27" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="123 Business St, City"></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-sm bg-primary-600 hover:bg-primary-700">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showHistoryModal && historyCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{historyCustomer.name} - Billing History</h2>
                <p className="text-gray-500 text-sm">Customer Profile & Invoices</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">Close</button>
            </div>
            
            {historyLoading ? (
              <div className="p-12 text-center text-gray-500">Loading history...</div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {historySummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                      <div className="text-xs text-blue-600 font-medium uppercase mb-1">Total Invoices</div>
                      <div className="text-2xl font-bold text-blue-900">{historySummary.totalInvoices}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                      <div className="text-xs text-green-600 font-medium uppercase mb-1">Total Billing</div>
                      <div className="text-2xl font-bold text-green-900">₹{historySummary.totalBilling.toFixed(2)}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-center">
                      <div className="text-xs text-purple-600 font-medium uppercase mb-1">Total Paid</div>
                      <div className="text-2xl font-bold text-purple-900">₹{historySummary.totalPaid.toFixed(2)}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                      <div className="text-xs text-red-600 font-medium uppercase mb-1">Outstanding</div>
                      <div className="text-2xl font-bold text-red-700">₹{historySummary.outstanding.toFixed(2)}</div>
                    </div>
                  </div>
                )}
                
                <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                      {historyInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-blue-600">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3 text-gray-600">{new Date(inv.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">₹{inv.grandTotal.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-green-600">₹{(inv.amountPaid || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">₹{(inv.balance || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <a href={`${API_BASE_URL}/invoices/${inv.id}/pdf`} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline">View PDF</a>
                          </td>
                        </tr>
                      ))}
                      {historyInvoices.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No finalized invoices found for this customer.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openHistoryModal(customer)} className="text-purple-600 hover:text-purple-800 font-medium mr-4">History</button>
                        <button onClick={() => openEditModal(customer)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        <button onClick={() => handleDelete(customer.id)} className="text-red-500 hover:text-red-700 font-medium ml-4">Remove</button>
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
                <div key={customer.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => openHistoryModal(customer)} className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100" title="History">
                      <Clock size={14} />
                    </button>
                    <button onClick={() => openEditModal(customer)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(customer.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="mb-3 pr-24">
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
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
