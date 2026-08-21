import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Save, Settings, Printer, Scale, AlertTriangle, Truck, User, Package } from 'lucide-react';
import { useWeighbridgeStore } from '../services/WeighbridgeDeviceService';
import { useSyncStore } from '../services/SyncService';
import { v4 as uuidv4 } from 'uuid';
import { logAudit } from '../utils/audit';

export default function Weighment() {
  const { currentWeight, status: hwStatus, connectionType, stable } = useWeighbridgeStore();
  const location = useLocation();
  
  const [, setVehicleNo] = useState('');
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [, setSearchError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState('');
  const [transporters, setTransporters] = useState<any[]>([]);
  const [customerPrices, setCustomerPrices] = useState<any[]>([]);
  const [loadType, setLoadType] = useState('LOAD');
  
  // Pending Weighment State
  const [pendingWeighment, setPendingWeighment] = useState<any>(null);
  
  // Completed Weighment State (for printing)
  const [completedWeighment, setCompletedWeighment] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Manual mode state
  const [showManualConfirm, setShowManualConfirm] = useState(false);
  const [manualReason, setManualReason] = useState('');

  const { syncStatus } = useSyncStore();

  const fetchMasters = async () => {
    const ipcRenderer = (window as any).ipcRenderer;
    if (!ipcRenderer) return;
    try {
      const [cRes, mRes, dRes, vRes, tRes, cpRes] = await Promise.all([
          ipcRenderer.invoke('db-query', 'SELECT * FROM customers'),
          ipcRenderer.invoke('db-query', 'SELECT * FROM materials'),
          ipcRenderer.invoke('db-query', 'SELECT * FROM drivers'),
          ipcRenderer.invoke('db-query', 'SELECT * FROM vehicles'),
          ipcRenderer.invoke('db-query', 'SELECT * FROM transporters'),
          ipcRenderer.invoke('db-query', 'SELECT * FROM customer_material_prices')
        ]);
        if (cRes.success) setCustomers(cRes.data);
        if (mRes.success) setMaterials(mRes.data);
        if (dRes.success) setDrivers(dRes.data);
        if (vRes.success) setVehicles(vRes.data);
        if (tRes.success) setTransporters(tRes.data);
        if (cpRes.success) setCustomerPrices(cpRes.data);
    } catch (err) {
      console.error("Failed to load master data", err);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, [syncStatus]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMasters();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVehicleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVehicleSelect = async (v: any) => {
    setVehicleNo(v.vehicleNumber);
    setVehicleSearchTerm(v.vehicleNumber);
    setSelectedVehicle(v);
    setShowVehicleDropdown(false);
    setSearchError(null);
    setCompletedWeighment(null);

    // Auto-populate mapped fields (if any)
    if (v.customerId) setSelectedCustomer(v.customerId);
    if (v.driverId) setSelectedDriver(v.driverId);
    if (v.transporterId) setSelectedTransporter(v.transporterId);

    // Check for pending weighment
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      if (!ipcRenderer) return;
      
      const res = await ipcRenderer.invoke('db-query', "SELECT * FROM weighments WHERE vehicleNumber = ? AND status = 'FIRST_WEIGHT'", [v.vehicleNumber]);
      if (res.success && res.data && res.data.length > 0) {
        setPendingWeighment(res.data[0]);
        // Lock fields to match pending transaction
        if (res.data[0].customerId) setSelectedCustomer(res.data[0].customerId);
        if (res.data[0].materialId) setSelectedMaterial(res.data[0].materialId);
        if (res.data[0].driverId) setSelectedDriver(res.data[0].driverId);
        if (res.data[0].transporterId) setSelectedTransporter(res.data[0].transporterId);
        if (res.data[0].loadType) setLoadType(res.data[0].loadType);
      } else {
        setPendingWeighment(null);
      }
    } catch (err) {
      console.error('Error checking pending weighment', err);
    }
  };

  const filteredVehicles = vehicles.filter(v => v.vehicleNumber.toLowerCase().includes(vehicleSearchTerm.toLowerCase())).slice(0, 5);

  useEffect(() => {
    if (location.state?.vehicleNumber && vehicles.length > 0 && !selectedVehicle) {
      const v = vehicles.find(v => v.vehicleNumber === location.state.vehicleNumber);
      if (v) {
        handleVehicleSelect(v);
      } else {
        // If it's a manual entry not in master
        setVehicleNo(location.state.vehicleNumber);
        setVehicleSearchTerm(location.state.vehicleNumber);
        setSelectedVehicle({ vehicleNumber: location.state.vehicleNumber });
        
        // Directly trigger pending check
        const ipcRenderer = (window as any).ipcRenderer;
        if (ipcRenderer) {
          ipcRenderer.invoke('db-query', "SELECT * FROM weighments WHERE vehicleNumber = ? AND status = 'FIRST_WEIGHT'", [location.state.vehicleNumber])
            .then((res: any) => {
              if (res.success && res.data && res.data.length > 0) {
                setPendingWeighment(res.data[0]);
                if (res.data[0].customerId) setSelectedCustomer(res.data[0].customerId);
                if (res.data[0].materialId) setSelectedMaterial(res.data[0].materialId);
                if (res.data[0].driverId) setSelectedDriver(res.data[0].driverId);
                if (res.data[0].transporterId) setSelectedTransporter(res.data[0].transporterId);
                if (res.data[0].loadType) setLoadType(res.data[0].loadType);
              }
            });
        }
      }
      
      // Clear state to avoid loops on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state, vehicles]);

  const handleCaptureClick = () => {
    if (!selectedVehicle) return;
    if (connectionType === 'MANUAL') {
      setShowManualConfirm(true);
    } else {
      executeCapture();
    }
  };

  const executeCapture = async () => {
    setIsSubmitting(true);
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      if (!ipcRenderer) return;

      const now = new Date().toISOString();
      const weightSource = connectionType === 'MANUAL' ? 'MANUAL' : 'DEVICE';

      if (!pendingWeighment) {
        // FIRST WEIGHT
        if (!selectedMaterial || currentWeight <= 0) {
          throw new Error("Please select Material and ensure weight is > 0.");
        }

        const id = uuidv4();
        const slipNumber = `WB-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        
        const q = `
          INSERT INTO weighments 
          (id, slipNumber, vehicleId, vehicleNumber, customerId, materialId, driverId, transporterId, firstWeight, firstWeightDate, firstWeightSource, status, syncStatus, date, createdAt, updatedAt, loadType)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
          id, slipNumber, selectedVehicle.id, selectedVehicle.vehicleNumber, 
          selectedCustomer || null, selectedMaterial || null, selectedDriver || null, selectedTransporter || null,
          currentWeight, now, weightSource, 'FIRST_WEIGHT', 'PENDING_SYNC', now, now, now, loadType
        ];

        const res = await ipcRenderer.invoke('db-query', q, params);
        if (!res.success) throw new Error(res.error);
        
        await logAudit(
          'CREATE', 
          'WEIGHMENT', 
          id, 
          `Captured FIRST WEIGHT of ${currentWeight} KG for vehicle ${selectedVehicle.vehicleNumber}`
        );

        useSyncStore.getState().updatePendingCount();

        const newW = {
          id, slipNumber, vehicleNumber: selectedVehicle.vehicleNumber, 
          customerId: selectedCustomer, materialId: selectedMaterial, driverId: selectedDriver,
          firstWeight: currentWeight, firstWeightDate: now,
          status: 'FIRST_WEIGHT'
        };
        setCompletedWeighment(newW); // Show slip printing option
        
        // Reset state for new vehicle
        resetFormState();
        
      } else {
        // SECOND WEIGHT
        if (currentWeight <= 0) {
           throw new Error("Weight must be > 0.");
        }
        
        if (Number(currentWeight) === Number(pendingWeighment.firstWeight)) {
           throw new Error("Second weight cannot be identical to the first weight.");
        }
        
        const netW = Math.abs(currentWeight - pendingWeighment.firstWeight);
        
        let pricingType = 'PER_UNIT';
        let billingUnit = 'TON';
        let rate = 0;

        const customPrice = customerPrices.find(p => p.customerId === pendingWeighment.customerId && p.materialId === pendingWeighment.materialId && p.isActive === 1);
        const baseMaterial = materials.find(m => m.id === pendingWeighment.materialId);

        if (customPrice) {
          pricingType = customPrice.pricingType;
          billingUnit = customPrice.billingUnit;
          rate = customPrice.rate;
        } else if (baseMaterial) {
          pricingType = baseMaterial.pricingType || 'PER_UNIT';
          billingUnit = baseMaterial.billingUnit || 'TON';
          rate = baseMaterial.defaultRate || 0;
        }

        let calculatedQuantity = netW;
        if (billingUnit === 'TON') calculatedQuantity = netW / 1000;
        
        let calculatedAmount = 0;
        if (pricingType === 'FIXED') {
          calculatedAmount = rate;
        } else {
          calculatedAmount = calculatedQuantity * rate;
        }
        
        const q = "UPDATE weighments SET secondWeight = ?, secondWeightDate = ?, secondWeightSource = ?, netWeight = ?, status = 'COMPLETED', syncStatus = 'PENDING_SYNC', updatedAt = ?, pricingType = ?, rate = ?, calculatedQuantity = ?, calculatedAmount = ? WHERE id = ?";
        const res = await ipcRenderer.invoke('db-query', q, [currentWeight, now, weightSource, netW, now, pricingType, rate, calculatedQuantity, calculatedAmount, pendingWeighment.id]);
        
        if (!res.success) throw new Error(res.error);

        await logAudit(
          'UPDATE', 
          'WEIGHMENT', 
          pendingWeighment.id, 
          `Captured SECOND WEIGHT of ${currentWeight} KG. Net Weight: ${netW} KG for vehicle ${pendingWeighment.vehicleNumber}`
        );

        useSyncStore.getState().updatePendingCount();
        
        setCompletedWeighment({
          ...pendingWeighment,
          secondWeight: currentWeight,
          secondWeightDate: now,
          netWeight: netW,
          status: 'COMPLETED',
          updatedAt: now,
          pricingType,
          rate,
          calculatedQuantity,
          calculatedAmount
        });

        // Reset state
        resetFormState();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to capture weight');
    } finally {
      setIsSubmitting(false);
      setShowManualConfirm(false);
      setManualReason('');
    }
  };

  const resetFormState = () => {
    setVehicleNo('');
    setVehicleSearchTerm('');
    setSelectedVehicle(null);
    setSelectedCustomer('');
    setSelectedMaterial('');
    setSelectedDriver('');
    setSelectedTransporter('');
    setLoadType('LOAD');
    setPendingWeighment(null);
  };

  const printSlip = () => {
    window.print();
  };

  const transactionMode = pendingWeighment ? 'SECOND_WEIGHT' : 'FIRST_WEIGHT';
  const isCaptureDisabled = !selectedVehicle || (!stable && connectionType !== 'MANUAL') || isSubmitting || currentWeight <= 0 || (!pendingWeighment && !selectedMaterial);

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 print:p-0 print:m-0 print:max-w-none">
      
      {/* LEFT COLUMN: Input & Status */}
      <div className="flex-1 space-y-6 print:hidden">
        
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Weighment Operation</h1>
            {pendingWeighment && (
              <div className="flex items-center space-x-2 mt-1">
                <AlertTriangle size={16} className="text-amber-500" />
                <p className="text-amber-600 font-bold text-sm">Pending Weighment Found - Processing Second Weight</p>
              </div>
            )}
            {!pendingWeighment && (
              <p className="text-slate-500 text-sm mt-1">New Weighment - Processing First Weight</p>
            )}
          </div>
          <div className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 ${
            hwStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <Settings size={18} />
            <span>{hwStatus} ({connectionType})</span>
          </div>
        </div>

        {/* Vehicle Search */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="text-slate-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-700">Vehicle Identification</h2>
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input 
              type="text"
              value={vehicleSearchTerm}
              onChange={(e) => {
                setVehicleSearchTerm(e.target.value.toUpperCase());
                setShowVehicleDropdown(true);
                if (e.target.value === '') resetFormState();
              }}
              onFocus={() => setShowVehicleDropdown(true)}
              placeholder="Search Vehicle (e.g. TN37...)"
              className="w-full pl-10 pr-4 py-3 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase font-bold text-slate-800 shadow-inner"
            />
            {showVehicleDropdown && vehicleSearchTerm && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {filteredVehicles.length > 0 ? (
                  filteredVehicles.map(v => (
                    <div 
                      key={v.id} 
                      onClick={() => handleVehicleSelect(v)}
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                    >
                      <span className="font-bold text-slate-700">{v.vehicleNumber}</span>
                      <span className="text-xs text-slate-400">{v.vehicleType || 'Unknown Type'}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-4 text-slate-500 text-sm text-center">
                    <p className="mb-2">No vehicle found.</p>
                    <button 
                      onClick={async () => {
                        try {
                          const newId = 'V' + Date.now();
                          const q = 'INSERT INTO vehicles (id, vehicleNumber, tareWeight) VALUES (?, ?, ?)';
                          const res = await (window as any).ipcRenderer.invoke('db-query', q, [newId, vehicleSearchTerm, 0]);
                          if (res.success) {
                            const newV = { id: newId, vehicleNumber: vehicleSearchTerm, tareWeight: 0 };
                            setVehicles([...vehicles, newV]);
                            handleVehicleSelect(newV);
                          }
                        } catch (e) {
                          alert('Failed to quick add vehicle');
                        }
                      }}
                      className="w-full py-2 bg-primary-50 text-primary-600 font-bold rounded-lg border border-primary-100 hover:bg-primary-100 transition-colors"
                    >
                      + Quick Add "{vehicleSearchTerm}"
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Transaction Details */}
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-opacity ${!selectedVehicle ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                <User size={16} className="text-slate-400" /> Customer
              </label>
              <select 
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                disabled={!!pendingWeighment}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">-- Select Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                <Package size={16} className="text-slate-400" /> Material *
              </label>
              <select 
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                disabled={!!pendingWeighment}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">-- Select Material --</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                <User size={16} className="text-slate-400" /> Driver
              </label>
              <select 
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                disabled={!!pendingWeighment}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">-- Select Driver --</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                <Truck size={16} className="text-slate-400" /> Transporter
              </label>
              <select 
                value={selectedTransporter}
                onChange={(e) => setSelectedTransporter(e.target.value)}
                disabled={!!pendingWeighment}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">-- Select Transporter --</option>
                {transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="mt-6">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                <Package size={16} className="text-slate-400" /> Load Type *
              </label>
              <div className="flex gap-4">
                {['LOAD', 'EMPTY', 'RETURN', 'OTHER'].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="loadType" 
                      value={type} 
                      checked={loadType === type} 
                      onChange={(e) => setLoadType(e.target.value)}
                      disabled={!!pendingWeighment}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{type}</span>
                  </label>
                ))}
              </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Weight Display & Action */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6 print:hidden">
        
        {/* Live Weight Box */}
        <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
          
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-400 text-xs font-mono tracking-widest uppercase">Current Weight</span>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
              stable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 animate-pulse'
            }`}>
              <div className={`w-2 h-2 rounded-full ${stable ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
              {stable ? 'STABLE' : 'UNSTABLE'}
            </div>
          </div>

          <div className="flex items-end justify-center gap-2 font-mono mb-8">
            <span className={`text-6xl font-bold tracking-tight ${stable ? 'text-cyan-400' : 'text-slate-500'}`}>
              {currentWeight}
            </span>
            <span className="text-2xl text-cyan-600 font-bold mb-1">KG</span>
          </div>

          {/* Weight Context (Pending Info) */}
          <div className="bg-slate-800/50 rounded-lg p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">First Weight:</span>
              <span className="font-mono text-slate-200">{pendingWeighment ? `${pendingWeighment.firstWeight} KG` : '-- KG'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Second Weight:</span>
              <span className="font-mono text-slate-200">{pendingWeighment ? `${currentWeight} KG` : '-- KG'}</span>
            </div>
            <div className="w-full h-px bg-slate-700 my-1"></div>
            <div className="flex justify-between font-bold">
              <span className="text-slate-300">Net Weight:</span>
              <span className="font-mono text-cyan-400 text-lg">
                {pendingWeighment ? `${Math.abs(currentWeight - pendingWeighment.firstWeight)} KG` : '-- KG'}
              </span>
            </div>
          </div>
        </div>

        {/* Capture Button */}
        <button 
          onClick={handleCaptureClick}
          disabled={isCaptureDisabled}
          className="w-full py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed shadow-lg"
          style={{
            backgroundColor: isCaptureDisabled ? '#94a3b8' : (transactionMode === 'FIRST_WEIGHT' ? '#2563eb' : '#16a34a'),
            color: '#ffffff'
          }}
        >
          <Scale size={24} />
          {isSubmitting ? 'PROCESSING...' : `CAPTURE ${transactionMode.replace('_', ' ')}`}
        </button>

      </div>

      {/* MANUAL OVERRIDE MODAL */}
      {showManualConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 print:hidden backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertTriangle size={24} />
              <h2 className="text-xl font-bold">Manual Weight Entry</h2>
            </div>
            <p className="text-slate-600 mb-6">You are capturing a weight manually while the device is not providing an automatic reading. This action will be logged.</p>
            
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center font-mono">
              <span className="text-slate-500">Weight to Record:</span>
              <span className="text-2xl font-bold text-slate-800">{currentWeight} KG</span>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for manual entry *</label>
              <textarea 
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder="e.g., Indicator cable damaged..."
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                rows={3}
              ></textarea>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowManualConfirm(false)} 
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeCapture}
                disabled={!manualReason.trim() || isSubmitting}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Confirm Manual Weight'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT SLIP OVERLAY (Visible on Print or when completed) */}
      {completedWeighment && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 print:static print:bg-white print:flex print:items-start print:justify-start overflow-y-auto p-4">
          
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl p-8 print:shadow-none print:w-full print:max-w-none print:p-0">
            {/* Screen Actions (Hidden on Print) */}
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Save size={20} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Weighment Saved</h2>
                  <p className="text-sm text-slate-500">Transaction {completedWeighment.slipNumber}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setCompletedWeighment(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Close
                </button>
                <button 
                  onClick={printSlip}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium flex items-center gap-2 shadow-sm"
                >
                  <Printer size={18} /> Print Slip
                </button>
              </div>
            </div>

            {/* Actual Slip Content */}
            <div className="slip-content font-sans text-black">
              <div className="text-center mb-6 flex flex-col items-center">
                <img src="/icon.png" alt="FIC Logo" className="w-16 h-16 mb-2 print:block" />
                <h1 className="text-2xl font-bold uppercase tracking-wider">FIC WEIGHBRIDGE</h1>
                <p className="text-sm">123 Industrial Area, State, India</p>
                <h2 className="text-lg font-bold mt-4 border-b-2 border-black inline-block pb-1 uppercase tracking-widest">
                  {completedWeighment.status === 'FIRST_WEIGHT' ? 'First Weight Slip' : 'Final Weighment Slip'}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p><span className="font-bold">Slip No:</span> {completedWeighment.slipNumber}</p>
                  <p><span className="font-bold">Vehicle No:</span> {completedWeighment.vehicleNumber}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">Date:</span> {new Date(completedWeighment.firstWeightDate || completedWeighment.updatedAt).toLocaleDateString()}</p>
                  <p><span className="font-bold">Time:</span> {new Date(completedWeighment.firstWeightDate || completedWeighment.updatedAt).toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="border border-black p-4 mb-6 text-sm grid grid-cols-2 gap-y-3">
                <div className="col-span-2 border-b border-gray-300 pb-2 mb-2"><span className="font-bold inline-block w-32">Customer:</span> {customers.find(c => c.id === completedWeighment.customerId)?.name || '-'}</div>
                <div className="col-span-2 border-b border-gray-300 pb-2 mb-2"><span className="font-bold inline-block w-32">Material:</span> {materials.find(m => m.id === completedWeighment.materialId)?.name || '-'}</div>
                <div><span className="font-bold inline-block w-32">Driver:</span> {drivers.find(d => d.id === completedWeighment.driverId)?.name || '-'}</div>
                <div><span className="font-bold inline-block w-32">Load Type:</span> {completedWeighment.netWeight ? 'Completed' : 'Pending'}</div>
              </div>

              <table className="w-full mb-8 text-sm border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2 text-left">Description</th>
                    <th className="border border-black p-2 text-right">Weight (KG)</th>
                    <th className="border border-black p-2 text-right">Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2 font-bold">First Weight</td>
                    <td className="border border-black p-2 text-right font-mono text-lg">{completedWeighment.firstWeight}</td>
                    <td className="border border-black p-2 text-right">{new Date(completedWeighment.firstWeightDate).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-bold">Second Weight</td>
                    <td className="border border-black p-2 text-right font-mono text-lg">{completedWeighment.secondWeight || '-'}</td>
                    <td className="border border-black p-2 text-right">{completedWeighment.secondWeightDate ? new Date(completedWeighment.secondWeightDate).toLocaleString() : '-'}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-bold bg-gray-100">Net Weight</td>
                    <td className="border border-black p-2 text-right font-mono text-xl font-bold bg-gray-100">{completedWeighment.netWeight || '-'}</td>
                    <td className="border border-black p-2 text-right bg-gray-100"></td>
                  </tr>
                </tbody>
              </table>

              {completedWeighment.status === 'COMPLETED' && completedWeighment.rate > 0 && (
                <div className="border border-black p-4 mb-8 text-sm grid grid-cols-2 gap-y-2 bg-gray-50">
                  <div className="col-span-2 text-center font-bold border-b border-gray-300 pb-2 mb-2">Pricing Details</div>
                  <div><span className="font-bold inline-block w-32">Pricing Type:</span> {completedWeighment.pricingType}</div>
                  <div><span className="font-bold inline-block w-32">Rate (₹):</span> {completedWeighment.rate.toFixed(2)}</div>
                  <div><span className="font-bold inline-block w-32">Quantity:</span> {completedWeighment.calculatedQuantity?.toFixed(3)}</div>
                  <div className="text-lg text-right pr-4"><span className="font-bold">Total (₹):</span> {completedWeighment.calculatedAmount?.toFixed(2)}</div>
                </div>
              )}

              <div className="flex justify-between items-end mt-16 pt-4 text-sm font-bold">
                <div className="text-center">
                  <div className="border-t border-black w-40 pt-1">Operator Signature</div>
                </div>
                <div className="text-center">
                  <div className="border-t border-black w-40 pt-1">Driver Signature</div>
                </div>
              </div>

              <div className="text-center text-xs mt-8 pt-4 border-t border-gray-300 text-gray-500">
                Computer Generated Weighment Slip
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
