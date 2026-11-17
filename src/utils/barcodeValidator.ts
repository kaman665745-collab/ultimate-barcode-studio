import { BarcodeStandard } from '../types/studio';

export interface BarcodeStandardInfo {
  id: BarcodeStandard;
  bwipBcid: string;
  label: string;
  category: 'Retail & Publishing' | 'Logistics & Industrial' | 'Healthcare & Library';
  placeholder: string;
  sampleValue: string;
  rulesSummary: string;
  supportsCustomColor: boolean;
  isProductIdentifier: boolean;
}

export const BARCODE_STANDARDS: Record<BarcodeStandard, BarcodeStandardInfo> = {
  code128: {
    id: 'code128',
    bwipBcid: 'code128',
    label: 'CODE 128',
    category: 'Logistics & Industrial',
    placeholder: 'UB-2026-PRO-001',
    sampleValue: 'UB-2026-PRO-001',
    rulesSummary: 'Full ASCII (characters 0–127). High density, ideal for shipping & inventory.',
    supportsCustomColor: true,
    isProductIdentifier: false,
  },
  code39: {
    id: 'code39',
    bwipBcid: 'code39',
    label: 'CODE 39',
    category: 'Logistics & Industrial',
    placeholder: 'ASSET-4092',
    sampleValue: 'ASSET-4092',
    rulesSummary: 'Uppercase A–Z, 0–9, and - . $ / + % space.',
    supportsCustomColor: true,
    isProductIdentifier: false,
  },
  code93: {
    id: 'code93',
    bwipBcid: 'code93',
    label: 'CODE 93',
    category: 'Logistics & Industrial',
    placeholder: 'INV-9382-A',
    sampleValue: 'INV-9382-A',
    rulesSummary: 'Compact alphanumeric encoding (ASCII 0–127) with dual check characters.',
    supportsCustomColor: true,
    isProductIdentifier: false,
  },
  ean13: {
    id: 'ean13',
    bwipBcid: 'ean13',
    label: 'EAN-13',
    category: 'Retail & Publishing',
    placeholder: '4006381333931',
    sampleValue: '4006381333931',
    rulesSummary: '12 digits (check digit auto-calculated) or 13 digits with valid GS1 Mod-10 check digit.',
    supportsCustomColor: true,
    isProductIdentifier: true,
  },
  ean8: {
    id: 'ean8',
    bwipBcid: 'ean8',
    label: 'EAN-8',
    category: 'Retail & Publishing',
    placeholder: '96385074',
    sampleValue: '96385074',
    rulesSummary: '7 digits (auto check digit) or 8 digits with valid Mod-10 check digit.',
    supportsCustomColor: true,
    isProductIdentifier: true,
  },
  upca: {
    id: 'upca',
    bwipBcid: 'upca',
    label: 'UPC-A',
    category: 'Retail & Publishing',
    placeholder: '036000291452',
    sampleValue: '036000291452',
    rulesSummary: '11 digits (auto check digit) or 12 digits with valid Mod-10 check digit.',
    supportsCustomColor: true,
    isProductIdentifier: true,
  },
  upce: {
    id: 'upce',
    bwipBcid: 'upce',
    label: 'UPC-E',
    category: 'Retail & Publishing',
    placeholder: '01234565',
    sampleValue: '01234565',
    rulesSummary: '6–8 digits (number system 0/1) compressed UPC with Mod-10 check digit.',
    supportsCustomColor: true,
    isProductIdentifier: true,
  },
  itf14: {
    id: 'itf14',
    bwipBcid: 'itf14',
    label: 'ITF-14',
    category: 'Logistics & Industrial',
    placeholder: '10012345678902',
    sampleValue: '10012345678902',
    rulesSummary: '13 digits (auto check digit) or 14 digits with valid Mod-10 check digit for cartons.',
    supportsCustomColor: true,
    isProductIdentifier: true,
  },
  interleaved2of5: {
    id: 'interleaved2of5',
    bwipBcid: 'interleaved2of5',
    label: 'ITF (Interleaved 2 of 5)',
    category: 'Logistics & Industrial',
    placeholder: '12345678',
    sampleValue: '12345678',
    rulesSummary: 'Even number of numeric digits (0–9), minimum 2 digits.',
    supportsCustomColor: true,
    isProductIdentifier: false,
  },
  codabar: {
    id: 'codabar',
    bwipBcid: 'rationalizedCodabar',
    label: 'Codabar',
    category: 'Healthcare & Library',
    placeholder: 'A123456B',
    sampleValue: 'A123456B',
    rulesSummary: 'Digits 0–9 and - $ : / . + wrapped in start/stop characters (A–D).',
    supportsCustomColor: true,
    isProductIdentifier: false,
  },
  isbn10: {
    id: 'isbn10',
    bwipBcid: 'isbn',
    label: 'ISBN-10',
    category: 'Retail & Publishing',
    placeholder: '0-306-40615-2',
    sampleValue: '0-306-40615-2',
    rulesSummary: '9 digits + Mod-11 check digit (0–9 or X). Encoded cleanly via EAN-13 bookland.',
    supportsCustomColor: true,
    isProductIdentifier: true,
  },
  isbn13: {
    id: 'isbn13',
    bwipBcid: 'isbn',
    label: 'ISBN-13',
    category: 'Retail & Publishing',
    placeholder: '978-0-306-40615-7',
    sampleValue: '978-0-306-40615-7',
    rulesSummary: '13-digit book identifier starting with 978 or 979 with valid Mod-10 check digit.',
    supportsCustomColor: true,
    isProductIdentifier: true,
  },
  'gs1-128': {
    id: 'gs1-128',
    bwipBcid: 'gs1-128',
    label: 'GS1-128',
    category: 'Logistics & Industrial',
    placeholder: '(01)09501101530003(17)271231',
    sampleValue: '(01)09501101530003(17)271231',
    rulesSummary: 'Application Identifiers in parentheses, e.g. (01)GTIN(17)YYMMDD(10)BATCH.',
    supportsCustomColor: true,
    isProductIdentifier: true,
  },
};

