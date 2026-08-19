import { create } from 'zustand';
import type { IWeighbridgeDevice, DeviceConfiguration, ConnectionStatus } from './hardware/IWeighbridgeDevice';
import { SimulatedWeighbridgeDevice } from './hardware/devices/SimulatedWeighbridgeDevice';

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
