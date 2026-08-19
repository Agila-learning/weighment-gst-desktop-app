import type { IWeighbridgeDevice, DeviceConfiguration, ConnectionStatus, ParsedWeightData } from '../IWeighbridgeDevice';
import type { IWeighbridgeParser } from '../WeighbridgeDataParser';
import { DefaultRegexParser } from '../WeighbridgeDataParser';

export class SimulatedWeighbridgeDevice implements IWeighbridgeDevice {
  private parser: IWeighbridgeParser;
  private timer: any = null;
  private onWeightUpdateCb?: (data: ParsedWeightData) => void;
  private onRawDataCb?: (data: string) => void;
  private onStatusChangeCb?: (status: ConnectionStatus) => void;

  constructor() {
    this.parser = new DefaultRegexParser();
  }

  async connect(_config: DeviceConfiguration): Promise<void> {
    this.onStatusChangeCb?.('CONNECTING');
    
    // Simulate connection delay
    return new Promise((resolve) => {
      setTimeout(() => {
        this.onStatusChangeCb?.('CONNECTED');
        resolve();
      }, 1000);
    });
  }

  async disconnect(): Promise<void> {
    this.stopReading();
    this.onStatusChangeCb?.('DISCONNECTED');
  }

  startReading(): void {
    if (this.timer) clearInterval(this.timer);
    
    let baseWeight = 9400;
    
    this.timer = setInterval(() => {
      // Simulate fluctuation and stability
      const fluctuation = Math.floor(Math.random() * 20) - 10;
      const currentWeight = Math.max(0, baseWeight + fluctuation);
      
      // Simulate raw string
      const rawString = `ST,GS,${currentWeight}KG\r\n`;
      this.onRawDataCb?.(rawString);

      const parsed = this.parser.parse(rawString);
      if (parsed) {
        // We simulate that the hardware itself doesn't always send the stable flag correctly,
        // we'll rely on the software store to do the stability check based on repeated values.
        this.onWeightUpdateCb?.(parsed);
      }
    }, 1000);
  }

  stopReading(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  onWeightUpdate(callback: (data: ParsedWeightData) => void): void {
    this.onWeightUpdateCb = callback;
  }

  onRawData(callback: (data: string) => void): void {
    this.onRawDataCb = callback;
  }

  onError(_callback: (error: string) => void): void {
    // Simulated device does not throw connection errors
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.onStatusChangeCb = callback;
  }
}
