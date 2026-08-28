import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Save, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import apiClient from '../api/client';

const PermitCardSettings = () => {
  const [settings, setSettings] = useState({
    registrationNumber: '',
    registerHolderName: '',
    stockyardLocation: '',
    stockyardSfNo: '',
    stockyardVillage: '',
    stockyardTaluk: '',
    stockyardDistrict: '',
    stockyardValidity: '',
    qrImageUrl: '',
    signatureImageUrl: '',
    sealImageUrl: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/permit-cards/template');
      if (res.data) {
        setSettings({
          registrationNumber: res.data.registrationNumber || '',
          registerHolderName: res.data.registerHolderName || '',
          stockyardLocation: res.data.stockyardLocation || '',
          stockyardSfNo: res.data.stockyardSfNo || '',
          stockyardVillage: res.data.stockyardVillage || '',
          stockyardTaluk: res.data.stockyardTaluk || '',
          stockyardDistrict: res.data.stockyardDistrict || '',
          stockyardValidity: res.data.stockyardValidity || '',
          qrImageUrl: res.data.qrImageUrl || '',
          signatureImageUrl: res.data.signatureImageUrl || '',
          sealImageUrl: res.data.sealImageUrl || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch permit template', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiClient.put('/permit-cards/template', settings);
      alert('Permit Template Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings((prev) => ({ ...prev, [fieldName]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/permit-cards" className="text-gray-500 hover:text-indigo-600 transition-colors p-2 bg-white rounded-full shadow-sm hover:shadow">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Permit Card Template Settings</h1>
        <div className="flex-1"></div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">General Info</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
            <input type="text" name="registrationNumber" value={settings.registrationNumber} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Register Holder Name / Company</label>
            <input type="text" name="registerHolderName" value={settings.registerHolderName} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Stockyard Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" name="stockyardLocation" value={settings.stockyardLocation} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SF.No / Extent</label>
              <input type="text" name="stockyardSfNo" value={settings.stockyardSfNo} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
              <input type="text" name="stockyardVillage" value={settings.stockyardVillage} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taluk</label>
              <input type="text" name="stockyardTaluk" value={settings.stockyardTaluk} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <input type="text" name="stockyardDistrict" value={settings.stockyardDistrict} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validity of Stockyard</label>
            <input type="text" name="stockyardValidity" value={settings.stockyardValidity} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold border-b pb-2 flex items-center gap-2"><ImageIcon size={18} /> Media & Signatures (Provide Base64 or Image URLs)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed QR Code</label>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'qrImageUrl')} className="w-full border rounded px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              {settings.qrImageUrl && <div className="mt-2"><img src={settings.qrImageUrl} alt="QR" className="h-24 object-contain border p-1 rounded" /></div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seal / Stamp</label>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'sealImageUrl')} className="w-full border rounded px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              {settings.sealImageUrl && <div className="mt-2"><img src={settings.sealImageUrl} alt="Seal" className="h-16 object-contain border p-1 rounded" /></div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'signatureImageUrl')} className="w-full border rounded px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              {settings.signatureImageUrl && <div className="mt-2"><img src={settings.signatureImageUrl} alt="Signature" className="h-16 object-contain border p-1 rounded" /></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermitCardSettings;
