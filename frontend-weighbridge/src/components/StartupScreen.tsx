import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, Play } from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSyncStore } from '../services/SyncService';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface StartupScreenProps {
  onSuccess: () => void;
}

type StepStatus = 'pending' | 'loading' | 'success' | 'error' | 'warning';

export default function StartupScreen({ onSuccess }: StartupScreenProps) {
  const [internetStatus, setInternetStatus] = useState<StepStatus>('pending');
  const [backendStatus, setBackendStatus] = useState<StepStatus>('pending');
  const [dbStatus, setDbStatus] = useState<StepStatus>('pending');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const handleProceedOffline = () => {
    useSyncStore.setState({ isOnline: false });
    onSuccess();
  };

  const checkConnection = async () => {
    setErrorMessage('');
    setInternetStatus('loading');
    setBackendStatus('pending');
    setDbStatus('pending');

    // Step 1: Internet
    if (!navigator.onLine) {
      setInternetStatus('warning');
      setErrorMessage('No internet connection. The app can run in Offline Mode.');
      return;
    }
    setInternetStatus('success');
    setBackendStatus('loading');

    // Step 2 & 3: Backend Health Check
    try {
      const response = await api.get('/health', { timeout: 15000 });
      if (response.data && response.data.status === 'OK') {
        setBackendStatus('success');
        setDbStatus('loading');
        
        // Slight delay for UI UX
        setTimeout(() => {
          if (response.data.database === 'connected') {
            setDbStatus('success');
            useSyncStore.setState({ isOnline: true });
            setTimeout(onSuccess, 500);
          } else {
            setDbStatus('warning');
            setErrorMessage('Backend is running, but centralized database is disconnected.');
          }
        }, 500);
      } else {
        setBackendStatus('warning');
        setErrorMessage('Backend returned an unexpected response.');
      }
    } catch (error: any) {
      if (retryCount < 3) {
        // Auto retry for slow server spin-ups
        setBackendStatus('error');
        setErrorMessage('Server is slow to respond (waking up). Retrying...');
        setTimeout(() => {
          setRetryCount((c) => c + 1);
        }, 3000);
      } else {
        setBackendStatus('warning');
        setErrorMessage('Failed to connect to the centralized backend server. You can still use the app offline.');
      }
    }
  };

  useEffect(() => {
    checkConnection();
  }, [retryCount]);

  const StatusIcon = ({ status }: { status: StepStatus }) => {
    if (status === 'pending') return <div className="w-5 h-5 rounded-full border-2 border-slate-700" />;
    if (status === 'loading') return <RefreshCw size={20} className="animate-spin text-blue-500" />;
    if (status === 'success') return <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">✓</div>;
    if (status === 'warning') return <AlertCircle size={20} className="text-amber-500" />;
    return <AlertCircle size={20} className="text-red-500" />;
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[9999] text-white">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <div className="flex justify-center mb-6">
           <img src="./icon.png" alt="Logo" className="w-16 h-16 object-contain rounded-xl shadow-lg bg-white" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Weighbridge App Startup</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Checking cloud sync connection...</p>

        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <StatusIcon status={internetStatus} />
            <div className={cn("flex-1 text-sm font-medium", (internetStatus === 'pending') && 'text-slate-500', internetStatus === 'warning' && 'text-amber-500')}>
              Checking internet connection
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <StatusIcon status={backendStatus} />
            <div className={cn("flex-1 text-sm font-medium", (backendStatus === 'pending') && 'text-slate-500', backendStatus === 'warning' && 'text-amber-500')}>
              Connecting to sync server
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <StatusIcon status={dbStatus} />
            <div className={cn("flex-1 text-sm font-medium", (dbStatus === 'pending') && 'text-slate-500', dbStatus === 'warning' && 'text-amber-500')}>
              Connecting to cloud database
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-8 p-4 bg-slate-900 border border-slate-700 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-300">{errorMessage}</div>
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button 
                onClick={() => setRetryCount(0)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 border border-slate-600"
              >
                <RefreshCw size={16} />
                <span>Retry</span>
              </button>
              <button 
                onClick={handleProceedOffline}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Play size={16} />
                <span>Proceed Offline</span>
              </button>
            </div>
            <div className="mt-4 text-center">
              <span className="text-[10px] text-slate-500 font-mono break-all">{API_BASE_URL}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
