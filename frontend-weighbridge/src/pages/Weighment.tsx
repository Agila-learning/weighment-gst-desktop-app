import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Truck, Scale, CheckCircle, Save, X, Printer, Download, Loader2, AlertTriangle, User, Package, RefreshCw } from 'lucide-react';
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
  const [quickAddVehicle, setQuickAddVehicle] = useState({ vehicleNumber: '', vehicleType: 'Tipper' });
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const [customers, setCustomers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [customerPrices, setCustomerPrices] = useState<any[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState('');
  const [loadType, setLoadType] = useState('LOAD');
  const [manualWeight, setManualWeight] = useState('');

  const [pendingWeighment, setPendingWeighment] = useState<any>(null);
  const [completedWeighment, setCompletedWeighment] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualConfirm, setShowManualConfirm] = useState(false);
  const [manualReason, setManualReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [slipDownloading, setSlipDownloading] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchMasters = async () => {
    try {
      const [cRes, mRes, dRes, tRes, cpRes, sRes] = await Promise.all([
        api.get('/customers'),
        api.get('/materials'),
        api.get('/drivers'),
        api.get('/transporters'),
        api.get('/customer-material-prices'),
        api.get('/settings').catch(() => ({ data: null })),
      ]);
      setCustomers(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.data || []));
      setMaterials(Array.isArray(mRes.data) ? mRes.data : (mRes.data?.data || []));
      setDrivers(Array.isArray(dRes.data) ? dRes.data : (dRes.data?.data || []));
      setTransporters(Array.isArray(tRes.data) ? tRes.data : (tRes.data?.data || []));
      setCustomerPrices(Array.isArray(cpRes.data) ? cpRes.data : (cpRes.data?.data || []));
      if (sRes.data) setCompanySettings(sRes.data);
    } catch (err) {
      const ipcRenderer = (window as any).ipcRenderer;
      if (ipcRenderer) {
        const [cRes, mRes, dRes, tRes] = await Promise.all([
          ipcRenderer.invoke('db-query', 'SELECT * FROM customers'),
          ipcRenderer.invoke('db-query', 'SELECT * FROM materials'),
          ipcRenderer.invoke('db-query', 'SELECT * FROM drivers'),
          ipcRenderer.invoke('db-query', 'SELECT * FROM transporters'),
        ]);
        if (cRes.success) setCustomers(cRes.data);
        if (mRes.success) setMaterials(mRes.data);
        if (dRes.success) setDrivers(dRes.data);
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
    setCompletedWeighment(null);
    if (v.customerId) setSelectedCustomer(v.customerId);
    if (v.driverId) setSelectedDriver(v.driverId);
    if (v.transporterId) setSelectedTransporter(v.transporterId);
    try {
      const res = await api.get('/weighments/active/' + (v.id || v.vehicleNumber));
      const active = res.data;
      if (active) {
        setPendingWeighment(active);
        if (active.customerId) setSelectedCustomer(active.customerId);
        if (active.materialId) setSelectedMaterial(active.materialId);
        if (active.driverId) setSelectedDriver(active.driverId);
        if (active.transporterId) setSelectedTransporter(active.transporterId);
        if (active.loadType) setLoadType(active.loadType);
      } else { setPendingWeighment(null); }
    } catch { setPendingWeighment(null); }
  };

  const handleQuickAdd = () => {
    setQuickAddVehicle({ vehicleNumber: vehicleSearchTerm.trim().toUpperCase(), vehicleType: 'Tipper' });
    setShowQuickAdd(true);
    setShowVehicleDropdown(false);
  };

  const handleQuickAddConfirm = async () => {
    if (!quickAddVehicle.vehicleNumber) return;
    setQuickAddLoading(true);
    try {
      const res = await api.post('/vehicles', { vehicleNumber: quickAddVehicle.vehicleNumber, vehicleType: quickAddVehicle.vehicleType });
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

  const handleCaptureClick = () => {
    if (!selectedVehicle) return;
    setErrorMsg('');
    if (connectionType === 'MANUAL') setShowManualConfirm(true);
    else executeCapture();
  };

  const executeCapture = async () => {
    setIsSubmitting(true);
    try {
      const ew = getEffectiveWeight();
      const ws = connectionType === 'MANUAL' ? 'MANUAL' : 'DEVICE';
      if (!pendingWeighment) {
        if (!selectedMaterial) throw new Error('Please select Material before capturing weight.');
        if (ew <= 0) throw new Error('Weight must be greater than 0.');
        const res = await api.post('/weighments/first-weight', {
          vehicleId: selectedVehicle.id, vehicleNumber: selectedVehicle.vehicleNumber,
          customerId: selectedCustomer || null, materialId: selectedMaterial || null,
          driverId: selectedDriver || null, transporterId: selectedTransporter || null,
          firstWeight: ew, firstWeightSource: ws, loadType, unit: 'KG'
        });
        setCompletedWeighment({ ...res.data, status: 'FIRST_WEIGHT' });
        resetFormState();
        setSuccessMsg('First weight captured! Slip: ' + res.data.slipNumber);
      } else {
        if (ew <= 0) throw new Error('Weight must be > 0.');
        const fw = Number(pendingWeighment.firstWeight);
        if (Math.abs(ew - fw) < 1) throw new Error('Second weight cannot be the same as first weight.');
        const netWeight = Math.abs(ew - fw);
        let pricingType = 'PER_UNIT', billingUnit = 'TON', rate = 0;
        const cp = customerPrices.find(p => p.customerId === selectedCustomer && p.materialId === selectedMaterial && p.isActive);
        const bm = materials.find(m => m.id === selectedMaterial);
        if (cp) { pricingType = cp.pricingType; billingUnit = cp.billingUnit; rate = cp.rate; }
        else if (bm) { pricingType = bm.pricingType || 'PER_UNIT'; billingUnit = bm.billingUnit || 'TON'; rate = bm.defaultRate || 0; }
        let qty = netWeight;
        if (billingUnit === 'TON') qty = netWeight / 1000;
        const amt = pricingType === 'FIXED' ? rate : qty * rate;
        const res = await api.post('/weighments/second-weight', {
          weighmentId: pendingWeighment.id, vehicleId: pendingWeighment.vehicleId, vehicleNumber: pendingWeighment.vehicleNumber,
          secondWeight: ew, secondWeightSource: ws, pricingType, rate, billingUnit, calculatedQuantity: qty, calculatedAmount: amt,
          loadType, customerId: selectedCustomer || null, materialId: selectedMaterial || null, driverId: selectedDriver || null, transporterId: selectedTransporter || null
        });
        setCompletedWeighment({ ...res.data, customer: customers.find(c => c.id === res.data.customerId), material: materials.find(m => m.id === res.data.materialId), driver: drivers.find(d => d.id === res.data.driverId), transporter: transporters.find(t => t.id === res.data.transporterId) });
        resetFormState();
        setSuccessMsg('Weighment complete! Net: ' + netWeight.toLocaleString('en-IN') + ' KG');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to capture weight');
    } finally { setIsSubmitting(false); setShowManualConfirm(false); setManualReason(''); }
  };

  const resetFormState = () => {
    setVehicleSearchTerm(''); setSelectedVehicle(null); setSelectedCustomer(''); setSelectedMaterial('');
    setSelectedDriver(''); setSelectedTransporter(''); setLoadType('LOAD'); setPendingWeighment(null); setManualWeight('');
  };

  const downloadSlipPdf = async (id: string, slip: string) => {
    setSlipDownloading(true);
    const toastId = toast.loading('Generating PDF...');
    try {
      const { buffer, blobUrl, blob } = await fetchWeighmentSlipPdf(id);
      const ipcRenderer = (window as any).ipcRenderer;
      const filename = `WeighbridgeSlip-${slip}.pdf`;

      if (ipcRenderer && buffer) {
        const saveResult = await ipcRenderer.invoke('save-pdf-dialog', {
          buffer: Array.from(new Uint8Array(buffer)),
          defaultFilename: filename
        });
        if (!saveResult.success && saveResult.error && !saveResult.canceled) {
          toast.error('Error saving PDF: ' + saveResult.error, { id: toastId });
        } else if (saveResult.success) {
          toast.success('Slip downloaded successfully', { id: toastId });
        } else {
          toast.dismiss(toastId);
        }
      } else if (blobUrl) {
        if (blob.type === 'text/html') {
          const printWindow = window.open(blobUrl, '_blank');
          if (printWindow) {
            printWindow.onload = () => {
              setTimeout(() => printWindow.print(), 500);
            };
            toast.success('Slip HTML fallback opened for printing', { id: toastId });
          } else {
            toast.error('Popup blocked. Please allow popups to print.', { id: toastId });
          }
        } else {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
          toast.success('Slip downloaded successfully', { id: toastId });
        }
      }
    } catch (err: any) {
      toast.error('Unable to generate slip PDF. Please try again.', { id: toastId });
      console.error(err);
    } finally {
      setSlipDownloading(false);
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
  const transactionMode = pendingWeighment ? 'SECOND_WEIGHT' : 'FIRST_WEIGHT';
  const isCaptureDisabled = !selectedVehicle || isSubmitting || ew <= 0 || (!pendingWeighment && !selectedMaterial) || (!pendingWeighment && connectionType !== 'MANUAL' && !stable);
  const cn = companySettings?.companyName || 'WEIGHBRIDGE';

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Weighment Operation</h1>
            {pendingWeighment ? (
              <div className="flex items-center gap-2 mt-1"><AlertTriangle size={14} className="text-amber-500" /><p className="text-amber-600 font-bold text-sm">Pending — 2nd Weight for {pendingWeighment.vehicleNumber}</p></div>
            ) : <p className="text-slate-500 text-sm mt-1">New Weighment — First Weight</p>}
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
              {!pendingWeighment && <button onClick={resetFormState} className="text-blue-400 hover:text-blue-600"><X size={15} /></button>}
            </div>
          )}
        </div>

        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 transition-opacity ${!selectedVehicle ? 'opacity-40 pointer-events-none' : ''}`}>
          <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Transaction Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5"><User size={12} /> Customer</label>
              <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
                <option value="">-- Select Customer --</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5"><Package size={12} /> Material *</label>
              <select value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
                <option value="">-- Select Material --</option>{materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div><label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5"><User size={12} /> Driver</label>
              <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
                <option value="">-- Select Driver --</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5"><Truck size={12} /> Transporter</label>
              <select value={selectedTransporter} onChange={e => setSelectedTransporter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
                <option value="">-- Select Transporter --</option>{transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
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
            <div className="flex justify-between text-sm"><span className="text-slate-400">First Weight:</span><span className="font-mono text-slate-200">{pendingWeighment ? (pendingWeighment.firstWeight || 0).toLocaleString('en-IN') + ' KG' : '-- KG'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Second Weight:</span><span className="font-mono text-slate-200">{pendingWeighment ? ew.toLocaleString('en-IN') + ' KG' : '-- KG'}</span></div>
            <div className="w-full h-px bg-slate-700 my-0.5" />
            <div className="flex justify-between font-bold"><span className="text-slate-300">Net Weight:</span><span className="font-mono text-cyan-400 text-lg">{pendingWeighment && ew > 0 ? Math.abs(ew - (pendingWeighment.firstWeight || 0)).toLocaleString('en-IN') + ' KG' : '-- KG'}</span></div>
          </div>
        </div>

        <button onClick={handleCaptureClick} disabled={isCaptureDisabled} className={`w-full py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${transactionMode === 'FIRST_WEIGHT' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white`}>
          <Scale size={22} />{isSubmitting ? 'PROCESSING...' : 'CAPTURE ' + transactionMode.replace(/_/g,' ')}
        </button>
        <div className="text-center text-xs text-slate-400">Weight Source: <span className="font-bold text-slate-600">{connectionType}</span></div>
      </div>

      {showQuickAdd && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Plus size={20} className="text-blue-600" /></div><div><h2 className="text-lg font-bold text-slate-800">Create New Vehicle</h2><p className="text-sm text-slate-500">Vehicle not found in master</p></div></div>
            <div className="space-y-3 mb-5">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Number *</label><input type="text" value={quickAddVehicle.vehicleNumber} onChange={e => setQuickAddVehicle({...quickAddVehicle, vehicleNumber: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-bold uppercase focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Type</label><select value={quickAddVehicle.vehicleType} onChange={e => setQuickAddVehicle({...quickAddVehicle, vehicleType: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">{['Tipper','Lorry','Mini Truck','Container','Tractor','Other'].map(t => <option key={t}>{t}</option>)}</select></div>
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
            <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between font-mono"><span className="text-slate-500">Weight:</span><span className="text-2xl font-bold">{ew.toLocaleString('en-IN')} KG</span></div>
            <div className="mb-5"><label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label><textarea value={manualReason} onChange={e => setManualReason(e.target.value)} placeholder="e.g., Device malfunction..." className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400" rows={3} /></div>
            <div className="flex justify-end gap-3"><button onClick={() => setShowManualConfirm(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button><button onClick={executeCapture} disabled={!manualReason.trim() || isSubmitting} className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Confirm'}</button></div>
          </div>
        </div>
      )}

      {completedWeighment && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 overflow-y-auto p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><Save size={19} className="text-green-600" /></div><div><h2 className="text-lg font-bold text-slate-800">{completedWeighment.status === 'FIRST_WEIGHT' ? 'First Weight Captured' : 'Weighment Complete!'}</h2><p className="text-sm text-slate-500">Slip: {completedWeighment.slipNumber || '—'}</p></div></div>
              <div className="flex gap-2">
                <button onClick={() => setCompletedWeighment(null)} className="px-3 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50"><X size={15} /></button>
                <button onClick={() => window.print()} className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-600"><Printer size={15} /> Print</button>
                {completedWeighment.id && <button onClick={() => downloadSlipPdf(completedWeighment.id, completedWeighment.slipNumber || completedWeighment.id)} disabled={slipDownloading} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-50">
                  {slipDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  {slipDownloading ? 'Downloading...' : 'Download PDF'}
                </button>}
              </div>
            </div>
              <div className="p-6 font-sans text-black relative">
                {companySettings?.logoUrl && (
                  <div 
                    className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0"
                    style={{ backgroundImage: `url(${companySettings.logoUrl})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'contain', margin: '20%' }}
                  />
                )}
                <div className="text-center mb-4 pb-4 border-b-2 border-black relative z-10">
                  {companySettings?.logoUrl && (
                    <img src={companySettings.logoUrl} alt="Company Logo" className="w-16 h-16 object-contain mx-auto mb-2" />
                  )}
                  <h1 className="text-xl font-bold uppercase tracking-widest">{cn}</h1>
                {companySettings?.address && <p className="text-xs text-gray-600 mt-1">{companySettings.address}</p>}
                {companySettings?.phone && <p className="text-xs text-gray-600">Tel: {companySettings.phone}</p>}
                <div className="inline-block bg-black text-white px-6 py-1 mt-2 text-sm font-bold tracking-widest">{completedWeighment.status === 'FIRST_WEIGHT' ? 'FIRST WEIGHT RECEIPT' : 'WEIGHBRIDGE SLIP'}</div>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <div><p><b>Slip No:</b> {completedWeighment.slipNumber || '—'}</p><p><b>Vehicle:</b> {completedWeighment.vehicleNumber}</p><p><b>Load Type:</b> {completedWeighment.loadType || '—'}</p></div>
                <div className="text-right"><p><b>Date:</b> {new Date(completedWeighment.firstWeightDate || completedWeighment.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p><p><b>Time:</b> {new Date(completedWeighment.firstWeightDate || completedWeighment.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</p></div>
              </div>
              <div className="border border-black p-3 mb-4 grid grid-cols-2 gap-y-1.5 text-sm">
                <div><b>Customer: </b>{completedWeighment.customer?.name || customers.find(c => c.id === completedWeighment.customerId)?.name || '—'}</div>
                <div><b>Material: </b>{completedWeighment.material?.name || materials.find(m => m.id === completedWeighment.materialId)?.name || '—'}</div>
                <div><b>Driver: </b>{completedWeighment.driver?.name || drivers.find(d => d.id === completedWeighment.driverId)?.name || '—'}</div>
                <div><b>Transporter: </b>{completedWeighment.transporter?.name || transporters.find(t => t.id === completedWeighment.transporterId)?.name || '—'}</div>
              </div>
              <table className="w-full text-sm border-collapse border border-black mb-4">
                <thead><tr className="bg-gray-100"><th className="border border-black p-2 text-left">Description</th><th className="border border-black p-2 text-right">Weight (KG)</th><th className="border border-black p-2 text-right">Source</th></tr></thead>
                <tbody>
                  <tr><td className="border border-black p-2 font-bold">First Weight</td><td className="border border-black p-2 text-right font-mono">{(completedWeighment.firstWeight||0).toLocaleString('en-IN')}</td><td className="border border-black p-2 text-right text-xs">{completedWeighment.firstWeightSource||'—'}</td></tr>
                  <tr><td className="border border-black p-2 font-bold">Second Weight</td><td className="border border-black p-2 text-right font-mono">{completedWeighment.secondWeight!=null?(completedWeighment.secondWeight).toLocaleString('en-IN'):'—'}</td><td className="border border-black p-2 text-right text-xs">{completedWeighment.secondWeightSource||'—'}</td></tr>
                  <tr className="bg-gray-900 text-white"><td className="border border-black p-2 font-bold">NET WEIGHT</td><td className="border border-black p-2 text-right font-mono text-lg font-bold" colSpan={2}>{completedWeighment.netWeight!=null?(completedWeighment.netWeight).toLocaleString('en-IN')+' KG':'—'}</td></tr>
                </tbody>
              </table>
              {completedWeighment.calculatedAmount != null && completedWeighment.calculatedAmount > 0 && (
                <div className="border-2 border-black p-3 mb-4 bg-gray-50 flex justify-between items-center text-sm">
                  <div><p className="text-gray-500 text-xs">Rate: ₹{(completedWeighment.rate||0).toFixed(2)}/{completedWeighment.billingUnit} | Qty: {(completedWeighment.calculatedQuantity||0).toFixed(3)} {completedWeighment.billingUnit}</p></div>
                  <div className="text-right"><p className="text-xs text-gray-500 uppercase">Total Amount</p><p className="text-2xl font-bold">₹{(completedWeighment.calculatedAmount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</p></div>
                </div>
              )}
                <div className="flex justify-end mt-10 pt-4 text-xs text-center">
                  <div><div className="border-t border-black w-32 pt-1 mx-auto">Authorized Signatory</div></div>
                </div>
              <p className="text-center text-gray-400 text-xs mt-3 border-t border-gray-200 pt-2">Computer Generated Weighment Slip</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
