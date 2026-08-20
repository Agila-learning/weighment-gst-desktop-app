import { HashRouter, Routes, Route, Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { 
  Truck, Scale, History as HistoryIcon, Settings as SettingsIcon, 
  LayoutDashboard, Users, UserSquare, Package, UserCircle,
  FileSpreadsheet, ClipboardList
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useWeighbridgeStore } from './services/WeighbridgeDeviceService';
import { useSyncStore } from './services/SyncService';
import { useEffect, useState } from 'react';
import { useAuthStore } from './services/AuthService';
import { LogOut, ChevronLeft, ChevronRight, Database, Printer } from 'lucide-react';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function Sidebar() {
  const location = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);
  const { status } = useWeighbridgeStore();
  const { isOnline, syncStatus, pendingRecords } = useSyncStore();
  
  const menuGroups = [
    {
      title: 'Main',
      items: [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' }
      ]
    },
    {
      title: 'Weighbridge',
      items: [
        { path: '/weighment', icon: Scale, label: 'Weighment' },
        { path: '/pending', icon: ClipboardList, label: 'Pending Weighments' },
        { path: '/history', icon: HistoryIcon, label: 'History' },
      ]
    },
    {
      title: 'Masters',
      items: [
        { path: '/masters/vehicles', icon: Truck, label: 'Vehicles' },
        { path: '/masters/customers', icon: Users, label: 'Customers' },
        { path: '/masters/materials', icon: Package, label: 'Materials' },
        { path: '/masters/drivers', icon: UserSquare, label: 'Drivers' },
        { path: '/masters/transporters', icon: UserCircle, label: 'Transporters' },
      ]
    },
    {
      title: 'Reports',
      items: [
        { path: '/reports', icon: FileSpreadsheet, label: 'Reports Dashboard' },
      ]
    },
    {
      title: 'Device',
      items: [
        { path: '/settings', icon: SettingsIcon, label: 'Hardware Settings' },
        { path: '/audit-log', icon: ClipboardList, label: 'Audit Log' },
      ]
    }
  ];

  return (
    <div className={`bg-slate-900 h-screen text-slate-100 flex flex-col transition-all duration-300 ${isMinimized ? 'w-20' : 'w-64'}`}>
      <div className={`p-4 flex items-center border-b border-slate-800 mb-6 ${isMinimized ? 'flex-col justify-center gap-4' : 'justify-between'}`}>
        <div className={`flex items-center ${isMinimized ? '' : 'space-x-3'}`}>
          <img src="./icon.png" alt="Logo" className={`w-8 h-8 object-contain rounded ${isMinimized ? '' : ''}`} />
          {!isMinimized && (
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">FIC</h1>
              <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest mt-0.5">Weighbridge</p>
            </div>
          )}
        </div>
        <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white flex-shrink-0">
          {isMinimized ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            {!isMinimized ? (
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {group.title}
              </p>
            ) : (
              <div className="flex justify-center mb-2">
                <div className="h-px w-8 bg-slate-800" title={group.title} />
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center px-4 py-2 rounded-lg transition-colors text-sm",
                    location.pathname === item.path 
                      ? "bg-primary-600 text-white font-medium" 
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    isMinimized ? "justify-center space-x-0" : "space-x-3"
                  )}
                  title={item.label}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!isMinimized && <span className="whitespace-nowrap">{item.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className={`p-4 border-t border-slate-800 flex items-center bg-slate-950 ${isMinimized ? 'justify-center' : 'space-x-3'}`} title="Device Status">
        <div className={cn(
          "w-3 h-3 rounded-full shrink-0",
          status === 'CONNECTED' ? 'bg-emerald-500' :
          status === 'CONNECTING' ? 'bg-amber-500' :
          status === 'ERROR' ? 'bg-red-500' : 'bg-slate-500',
          status !== 'ERROR' && "animate-pulse"
        )} />
        {!isMinimized && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Device Status</span>
            <span className={cn(
              "text-sm font-bold truncate",
              status === 'CONNECTED' ? 'text-emerald-400' :
              status === 'CONNECTING' ? 'text-amber-400' :
              status === 'ERROR' ? 'text-red-400' : 'text-slate-400'
            )}>{status}</span>
          </div>
        )}
      </div>
      <div className={`p-4 border-t border-slate-800 flex items-center bg-slate-950 ${isMinimized ? 'justify-center' : 'space-x-3'}`} title="Network Status">
        <div className={cn(
          "w-3 h-3 rounded-full shrink-0",
          isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
        )} />
        {!isMinimized && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Internet</span>
            <span className={cn(
              "text-sm font-bold",
              isOnline ? 'text-emerald-400' : 'text-red-400'
            )}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            {syncStatus === 'SYNCING' && <span className="text-xs text-blue-400 truncate">Syncing...</span>}
            {pendingRecords > 0 && <span className="text-xs text-amber-400 truncate">{pendingRecords} pending</span>}
          </div>
        )}
      </div>
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <button 
          onClick={() => useAuthStore.getState().logout()}
          className={`flex items-center justify-center text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 py-2 rounded-lg transition-colors border border-slate-800 ${isMinimized ? 'w-full' : 'w-full space-x-2'}`}
          title="Logout"
        >
          <LogOut size={16} className="shrink-0" />
          {!isMinimized && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}

function Layout() {
  const { init, isOnline, pendingRecords } = useSyncStore();
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    init();
  }, [init]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col relative bg-slate-50">
        
        {/* Global Status Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase">Weighbridge:</span>
              <span className="flex items-center text-xs font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Connected
              </span>
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase">Database:</span>
              <span className="flex items-center text-xs font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                Connected
              </span>
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <div className="flex items-center space-x-2">
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase">Printer:</span>
              <span className="flex items-center text-xs font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                Connected
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             <span className="text-xs font-bold text-slate-400">ADMIN</span>
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">A</div>
          </div>
        </header>

        {!isOnline && (
          <div className="bg-amber-100 text-amber-800 px-4 py-2 text-sm font-medium border-b border-amber-200 flex justify-between items-center z-10 shrink-0">
            <span>Offline Mode – Weighments will sync automatically when internet is restored.</span>
            {pendingRecords > 0 && <span>{pendingRecords} weighments waiting to sync</span>}
          </div>
        )}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import Dashboard from './pages/Dashboard';
import Weighment from './pages/Weighment';
import PendingWeighments from './pages/PendingWeighments';
import History from './pages/History';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';

import Vehicles from './pages/masters/Vehicles';
import Customers from './pages/masters/Customers';
import Materials from './pages/masters/Materials';
import Drivers from './pages/masters/Drivers';
import Transporters from './pages/masters/Transporters';
import Reports from './pages/reports/Reports';
import Login from './pages/Login';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/weighment" element={<Weighment />} />
          <Route path="/pending" element={<PendingWeighments />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/masters/vehicles" element={<Vehicles />} />
          <Route path="/masters/customers" element={<Customers />} />
          <Route path="/masters/materials" element={<Materials />} />
          <Route path="/masters/drivers" element={<Drivers />} />
          <Route path="/masters/transporters" element={<Transporters />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
