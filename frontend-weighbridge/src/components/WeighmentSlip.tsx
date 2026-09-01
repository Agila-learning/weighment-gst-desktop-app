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
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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

        <div className="p-6 overflow-y-auto bg-white relative font-mono text-sm" id="printable-slip">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #printable-slip, #printable-slip * { visibility: visible; }
              #printable-slip { position: absolute; left: 0; top: 0; width: 100%; max-width: 300px; margin: 0 auto; }
            }
          `}</style>
          
          <div className="text-center mb-4 border-b border-dashed border-slate-800 pb-4">
            <h1 className="text-lg font-bold uppercase">{companySettings?.companyName || 'WEIGHBRIDGE'}</h1>
            <p className="text-xs">{companySettings?.address}</p>
            <p className="text-xs">Ph: {companySettings?.phone}</p>
            <div className="mt-2 font-bold uppercase">{weighment.status === 'COMPLETED' ? 'WEIGHBRIDGE SLIP' : 'WEIGHMENT RECEIPT'}</div>
          </div>

          <div className="mb-4 text-xs">
            <div className="flex justify-between mb-1"><span>Slip No:</span> <strong>{weighment.slipNumber}</strong></div>
            <div className="flex justify-between mb-1"><span>Date:</span> <strong>{new Date(weighment.createdAt).toLocaleString()}</strong></div>
            <div className="flex justify-between mb-1"><span>Vehicle:</span> <strong>{weighment.vehicleNumber}</strong></div>
          </div>

          <div className="border-t border-dashed border-slate-800 py-3 mb-4 text-xs">
            <div className="flex justify-between mb-1"><span className="font-bold">Customer:</span> <span>{weighment.customer?.name || weighment.customerName || '—'}</span></div>
            <div className="flex justify-between mb-1"><span className="font-bold">Material:</span> <span>{weighment.material?.name || weighment.materialName || '—'}</span></div>
            <div className="flex justify-between mb-1"><span className="font-bold">Driver:</span> <span>{weighment.driver?.name || weighment.driverName || '—'}</span></div>
            <div className="flex justify-between mb-1"><span className="font-bold">Transporter:</span> <span>{weighment.transporter?.name || weighment.transporterName || '—'}</span></div>
          </div>

          <div className="border-t border-b border-dashed border-slate-800 py-4 mb-4">
            {(() => {
              let w1Label = 'First Weight';
              let w2Label = 'Second Weight';
              let w1Val = weighment.firstWeight;
              let w2Val = weighment.secondWeight;
              let dt1 = new Date(weighment.firstWeightDate).toLocaleString();
              let dt2 = weighment.secondWeightDate ? new Date(weighment.secondWeightDate).toLocaleString() : '--';

              if (weighment.status === 'COMPLETED' && weighment.firstWeight != null && weighment.secondWeight != null) {
                if (weighment.firstWeight < weighment.secondWeight) {
                  w1Label = 'Empty Weight';
                  w2Label = 'Load Weight';
                } else {
                  w1Label = 'Empty Weight';
                  w2Label = 'Load Weight';
                  w1Val = weighment.secondWeight;
                  w2Val = weighment.firstWeight;
                  dt1 = new Date(weighment.secondWeightDate).toLocaleString();
                  dt2 = new Date(weighment.firstWeightDate).toLocaleString();
                }
              }

              return (
                <>
                  <div className="flex justify-between mb-1">
                    <span>{w1Label}:</span>
                    <strong>{w1Val?.toLocaleString() || '--'} KG</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 text-right mb-3">{dt1}</div>

                  <div className="flex justify-between mb-1">
                    <span>{w2Label}:</span>
                    <strong>{w2Val?.toLocaleString() || '--'} KG</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 text-right mb-3">{dt2}</div>

                  <div className="flex justify-between mt-4 pt-4 border-t border-slate-800 text-base font-bold">
                    <span>NET WEIGHT:</span>
                    <span>{weighment.netWeight?.toLocaleString() || '--'} KG</span>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="flex justify-center items-center text-xs font-semibold mt-4">
            <p className="italic text-gray-600">Thank you for your business! Drive safely.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
