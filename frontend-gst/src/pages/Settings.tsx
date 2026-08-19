import { useState, useEffect } from 'react';
import { Building2, Percent, Save, FolderOpen, FileText } from 'lucide-react';
import apiClient from '../api/client';

const Settings = () => {
  const [company, setCompany] = useState({ companyName: '', gstin: '', address: '', stateName: '', stateCode: '', invoicePrefix: 'INV-', bankDetails: '', upiDetails: '', upiId: '', showQrOnInvoice: false, declaration: '', termsAndConditions: '', authSignatoryName: '', authSignatoryDesignation: '', signatureImageUrl: '', logoUrl: '', sealImageUrl: '' });
  const [taxes, setTaxes] = useState<any[]>([]);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [newTax, setNewTax] = useState({ name: '', cgst: '', sgst: '', igst: '' });
  const [pdfStoragePath, setPdfStoragePath] = useState('');
  
  const [printers, setPrinters] = useState<any[]>([]);
  const [defaultPrinter, setDefaultPrinter] = useState('');

  // Use global ipcRenderer if available (Electron context)
  const ipcRenderer = (window as any).ipcRenderer;

  useEffect(() => {
    fetchCompany();
    fetchTaxes();
    const storedPath = localStorage.getItem('pdfStoragePath');
    if (storedPath) setPdfStoragePath(storedPath);
    
    const storedPrinter = localStorage.getItem('defaultPrinter');
    if (storedPrinter) setDefaultPrinter(storedPrinter);

    if (ipcRenderer) {
      ipcRenderer.invoke('get-printers').then((list: any[]) => {
        setPrinters(list);
      }).catch(console.error);
    }
  }, []);

  const fetchCompany = async () => {
    try {
      const res = await apiClient.get('/settings/company');
      if (res.data) {
        setCompany({
          companyName: res.data.companyName || '',
          gstin: res.data.gstin || '',
          address: res.data.address || '',
          stateName: res.data.stateName || '',
          stateCode: res.data.stateCode || '',
          invoicePrefix: res.data.invoicePrefix || 'INV-',
          bankDetails: res.data.bankDetails || '',
          upiDetails: res.data.upiDetails || '',
          upiId: res.data.upiId || '',
          showQrOnInvoice: res.data.showQrOnInvoice || false,
          declaration: res.data.declaration || '',
          termsAndConditions: res.data.termsAndConditions || '',
          authSignatoryName: res.data.authSignatoryName || '',
          authSignatoryDesignation: res.data.authSignatoryDesignation || '',
          signatureImageUrl: res.data.signatureImageUrl || '',
          logoUrl: res.data.logoUrl || '',
          sealImageUrl: res.data.sealImageUrl || ''
        });
      }
    } catch (err) { console.error(err); }
  };

  const fetchTaxes = async () => {
    try {
      const res = await apiClient.get('/settings/taxes');
      setTaxes(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/settings/company', company);
      alert('Company details saved successfully!');
    } catch (err) {
      alert('Failed to save company details');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'signatureImageUrl' | 'sealImageUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompany({ ...company, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/settings/taxes', {
        name: newTax.name,
        cgst: Number(newTax.cgst) || 0,
        sgst: Number(newTax.sgst) || 0,
        igst: Number(newTax.igst) || 0
      });
      setShowTaxModal(false);
      setNewTax({ name: '', cgst: '', sgst: '', igst: '' });
      fetchTaxes();
    } catch (err) {
      alert('Failed to add tax rate');
    }
  };

  const handleDeleteTax = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax slab?')) return;
    try {
      await apiClient.delete(`/settings/taxes/${id}`);
      fetchTaxes();
    } catch (err) {
      alert('Failed to delete tax rate');
    }
  };

  const handleChooseFolder = async () => {
    if (!ipcRenderer) {
      alert("This feature is only available in the desktop application.");
      return;
    }
    try {
      const selectedPath = await ipcRenderer.invoke('choose-folder');
      if (selectedPath) {
        setPdfStoragePath(selectedPath);
        localStorage.setItem('pdfStoragePath', selectedPath);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to choose folder");
    }
  };

  const handleResetFolder = () => {
    setPdfStoragePath('');
    localStorage.removeItem('pdfStoragePath');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage company details and tax configurations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Settings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Building2 size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Company Profile</h2>
          </div>
          
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
              <div className="flex items-center gap-4">
                {company.logoUrl && (
                  <img src={company.logoUrl} alt="Logo" className="h-16 w-16 object-contain border rounded" />
                )}
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logoUrl')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {company.logoUrl && (
                  <button type="button" onClick={() => setCompany({ ...company, logoUrl: '' })} className="text-red-500 text-sm hover:underline">Remove Logo</button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Seal</label>
                <div className="flex flex-col gap-2">
                  {company.sealImageUrl && (
                    <div className="relative">
                      <img src={company.sealImageUrl} alt="Seal" className="h-20 w-20 object-contain border rounded bg-gray-50" />
                      <button type="button" onClick={() => setCompany({ ...company, sealImageUrl: '' })} className="text-red-500 text-xs hover:underline mt-1">Remove</button>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'sealImageUrl')} className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-100 file:text-gray-700" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authorised Signature</label>
                <div className="flex flex-col gap-2">
                  {company.signatureImageUrl && (
                    <div className="relative">
                      <img src={company.signatureImageUrl} alt="Signature" className="h-20 w-32 object-contain border rounded bg-gray-50" />
                      <button type="button" onClick={() => setCompany({ ...company, signatureImageUrl: '' })} className="text-red-500 text-xs hover:underline mt-1">Remove</button>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'signatureImageUrl')} className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-100 file:text-gray-700" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={company.companyName} onChange={e => setCompany({...company, companyName: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={company.gstin} onChange={e => setCompany({...company, gstin: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={company.invoicePrefix} onChange={e => setCompany({...company, invoicePrefix: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" rows={2} value={company.address} onChange={e => setCompany({...company, address: e.target.value})}></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State Name</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={company.stateName} onChange={e => setCompany({...company, stateName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State Code</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={company.stateCode} onChange={e => setCompany({...company, stateCode: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Details</label>
              <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" rows={3} value={company.bankDetails} onChange={e => setCompany({...company, bankDetails: e.target.value})} placeholder="Bank Name:&#10;A/c No:&#10;IFSC:"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Declaration</label>
              <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" rows={2} value={company.declaration} onChange={e => setCompany({...company, declaration: e.target.value})}></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auth Signatory Name</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={company.authSignatoryName} onChange={e => setCompany({...company, authSignatoryName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auth Signatory Designation</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={company.authSignatoryDesignation} onChange={e => setCompany({...company, authSignatoryDesignation: e.target.value})} />
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-800 mb-3 text-sm">UPI & QR Code Payments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={company.upiId} onChange={e => setCompany({...company, upiId: e.target.value})} placeholder="merchant@upi" />
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                  <input type="checkbox" id="showQr" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={company.showQrOnInvoice} onChange={e => setCompany({...company, showQrOnInvoice: e.target.checked})} />
                  <label htmlFor="showQr" className="text-sm font-medium text-gray-700">Display scannable QR Code on Invoice PDF</label>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90 w-full justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
                <Save size={18} /> Save Company Details
              </button>
            </div>
          </form>
        </div>

        {/* Tax Rates Configuration */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <Percent size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Tax Slabs (GST)</h2>
          </div>
          
          <div className="space-y-4">
            {taxes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No tax slabs configured yet.</p>
            ) : (
              taxes.map((tax) => (
                <div key={tax.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center bg-gray-50">
                  <div>
                    <h4 className="font-semibold text-gray-800">{tax.name}</h4>
                    <p className="text-sm text-gray-500">
                      CGST: {tax.cgst}% | SGST: {tax.sgst}% {tax.igst > 0 && `| IGST: ${tax.igst}%`}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteTax(tax.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                </div>
              ))
            )}

            <button onClick={() => setShowTaxModal(true)} className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors font-medium">
              + Add New Tax Slab
            </button>
          </div>
        </div>

        {/* Local Storage & PDF Settings */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <FileText size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Invoice Settings & PDF Storage</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Local PDF Storage Location</h3>
              <p className="text-sm text-gray-500 mb-3">All generated invoices will be saved locally to this folder. No PDFs are uploaded to cloud storage.</p>
              
              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Location</p>
                  <p className="font-mono text-sm text-gray-800 truncate" title={pdfStoragePath || 'Default (Documents/GST Billing/Invoices)'}>
                    {pdfStoragePath || 'Default (Documents/GST Billing/Invoices)'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={handleChooseFolder} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors">
                    <FolderOpen size={16} className="mr-2" /> Change Location
                  </button>
                  {pdfStoragePath && (
                    <button onClick={handleResetFolder} className="px-4 py-2 bg-white border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm transition-colors">
                      Reset to Default
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Default Printer</h3>
              <p className="text-sm text-gray-500 mb-3">Select a default printer for silent PDF printing.</p>
              
              <select 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none bg-gray-50"
                value={defaultPrinter}
                onChange={(e) => {
                  setDefaultPrinter(e.target.value);
                  localStorage.setItem('defaultPrinter', e.target.value);
                }}
              >
                <option value="">-- Let system decide --</option>
                {printers.map((p, idx) => (
                  <option key={idx} value={p.name}>{p.displayName || p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {showTaxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Tax Slab</h2>
            
            <form onSubmit={handleAddTax} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Name (e.g., GST 18%)</label>
                <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newTax.name} onChange={e => setNewTax({...newTax, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CGST (%)</label>
                  <input type="number" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newTax.cgst} onChange={e => setNewTax({...newTax, cgst: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SGST (%)</label>
                  <input type="number" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newTax.sgst} onChange={e => setNewTax({...newTax, sgst: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IGST (%)</label>
                <input type="number" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={newTax.igst} onChange={e => setNewTax({...newTax, igst: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowTaxModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-sm" style={{ backgroundColor: 'var(--color-primary)' }}>Add Tax</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
