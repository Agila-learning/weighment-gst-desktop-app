import { Printer, Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { fetchWeighmentSlipPdf } from '../utils/pdfHelper';
import toast from 'react-hot-toast';

export default function WeighmentSlip({ weighment, onClose }: { weighment: any, onClose: () => void }) {
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    api.get('/settings/company').then(res => setCompanySettings(res.data)).catch(console.error);
  }, []);

  if (!weighment) return null;

  const [isDownloading, setIsDownloading] = useState(false);
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    const toastId = toast.loading('Generating PDF...');
    try {
      const { buffer, blobUrl, blob } = await fetchWeighmentSlipPdf(weighment.id);
      const ipcRenderer = (window as any).ipcRenderer;
      const filename = `WeighbridgeSlip-${weighment.slipNumber || weighment.id}.pdf`;

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
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:hidden">
          <h2 className="text-lg font-bold text-slate-800">Print Weighment Slip</h2>
          <div className="flex space-x-2">
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center text-sm font-medium"
            >
              <Printer size={16} className="mr-2" /> Print
            </button>
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium disabled:opacity-50"
            >
              {isDownloading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto bg-white relative" id="printable-slip">
          {/* Watermark */}
          {companySettings?.logoUrl && (
            <div 
              className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0"
              style={{ backgroundImage: `url(${companySettings.logoUrl})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'contain', margin: '20%' }}
            />
          )}
          
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #printable-slip, #printable-slip * { visibility: visible; }
              #printable-slip { position: absolute; left: 0; top: 0; width: 100%; }
            }
          `}</style>
          
          <div className="text-center mb-8 border-b-2 border-slate-800 pb-6 flex flex-col items-center relative z-10">
            {companySettings?.logoUrl ? (
              <img src={companySettings.logoUrl} alt="Company Logo" className="w-16 h-16 object-contain mb-2" />
            ) : (
              <img src="/icon.png" alt="FIC Logo" className="w-16 h-16 object-contain mb-2" />
            )}
            <h1 className="text-3xl font-black text-slate-900 mb-1">{companySettings?.companyName || 'FIC WEIGHBRIDGE'}</h1>
            <p className="text-sm text-slate-600">{companySettings?.address || '123 Industrial Estate, Main Road, City - 600001'}</p>
            <p className="text-sm text-slate-600">Phone: {companySettings?.phone || '+91 98765 43210'}</p>
            <div className="mt-4 inline-block px-4 py-1 border-2 border-slate-800 rounded font-bold tracking-widest uppercase">
              Weighment Slip
            </div>
          </div>

          <div className="flex justify-between mb-6 text-sm">
            <div>
              <p><span className="font-semibold w-24 inline-block">Slip No</span>: <span className="font-mono text-base font-bold">{weighment.slipNumber}</span></p>
              <p><span className="font-semibold w-24 inline-block">Date</span>: {new Date(weighment.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p><span className="font-semibold w-24 inline-block">Vehicle No</span>: <span className="font-bold text-lg">{weighment.vehicleNumber}</span></p>
              <p><span className="font-semibold w-24 inline-block">Load Type</span>: <span className="font-bold">{weighment.loadType || 'N/A'}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
            <div className="border border-slate-300 p-3 rounded">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Customer</p>
              <p className="font-bold text-slate-800">{weighment.customer?.name || weighment.customerName || 'N/A'}</p>
            </div>
            <div className="border border-slate-300 p-3 rounded">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Material</p>
              <p className="font-bold text-slate-800">{weighment.material?.name || weighment.materialName || 'N/A'}</p>
            </div>
            <div className="border border-slate-300 p-3 rounded">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Driver</p>
              <p className="font-bold text-slate-800">{weighment.driver?.name || weighment.driverName || 'N/A'}</p>
            </div>
            <div className="border border-slate-300 p-3 rounded">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Transporter</p>
              <p className="font-bold text-slate-800">{weighment.transporter?.name || weighment.transporterName || 'N/A'}</p>
            </div>
          </div>

          <table className="w-full text-sm border-collapse border border-slate-400 mb-12">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 p-2 text-left">Weight Type</th>
                <th className="border border-slate-400 p-2 text-right">Gross (KG)</th>
                <th className="border border-slate-400 p-2 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-400 p-2 font-medium">First Weight</td>
                <td className="border border-slate-400 p-2 text-right font-mono">{weighment.firstWeight}</td>
                <td className="border border-slate-400 p-2 text-right">{new Date(weighment.firstWeightDate).toLocaleString()}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 p-2 font-medium">Second Weight</td>
                <td className="border border-slate-400 p-2 text-right font-mono">{weighment.secondWeight}</td>
                <td className="border border-slate-400 p-2 text-right">{new Date(weighment.secondWeightDate).toLocaleString()}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-400 p-3 font-bold text-lg">NET WEIGHT</td>
                <td className="border border-slate-400 p-3 text-right">
                  <span className="font-mono font-bold text-xl">{weighment.netWeight}</span> KG<br/>
                  <span className="text-sm text-slate-500 font-bold">{(weighment.netWeight / 1000).toFixed(3)} TON</span>
                </td>
                <td className="border border-slate-400 p-3 text-right font-bold"></td>
              </tr>
            </tbody>
          </table>

          {weighment.status === 'COMPLETED' && weighment.rate > 0 && (
            <div className="border border-slate-400 mb-12 text-sm overflow-hidden">
              <div className="text-center font-bold border-b border-slate-400 p-2 uppercase bg-slate-200">Pricing Details</div>
              <div className="grid grid-cols-4 divide-x divide-slate-400 bg-slate-50">
                <div className="p-3"><span className="block text-xs text-slate-500 uppercase mb-1">Pricing Type</span> <span className="font-bold">{weighment.pricingType}</span></div>
                <div className="p-3"><span className="block text-xs text-slate-500 uppercase mb-1">Rate (₹)</span> <span className="font-bold">{Number(weighment.rate).toFixed(2)}</span></div>
                <div className="p-3"><span className="block text-xs text-slate-500 uppercase mb-1">Quantity</span> <span className="font-bold">{Number(weighment.calculatedQuantity).toFixed(3)} {weighment.billingUnit}</span></div>
                <div className="p-3 bg-slate-100 flex flex-col justify-center items-end"><span className="block text-xs text-slate-500 uppercase mb-1">Total Amount (₹)</span> <span className="font-bold text-lg">{Number(weighment.calculatedAmount).toFixed(2)}</span></div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-16 pt-8 text-sm border-t border-slate-200">
            <div className="text-center">
              <p className="mb-8 font-semibold">Authorized</p>
              <p className="border-t border-slate-400 pt-1 w-40">Operator Signature</p>
            </div>
          </div>
          
          <div className="text-center text-xs text-slate-400 mt-8">
            Generated by Weighbridge System
          </div>
        </div>
      </div>
    </div>
  );
}
