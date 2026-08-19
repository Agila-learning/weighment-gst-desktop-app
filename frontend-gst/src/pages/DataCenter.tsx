import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import apiClient from '../api/client';

const DataCenter = () => {
  const [activeTab, setActiveTab] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  
  // Import State
  const [importType, setImportType] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [importMode, setImportMode] = useState<'ADD' | 'UPDATE' | 'ADD_UPDATE'>('ADD');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  
  // Export State
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async (type: string) => {
    window.open(`http://localhost:3000/api/data/template/${type}`, '_blank');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setImportType(type);
      setPreviewData(null);
      setImportResult(null);
      
      const res = await apiClient.post(`/data/preview/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setPreviewData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error processing file');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCommitImport = async () => {
    if (!previewData || !importType) return;
    
    const validRecords = previewData.filter(row => row.status !== 'ERROR').map(r => r.data);
    
    if (validRecords.length === 0) {
      alert('No valid records to import.');
      return;
    }
    
    try {
      setIsImporting(true);
      const fileName = fileInputRef.current?.files?.[0]?.name || 'unknown.xlsx';
      
      const res = await apiClient.post(`/data/commit/${importType}`, {
        mode: importMode,
        records: validRecords,
        fileName
      });
      
      setImportResult(res.data);
      setPreviewData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error importing records');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = (type: string) => {
    const params = new URLSearchParams();
    if (exportStartDate) params.append('startDate', exportStartDate);
    if (exportEndDate) params.append('endDate', exportEndDate);
    
    window.open(`http://localhost:3000/api/data/export/${type}?${params.toString()}`, '_blank');
  };

  const renderImportCard = (title: string, desc: string, type: string) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{desc}</p>
        </div>
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <Upload size={24} />
        </div>
      </div>
      <div className="flex flex-col gap-3 mt-6">
        <button onClick={() => handleDownloadTemplate(type)} className="flex items-center justify-center gap-2 w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
          <Download size={16} /> Download Template
        </button>
        <label className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer">
          <Upload size={16} /> Upload Excel
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => handleFileChange(e, type)} 
          />
        </label>
      </div>
    </div>
  );

  const renderExportCard = (title: string, type: string) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
          <FileSpreadsheet size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">Export as .xlsx format</p>
        </div>
      </div>
      <button onClick={() => handleExport(type)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
        <Download size={16} /> Export
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import / Export</h1>
        <p className="text-gray-500">Centralized hub for bulk data operations using Excel</p>
      </div>

      <div className="flex border-b border-gray-200">
        <button 
          className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 ${activeTab === 'IMPORT' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => { setActiveTab('IMPORT'); setPreviewData(null); setImportResult(null); }}
        >
          Import Data
        </button>
        <button 
          className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 ${activeTab === 'EXPORT' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('EXPORT')}
        >
          Export Data
        </button>
      </div>

      {activeTab === 'IMPORT' && !previewData && !importResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {renderImportCard('Customers', 'Import client details, GSTIN, and billing addresses.', 'customers')}
          {renderImportCard('Materials', 'Import product catalog, HSN/SAC, and tax rates.', 'materials')}
          {renderImportCard('Vehicles', 'Import fleet details, capacities, and transporters.', 'vehicles')}
          {renderImportCard('Drivers', 'Import driver profiles and license details.', 'drivers')}
        </div>
      )}

      {activeTab === 'IMPORT' && previewData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animation-fade-in">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Import Preview <span className="text-sm font-normal text-gray-500">({importType})</span>
              </h2>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-gray-600">Total Rows: <strong>{previewData.length}</strong></span>
                <span className="text-green-600">Valid: <strong>{previewData.filter(r => r.status === 'VALID').length}</strong></span>
                <span className="text-yellow-600">Warnings: <strong>{previewData.filter(r => r.status === 'WARNING').length}</strong></span>
                <span className="text-red-600">Errors: <strong>{previewData.filter(r => r.status === 'ERROR').length}</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Import Mode</label>
                <select 
                  className="px-3 py-1.5 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={importMode}
                  onChange={(e: any) => setImportMode(e.target.value)}
                >
                  <option value="ADD">Add New Records Only</option>
                  <option value="UPDATE">Update Existing Records</option>
                  <option value="ADD_UPDATE">Add New + Update Existing</option>
                </select>
              </div>
              <button 
                onClick={handleCommitImport}
                disabled={isImporting}
                className="mt-4 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isImporting ? 'Importing...' : 'Confirm Import'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-100 text-gray-600 sticky top-0 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Row</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Record Preview (JSON)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{row.rowNumber}</td>
                    <td className="px-4 py-3">
                      {row.status === 'VALID' && <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle size={14}/> Valid</span>}
                      {row.status === 'WARNING' && <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-medium"><AlertCircle size={14}/> Warning</span>}
                      {row.status === 'ERROR' && <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"><XCircle size={14}/> Error</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{row.message}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs truncate max-w-md">{JSON.stringify(row.data)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'IMPORT' && importResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center max-w-2xl mx-auto mt-10">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Completed Successfully</h2>
          <p className="text-gray-600 mb-6">Your excel data has been processed.</p>
          
          <div className="grid grid-cols-4 gap-4 text-center mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-blue-600">{importResult.created}</div>
              <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Created</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-indigo-600">{importResult.updated}</div>
              <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Updated</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-gray-600">{importResult.skipped}</div>
              <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Skipped</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-3xl font-bold text-red-600">{importResult.failed}</div>
              <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Failed</div>
            </div>
          </div>
          
          <button 
            onClick={() => { setImportResult(null); setImportType(null); }}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}

      {activeTab === 'EXPORT' && (
        <div className="pt-4 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">Global Date Range Filter (Optional):</span>
            <input type="date" className="px-3 py-1.5 border border-gray-300 rounded text-sm outline-none" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} />
            <span className="text-gray-400">-</span>
            <input type="date" className="px-3 py-1.5 border border-gray-300 rounded text-sm outline-none" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderExportCard('Invoices & Sales', 'invoices')}
            {renderExportCard('Customers Register', 'customers')}
            {renderExportCard('Materials Catalog', 'materials')}
            {renderExportCard('Vehicles Fleet', 'vehicles')}
            {renderExportCard('Drivers Register', 'drivers')}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataCenter;
