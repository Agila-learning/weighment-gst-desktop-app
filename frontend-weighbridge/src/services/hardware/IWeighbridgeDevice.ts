export interface DeviceConfiguration {
  connectionType: 'SERIAL' | 'TCP' | 'USB' | 'MANUAL' | 'SIMULATED';
  comPort?: string;
  baudRate?: number;
  dataBits?: number;
  parity?: string;
  stopBits?: number;
  ipAddress?: string;
  port?: number;
  readInterval?: number;
  connectionTimeout?: number;
}

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface ParsedWeightData {
  weight: number;
  unit: string;
  isStable: boolean;
  rawData?: string;
}

export interface IWeighbridgeDevice {
  /** Connect to the device */
  connect(config: DeviceConfiguration): Promise<void>;
  
  /** Disconnect from the device */
  disconnect(): Promise<void>;
  
  /** 
   * Starts reading continuous data. 
   * The implementation should call the callbacks internally.
   */
  startReading(): void;
  
  /** Stops reading continuous data. */
  stopReading(): void;
  
  /** Register callback for when new weight is calculated/received */
  onWeightUpdate(callback: (data: ParsedWeightData) => void): void;
  
  /** Register callback for raw data (useful for diagnostics) */
  onRawData(callback: (data: string) => void): void;
  
  /** Register callback for errors/disconnects */
  onError(callback: (error: string) => void): void;
  
  /** Register callback for status changes */
  onStatusChange(callback: (status: ConnectionStatus) => void): void;
}
