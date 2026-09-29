import type { IWeighbridgeDevice, DeviceConfiguration, ConnectionStatus, ParsedWeightData } from '../IWeighbridgeDevice';
import { DefaultRegexParser } from '../WeighbridgeDataParser';

export class SerialWeighbridgeDevice implements IWeighbridgeDevice {
  private parser = new DefaultRegexParser();
  private onStatusChangeCb?: (s: ConnectionStatus) => void;
  private onRawDataCb?: (r: string) => void;
  private onErrorCb?: (e: string) => void;
  private onWeightUpdateCb?: (d: ParsedWeightData) => void;
  private isReading = false;
  private buffer = '';

  constructor() {
    this.setupIpcListeners();
  }

  private setupIpcListeners() {
    const ipcRenderer = (window as any).ipcRenderer;
    if (!ipcRenderer) return;

    ipcRenderer.on('serial-data', (_event: any, data: string) => {
      if (this.onRawDataCb) this.onRawDataCb(data);
      if (this.isReading) {
        this.buffer += data;
        const lines = this.buffer.split(/\r?\n|\r/);
        
        while (lines.length > 1) {
          const line = lines.shift()?.trim();
          if (line) {
             const parsed = this.parser.parse(line);
             if (parsed && this.onWeightUpdateCb) {
               this.onWeightUpdateCb(parsed);
             }
          }
        }
        this.buffer = lines[0] || '';
      }
    });

    ipcRenderer.on('serial-error', (_event: any, err: string) => {
      if (this.onErrorCb) this.onErrorCb(err);
      if (this.onStatusChangeCb) this.onStatusChangeCb('ERROR');
    });

    ipcRenderer.on('serial-close', () => {
      if (this.onStatusChangeCb) this.onStatusChangeCb('DISCONNECTED');
    });
  }

  async connect(config: DeviceConfiguration): Promise<void> {
    const ipcRenderer = (window as any).ipcRenderer;
    if (!ipcRenderer) throw new Error("IPC not available");
    if (!config.comPort) throw new Error("COM Port is required");

    if (this.onStatusChangeCb) this.onStatusChangeCb('CONNECTING');
    const res = await ipcRenderer.invoke('serial-connect', {
      path: config.comPort,
      baudRate: config.baudRate || 9600,
      dataBits: config.dataBits || 8,
      stopBits: config.stopBits || 1,
      parity: (config.parity?.toLowerCase() || 'none')
    });

    if (res.success) {
      if (this.onStatusChangeCb) this.onStatusChangeCb('CONNECTED');
    } else {
      if (this.onErrorCb) this.onErrorCb(res.error);
      if (this.onStatusChangeCb) this.onStatusChangeCb('ERROR');
      throw new Error(res.error);
    }
  }

  async disconnect(): Promise<void> {
    const ipcRenderer = (window as any).ipcRenderer;
    if (ipcRenderer) {
      await ipcRenderer.invoke('serial-disconnect');
    }
    this.isReading = false;
    if (this.onStatusChangeCb) this.onStatusChangeCb('DISCONNECTED');
  }

  startReading(): void {
    this.isReading = true;
  }

  stopReading(): void {
    this.isReading = false;
  }

  onWeightUpdate(callback: (data: ParsedWeightData) => void): void {
    this.onWeightUpdateCb = callback;
  }

  onRawData(callback: (data: string) => void): void {
    this.onRawDataCb = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCb = callback;
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.onStatusChangeCb = callback;
  }
}
