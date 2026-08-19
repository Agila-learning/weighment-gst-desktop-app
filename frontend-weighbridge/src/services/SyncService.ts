import { create } from 'zustand';
import apiClient from './api';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ERROR';

interface SyncState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  pendingRecords: number;
  syncedRecords: number;
  failedRecords: number;
  init: () => void;
  triggerSync: () => Promise<void>;
  updatePendingCount: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: navigator.onLine,
  syncStatus: 'IDLE',
  lastSyncTime: null,
  pendingRecords: 0,
  syncedRecords: 0,
  failedRecords: 0,

  init: () => {
    window.addEventListener('online', () => {
      set({ isOnline: true });
      get().triggerSync();
    });
    window.addEventListener('offline', () => {
      set({ isOnline: false });
    });
    
    // Initial sync and setup interval
    get().triggerSync();
    setInterval(() => {
      if (get().isOnline) {
        get().triggerSync();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  },

  updatePendingCount: async () => {
    const ipcRenderer = (window as any).ipcRenderer;
    if (!ipcRenderer) return;
    try {
      const res = await ipcRenderer.invoke('db-query', "SELECT count(*) as count FROM weighments WHERE syncStatus = 'PENDING_SYNC'");
      if (res.success && res.data && res.data.length > 0) {
        set({ pendingRecords: res.data[0].count });
      }
    } catch (err) {
      console.error(err);
    }
  },

  triggerSync: async () => {
    if (!get().isOnline || get().syncStatus === 'SYNCING') return;

    set({ syncStatus: 'SYNCING' });

    try {
      // 1. Sync Master Data (Download)
      await syncMasterData();

      // 2. Sync Weighments (Upload)
      await syncWeighments();

      set({ syncStatus: 'IDLE', lastSyncTime: new Date().toISOString() });
      await get().updatePendingCount();
    } catch (err) {
      console.error('Sync failed', err);
      set({ syncStatus: 'ERROR' });
    }
  }
}));

async function syncMasterData() {
  const ipcRenderer = (window as any).ipcRenderer;
  if (!ipcRenderer) return;

  const endpoints = ['customers', 'vehicles', 'materials', 'drivers', 'transporters'];
  
  for (const endpoint of endpoints) {
    try {
      const res = await apiClient.get(`/${endpoint}`);
      const data = res.data.data;
      if (!data) continue;

      const queries = data.map((item: any) => {
        let q = '';
        let params: any[] = [];
        if (endpoint === 'customers') {
          q = 'INSERT OR REPLACE INTO customers (id, name, gstin) VALUES (?, ?, ?)';
          params = [item.id, item.name, item.gstin || null];
        } else if (endpoint === 'vehicles') {
          q = 'INSERT OR REPLACE INTO vehicles (id, vehicleNumber, tareWeight) VALUES (?, ?, ?)';
          params = [item.id, item.vehicleNumber, item.tareWeight || 0];
        } else if (endpoint === 'materials') {
          q = 'INSERT OR REPLACE INTO materials (id, name) VALUES (?, ?)';
          params = [item.id, item.name];
        } else if (endpoint === 'drivers') {
          q = 'INSERT OR REPLACE INTO drivers (id, name) VALUES (?, ?)';
          params = [item.id, item.name];
        } else if (endpoint === 'transporters') {
          q = 'INSERT OR REPLACE INTO transporters (id, name) VALUES (?, ?)';
          params = [item.id, item.name];
        }
        return { query: q, params };
      });
      
      await ipcRenderer.invoke('db-transaction', queries);
    } catch (e) {
      console.error(`Failed to sync master data: ${endpoint}`, e);
    }
  }
}

async function syncWeighments() {
  const ipcRenderer = (window as any).ipcRenderer;
  if (!ipcRenderer) return;

  try {
    const pendingRes = await ipcRenderer.invoke('db-query', "SELECT * FROM weighments WHERE syncStatus = 'PENDING_SYNC'");
    if (!pendingRes.success) return;
    
    const pending = pendingRes.data;
    let synced = 0;
    let failed = 0;

    for (const record of pending) {
      try {
        const payload = {
          id: record.id,
          slipNumber: record.slipNumber,
          vehicleId: record.vehicleId,
          customerId: record.customerId,
          materialId: record.materialId,
          driverId: record.driverId,
          transporterId: record.transporterId,
          firstWeight: record.firstWeight,
          secondWeight: record.secondWeight,
          netWeight: record.netWeight,
          status: record.status,
          date: record.date
        };
        
        await apiClient.post('/weighments', payload);
        
        // Mark as synced
        await ipcRenderer.invoke('db-query', "UPDATE weighments SET syncStatus = 'SYNCED' WHERE id = ?", [record.id]);
        synced++;
      } catch (err) {
        console.error('Failed to sync weighment', record.id, err);
        failed++;
      }
    }
    
    const state = useSyncStore.getState();
    useSyncStore.setState({ 
      syncedRecords: state.syncedRecords + synced, 
      failedRecords: state.failedRecords + failed 
    });
  } catch (err) {
    console.error('Sync weighments error', err);
  }
}
