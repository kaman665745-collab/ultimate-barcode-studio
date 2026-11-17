import { BarcodeStandard } from '../types/studio';
import { validateAndPrepareBarcode } from './barcodeValidator';

export interface BatchItemInput {
  id: string;
  label: string;
  value: string;
  valid: boolean;
  normalizedValue: string;
  error?: string;
}

export const MAX_BATCH_ITEMS = 50;

/**
 * Parses multi-line or CSV ("Label, Value") text into validated batch items.
 * Accepts up to MAX_BATCH_ITEMS non-empty rows.
 */
export function parseBatchItems(
  rawText: string,
  mode: 'qr' | 'barcode',
  barcodeStandard: BarcodeStandard = 'code128'
): { items: BatchItemInput[]; truncatedCount: number } {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const truncatedCount = Math.max(0, lines.length - MAX_BATCH_ITEMS);
  const sliced = lines.slice(0, MAX_BATCH_ITEMS);

  const items: BatchItemInput[] = sliced.map((line, index) => {
    const commaIdx = line.indexOf(',');
    let label = `Item ${index + 1}`;
    let value = line;

    if (commaIdx > 0 && commaIdx < line.length - 1) {
      const left = line.slice(0, commaIdx).trim();
      const right = line.slice(commaIdx + 1).trim();
      if (left && right) {
        label = left.slice(0, 48);
        value = right;
      }
    }

    if (mode === 'qr') {
      const valid = value.length > 0 && value.length <= 2953;
      return {
        id: `batch-${index + 1}`,
        label,
        value,
        valid,
        normalizedValue: value,
        error: valid ? undefined : 'QR payload exceeds maximum 2,953 byte capacity.',
      };
    }

    const bcCheck = validateAndPrepareBarcode(barcodeStandard, value);
    return {
      id: `batch-${index + 1}`,
      label,
      value,
      valid: bcCheck.valid,
      normalizedValue: bcCheck.valid ? bcCheck.normalizedValue : value,
      error: bcCheck.valid ? undefined : bcCheck.error,
    };
  });

  return { items, truncatedCount };
}
