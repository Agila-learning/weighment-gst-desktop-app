import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Truck, Scale, CheckCircle, X, Printer, AlertTriangle, User, Package, RefreshCw } from 'lucide-react';
import { useWeighbridgeStore } from '../services/WeighbridgeDeviceService';
import { useSyncStore } from '../services/SyncService';
import api from '../services/api';
import { fetchWeighmentSlipPdf } from '../utils/pdfHelper';
import toast from 'react-hot-toast';

export default function Weighment() {
  const { currentWeight, status: hwStatus, connectionType, stable } = useWeighbridgeStore();
  const location = useLocation();
  const { syncStatus } = useSyncStore();

  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [vehicleSearchResults, setVehicleSearchResults] = useState<any[]>([]);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [vehicleSearchLoading, setVehicleSearchLoading] = useState(false);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddVehicle, setQuickAddVehicle] = useState({ vehicleNumber: '', vehicleType: 'Tipper', capacityWeight: '' });
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  // Pricing Modal State
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingDetails, setPricingDetails] = useState({ pricingType: 'PER_UNIT', billingUnit: 'TON', rate: 0, netWeight: 0, ew: 0, ws: '', taxPercent: 0 });

  const [customers, setCustomers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [, setTransporters] = useState<any[]>([]);
  const [customerPrices, setCustomerPrices] = useState<any[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [loadType, setLoadType] = useState('LOAD');
  const [manualWeight, setManualWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');

  const [pendingWeighment, setPendingWeighment] = useState<any>(null);
  const [captureType, setCaptureType] = useState('SINGLE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualConfirm, setShowManualConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchMasters = async () => {
    try {
      const [cRes, mRes, tRes, cpRes] = await Promise.all([
        api.get('/customers'),
        api.get('/materials'),
        api.get('/transporters'),
        api.get('/customer-material-prices'),
      ]);
      setCustomers(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.data || []));
      setMaterials(Array.isArray(mRes.data) ? mRes.data : (mRes.data?.data || []));
      setTransporters(Array.isArray(tRes.data) ? tRes.data : (tRes.data?.data || []));
      setCustomerPrices(Array.isArray(cpRes.data) ? cpRes.data : (cpRes.data?.data || []));
    } catch (err) {
      const ipcRenderer = (window as any).ipcRenderer;
      if (ipcRenderer) {
        const [cRes, mRes, tRes] = await Promise.all([
          ipcRenderer.invoke('db-query', 'SELECT * FROM customers'),
          ipcRenderer.invoke('db-query', 'SELECT * FROM materials'),
          ipcRenderer.invoke('db-query', 'SELECT * FROM transporters'),
        ]);
        if (cRes.success) setCustomers(cRes.data);
        if (mRes.success) setMaterials(mRes.data);
        if (tRes.success) setTransporters(tRes.data);
      }
    }
  };

  useEffect(() => { fetchMasters(); }, [syncStatus]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowVehicleDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const q = vehicleSearchTerm.trim();
    if (!q || q.length < 2) { setVehicleSearchResults([]); setShowVehicleDropdown(false); return; }
    const t = setTimeout(async () => {
      setVehicleSearchLoading(true);
      try {
        const res = await api.get('/vehicles/search?q=' + encodeURIComponent(q));
        setVehicleSearchResults(res.data || []);
        setShowVehicleDropdown(true);
      } catch {
        const ipc = (window as any).ipcRenderer;
        if (ipc) {
          const r = await ipc.invoke('db-query', 'SELECT * FROM vehicles WHERE vehicleNumber LIKE ? LIMIT 10', ['%' + q + '%']);
          if (r.success) { setVehicleSearchResults(r.data || []); setShowVehicleDropdown(true); }
        }
      } finally { setVehicleSearchLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [vehicleSearchTerm]);

  const handleVehicleSelect = async (v: any) => {
    setVehicleSearchTerm(v.vehicleNumber);
    setSelectedVehicle(v);
    setShowVehicleDropdown(false);
    setErrorMsg('');
    setPendingWeighment(null);
    if (v.customerId) setSelectedCustomer(v.customerId);
    
    try {
      const activeRes = await api.get(`/weighments/active/${v.id || v.vehicleNumber}`);
      if (activeRes.data) {
        setPendingWeighment(activeRes.data);
        if (activeRes.data.customerId) setSelectedCustomer(activeRes.data.customerId);
        if (activeRes.data.materialId) setSelectedMaterial(activeRes.data.materialId);
        setTareWeight(activeRes.data.firstWeight.toString());
      } else {
        setPendingWeighment(null);
        if (v.capacityWeight) setTareWeight(v.capacityWeight.toString());
        else setTareWeight('');
      }
    } catch {
      setPendingWeighment(null);
      if (v.capacityWeight) setTareWeight(v.capacityWeight.toString());
      else setTareWeight('');
    }
  };

  const handleQuickAdd = () => {
    setQuickAddVehicle({ vehicleNumber: vehicleSearchTerm.trim().toUpperCase(), vehicleType: 'Tipper', capacityWeight: '' });
    setShowQuickAdd(true);
    setShowVehicleDropdown(false);
  };

  const handleQuickAddConfirm = async () => {
    if (!quickAddVehicle.vehicleNumber) return;
    setQuickAddLoading(true);
    try {
      const payload = { 
        vehicleNumber: quickAddVehicle.vehicleNumber, 
        vehicleType: quickAddVehicle.vehicleType,
        capacityWeight: quickAddVehicle.capacityWeight ? Number(quickAddVehicle.capacityWeight) : null
      };
      const res = await api.post('/vehicles', payload);
      setShowQuickAdd(false);
      await handleVehicleSelect(res.data);
      setSuccessMsg('Vehicle ' + res.data.vehicleNumber + ' created!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      if (err.response?.status === 400) {
        try {
          const sr = await api.get('/vehicles/search?q=' + encodeURIComponent(quickAddVehicle.vehicleNumber));
          const ex = sr.data?.find((v: any) => v.vehicleNumber === quickAddVehicle.vehicleNumber);
          if (ex) { setShowQuickAdd(false); await handleVehicleSelect(ex); setSuccessMsg('Vehicle already exists — selected.'); setTimeout(() => setSuccessMsg(''), 4000); return; }
        } catch {}
      }
      setErrorMsg(err.response?.data?.message || 'Failed to create vehicle');
    } finally { setQuickAddLoading(false); }
  };

  const getEffectiveWeight = () => connectionType === 'MANUAL' && manualWeight ? parseFloat(manualWeight) : currentWeight;



  const executeCapture = async (type = captureType) => {
    setIsSubmitting(true);
    try {
      const scaleWeight = getEffectiveWeight();
      const ws = connectionType === 'MANUAL' ? 'MANUAL' : 'DEVICE';
      
      if (!selectedMaterial) throw new Error('Please select Material before capturing weight.');
      
      let finalNetWeight = 0;
      let finalEw = scaleWeight;

      if (type === 'SINGLE') {
        const emptyWeight = Number(tareWeight);
        if (scaleWeight <= 0) throw new Error('Gross weight must be greater than 0.');
        if (emptyWeight <= 0) throw new Error('Empty weight must be greater than 0.');
        if (scaleWeight === emptyWeight) throw new Error('Gross weight cannot be same as empty weight.');
        finalNetWeight = Math.abs(scaleWeight - emptyWeight);
      } else if (type === 'EMPTY_ONLY') {
        const fallbackWeight = scaleWeight > 0 ? scaleWeight : Number(tareWeight);
        if (fallbackWeight <= 0) throw new Error('Empty weight must be greater than 0.');
        finalNetWeight = fallbackWeight; // Use scale weight for empty bill pricing calc
        finalEw = fallbackWeight;
      } else if (type === 'LOADED') {
        const emptyWeight = pendingWeighment.firstWeight;
        if (scaleWeight <= 0) throw new Error('Gross weight must be greater than 0.');
        if (scaleWeight === emptyWeight) throw new Error('Gross weight cannot be same as empty weight.');
        finalNetWeight = Math.abs(scaleWeight - emptyWeight);
      }
      
      if (type === 'EMPTY_ONLY') {
        // Bypass pricing completely for Empty Weight slip
        const finalRes = await api.post('/weighments/first-weight', {
          vehicleId: selectedVehicle.id, vehicleNumber: selectedVehicle.vehicleNumber,
          customerId: selectedCustomer || null, materialId: selectedMaterial || null,
          driverId: null, transporterId: null,
          firstWeight: finalEw, firstWeightSource: ws, loadType, unit: 'KG'
        });
        resetFormState();
        setSuccessMsg('Empty weight slip generated!');
        if (finalRes && finalRes.data && finalRes.data.id) {
          printSlipPdf(finalRes.data.id, finalRes.data.slipNumber);
        }
        setIsSubmitting(false);
        return;
      }
      
      let pricingType = 'PER_UNIT', billingUnit = 'TON', rate = 0;
      const cp = customerPrices.find(p => p.customerId === selectedCustomer && p.materialId === selectedMaterial && p.isActive);
      const bm = materials.find(m => m.id === selectedMaterial);
      let taxPercent = 0;
      if (cp) { pricingType = cp.pricingType; billingUnit = cp.billingUnit; rate = cp.rate; }
      else if (bm) { pricingType = bm.pricingType || 'PER_UNIT'; billingUnit = bm.billingUnit || 'TON'; rate = bm.defaultRate || 0; }
      
      if (pricingType === 'FIXED') pricingType = 'PER_LOAD';
      else if (pricingType !== 'PER_LOAD') pricingType = 'PER_UNIT';
      
      if (bm && bm.taxRate) { taxPercent = (bm.taxRate.cgst || 0) + (bm.taxRate.sgst || 0) + (bm.taxRate.igst || 0); }
      
      setPricingDetails({ pricingType, billingUnit, rate, netWeight: finalNetWeight, ew: finalEw, ws, taxPercent });
      setShowPricingModal(true);
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to capture weight');
      setIsSubmitting(false); setShowManualConfirm(false);
    }
  };

  const finalizeSecondWeight = async () => {
    setIsSubmitting(true);
    try {
      let qty = pricingDetails.netWeight;
      if (pricingDetails.billingUnit === 'TON') qty = pricingDetails.netWeight / 1000;
      const baseAmt = pricingDetails.pricingType === 'PER_LOAD' ? pricingDetails.rate : qty * pricingDetails.rate;
      const amt = baseAmt * (1 + (pricingDetails.taxPercent || 0) / 100);
      
      let finalRes;

      if (captureType === 'SINGLE') {
        const emptyWeight = Number(tareWeight);
        const fwRes = await api.post('/weighments/first-weight', {
          vehicleId: selectedVehicle.id, vehicleNumber: selectedVehicle.vehicleNumber,
          customerId: selectedCustomer || null, materialId: selectedMaterial || null,
          driverId: null, transporterId: null,
          firstWeight: emptyWeight, firstWeightSource: 'MANUAL', loadType, unit: 'KG'
        });
        finalRes = await api.post('/weighments/second-weight', {
          weighmentId: fwRes.data.id, 
          secondWeight: pricingDetails.ew, secondWeightSource: pricingDetails.ws, 
          pricingType: pricingDetails.pricingType, rate: pricingDetails.rate, 
          billingUnit: pricingDetails.billingUnit, calculatedQuantity: qty, calculatedAmount: amt,
          loadType, customerId: selectedCustomer || null, materialId: selectedMaterial || null
        });
      } else if (captureType === 'LOADED') {
        finalRes = await api.post('/weighments/second-weight', {
          weighmentId: pendingWeighment.id, 
          secondWeight: pricingDetails.ew, secondWeightSource: pricingDetails.ws, 
          pricingType: pricingDetails.pricingType, rate: pricingDetails.rate, 
          billingUnit: pricingDetails.billingUnit, calculatedQuantity: qty, calculatedAmount: amt,
          loadType, customerId: selectedCustomer || null, materialId: selectedMaterial || null
        });
      }

      resetFormState();
      setShowPricingModal(false);
      setSuccessMsg('Weighment complete!');
      
      // Directly print the slip bypassing the preview modal
      if (finalRes && finalRes.data && finalRes.data.id) {
        printSlipPdf(finalRes.data.id, finalRes.data.slipNumber);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to capture weight');
    } finally { setIsSubmitting(false); }
  };

  const resetFormState = () => {
    setVehicleSearchTerm(''); setSelectedVehicle(null); setSelectedCustomer(''); setSelectedMaterial('');
    setLoadType('LOAD'); setManualWeight(''); setTareWeight(''); setPendingWeighment(null);
  };

  const printSlipPdf = async (id: string, slip: string) => {
    const toastId = toast.loading('Opening for Print...');
    try {
      const { buffer, blobUrl, blob } = await fetchWeighmentSlipPdf(id);
      const ipcRenderer = (window as any).ipcRenderer;
      const filename = `WeighbridgeSlip-${slip || id}.pdf`;

      if (ipcRenderer && buffer) {
        const result = await ipcRenderer.invoke('open-pdf-temp', { buffer, defaultFilename: filename });
        if (result.success) toast.success('Document opened in PDF viewer', { id: toastId });
        else throw new Error(result.error);
      } else if (blobUrl && blob.type === 'text/html') {
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
          toast.success('Slip opened for printing', { id: toastId });
        }
      } else if (blobUrl) {
         window.open(blobUrl, '_blank');
         toast.success('Document opened', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Unable to generate slip PDF for printing.', { id: toastId });
    }
  };

  useEffect(() => {
    if (location.state?.vehicleNumber && !selectedVehicle) {
      setVehicleSearchTerm(location.state.vehicleNumber);
      api.get('/vehicles/search?q=' + encodeURIComponent(location.state.vehicleNumber)).then(r => {
        const v = r.data?.find((x: any) => x.vehicleNumber === location.state.vehicleNumber);
        if (v) handleVehicleSelect(v); else setSelectedVehicle({ vehicleNumber: location.state.vehicleNumber });
      }).catch(() => setSelectedVehicle({ vehicleNumber: location.state.vehicleNumber }));
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const ew = getEffectiveWeight();


  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Weighment Operation</h1>
            <p className="text-slate-500 text-sm mt-1">{pendingWeighment ? 'Step 2: Capture Loaded Weight' : 'Step 1 / Single-Step Capture'}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${hwStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            <Scale size={13} /> {hwStatus} ({connectionType})
          </div>
        </div>

        {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex justify-between items-center text-sm"><span>⚠ {errorMsg}</span><button onClick={() => setErrorMsg('')}><X size={16} /></button></div>}
        {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm"><CheckCircle size={16} /> {successMsg}</div>}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3"><Truck className="text-slate-400" size={17} /><h2 className="text-base font-semibold text-slate-700">Vehicle Identification</h2></div>
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input type="text" value={vehicleSearchTerm}
                onChange={(e) => { setVehicleSearchTerm(e.target.value.toUpperCase()); if (!e.target.value) resetFormState(); }}
                onFocus={() => vehicleSearchResults.length > 0 && setShowVehicleDropdown(true)}
                placeholder="Search Vehicle (e.g. TN38AB1234)"
                className="w-full pl-10 pr-10 py-3 text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 uppercase font-bold text-slate-800"
              />
              {vehicleSearchLoading && <RefreshCw size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
            </div>
            {showVehicleDropdown && vehicleSearchTerm.length >= 2 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                {vehicleSearchResults.length > 0 ? (
                  <>
                    {vehicleSearchResults.map(v => (
                      <div key={v.id} onClick={() => handleVehicleSelect(v)} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-0">
                        <div className="flex justify-between"><span className="font-bold text-slate-800">{v.vehicleNumber}</span><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{v.vehicleType || '—'}</span></div>
                        {(v.driver || v.transporter) && <div className="text-xs text-slate-400 mt-0.5">{v.driver?.name && 'Driver: ' + v.driver.name}{v.driver?.name && v.transporter?.name && ' · '}{v.transporter?.name && 'Transporter: ' + v.transporter.name}</div>}
                      </div>
                    ))}
                    <div onClick={handleQuickAdd} className="px-4 py-2.5 text-blue-600 hover:bg-blue-50 cursor-pointer border-t text-sm font-medium flex items-center gap-1.5"><Plus size={13} /> Create new "{vehicleSearchTerm}"</div>
                  </>
                ) : (
                  <div className="px-4 py-4 text-center">
                    <p className="text-slate-500 text-sm mb-3">No vehicle found for "{vehicleSearchTerm}"</p>
                    <button onClick={handleQuickAdd} className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2"><Plus size={15} /> Create Vehicle "{vehicleSearchTerm}"</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedVehicle && (
            <div className="mt-3 flex items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-lg">
              <Truck size={17} className="text-blue-500" />
              <div className="flex-1"><div className="font-bold text-blue-800">{selectedVehicle.vehicleNumber}</div>{selectedVehicle.vehicleType && <div className="text-xs text-blue-600">{selectedVehicle.vehicleType}</div>}</div>
              <button onClick={resetFormState} className="text-blue-400 hover:text-blue-600"><X size={15} /></button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Transaction Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5"><User size={12} /> Customer</label>
              <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
                <option value="">-- Select Customer --</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5"><Package size={12} /> Material *</label>
              <select value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
                <option value="">-- Select Material --</option>{materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div><label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5"><Scale size={12} /> Empty Weight (KG) {pendingWeighment ? '(From Step 1)' : '*'}</label>
              <input type="number" value={tareWeight} onChange={e => setTareWeight(e.target.value)} disabled={!!pendingWeighment} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" placeholder="e.g. 2500" />
            </div>
          </div>
          <div className="mt-3"><label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-2"><Package size={12} /> Load Type</label>
            <div className="flex gap-4 flex-wrap">{['LOAD','EMPTY','RETURN','OTHER'].map(type => (<label key={type} className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="loadType" value={type} checked={loadType === type} onChange={e => setLoadType(e.target.value)} className="text-blue-600" /><span className="text-sm text-slate-700">{type}</span></label>))}</div></div>
        </div>

        {connectionType === 'MANUAL' && selectedVehicle && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-700 uppercase mb-2">Manual Weight Entry</p>
            <div className="flex gap-3 items-center"><input type="number" value={manualWeight} onChange={e => setManualWeight(e.target.value)} placeholder="Enter weight in KG" className="flex-1 px-4 py-2.5 border border-amber-300 rounded-lg text-lg font-bold focus:ring-2 focus:ring-amber-400" min="0" /><span className="text-amber-700 font-bold">KG</span></div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[350px] flex flex-col gap-4">
        <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
          <div className="flex justify-between items-center mb-5">
            <span className="text-slate-400 text-xs font-mono tracking-widest uppercase">{connectionType === 'MANUAL' ? 'Manual Entry' : 'Live Weight'}</span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${(stable || connectionType === 'MANUAL') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 animate-pulse'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${(stable || connectionType === 'MANUAL') ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {connectionType === 'MANUAL' ? 'MANUAL' : (stable ? 'STABLE' : 'UNSTABLE')}
            </div>
          </div>
          <div className="flex items-end justify-center gap-2 font-mono mb-6">
            <span className={`text-6xl font-bold tracking-tight ${(stable || connectionType === 'MANUAL') ? 'text-cyan-400' : 'text-slate-500'}`}>{connectionType === 'MANUAL' ? (manualWeight || '0') : currentWeight.toLocaleString('en-IN')}</span>
            <span className="text-2xl text-cyan-600 font-bold mb-1">KG</span>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Empty Weight:</span><span className="font-mono text-slate-200">{tareWeight ? Number(tareWeight).toLocaleString('en-IN') + ' KG' : '-- KG'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Load Weight:</span><span className="font-mono text-slate-200">{ew > 0 ? ew.toLocaleString('en-IN') + ' KG' : '-- KG'}</span></div>
            <div className="w-full h-px bg-slate-700 my-0.5" />
            <div className="flex justify-between font-bold"><span className="text-slate-300">Net Weight:</span><span className="font-mono text-cyan-400 text-lg">{ew > 0 && tareWeight ? Math.abs(ew - Number(tareWeight)).toLocaleString('en-IN') + ' KG' : '-- KG'}</span></div>
          </div>
        </div>

        {pendingWeighment ? (
          <button onClick={() => { setCaptureType('LOADED'); if(connectionType==='MANUAL') setShowManualConfirm(true); else executeCapture('LOADED'); }} disabled={!selectedVehicle || isSubmitting || ew <= 0 || !selectedMaterial || (connectionType !== 'MANUAL' && !stable)} className={`w-full py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg bg-blue-600 hover:bg-blue-700 text-white`}>
            <Scale size={22} />{isSubmitting ? 'PROCESSING...' : 'CAPTURE GROSS WEIGHT & BILL (STEP 2)'}
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <button onClick={() => { setCaptureType('EMPTY_ONLY'); if(connectionType==='MANUAL') setShowManualConfirm(true); else executeCapture('EMPTY_ONLY'); }} disabled={!selectedVehicle || isSubmitting || (ew <= 0 && (!tareWeight || Number(tareWeight) <= 0)) || !selectedMaterial || (connectionType !== 'MANUAL' && !stable)} className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow bg-emerald-600 hover:bg-emerald-700 text-white`}>
              <Scale size={18} /> PRINT EMPTY WEIGHT SLIP (STEP 1)
            </button>
            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-700 w-full absolute"></div>
              <span className="bg-slate-900 px-3 text-xs font-medium text-slate-500 relative z-10">OR</span>
            </div>
            <button onClick={() => { setCaptureType('SINGLE'); if(connectionType==='MANUAL') setShowManualConfirm(true); else executeCapture('SINGLE'); }} disabled={!selectedVehicle || isSubmitting || ew <= 0 || !selectedMaterial || !tareWeight || (connectionType !== 'MANUAL' && !stable)} className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow bg-blue-600 hover:bg-blue-700 text-white`}>
              <Scale size={18} /> WEIGH & BILL (MANUAL TARE)
            </button>
          </div>
        )}
        <div className="text-center text-xs text-slate-400 mt-2">Weight Source: <span className="font-bold text-slate-600">{connectionType}</span></div>
      </div>

      {showQuickAdd && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Plus size={20} className="text-blue-600" /></div><div><h2 className="text-lg font-bold text-slate-800">Create New Vehicle</h2><p className="text-sm text-slate-500">Vehicle not found in master</p></div></div>
            <div className="space-y-3 mb-5">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Number *</label><input type="text" value={quickAddVehicle.vehicleNumber} onChange={e => setQuickAddVehicle({...quickAddVehicle, vehicleNumber: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-bold uppercase focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Type</label><select value={quickAddVehicle.vehicleType} onChange={e => setQuickAddVehicle({...quickAddVehicle, vehicleType: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">{['Tipper','Lorry','Mini Truck','Container','Tractor','Other'].map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Empty Weight (KG)</label><input type="number" value={quickAddVehicle.capacityWeight} onChange={e => setQuickAddVehicle({...quickAddVehicle, capacityWeight: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500" placeholder="e.g. 2500" /></div>
            </div>
            <div className="flex justify-end gap-3"><button onClick={() => setShowQuickAdd(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button><button onClick={handleQuickAddConfirm} disabled={!quickAddVehicle.vehicleNumber || quickAddLoading} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">{quickAddLoading ? 'Creating...' : 'Create Vehicle'}</button></div>
          </div>
        </div>
      )}

      {showManualConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 text-amber-600 mb-4"><AlertTriangle size={22} /><h2 className="text-xl font-bold">Manual Weight Entry</h2></div>
            <p className="text-slate-600 mb-4 text-sm">You are recording a manual weight. This will be logged.</p>
            <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between font-mono"><span className="text-slate-500">Weight:</span><span className="text-2xl font-bold">{(captureType === 'EMPTY_ONLY' && ew <= 0 ? Number(tareWeight) : ew).toLocaleString('en-IN')} KG</span></div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowManualConfirm(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button><button onClick={() => executeCapture(captureType)} disabled={isSubmitting} className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Confirm'}</button></div>
          </div>
        </div>
      )}

        {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">Adjust Pricing</h2>
              <button onClick={() => setShowPricingModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={pricingDetails.pricingType} onChange={e => setPricingDetails({ ...pricingDetails, pricingType: e.target.value })}>
                    <option value="PER_UNIT">Per Unit</option>
                    <option value="PER_LOAD">Per Load</option>
                  </select>
                </div>
                {pricingDetails.pricingType === 'PER_UNIT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Unit</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={pricingDetails.billingUnit} onChange={e => setPricingDetails({ ...pricingDetails, billingUnit: e.target.value })}>
                      <option value="TON">TON</option>
                      <option value="KG">KG</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={pricingDetails.rate} onChange={e => setPricingDetails({ ...pricingDetails, rate: Number(e.target.value) })} />
              </div>
              <div className="bg-blue-50 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-800 font-medium">Base Amount:</span>
                  <span className="text-lg font-bold text-blue-900">
                    ₹ {((pricingDetails.pricingType === 'PER_LOAD' ? pricingDetails.rate : (pricingDetails.billingUnit === 'TON' ? pricingDetails.netWeight / 1000 : pricingDetails.netWeight) * pricingDetails.rate)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                {pricingDetails.taxPercent > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-800 font-medium">Tax ({pricingDetails.taxPercent}%):</span>
                    <span className="text-sm font-bold text-blue-900">
                      + ₹ {(((pricingDetails.pricingType === 'PER_LOAD' ? pricingDetails.rate : (pricingDetails.billingUnit === 'TON' ? pricingDetails.netWeight / 1000 : pricingDetails.netWeight) * pricingDetails.rate) * pricingDetails.taxPercent) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-blue-200 pt-2 mt-1">
                  <span className="text-sm text-blue-800 font-bold">Total Amount (incl. Tax):</span>
                  <span className="text-xl font-bold text-blue-900">
                    ₹ {((pricingDetails.pricingType === 'PER_LOAD' ? pricingDetails.rate : (pricingDetails.billingUnit === 'TON' ? pricingDetails.netWeight / 1000 : pricingDetails.netWeight) * pricingDetails.rate) * (1 + pricingDetails.taxPercent / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-2xl border-t border-gray-100">
              <button onClick={() => setShowPricingModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={finalizeSecondWeight} disabled={isSubmitting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                {isSubmitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Printer size={18} />}
                Confirm & Generate Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct print implementation bypassing the success modal */}
    </div>
  );
}
