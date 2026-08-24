import { useState, useEffect } from 'react';
import { useWeighbridgeStore } from '../services/WeighbridgeDeviceService';
import { useSyncStore } from '../services/SyncService';
import type { ConnectionType } from '../services/WeighbridgeDeviceService';
import { Edit3, Network, Usb, Activity, Save, Terminal, RefreshCw, Cloud, CloudOff, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DeviceConfiguration } from '../services/hardware/IWeighbridgeDevice';

export default function Settings() {
  const { connect, disconnect, status, config, rawIncomingData, currentWeight, stable, connectionLogs, saveConfig } = useWeighbridgeStore();
  const { isOnline, syncStatus, lastSyncTime, pendingRecords, syncedRecords, failedRecords, syncErrors, triggerSync, clearSyncErrors } = useSyncStore();
  const [activeTab, setActiveTab] = useState<'SETUP' | 'DIAGNOSTICS' | 'SYNC' | 'DATABASE'>('SETUP');

  const [selectedType, setSelectedType] = useState<ConnectionType>(config?.connectionType || 'SIMULATED');
  
  // Serial state
  const [comPort, setComPort] = useState(config?.comPort || 'COM1');
  const [baudRate, setBaudRate] = useState(config?.baudRate || 9600);
  const [dataBits, setDataBits] = useState(config?.dataBits || 8);
  const [parity, setParity] = useState(config?.parity || 'None');
  const [stopBits, setStopBits] = useState(config?.stopBits || 1);
  const [readInterval, setReadInterval] = useState(config?.readInterval || 100);
  const [connectionTimeout, setConnectionTimeout] = useState(config?.connectionTimeout || 3000);
  
  // TCP state
  const [ipAddress, setIpAddress] = useState(config?.ipAddress || '192.168.1.100');
  const [port, setPort] = useState(config?.port || 5000);

  const [autoBackupEnabled, setAutoBackupEnabled] = useState(localStorage.getItem('autoBackup') === 'true');

  useEffect(() => {
    if (config) {
      setSelectedType(config.connectionType || 'SIMULATED');
      if (config.comPort) setComPort(config.comPort);
      if (config.baudRate) setBaudRate(config.baudRate);
      if (config.dataBits) setDataBits(config.dataBits);
      if (config.parity) setParity(config.parity);
      if (config.stopBits) setStopBits(config.stopBits);
      if (config.readInterval) setReadInterval(config.readInterval);
      if (config.connectionTimeout) setConnectionTimeout(config.connectionTimeout);
      if (config.ipAddress) setIpAddress(config.ipAddress);
      if (config.port) setPort(config.port);
    }
  }, [config]);

  useEffect(() => {
    if (autoBackupEnabled) {
      // Trigger auto backup silently once on load if enabled
      const ipcRenderer = (window as any).ipcRenderer;
      if (ipcRenderer) {
        ipcRenderer.invoke('auto-backup-db').catch(console.error);
      }
    }
  }, [autoBackupEnabled]);

  const handleConnect = async () => {
    const newConfig: DeviceConfiguration = {
      connectionType: selectedType,
      comPort: selectedType === 'SERIAL' ? comPort : undefined,
      baudRate: selectedType === 'SERIAL' ? baudRate : undefined,
      dataBits: selectedType === 'SERIAL' ? dataBits : undefined,
      parity: selectedType === 'SERIAL' ? parity : undefined,
      stopBits: selectedType === 'SERIAL' ? stopBits : undefined,
      ipAddress: selectedType === 'TCP' ? ipAddress : undefined,
      port: selectedType === 'TCP' ? port : undefined,
      readInterval,
      connectionTimeout,
    };
    await saveConfig(newConfig);
    connect(newConfig);
    alert('Settings Saved Successfully!');
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset to default device settings?')) {
      setComPort('COM1');
      setBaudRate(9600);
      setDataBits(8);
      setParity('None');
      setStopBits(1);
      setReadInterval(100);
      setConnectionTimeout(3000);
      setIpAddress('192.168.1.100');
      setPort(5000);
    }
  };

  const handleBackup = async () => {
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      if (!ipcRenderer) return;
      const res = await ipcRenderer.invoke('backup-db');
      if (res.success) {
        alert(`Database backed up successfully to:\n${res.filePath}`);
      } else if (res.error !== 'Cancelled') {
        alert('Backup failed: ' + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async () => {
    try {
      const ipcRenderer = (window as any).ipcRenderer;
      if (!ipcRenderer) return;
      const res = await ipcRenderer.invoke('restore-db');
      if (res && !res.success && res.error !== 'Cancelled') {
        alert('Restore failed: ' + res.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 min-h-screen overflow-y-auto flex flex-col pb-32">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Hardware Integration</h1>
        
        <div className="flex space-x-2 bg-slate-200 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('SETUP')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'SETUP' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Connection Setup
          </button>
          <button 
            onClick={() => setActiveTab('DIAGNOSTICS')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'DIAGNOSTICS' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Diagnostics (Admin)
          </button>
          <button 
            onClick={() => setActiveTab('SYNC')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'SYNC' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Synchronization
          </button>
          <button 
            onClick={() => setActiveTab('DATABASE')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'DATABASE' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Database Utils
          </button>
        </div>
      </div>
      
      {activeTab === 'SETUP' ? (
        <div className="max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
          
          <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Device Types</h2>
            <div className="space-y-3">
              {[
                { type: 'SIMULATED', icon: Activity, label: 'Simulated Device', desc: 'Test mode' },
                { type: 'SERIAL', icon: Usb, label: 'RS232 / COM Port', desc: 'Direct serial cable' },
                { type: 'TCP', icon: Network, label: 'TCP/IP Network', desc: 'Ethernet / Wi-Fi' },
                { type: 'MANUAL', icon: Edit3, label: 'Manual Entry', desc: 'Fallback mode' }
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setSelectedType(item.type as ConnectionType)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center space-x-4 ${
                    selectedType === item.type ? 'border-primary-500 bg-primary-50' : 'border-transparent hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${selectedType === item.type ? 'bg-primary-100 text-primary-700' : 'bg-white text-slate-500 shadow-sm'}`}>
                    <item.icon size={20} />
                  </div>
                  <div>
                    <p className={`font-bold ${selectedType === item.type ? 'text-primary-900' : 'text-slate-700'}`}>{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-2/3 p-8 flex flex-col">
            <div className="flex-1">
              {selectedType === 'SERIAL' && (
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                    <Usb className="mr-2 text-slate-400" /> RS232 Configuration
                  </h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">COM Port</label>
                      <select value={comPort} onChange={(e) => setComPort(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg">
                        <option value="COM1">COM1</option>
                        <option value="COM2">COM2</option>
                        <option value="COM3">COM3</option>
                        <option value="COM4">COM4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Baud Rate</label>
                      <select value={baudRate} onChange={(e) => setBaudRate(Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-lg">
                        <option value="4800">4800</option>
                        <option value="9600">9600</option>
                        <option value="19200">19200</option>
                        <option value="38400">38400</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Data Bits</label>
                      <select value={dataBits} onChange={(e) => setDataBits(Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-lg">
                        <option value={7}>7</option>
                        <option value={8}>8</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Parity</label>
                      <select value={parity} onChange={(e) => setParity(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg">
                        <option value="None">None</option>
                        <option value="Odd">Odd</option>
                        <option value="Even">Even</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Stop Bits</label>
                      <select value={stopBits} onChange={(e) => setStopBits(Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-lg">
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Connection Timeout (ms)</label>
                      <input type="number" value={connectionTimeout} onChange={(e) => setConnectionTimeout(Number(e.target.value))} className="w-full p-2.5 border border-slate-300 rounded-lg" />
                    </div>
                  </div>
                </div>
              )}

              {selectedType === 'TCP' && (
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                    <Network className="mr-2 text-slate-400" /> TCP/IP Configuration
                  </h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">IP Address</label>
                      <input type="text" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="192.168.1.100" className="w-full p-2.5 border border-slate-300 rounded-lg font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Port</label>
                      <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} placeholder="5000" className="w-full p-2.5 border border-slate-300 rounded-lg font-mono" />
                    </div>
                  </div>
                </div>
              )}

              {selectedType === 'SIMULATED' && (
                <div className="text-center py-12">
                  <Activity size={48} className="mx-auto text-primary-300 mb-4" />
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Simulated Device</h2>
                  <p className="text-slate-500 max-w-sm mx-auto">This mode simulates a live weighbridge indicator fluctuating around 9,400 KG. It will randomly switch between STABLE and UNSTABLE states.</p>
                </div>
              )}

              {selectedType === 'MANUAL' && (
                <div className="text-center py-12">
                  <Edit3 size={48} className="mx-auto text-amber-300 mb-4" />
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Manual Entry Fallback</h2>
                  <p className="text-slate-500 max-w-sm mx-auto">Requires authorized operators to type the weight manually. Use only if hardware is permanently down.</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center bg-slate-50 -mx-8 -mb-8 p-6">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  status === 'CONNECTED' ? 'bg-emerald-500' :
                  status === 'CONNECTING' ? 'bg-amber-500' :
                  status === 'ERROR' ? 'bg-red-500' : 'bg-slate-400'
                }`} />
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
                  <p className={`font-bold ${
                    status === 'CONNECTED' ? 'text-emerald-700' :
                    status === 'CONNECTING' ? 'text-amber-700' :
                    status === 'ERROR' ? 'text-red-700' : 'text-slate-700'
                  }`}>{status}</p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button onClick={handleResetSettings} className="px-4 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-semibold transition-colors">
                  Reset Settings
                </button>
                {status === 'CONNECTED' ? (
                  <button onClick={disconnect} className="px-6 py-2.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg font-semibold transition-colors">
                    Disconnect
                  </button>
                ) : (
                  <>
                    <button onClick={handleConnect} className="px-6 py-2.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition-colors">
                      Test Connection
                    </button>
                    <button onClick={handleConnect} className="px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-semibold transition-colors flex items-center shadow-sm">
                      <Save size={18} className="mr-2" /> Save Configuration
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'DIAGNOSTICS' ? (
        <div className="flex-1 flex space-x-6 min-h-0">
          <div className="w-1/2 flex flex-col bg-slate-900 rounded-xl shadow-inner border border-slate-800 overflow-hidden text-slate-300 font-mono text-sm">
            <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center text-xs font-bold text-slate-500 tracking-wider">
                <Terminal size={14} className="mr-2" /> RAW HARDWARE STREAM
              </div>
              <div className="flex space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto break-all">
              {rawIncomingData ? (
                <>
                  <span className="text-emerald-400">&gt; RECV: </span>
                  <span className="text-slate-100">{rawIncomingData}</span>
                </>
              ) : (
                <span className="text-slate-600">No data received. Waiting for connection...</span>
              )}
            </div>
          </div>

          <div className="w-1/2 flex flex-col space-y-6 min-h-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Parser Output</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 text-xs uppercase mb-1">Parsed Weight</p>
                  <p className="text-2xl font-bold text-slate-800">{currentWeight} KG</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase mb-1">Stability Flag</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${stable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {stable ? 'STABLE' : 'UNSTABLE'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Connection Logs</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {connectionLogs.map((log, i) => (
                  <div key={i} className="flex space-x-3 text-sm">
                    <span className="text-slate-400 font-mono text-xs mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-slate-700">{log.event}</span>
                  </div>
                ))}
                {connectionLogs.length === 0 && <p className="text-slate-500 text-sm">No events logged yet.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'SYNC' ? (
        <div className="max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Offline Synchronization Dashboard</h2>
              <p className="text-slate-500">Monitor and manage the data sync between your local offline database and the central server.</p>
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold flex items-center space-x-2 ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {isOnline ? <Cloud size={20} /> : <CloudOff size={20} />}
              <span>{isOnline ? 'INTERNET CONNECTED' : 'OFFLINE'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="p-6 rounded-xl border border-amber-200 bg-amber-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-amber-800 uppercase tracking-wider text-sm">Pending Records</h3>
                <RefreshCw size={24} className="text-amber-500" />
              </div>
              <p className="text-4xl font-bold text-amber-600">{pendingRecords}</p>
              <p className="text-sm text-amber-700 mt-2">Waiting to sync to central database</p>
            </div>

            <div className="p-6 rounded-xl border border-emerald-200 bg-emerald-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-emerald-800 uppercase tracking-wider text-sm">Successfully Synced</h3>
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <p className="text-4xl font-bold text-emerald-600">{syncedRecords}</p>
              <p className="text-sm text-emerald-700 mt-2">Records synchronized this session</p>
            </div>

            <div className="p-6 rounded-xl border border-red-200 bg-red-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-red-800 uppercase tracking-wider text-sm">Failed Records</h3>
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <p className="text-4xl font-bold text-red-600">{failedRecords}</p>
              <p className="text-sm text-red-700 mt-2">Errors encountered during sync</p>
            </div>
          </div>

          {syncErrors.length > 0 && (
            <div className="mb-8 border border-red-200 rounded-xl overflow-hidden">
              <div className="bg-red-50 p-4 border-b border-red-200 flex justify-between items-center">
                <h3 className="font-bold text-red-800 flex items-center"><AlertCircle size={18} className="mr-2" /> Conflict Resolution Required</h3>
                <button onClick={clearSyncErrors} className="text-sm text-red-700 hover:text-red-900 font-medium">Clear All</button>
              </div>
              <div className="bg-white p-4 max-h-60 overflow-y-auto space-y-3">
                {syncErrors.map((err, idx) => (
                  <div key={idx} className="flex justify-between items-start bg-red-50 p-3 rounded-lg border border-red-100">
                    <div>
                      <span className="font-bold text-red-900 mr-2">Slip #{err.slipNumber}</span>
                      <span className="text-red-700 text-sm">{err.error}</span>
                    </div>
                    <button 
                      onClick={() => triggerSync()} 
                      className="px-3 py-1 bg-white border border-red-200 text-red-700 text-xs font-bold rounded shadow-sm hover:bg-red-50"
                    >
                      Retry Sync
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto bg-slate-50 p-6 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Last Synchronization</p>
              <p className="font-medium text-slate-800">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
              </p>
            </div>
            
            <button 
              onClick={triggerSync}
              disabled={!isOnline || syncStatus === 'SYNCING'}
              className="flex items-center px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`mr-2 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} size={20} />
              {syncStatus === 'SYNCING' ? 'Syncing Now...' : 'Force Sync Now'}
            </button>
          </div>
        </div>
      ) : activeTab === 'DATABASE' ? (
        <div className="max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col min-h-[500px]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Database Utilities</h2>
            <p className="text-slate-500">Manage your offline SQLite database backups and restores.</p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Backup Database</h3>
                <p className="text-sm text-slate-600 mb-6">Create a safe copy of your current local database. It is highly recommended to do this daily to avoid data loss.</p>
                
                <div className="flex items-center gap-2 mb-6">
                  <input 
                    type="checkbox" 
                    id="autoBackup" 
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" 
                    checked={autoBackupEnabled} 
                    onChange={e => {
                      setAutoBackupEnabled(e.target.checked);
                      localStorage.setItem('autoBackup', String(e.target.checked));
                    }} 
                  />
                  <label htmlFor="autoBackup" className="text-sm font-medium text-slate-700">Enable Daily Auto-Backup on Launch</label>
                </div>
              </div>
              <button 
                onClick={handleBackup}
                className="w-full flex justify-center items-center px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold transition-colors"
              >
                <Save className="mr-2" size={20} /> Generate Manual Backup (.db)
              </button>
            </div>

            <div className="border border-red-200 rounded-xl p-6 bg-red-50 flex flex-col justify-between">
              <h3 className="text-lg font-bold text-red-800 mb-2">Restore Database</h3>
              <p className="text-sm text-red-700 mb-6">Restore the local database from a previous backup file. <strong>Warning:</strong> This will overwrite all current local data and restart the application.</p>
              <button 
                onClick={handleRestore}
                className="w-full flex justify-center items-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors"
              >
                <RefreshCw className="mr-2" size={20} /> Restore Backup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
