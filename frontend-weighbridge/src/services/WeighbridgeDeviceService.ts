import { create } from 'zustand';
import type { IWeighbridgeDevice, DeviceConfiguration, ConnectionStatus } from './hardware/IWeighbridgeDevice';
import { SimulatedWeighbridgeDevice } from './hardware/devices/SimulatedWeighbridgeDevice';
import { v4 as uuidv4 } from 'uuid';

const getIpcRenderer = () => {
  return (window as any).ipcRenderer;
};


export type ConnectionType = 'SERIAL' | 'TCP' | 'USB' | 'MANUAL' | 'SIMULATED';

interface WeighbridgeState {
  status: ConnectionStatus;
  currentWeight: number;
  connectionType: ConnectionType;
  errorMessage: string | null;
  
  // New architecture additions
  stable: boolean;
  rawIncomingData: string | null;
  config: DeviceConfiguration | null;
  device: IWeighbridgeDevice | null;
  connectionLogs: { timestamp: string, event: string }[];

connect: (config: DeviceConfiguration) => Promise<void>;
  disconnect: () => void;
  readWeight: () => number;
  simulateWeightReading: (weight: number) => void;
  addLog: (event: string) => void;
  init: () => Promise<void>;
  saveConfig: (config: DeviceConfiguration) => Promise<void>;
}

export const useWeighbridgeStore = create<WeighbridgeState>((set, get) => {
  let lastWeight: number = -1;
  let weightUnchangedDuration = 0;

  return {
    status: 'DISCONNECTED',
    currentWeight: 0,
    connectionType: 'MANUAL',
    errorMessage: null,
    stable: false,
    rawIncomingData: null,
    config: null,
    device: null,
    connectionLogs: [],

addLog: (event: string) => {
      set((state) => ({
        connectionLogs: [...state.connectionLogs, { timestamp: new Date().toISOString(), event }].slice(-50) // keep last 50
      }));
    },
    
    init: async () => {
      try {
        const ipcRenderer = getIpcRenderer();
        if (ipcRenderer) {
          const res = await ipcRenderer.invoke('db-query', "SELECT * FROM device_settings LIMIT 1");
          if (res.success && res.data && res.data.length > 0) {
            const row = res.data[0];
            const config: DeviceConfiguration = {
              connectionType: row.connectionType as any,
              comPort: row.comPort,
              baudRate: row.baudRate,
              dataBits: row.dataBits,
              parity: row.parity,
              stopBits: row.stopBits,
              ipAddress: row.ipAddress,
              port: row.port,
              readInterval: row.readInterval,
              connectionTimeout: row.connectionTimeout
            };
            set({ config });
            // Auto connect if not NONE or MANUAL
            if (config.connectionType !== 'MANUAL') {
              get().connect(config);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load device config", err);
      }
    },
    
    saveConfig: async (config: DeviceConfiguration) => {
      try {
        const ipcRenderer = getIpcRenderer();
        if (ipcRenderer) {
          const res = await ipcRenderer.invoke('db-query', "SELECT id FROM device_settings LIMIT 1");
          
          if (res.success && res.data && res.data.length > 0) {
            // Update existing
            const id = res.data[0].id;
            await ipcRenderer.invoke('db-query', 
              `UPDATE device_settings SET 
                connectionType = ?, comPort = ?, baudRate = ?, dataBits = ?, parity = ?, stopBits = ?, ipAddress = ?, port = ?, readInterval = ?, connectionTimeout = ?, updatedAt = ?
              WHERE id = ?`,
              [
                config.connectionType, config.comPort || null, config.baudRate || null, config.dataBits || null, config.parity || null, config.stopBits || null, 
                config.ipAddress || null, config.port || null, config.readInterval || 100, config.connectionTimeout || 3000, new Date().toISOString(), id
              ]
            );
          } else {
            // Insert new
            await ipcRenderer.invoke('db-query',
              `INSERT INTO device_settings (id, connectionType, comPort, baudRate, dataBits, parity, stopBits, ipAddress, port, readInterval, connectionTimeout, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                uuidv4(), config.connectionType, config.comPort || null, config.baudRate || null, config.dataBits || null, config.parity || null, config.stopBits || null, 
                config.ipAddress || null, config.port || null, config.readInterval || 100, config.connectionTimeout || 3000, new Date().toISOString()
              ]
            );
          }
          set({ config });
        }
      } catch (err) {
        console.error("Failed to save config", err);
      }
    },

    connect: async (config: DeviceConfiguration) => {
      const currentDevice = get().device;
      if (currentDevice) {
        currentDevice.disconnect();
      }

      set({ 
        status: 'CONNECTING', 
        connectionType: config.connectionType, 
        errorMessage: null,
        config,
        stable: false
      });
      
      get().addLog(`Connecting via ${config.connectionType}...`);

      let newDevice: IWeighbridgeDevice | null = null;

      if (config.connectionType === 'MANUAL') {
        set({ status: 'CONNECTED', currentWeight: 0, stable: true });
        get().addLog('Connected (Manual Mode)');
        return;
      } else {
        // Instantiate real device or simulation
        // Since we don't have real hardware, we use the simulation wrapper
        newDevice = new SimulatedWeighbridgeDevice();
      }

      newDevice.onStatusChange((status) => {
        set({ status });
        get().addLog(`Status changed to ${status}`);
      });

      newDevice.onRawData((raw) => {
        set({ rawIncomingData: raw });
      });

      newDevice.onError((err) => {
        set({ errorMessage: err, status: 'ERROR' });
        get().addLog(`Error: ${err}`);
      });

      newDevice.onWeightUpdate((parsed) => {

        // Custom software stability check
        // If weight remains same for 3 consecutive updates (3 seconds), mark stable
        if (parsed.weight === lastWeight) {
          weightUnchangedDuration += 1;
        } else {
          weightUnchangedDuration = 0;
          lastWeight = parsed.weight;
        }

        const isStable = weightUnchangedDuration >= 3;

        set({ 
          currentWeight: parsed.weight,
          stable: isStable
        });
      });

      try {
        await newDevice.connect(config);
        newDevice.startReading();
        set({ device: newDevice });
      } catch (err: any) {
        set({ errorMessage: err.message || 'Connection failed', status: 'ERROR' });
        get().addLog(`Connection failed`);
      }
    },

    disconnect: () => {
      const device = get().device;
      if (device) {
        device.stopReading();
        device.disconnect();
      }
      set({ status: 'DISCONNECTED', currentWeight: 0, errorMessage: null, stable: false, device: null, rawIncomingData: null });
      get().addLog('Disconnected by user');
    },

    readWeight: () => {
      return get().currentWeight;
    },

    simulateWeightReading: (weight: number) => {
      set({ currentWeight: weight, stable: true }); // Manual override is always stable
    }
  };
});
