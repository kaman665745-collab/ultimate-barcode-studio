import { QRDesignConfig } from '../types/studio';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RgbColor | null {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function relativeLuminance(rgb: RgbColor): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return 1;
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ScanReliabilityReport {
  status: 'reliable' | 'caution' | 'risk';
  contrastScore: number;
  warnings: string[];
  recommendations: string[];
}

export function analyzeDesignReliability(
  design: QRDesignConfig,
  decodedSuccessfully?: boolean | null
): ScanReliabilityReport {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const effectiveBg = design.transparentBg ? '#07060b' : design.backgroundColor;
  const fgColors = design.gradient.enabled
    ? design.gradient.colorStops
    : [design.foregroundColor];

  const minContrast = Math.min(
    ...fgColors.map((fg) => contrastRatio(fg, effectiveBg))
  );

  // Check foreground vs background contrast
  if (minContrast < 2.5) {
    warnings.push(
      `Low foreground-to-background contrast (${minContrast.toFixed(1)}:1). Scanners typically require at least 3.5:1.`
    );
    recommendations.push('Increase contrast between QR modules and background.');
  } else if (minContrast < 4.0) {
    warnings.push(
      `Moderate contrast (${minContrast.toFixed(1)}:1). May struggle under dim lighting.`
    );
  }

  // Check inverted colors (light dots on dark bg)
  const bgRgb = hexToRgb(effectiveBg);
  const fgRgb = hexToRgb(fgColors[0]);
  if (bgRgb && fgRgb && relativeLuminance(fgRgb) > relativeLuminance(bgRgb)) {
    warnings.push(
      'Inverted polarity detected (light modules on a dark background). Older scanners may not decode inverted QR codes.'
    );
    recommendations.push('Use dark modules on a light background for maximum universal scanner compatibility.');
  }

  if (design.transparentBg) {
    warnings.push(
      'Transparent background enabled. Ensure the surface you place this QR on has high contrast.'
    );
  }

  // Logo size vs ECC check
  if (design.logoDataUrl) {
    if (design.logoSize > 0.35 && design.ecc !== 'H') {
      warnings.push(
        `Large center logo (${Math.round(design.logoSize * 100)}%) without High (H) error correction risks unreadable modules.`
      );
      recommendations.push('Switch Error Correction Level to H (30%) or reduce logo size below 30%.');
    } else if (design.logoSize > 0.38) {
      warnings.push(
        `Logo covers ${Math.round(design.logoSize * 100)}% of QR area, exceeding the safe 30% threshold.`
      );
    }
  }

  if (design.margin < 8) {
    warnings.push('Quiet zone margin is narrow (< 8px). Keep adequate whitespace around the matrix.');
  }

  if (decodedSuccessfully === false) {
    warnings.push(
      'Live pixel verification could not decode the styled QR canvas. Adjust colors, logo size, or margin.'
    );
  }

  let status: ScanReliabilityReport['status'] = 'reliable';
  if (
    decodedSuccessfully === false ||
    minContrast < 2.5 ||
    (design.logoDataUrl && design.logoSize > 0.38)
  ) {
    status = 'risk';
  } else if (warnings.length > 0) {
    status = 'caution';
  }

  return {
    status,
    contrastScore: Number(minContrast.toFixed(2)),
    warnings,
    recommendations,
  };
}
