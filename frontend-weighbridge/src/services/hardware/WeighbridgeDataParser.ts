import type { ParsedWeightData } from './IWeighbridgeDevice';

export interface IWeighbridgeParser {
  parse(rawData: string): ParsedWeightData | null;
}

export class DefaultRegexParser implements IWeighbridgeParser {
  /**
   * Attempts to parse raw string data like:
   * "18500 kg"
   * "ST,GS,18500KG"
   * "WT:18500 KG"
   * "+00018500"
   */
  parse(rawData: string): ParsedWeightData | null {
    if (!rawData) return null;
    
    // Look for numbers, optionally with decimals
    const match = rawData.match(/[\+\-]?\d+(\.\d+)?/);
    if (!match) return null;

    const weight = parseFloat(match[0]);
    
    // Strict Validation Rule: Reject invalid, zero, negative, or absurdly large weights (>200,000 KG)
    if (isNaN(weight) || weight <= 0 || weight > 200000) {
      return null;
    }

    // Detect unit
    let unit = 'KG';
    if (rawData.toLowerCase().includes('ton')) {
      unit = 'TON';
    }

    // Detect stability flag if provided by common vendor formats
    let isStable = true;
    if (rawData.includes('US') || rawData.includes('UN') || rawData.includes('ERR')) {
      isStable = false;
    }

    return {
      weight,
      unit,
      isStable,
      rawData
    };
  }
}
