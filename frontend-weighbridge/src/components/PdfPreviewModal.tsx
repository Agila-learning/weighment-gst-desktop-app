import { X, Download, Printer } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  blobUrl: string | null;
  isLoading: boolean;
  onDownload: () => void;
  onPrint: () => void;
  title?: string;
}

export default function PdfPreviewModal({ 
  isOpen, 
  onClose, 
  blobUrl, 
  isLoading, 
  onDownload, 
  onPrint,
  title = "PDF Preview" 
}: PdfPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={onPrint}
              disabled={isLoading || !blobUrl}
              className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              <Printer size={16} className="mr-2" /> Print
            </button>
            <button
              onClick={onDownload}
              disabled={isLoading || !blobUrl}
              className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
            >
              <Download size={16} className="mr-2" /> Download
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-100 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 backdrop-blur-sm">
              <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-medium">Generating Document...</p>
            </div>
          ) : blobUrl ? (
            <iframe 
              src={blobUrl} 
              className="w-full h-full border-none"
              title={title}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-red-500 font-medium">Failed to load document.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
