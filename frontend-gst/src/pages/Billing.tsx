import { useState, useEffect, useRef } from 'react';
import { Calculator, Save, FileCheck, Trash2, ChevronDown, ChevronRight, Search, CheckCircle, FolderOpen, Printer, FileText } from 'lucide-react';
import apiClient, { API_BASE_URL } from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';

const STATE_MAPPINGS: Record<string, string> = {
  '33': 'Tamil Nadu',
  '32': 'Kerala',
  '29': 'Karnataka',
  '36': 'Telangana',
  '28': 'Andhra Pradesh',
  '27': 'Maharashtra',
  '24': 'Gujarat',
  '07': 'Delhi',
  '09': 'Uttar Pradesh',
  '19': 'West Bengal'
};

const Autocomplete = ({ value, options, placeholder, onChange, displayKey, onSelect }: any) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const selected = options.find((o: any) => o.id === value);
      if (selected) setQuery(selected[displayKey]);
    } else {
      setQuery('');
    }
  }, [value, options, displayKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((o: any) => o[displayKey]?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none"
          placeholder={placeholder}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (e.target.value === '') onChange('');
          }}
          onFocus={() => setIsOpen(true)}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
      </div>
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((item: any) => (
            <div
              key={item.id}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
              onClick={() => {
                setQuery(item[displayKey]);
                onChange(item.id);
                if (onSelect) onSelect(item);
                setIsOpen(false);
              }}
            >
              {item[displayKey]} {item.gstin ? `(${item.gstin})` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Billing = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerSummary, setCustomerSummary] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Advanced Invoice Fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sameAsBuyer, setSameAsBuyer] = useState(true);
  
  const [buyerDetails, setBuyerDetails] = useState({ name: '', address: '', gstin: '', stateName: '', stateCode: '' });
  const [consigneeDetails, setConsigneeDetails] = useState({ name: '', address: '', gstin: '', stateName: '', stateCode: '' });
  
  const [headerDetails, setHeaderDetails] = useState({
    deliveryNote: '', paymentTerms: '', referenceNo: '', referenceDate: '', buyersOrderNo: '', buyersOrderDate: '',
    dispatchDocNo: '', dispatchDocDate: '', dispatchedThrough: '', destination: '', billOfLading: '', termsOfDelivery: ''
  });
  const [weighmentReference, setWeighmentReference] = useState('');
  
  const [lineItems, setLineItems] = useState([{ id: Date.now().toString(), materialId: '', quantity: 1, rate: 0, taxAmount: 0, amount: 0, totalAmount: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, materialName: '', hsnCode: '', unit: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [isFetchingWeighbridge, setIsFetchingWeighbridge] = useState(false);

  const ipcRenderer = (window as any).ipcRenderer;

  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const duplicateId = searchParams.get('duplicateId');

  useEffect(() => {
    apiClient.get('/settings/company').then(res => setCompany(res.data)).catch(console.error);
    apiClient.get('/customers').then(res => setCustomers(res.data)).catch(console.error);
    apiClient.get('/materials').then(res => setMaterials(res.data)).catch(console.error);
    apiClient.get('/vehicles').then(res => setVehicles(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchId = editId || duplicateId;
    if (fetchId) {
      apiClient.get(`/invoices/${fetchId}`).then(res => {
        const inv = res.data;
        setSelectedCustomer(inv.customerId || '');
        setSelectedVehicle(inv.vehicleId || '');
        // Do not copy date if duplicating
        if (editId) {
          setInvoiceDate(inv.date ? inv.date.split('T')[0] : '');
        } else {
          setInvoiceDate(new Date().toISOString().split('T')[0]);
        }
        
        setBuyerDetails({
          name: inv.buyerName || '',
          address: inv.buyerAddress || '',
          gstin: inv.buyerGstin || '',
          stateName: inv.buyerState || '',
          stateCode: inv.buyerStateCode || ''
        });
        
        if (inv.consigneeName || inv.consigneeAddress) {
          setSameAsBuyer(false);
          setConsigneeDetails({
            name: inv.consigneeName || '',
            address: inv.consigneeAddress || '',
            gstin: inv.consigneeGstin || '',
            stateName: inv.consigneeState || '',
            stateCode: inv.consigneeStateCode || ''
          });
        }
        
        setHeaderDetails({
          deliveryNote: inv.deliveryNote || '',
          paymentTerms: inv.paymentTerms || '',
          referenceNo: inv.referenceNo || '',
          referenceDate: inv.referenceDate || '',
          buyersOrderNo: inv.buyersOrderNo || '',
          buyersOrderDate: inv.buyersOrderDate || '',
          dispatchDocNo: inv.dispatchDocNo || '',
          dispatchDocDate: inv.dispatchDocDate || '',
          dispatchedThrough: inv.dispatchedThrough || '',
          destination: inv.destination || '',
          billOfLading: inv.billOfLading || '',
          termsOfDelivery: inv.termsOfDelivery || ''
        });
        setWeighmentReference(inv.weighmentReference || '');
        
        if (inv.items && inv.items.length > 0) {
          setLineItems(inv.items.map((item: any) => ({
            id: Date.now().toString() + Math.random(),
            materialId: item.materialId,
            quantity: item.quantity,
            rate: item.rate,
            taxAmount: item.taxAmount,
            amount: item.amount,
            totalAmount: item.totalAmount,
            cgstRate: item.cgstRate,
            sgstRate: item.sgstRate,
            igstRate: item.igstRate,
            materialName: item.materialName,
            hsnCode: item.hsnCode,
            unit: item.unit
          })));
        }
      }).catch(console.error);
    }
  }, [editId, duplicateId]);

  const handleStateCodeChange = (code: string, target: 'buyer' | 'consignee') => {
    const stateName = STATE_MAPPINGS[code] || '';
    if (target === 'buyer') {
      setBuyerDetails(prev => ({ ...prev, stateCode: code, stateName: stateName || prev.stateName }));
      if (sameAsBuyer) setConsigneeDetails(prev => ({ ...prev, stateCode: code, stateName: stateName || prev.stateName }));
    } else {
      setConsigneeDetails(prev => ({ ...prev, stateCode: code, stateName: stateName || prev.stateName }));
    }
  };

  const handleCustomerSelect = (cust: any) => {
    setBuyerDetails({
      name: cust.name || '',
      address: cust.address || '',
      gstin: cust.gstin || '',
      stateName: cust.stateName || '',
      stateCode: cust.stateCode || ''
    });
    if (sameAsBuyer) {
      setConsigneeDetails({
        name: cust.name || '',
        address: cust.address || '',
        gstin: cust.gstin || '',
        stateName: cust.stateName || '',
        stateCode: cust.stateCode || ''
      });
    }
    
    // Fetch customer summary
    apiClient.get(`/customers/${cust.id}/summary`)
      .then(res => setCustomerSummary(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerSummary(null);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (sameAsBuyer) {
      setConsigneeDetails({ ...buyerDetails });
    }
  }, [sameAsBuyer, buyerDetails]);

  const handleFetchFromWeighbridge = async () => {
    if (!selectedVehicle) {
      alert("Please select a vehicle first to fetch its latest weighment.");
      return;
    }
    try {
      setIsFetchingWeighbridge(true);
      const vehicleObj = vehicles.find(v => v.id === selectedVehicle);
      const res = await apiClient.get(`/weighments?status=COMPLETED&vehicleNumber=${vehicleObj?.vehicleNumber}&limit=1`);
      
      if (res.data.data && res.data.data.length > 0) {
        // Find the first unlinked weighment
        const weighment = res.data.data.find((w: any) => !w.invoiceReference);
        
        if (!weighment) {
          const linkedWeighment = res.data.data[0];
          alert(`THIS WEIGHMENT IS ALREADY LINKED\nSlip No: ${linkedWeighment.slipNumber}\nInvoice: ${linkedWeighment.invoiceReference}`);
          return;
        }
        
        // Auto fill fields
        if (weighment.customerId) setSelectedCustomer(weighment.customerId);
        
        // Set line item to match weighment
        if (weighment.materialId) {
          const material = materials.find(m => m.id === weighment.materialId);
          setLineItems([{ 
            id: Date.now().toString(), 
            materialId: weighment.materialId, 
            quantity: weighment.netWeight, 
            rate: material?.defaultRate || 0, 
            taxAmount: 0, 
            amount: 0, 
            totalAmount: 0, 
            cgstRate: 0, 
            sgstRate: 0, 
            igstRate: 0, 
            materialName: material?.name || '', 
            hsnCode: material?.hsnCode || '', 
            unit: 'KG' 
          }]);
        }
        
        // Update header details
        setHeaderDetails(prev => ({
          ...prev,
          referenceNo: weighment.slipNumber || prev.referenceNo,
          referenceDate: weighment.completedAt ? weighment.completedAt.split('T')[0] : prev.referenceDate,
          dispatchedThrough: vehicleObj?.vehicleNumber || prev.dispatchedThrough
        }));
        setWeighmentReference(weighment.slipNumber);
        
        alert(`Successfully fetched weighment ${weighment.slipNumber} (Net: ${weighment.netWeight} KG)`);
      } else {
        alert("No completed weighments found for this vehicle.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch weighbridge data.");
    } finally {
      setIsFetchingWeighbridge(false);
    }
  };

  const recalculateTaxes = (items: any[], activeBuyer: any) => {
    return items.map(item => {
      if (!item.materialId) return item;
      const material = materials.find(m => m.id === item.materialId);
      if (!material) return item;
      
      const isInterState = company?.stateCode && activeBuyer?.stateCode && company.stateCode !== activeBuyer.stateCode;
      const totalTaxRate = material.taxRate ? (material.taxRate.cgst + material.taxRate.sgst + material.taxRate.igst) : 0;
      
      let cgst = 0, sgst = 0, igst = 0;
      if (isInterState) {
        igst = totalTaxRate; 
      } else {
        cgst = material.taxRate?.cgst || (totalTaxRate / 2);
        sgst = material.taxRate?.sgst || (totalTaxRate / 2);
      }
      
      const amount = item.quantity * item.rate;
      const taxAmount = (amount * totalTaxRate) / 100;
      
      return {
        ...item,
        amount,
        taxAmount,
        totalAmount: amount + taxAmount,
        cgstRate: cgst,
        sgstRate: sgst,
        igstRate: igst,
        materialName: material.name,
        hsnCode: material.hsnCode,
        unit: material.unit
      };
    });
  };

  useEffect(() => {
    setLineItems(prev => recalculateTaxes(prev, consigneeDetails.stateCode ? consigneeDetails : buyerDetails));
  }, [company?.stateCode, buyerDetails.stateCode, consigneeDetails.stateCode]);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { id: Date.now().toString(), materialId: '', quantity: 1, rate: 0, taxAmount: 0, amount: 0, totalAmount: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, materialName: '', hsnCode: '', unit: '' }]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleLineItemChange = (id: string, field: string, value: any) => {
    setLineItems(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          const newItem = { ...item, [field]: value };
          if (field === 'materialId') {
            const material = materials.find(m => m.id === value);
            if (material) {
              newItem.rate = material.defaultRate;
            }
          }
          return newItem;
        }
        return item;
      });
      return recalculateTaxes(updated, consigneeDetails.stateCode ? consigneeDetails : buyerDetails);
    });
  };

  const subTotal = lineItems.reduce((acc, item) => acc + item.amount, 0);
  const taxTotal = lineItems.reduce((acc, item) => acc + item.taxAmount, 0);
  const grandTotal = subTotal + taxTotal;

  const handleSaveInvoice = async (status: 'DRAFT' | 'FINALIZED') => {
    if (!selectedCustomer) {
      alert('Please select a customer.');
      return;
    }
    
    const validItems = lineItems.filter(item => item.materialId);
    if (validItems.length === 0) {
      alert('Please add at least one material.');
      return;
    }

    try {
      setIsSaving(true);
      const vehicleObj = vehicles.find(v => v.id === selectedVehicle);
      
      const payload = {
        customerId: selectedCustomer,
        vehicleId: selectedVehicle || null,
        status,
        date: invoiceDate,
        buyerName: buyerDetails.name,
        buyerAddress: buyerDetails.address,
        buyerGstin: buyerDetails.gstin,
        buyerState: buyerDetails.stateName,
        buyerStateCode: buyerDetails.stateCode,
        consigneeName: consigneeDetails.name,
        consigneeAddress: consigneeDetails.address,
        consigneeGstin: consigneeDetails.gstin,
        consigneeState: consigneeDetails.stateName,
        consigneeStateCode: consigneeDetails.stateCode,
        ...headerDetails,
        weighmentReference,
        snapshotVehicleNumber: vehicleObj ? vehicleObj.vehicleNumber : undefined,
        items: validItems.map(i => ({ 
          materialId: i.materialId, 
          quantity: i.quantity, 
          rate: i.rate,
          cgstRate: i.cgstRate,
          sgstRate: i.sgstRate,
          igstRate: i.igstRate,
          materialName: i.materialName,
          hsnCode: i.hsnCode,
          unit: i.unit
        }))
      };

      let res;
      if (editId) {
        res = await apiClient.put(`/invoices/${editId}`, payload);
      } else {
        res = await apiClient.post('/invoices', payload);
      }
      
      if (status === 'FINALIZED') {
        if (!ipcRenderer) {
          // Fallback for non-electron env
          window.open(`${API_BASE_URL}/invoices/${res.data.id}/pdf`, '_blank');
          navigate('/invoices');
          return;
        }

        // Fetch PDF Buffer from backend
        const pdfRes = await apiClient.get(`/invoices/${res.data.id}/pdf`, { responseType: 'arraybuffer' });
        const buffer = pdfRes.data;

        // Prompt native save dialog immediately
        const saveResult = await ipcRenderer.invoke('save-pdf-dialog', { 
          buffer, 
          defaultFilename: `INV-${res.data.invoiceNumber}.pdf` 
        });

        if (saveResult.success) {
          setSuccessData({
            invoiceId: res.data.id,
            invoiceNumber: res.data.invoiceNumber,
            grandTotal: res.data.grandTotal,
            path: saveResult.path,
            buffer // Store buffer temporarily for re-download if needed
          });
        } else if (saveResult.canceled) {
          setSuccessData({
            invoiceId: res.data.id,
            invoiceNumber: res.data.invoiceNumber,
            grandTotal: res.data.grandTotal,
            buffer
          });
        } else {
          alert('Failed to save PDF locally: ' + saveResult.error);
          navigate('/invoices');
        }
      } else {
        navigate('/invoices');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving invoice');
    } finally {
      setIsSaving(false);
    }
  };

  if (successData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-lg w-full text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE GENERATED SUCCESSFULLY</h2>
          
          <div className="bg-gray-50 rounded-lg p-4 my-6 text-left border border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500 font-medium">Invoice Number:</span>
              <span className="font-bold text-gray-900">{successData.invoiceNumber}</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-gray-500 font-medium">Grand Total:</span>
              <span className="font-bold text-gray-900">₹{successData.grandTotal.toFixed(2)}</span>
            </div>
            {successData.path && (
              <div className="border-t border-gray-200 pt-3">
                <span className="block text-gray-500 font-medium text-xs mb-1 uppercase">Saved PDF Location:</span>
                <span className="font-mono text-sm text-gray-700 break-all">{successData.path}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button 
              onClick={async () => {
                const saveResult = await ipcRenderer.invoke('save-pdf-dialog', { 
                  buffer: successData.buffer, 
                  defaultFilename: `INV-${successData.invoiceNumber}.pdf` 
                });
                if (saveResult.success) {
                  setSuccessData({ ...successData, path: saveResult.path });
                } else if (!saveResult.canceled) {
                  alert('Unable to save the PDF to the selected location.');
                }
              }} 
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <FileText size={18} /> Download PDF
            </button>
            <button 
              onClick={() => {
                if (successData.path) {
                  ipcRenderer.invoke('open-pdf', successData.path);
                } else {
                  // Fallback if not saved locally yet
                  window.open(`${API_BASE_URL}/invoices/${successData.invoiceId}/pdf`, '_blank');
                }
              }} 
              className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <FolderOpen size={18} /> View Invoice
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => {
              if (successData.path) {
                const printer = localStorage.getItem('defaultPrinter');
                ipcRenderer.invoke('print-pdf', { filePath: successData.path, printerName: printer }).then((res: any) => {
                  if (!res.success && res.error) alert('Print error: ' + res.error);
                });
              } else {
                window.open(`${API_BASE_URL}/invoices/${successData.invoiceId}/pdf`);
              }
            }} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              <Printer size={18} /> Print
            </button>
            <button onClick={() => {
              setSuccessData(null);
              setLineItems([{ id: Date.now().toString(), materialId: '', quantity: 1, rate: 0, taxAmount: 0, amount: 0, totalAmount: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, materialName: '', hsnCode: '', unit: '' }]);
            }} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              <FileCheck size={18} /> Create New
            </button>
          </div>
          
          <div className="mt-6 border-t border-gray-200 pt-4">
            <button onClick={() => navigate('/invoices')} className="text-gray-500 hover:text-gray-800 font-medium transition-colors">
              Close & Go to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
          <p className="text-gray-500">Generate professional GST bills</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleSaveInvoice('DRAFT')} disabled={isSaving} className="flex items-center gap-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50">
            <Save size={18} /> Save Draft
          </button>
          <button onClick={() => handleSaveInvoice('FINALIZED')} disabled={isSaving} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)' }}>
            <FileCheck size={18} /> Finalize Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Primary Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer *</label>
                <Autocomplete 
                  options={customers} 
                  value={selectedCustomer} 
                  onChange={setSelectedCustomer} 
                  onSelect={handleCustomerSelect}
                  displayKey="name" 
                  placeholder="Search customer..." 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500 outline-none" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-medium text-gray-700">Vehicle Details</label>
                  <button 
                    onClick={handleFetchFromWeighbridge}
                    disabled={!selectedVehicle || isFetchingWeighbridge}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                  >
                    {isFetchingWeighbridge ? 'Fetching...' : 'Fetch Weighbridge Data'}
                  </button>
                </div>
                <Autocomplete 
                  options={vehicles} 
                  value={selectedVehicle} 
                  onChange={setSelectedVehicle} 
                  displayKey="vehicleNumber" 
                  placeholder="Search vehicle..." 
                />
              </div>
            </div>
            
            {customerSummary && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-600 font-medium uppercase">Customer Quick Summary</div>
                  <div className="text-sm font-semibold text-blue-900 mt-1">{buyerDetails.name}</div>
                </div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <div className="text-xs text-blue-600">Total Billing</div>
                    <div className="font-bold text-blue-900">₹ {customerSummary.totalBilling.toFixed(2)}</div>
                  </div>
                  <div className="text-right border-l border-blue-200 pl-6">
                    <div className="text-xs text-red-600">Outstanding Balance</div>
                    <div className="font-bold text-red-700">₹ {customerSummary.outstanding.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button 
              type="button" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 flex items-center justify-between bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
            >
              <span>+ Additional Invoice Details (Consignee, Dispatch, Reference)</span>
              {showAdvanced ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {showAdvanced && (
              <div className="p-6 space-y-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-8">
                  {/* Buyer Snapshot Edit */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-800 border-b pb-2">Buyer (Bill To)</h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Name</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={buyerDetails.name} onChange={e => setBuyerDetails({...buyerDetails, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Address</label>
                      <textarea className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" rows={2} value={buyerDetails.address} onChange={e => setBuyerDetails({...buyerDetails, address: e.target.value})}></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">State Code</label>
                        <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={buyerDetails.stateCode} onChange={e => handleStateCodeChange(e.target.value, 'buyer')} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">State Name</label>
                        <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm bg-gray-50" value={buyerDetails.stateName} readOnly />
                      </div>
                    </div>
                  </div>
                  
                  {/* Consignee */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="font-semibold text-gray-800">Consignee (Ship To)</h3>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" checked={sameAsBuyer} onChange={e => setSameAsBuyer(e.target.checked)} />
                        Same as Buyer
                      </label>
                    </div>
                    {!sameAsBuyer && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Name</label>
                          <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={consigneeDetails.name} onChange={e => setConsigneeDetails({...consigneeDetails, name: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Address</label>
                          <textarea className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" rows={2} value={consigneeDetails.address} onChange={e => setConsigneeDetails({...consigneeDetails, address: e.target.value})}></textarea>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500">State Code</label>
                            <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={consigneeDetails.stateCode} onChange={e => handleStateCodeChange(e.target.value, 'consignee')} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500">State Name</label>
                            <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm bg-gray-50" value={consigneeDetails.stateName} readOnly />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Header Information */}
                <div>
                  <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">Header Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 text-sm bg-white">
                    <div>
                      <label className="block text-gray-700 mb-1">Weighment Reference</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:border-blue-500 outline-none font-mono" value={weighmentReference} readOnly placeholder="Fetched automatically" />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1">Delivery Note</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:border-blue-500 outline-none" value={headerDetails.deliveryNote} onChange={e => setHeaderDetails(p => ({...p, deliveryNote: e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Payment Terms</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={headerDetails.paymentTerms} onChange={e => setHeaderDetails({...headerDetails, paymentTerms: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Terms of Delivery</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={headerDetails.termsOfDelivery} onChange={e => setHeaderDetails({...headerDetails, termsOfDelivery: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Reference No</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={headerDetails.referenceNo} onChange={e => setHeaderDetails({...headerDetails, referenceNo: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Buyer's Order No</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={headerDetails.buyersOrderNo} onChange={e => setHeaderDetails({...headerDetails, buyersOrderNo: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Dispatch Doc No</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={headerDetails.dispatchDocNo} onChange={e => setHeaderDetails({...headerDetails, dispatchDocNo: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Dispatched Through</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={headerDetails.dispatchedThrough} onChange={e => setHeaderDetails({...headerDetails, dispatchedThrough: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Destination</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={headerDetails.destination} onChange={e => setHeaderDetails({...headerDetails, destination: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Bill of Lading / LR No.</label>
                      <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:border-blue-500 outline-none text-sm" value={headerDetails.billOfLading} onChange={e => setHeaderDetails({...headerDetails, billOfLading: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-visible">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Line Items</h2>
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Rate (₹)</th>
                    <th className="px-4 py-3">Tax Breakdown</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => {
                    return (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="px-4 py-3 min-w-[200px]">
                          <Autocomplete 
                            options={materials} 
                            value={item.materialId} 
                            onChange={(val: any) => handleLineItemChange(item.id, 'materialId', val)} 
                            displayKey="name" 
                            placeholder="Select material..." 
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="0.1" step="0.1" className="w-20 px-2 py-1.5 border border-gray-300 rounded outline-none focus:ring-2 focus:border-blue-500" value={item.quantity} onChange={e => handleLineItemChange(item.id, 'quantity', Number(e.target.value))} />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="0" step="1" className="w-24 px-2 py-1.5 border border-gray-300 rounded outline-none focus:ring-2 focus:border-blue-500" value={item.rate} onChange={e => handleLineItemChange(item.id, 'rate', Number(e.target.value))} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.igstRate > 0 ? (
                            <div>IGST: {item.igstRate}%</div>
                          ) : (
                            <>
                              <div>CGST: {item.cgstRate}%</div>
                              <div>SGST: {item.sgstRate}%</div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">₹ {item.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          {lineItems.length > 1 && (
                            <button onClick={() => handleRemoveLineItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button onClick={handleAddLineItem} className="mt-4 text-blue-600 font-medium hover:text-blue-700 transition-colors inline-block">+ Add Line Item</button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calculator size={20} /> Invoice Summary
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹ {subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST Tax</span>
                <span>₹ {taxTotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-4 flex justify-between font-bold text-gray-900 text-xl">
                <span>Grand Total</span>
                <span>₹ {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
