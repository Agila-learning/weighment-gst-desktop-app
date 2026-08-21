import { Printer } from 'lucide-react';

export default function WeighmentSlip({ weighment, onClose }: { weighment: any, onClose: () => void }) {
  if (!weighment) return null;

  const handlePrint = () => {
    window.print();
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
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto bg-white" id="printable-slip">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #printable-slip, #printable-slip * { visibility: visible; }
              #printable-slip { position: absolute; left: 0; top: 0; width: 100%; }
            }
          `}</style>
          
          <div className="text-center mb-8 border-b-2 border-slate-800 pb-6 flex flex-col items-center">
            <img src="/icon.png" alt="FIC Logo" className="w-16 h-16 mb-2" />
            <h1 className="text-3xl font-black text-slate-900 mb-1">FIC WEIGHBRIDGE</h1>
            <p className="text-sm text-slate-600">123 Industrial Estate, Main Road, City - 600001</p>
            <p className="text-sm text-slate-600">Phone: +91 98765 43210</p>
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
                <td className="border border-slate-400 p-3 text-right font-mono font-bold text-xl">{weighment.netWeight}</td>
                <td className="border border-slate-400 p-3 text-right font-bold">{(weighment.netWeight / 1000).toFixed(2)} TON</td>
              </tr>
            </tbody>
          </table>

          {weighment.status === 'COMPLETED' && weighment.rate > 0 && (
            <div className="border border-slate-400 p-4 mb-12 text-sm grid grid-cols-2 gap-y-2 bg-slate-50">
              <div className="col-span-2 text-center font-bold border-b border-slate-300 pb-2 mb-2 uppercase">Pricing Details</div>
              <div><span className="font-bold inline-block w-32">Pricing Type:</span> {weighment.pricingType}</div>
              <div><span className="font-bold inline-block w-32">Rate (₹):</span> {Number(weighment.rate).toFixed(2)}</div>
              <div><span className="font-bold inline-block w-32">Quantity:</span> {Number(weighment.calculatedQuantity).toFixed(3)}</div>
              <div className="text-lg text-right pr-4"><span className="font-bold">Total (₹):</span> {Number(weighment.calculatedAmount).toFixed(2)}</div>
            </div>
          )}

          <div className="flex justify-between mt-16 pt-8 text-sm border-t border-slate-200">
            <div className="text-center">
              <p className="mb-8 font-semibold">{weighment.driver?.name || weighment.driverName || 'Driver'}</p>
              <p className="border-t border-slate-400 pt-1 w-40">Driver Signature</p>
            </div>
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
