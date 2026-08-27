import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Permit Card Template Settings</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed QR Code Image URL</label>
              <input type="text" name="qrImageUrl" value={settings.qrImageUrl} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="data:image/png;base64,..." />
              {settings.qrImageUrl && <img src={settings.qrImageUrl} alt="QR" className="mt-2 h-24 object-contain border p-1" />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seal / Stamp Image URL</label>
              <input type="text" name="sealImageUrl" value={settings.sealImageUrl} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="data:image/png;base64,..." />
              {settings.sealImageUrl && <img src={settings.sealImageUrl} alt="Seal" className="mt-2 h-16 object-contain border p-1" />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Register Holder Signature URL</label>
              <input type="text" name="signatureImageUrl" value={settings.signatureImageUrl} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="data:image/png;base64,..." />
              {settings.signatureImageUrl && <img src={settings.signatureImageUrl} alt="Signature" className="mt-2 h-16 object-contain border p-1" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermitCardSettings;