export function computeMod10CheckDigit(digitsWithoutCheck: string): number {
  let sum = 0;
  const len = digitsWithoutCheck.length;
  // Standard GS1/EAN/UPC weighting from right-to-left: 3, 1, 3, 1...
  for (let i = 0; i < len; i++) {
    const d = Number(digitsWithoutCheck[len - 1 - i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

export function computeIsbn10CheckChar(nineDigits: string): string {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(nineDigits[i]) * (10 - i);
  }
  const rem = (11 - (sum % 11)) % 11;
  return rem === 10 ? 'X' : String(rem);
}

export function isbn10ToIsbn13(isbn10Clean: string): string {
  const core9 = isbn10Clean.slice(0, 9);
  const base12 = `978${core9}`;
  const check = computeMod10CheckDigit(base12);
  return `${base12}${check}`;
}

export interface BarcodeValidationResult {
  valid: boolean;
  normalizedValue: string;
  bwipText: string;
  checkDigitInfo?: string;
  error?: string;
}

export function validateAndPrepareBarcode(
  standard: BarcodeStandard,
  rawInput: string
): BarcodeValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalizedValue: '',
      bwipText: '',
      error: `Enter a value for ${BARCODE_STANDARDS[standard].label}.`,
    };
  }

  switch (standard) {
    case 'code128': {
      for (let i = 0; i < trimmed.length; i++) {
        if (trimmed.charCodeAt(i) > 127) {
          return {
            valid: false,
            normalizedValue: trimmed,
            bwipText: trimmed,
            error: 'CODE 128 only supports standard ASCII characters (0–127).',
          };
        }
      }
      return { valid: true, normalizedValue: trimmed, bwipText: trimmed };
    }

    case 'code39': {
      const upper = trimmed.toUpperCase();
      if (!/^[0-9A-Z\-. $/+%]+$/.test(upper)) {
        return {
          valid: false,
          normalizedValue: upper,
          bwipText: upper,
          error: 'CODE 39 supports A–Z, 0–9, space, and - . $ / + % only.',
        };
      }
      return { valid: true, normalizedValue: upper, bwipText: upper };
    }

    case 'code93': {
      for (let i = 0; i < trimmed.length; i++) {
        if (trimmed.charCodeAt(i) > 127) {
          return {
            valid: false,
            normalizedValue: trimmed,
            bwipText: trimmed,
            error: 'CODE 93 supports ASCII characters (0–127) only.',
          };
        }
      }
      return { valid: true, normalizedValue: trimmed, bwipText: trimmed };
    }

    case 'ean13': {
      const digits = trimmed.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(digits)) {
        return { valid: false, normalizedValue: digits, bwipText: digits, error: 'EAN-13 must contain digits only.' };
      }
      if (digits.length === 12) {
        const cd = computeMod10CheckDigit(digits);
        const full = `${digits}${cd}`;
        return {
          valid: true,
          normalizedValue: full,
          bwipText: full,
          checkDigitInfo: `Auto-computed check digit: ${cd}`,
        };
      }
      if (digits.length === 13) {
        const expected = computeMod10CheckDigit(digits.slice(0, 12));
        if (Number(digits[12]) !== expected) {
          return {
            valid: false,
            normalizedValue: digits,
            bwipText: digits,
            error: `Invalid EAN-13 check digit. Expected ${expected} as the 13th digit, got ${digits[12]}.`,
          };
        }
        return {
          valid: true,
          normalizedValue: digits,
          bwipText: digits,
          checkDigitInfo: `Check digit verified (${expected})`,
        };
      }
      return {
        valid: false,
        normalizedValue: digits,
        bwipText: digits,
        error: 'EAN-13 requires 12 digits (without check digit) or 13 digits (with check digit).',
      };
    }

    case 'ean8': {
      const digits = trimmed.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(digits)) {
        return { valid: false, normalizedValue: digits, bwipText: digits, error: 'EAN-8 must contain digits only.' };
      }
      if (digits.length === 7) {
        const cd = computeMod10CheckDigit(digits);
        const full = `${digits}${cd}`;
        return {
          valid: true,
          normalizedValue: full,
          bwipText: full,
          checkDigitInfo: `Auto-computed check digit: ${cd}`,
        };
      }
      if (digits.length === 8) {
        const expected = computeMod10CheckDigit(digits.slice(0, 7));
        if (Number(digits[7]) !== expected) {
          return {
            valid: false,
            normalizedValue: digits,
            bwipText: digits,
            error: `Invalid EAN-8 check digit. Expected ${expected}, got ${digits[7]}.`,
          };
        }
        return {
          valid: true,
          normalizedValue: digits,
          bwipText: digits,
          checkDigitInfo: `Check digit verified (${expected})`,
        };
      }
      return {
        valid: false,
        normalizedValue: digits,
        bwipText: digits,
        error: 'EAN-8 requires 7 or 8 numeric digits.',
      };
    }

    case 'upca': {
      const digits = trimmed.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(digits)) {
        return { valid: false, normalizedValue: digits, bwipText: digits, error: 'UPC-A must contain digits only.' };
      }
      if (digits.length === 11) {
        const cd = computeMod10CheckDigit(digits);
        const full = `${digits}${cd}`;
        return {
          valid: true,
          normalizedValue: full,
          bwipText: full,
          checkDigitInfo: `Auto-computed check digit: ${cd}`,
        };
      }
      if (digits.length === 12) {
        const expected = computeMod10CheckDigit(digits.slice(0, 11));
        if (Number(digits[11]) !== expected) {
          return {
            valid: false,
            normalizedValue: digits,
            bwipText: digits,
            error: `Invalid UPC-A check digit. Expected ${expected}, got ${digits[11]}.`,
          };
        }
        return {
          valid: true,
          normalizedValue: digits,
          bwipText: digits,
          checkDigitInfo: `Check digit verified (${expected})`,
        };
      }
      return {
        valid: false,
        normalizedValue: digits,
        bwipText: digits,
        error: 'UPC-A requires 11 or 12 numeric digits.',
      };
    }

    case 'upce': {
      const digits = trimmed.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(digits)) {
        return { valid: false, normalizedValue: digits, bwipText: digits, error: 'UPC-E must contain digits only.' };
      }
      if (digits.length !== 8 && digits.length !== 7 && digits.length !== 6) {
        return {
          valid: false,
          normalizedValue: digits,
          bwipText: digits,
          error: 'UPC-E requires 6 digits (core), 7 digits, or 8 digits (with number system & check digit).',
        };
      }
      if (digits.length === 8 && digits[0] !== '0' && digits[0] !== '1') {
        return {
          valid: false,
          normalizedValue: digits,
          bwipText: digits,
          error: '8-digit UPC-E must begin with number system 0 or 1.',
        };
      }
      return {
        valid: true,
        normalizedValue: digits,
        bwipText: digits,
        checkDigitInfo: digits.length === 8 ? '8-digit UPC-E format' : 'UPC-E compressed format',
      };
    }

    case 'itf14': {
      const digits = trimmed.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(digits)) {
        return { valid: false, normalizedValue: digits, bwipText: digits, error: 'ITF-14 must contain digits only.' };
      }
      if (digits.length === 13) {
        const cd = computeMod10CheckDigit(digits);
        const full = `${digits}${cd}`;
        return {
          valid: true,
          normalizedValue: full,
          bwipText: full,
          checkDigitInfo: `Auto-computed check digit: ${cd}`,
        };
      }
      if (digits.length === 14) {
        const expected = computeMod10CheckDigit(digits.slice(0, 13));
        if (Number(digits[13]) !== expected) {
          return {
            valid: false,
            normalizedValue: digits,
            bwipText: digits,
            error: `Invalid ITF-14 check digit. Expected ${expected}, got ${digits[13]}.`,
          };
        }
        return {
          valid: true,
          normalizedValue: digits,
          bwipText: digits,
          checkDigitInfo: `Check digit verified (${expected})`,
        };
      }
      return {
        valid: false,
        normalizedValue: digits,
        bwipText: digits,
        error: 'ITF-14 requires 13 or 14 numeric digits.',
      };
    }

    case 'interleaved2of5': {
      const digits = trimmed.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(digits) || digits.length < 2) {
        return {
          valid: false,
          normalizedValue: digits,
          bwipText: digits,
          error: 'ITF requires at least 2 numeric digits.',
        };
      }
      if (digits.length % 2 !== 0) {
        return {
          valid: false,
          normalizedValue: digits,
          bwipText: digits,
          error: 'Interleaved 2 of 5 requires an even number of digits.',
        };
      }
      return { valid: true, normalizedValue: digits, bwipText: digits };
    }

    case 'codabar': {
      const upper = trimmed.toUpperCase();
      if (!/^[A-D][0-9\-$:/.+]+[A-D]$/.test(upper)) {
        return {
          valid: false,
          normalizedValue: upper,
          bwipText: upper,
          error: 'Codabar must start and end with A, B, C, or D and contain only 0–9 and - $ : / . + inside.',
        };
      }
      return { valid: true, normalizedValue: upper, bwipText: upper };
    }

    case 'isbn10': {
      const clean = trimmed.replace(/[\s-]/g, '').toUpperCase();
      if (!/^\d{9}[\dX]$/.test(clean)) {
        return {
          valid: false,
          normalizedValue: clean,
          bwipText: clean,
          error: 'ISBN-10 must be 9 digits followed by a check digit (0–9 or X).',
        };
      }
      const expected = computeIsbn10CheckChar(clean.slice(0, 9));
      if (clean[9] !== expected) {
        return {
          valid: false,
          normalizedValue: clean,
          bwipText: clean,
          error: `Invalid ISBN-10 check digit. Expected ${expected}, got ${clean[9]}.`,
        };
      }
      const isbn13 = isbn10ToIsbn13(clean);
      return {
        valid: true,
        normalizedValue: clean,
        bwipText: isbn13,
        checkDigitInfo: `ISBN-10 check digit verified (${expected}) · Bookland EAN ${isbn13}`,
      };
    }

    case 'isbn13': {
      const clean = trimmed.replace(/[\s-]/g, '');
      if (!/^(978|979)\d{10}$/.test(clean)) {
        return {
          valid: false,
          normalizedValue: clean,
          bwipText: clean,
          error: 'ISBN-13 must be 13 digits starting with 978 or 979.',
        };
      }
      const expected = computeMod10CheckDigit(clean.slice(0, 12));
      if (Number(clean[12]) !== expected) {
        return {
          valid: false,
          normalizedValue: clean,
          bwipText: clean,
          error: `Invalid ISBN-13 check digit. Expected ${expected}, got ${clean[12]}.`,
        };
      }
      return {
        valid: true,
        normalizedValue: clean,
        bwipText: clean,
        checkDigitInfo: `ISBN-13 check digit verified (${expected})`,
      };
    }

    case 'gs1-128': {
      if (!/^\(\d{2,4}\)[^\s]+/.test(trimmed)) {
        return {
          valid: false,
          normalizedValue: trimmed,
          bwipText: trimmed,
          error: 'GS1-128 requires Application Identifiers in parentheses, e.g. (01)09501101530003.',
        };
      }
      // Check balanced parentheses
      const opens = (trimmed.match(/\(/g) || []).length;
      const closes = (trimmed.match(/\)/g) || []).length;
      if (opens !== closes) {
        return {
          valid: false,
          normalizedValue: trimmed,
          bwipText: trimmed,
          error: 'Unmatched parentheses in GS1-128 Application Identifier string.',
        };
      }
      return { valid: true, normalizedValue: trimmed, bwipText: trimmed };
    }
  }
}
