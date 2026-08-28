import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import apiClient from '../api/client';

const CreatePermitCard = () => {
  const [searchParams] = useSearchParams();
  const duplicateId = searchParams.get('duplicateId');
  const navigate = useNavigate();

  const [permit, setPermit] = useState({
    date: new Date().toISOString().split('T')[0],
    dispatchTime: '',
    timeStart: '',
    timeEnd: '',
    vehicleId: '',
    customerId: '',
    materialId: '',
    driverId: '',
    vehicleNumber: '',
    vehicleType: '',
    driverName: '',
    driverMobile: '',
    purchaserName: '',
    purchaserAddress: '',
    purchaserDestination: '',
    purchaserState: '',
    materialName: '',
    quantity: 0,
    quantityUnit: 'MT',
    securityPaperNumber: '',
    transitPassNumber: '',
    bulkTransitPassNumber: '',
    approximateDistance: '',
    driverSignatureUrl: ''
  });

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDropdownData();
    if (duplicateId) {
      fetchDuplicateData(duplicateId);
    }
  }, [duplicateId]);

  const fetchDropdownData = async () => {
    try {
      const [vehRes, cusRes, matRes, driRes] = await Promise.all([
        apiClient.get('/vehicles'),
        apiClient.get('/customers'),
        apiClient.get('/materials'),
        apiClient.get('/drivers')
      ]);
      setVehicles(vehRes.data);
      setCustomers(cusRes.data);
      setMaterials(matRes.data);
      setDrivers(driRes.data);
    } catch (error) {
      console.error('Failed to fetch dropdowns', error);
    }
  };

  const fetchDuplicateData = async (id: string) => {
    try {
      const res = await apiClient.get(`/permit-cards/${id}`);
      if (res.data) {
        const duplicateData = { ...res.data };
        // Remove unique identifiers
        delete duplicateData.id;
        delete duplicateData.createdAt;
        delete duplicateData.updatedAt;
        delete duplicateData.permitReference;

        // Reset date/time and numbers but keep relations
        setPermit({
          ...duplicateData,
          date: new Date().toISOString().split('T')[0],
          dispatchTime: '',
          timeStart: '',
          timeEnd: '',
          securityPaperNumber: '',
          transitPassNumber: ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch duplicate', error);
    }
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const veh = vehicles.find(v => v.id === id);
    if (veh) {
      setPermit(prev => ({
        ...prev,
        vehicleId: veh.id,
        vehicleNumber: veh.vehicleNumber,
        vehicleType: veh.vehicleType || prev.vehicleType,
        driverId: veh.driverId || prev.driverId
      }));
      // Auto-fetch driver if linked
      if (veh.driverId) {
        const driver = drivers.find(d => d.id === veh.driverId);
        if (driver) {
          setPermit(prev => ({
            ...prev,
            driverName: driver.name,
            driverMobile: driver.mobile || '',
            driverSignatureUrl: driver.signatureImageUrl || ''
          }));
        }
      }
    }
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const cus = customers.find(c => c.id === id);
    if (cus) {
      setPermit(prev => ({
        ...prev,
        customerId: cus.id,
        purchaserName: cus.name,
        purchaserAddress: cus.address || '',
        purchaserState: cus.stateName || ''
      }));
    }
  };

  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const mat = materials.find(m => m.id === id);
    if (mat) {
      setPermit(prev => ({
        ...prev,
        materialId: mat.id,
        materialName: mat.name,
        quantityUnit: mat.unit || 'MT'
      }));
    }
  };

  const handleDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const drv = drivers.find(d => d.id === id);
    if (drv) {
      setPermit(prev => ({
        ...prev,
        driverId: drv.id,
        driverName: drv.name,
        driverMobile: drv.mobile || '',
        driverSignatureUrl: drv.signatureImageUrl || ''
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPermit(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiClient.post('/permit-cards', permit);
      alert('Permit Card Created Successfully!');
      navigate('/permit-cards');
    } catch (error) {
      console.error(error);
      alert('Failed to save permit card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/permit-cards" className="text-gray-500 hover:text-indigo-600 transition-colors p-2 bg-white rounded-full shadow-sm hover:shadow">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">
          {duplicateId ? 'Duplicate Permit Card' : 'Create New Permit Card'}
        </h1>
        <div className="flex-1"></div>
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Record'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dispatch & Permit Details */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Dispatch & Permit Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" name="date" value={permit.date} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dispatch Time</label>
              <input type="time" name="dispatchTime" value={permit.dispatchTime} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Time Start</label>
              <input type="time" name="timeStart" value={permit.timeStart} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Time End</label>
              <input type="time" name="timeEnd" value={permit.timeEnd} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bulk Transit Pass Number</label>
            <input type="text" name="bulkTransitPassNumber" value={permit.bulkTransitPassNumber} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Security Paper Serial No</label>
              <input type="text" name="securityPaperNumber" value={permit.securityPaperNumber} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Transit Pass Serial No</label>
              <input type="text" name="transitPassNumber" value={permit.transitPassNumber} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
          </div>
        </div>

        {/* Purchaser Details */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Purchaser Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Existing Customer (Optional)</label>
            <select value={permit.customerId} onChange={handleCustomerChange} className="w-full border rounded px-3 py-2 mt-1">
              <option value="">-- Select Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name of Purchaser *</label>
            <input type="text" name="purchaserName" value={permit.purchaserName} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input type="text" name="purchaserAddress" value={permit.purchaserAddress} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination City/Town</label>
              <input type="text" name="purchaserDestination" value={permit.purchaserDestination} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State</label>
              <input type="text" name="purchaserState" value={permit.purchaserState} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
          </div>
        </div>

        {/* Vehicle & Driver */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Vehicle & Driver</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Vehicle</label>
              <select value={permit.vehicleId} onChange={handleVehicleChange} className="w-full border rounded px-3 py-2 mt-1">
                <option value="">-- Select Vehicle --</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle Number *</label>
              <input type="text" name="vehicleNumber" value={permit.vehicleNumber} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" required />
            </div>
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
             <input type="text" name="vehicleType" value={permit.vehicleType} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700">Approximate Distance</label>
             <input type="text" name="approximateDistance" value={permit.approximateDistance} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Driver</label>
              <select value={permit.driverId} onChange={handleDriverChange} className="w-full border rounded px-3 py-2 mt-1">
                <option value="">-- Select Driver --</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Driver Name</label>
              <input type="text" name="driverName" value={permit.driverName} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700">Driver Mobile</label>
             <input type="text" name="driverMobile" value={permit.driverMobile} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
          </div>
        </div>

        {/* Material Details */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Material Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Material</label>
            <select value={permit.materialId} onChange={handleMaterialChange} className="w-full border rounded px-3 py-2 mt-1">
              <option value="">-- Select Material --</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700">Mineral Name *</label>
             <input type="text" name="materialName" value={permit.materialName} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity *</label>
              <input type="number" name="quantity" value={permit.quantity} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" required min="0.01" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <input type="text" name="quantityUnit" value={permit.quantityUnit} onChange={handleChange} className="w-full border rounded px-3 py-2 mt-1" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreatePermitCard;
