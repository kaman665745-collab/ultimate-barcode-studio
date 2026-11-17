import QRCodeStyling, { Options } from 'qr-code-styling';
import bwipjs from 'bwip-js/browser';
import { jsPDF } from 'jspdf';
import { BarcodeConfig, ExportFormat, QRDesignConfig, UpiPosterConfig } from '../types/studio';
import { BARCODE_STANDARDS, validateAndPrepareBarcode } from './barcodeValidator';
import { BatchItemInput } from './batchProcessor';
import { buildUpiUri } from './qrPayload';

export function buildQrStylingOptions(
  payload: string,
  design: QRDesignConfig,
  overrideSize?: number
): Options {
  const size = overrideSize ?? design.size;
  const gradient = design.gradient.enabled
    ? {
        type: design.gradient.type,
        rotation: (design.gradient.rotation * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: design.gradient.colorStops[0] },
          { offset: 1, color: design.gradient.colorStops[1] },
        ],
      }
    : undefined;

  return {
    width: size,
    height: size,
    type: 'canvas',
    data: payload || 'https://ultimatebarcodestudio.app',
    margin: design.margin,
    image: design.logoDataUrl || undefined,
    qrOptions: {
      typeNumber: 0,
      mode: 'Byte',
      errorCorrectionLevel: design.ecc,
    },
    imageOptions: {
      hideBackgroundDots: design.logoHideBackgroundDots,
      imageSize: design.logoSize,
      margin: design.logoMargin,
      crossOrigin: 'anonymous',
    },
    dotsOptions: {
      type: design.dotStyle,
      color: design.foregroundColor,
      gradient,
    },
    backgroundOptions: {
      color: design.transparentBg ? 'transparent' : design.backgroundColor,
    },
    cornersSquareOptions: {
      type: design.cornerSquareStyle,
      color: design.cornerSquareColor || design.foregroundColor,
    },
    cornersDotOptions: {
      type: design.cornerDotStyle,
      color: design.cornerDotColor || design.foregroundColor,
    },
  };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'ultimate-barcode-studio'
  );
}

function rawDataToBlob(raw: Blob | Uint8Array | ArrayBuffer, mime: string): Blob {
  if (raw instanceof Blob) return raw;
  const bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw);
  return new Blob([bytes], { type: mime });
}

/**
 * Renders the QR code plus optional styled frame/caption onto a high-res composite canvas
 * for PNG, JPEG, and PDF exports.
 */
async function renderCompositeQrCanvas(
  payload: string,
  design: QRDesignConfig,
  exportSize: number
): Promise<HTMLCanvasElement> {
  const qr = new QRCodeStyling(buildQrStylingOptions(payload, design, exportSize));
  const rawBlob = await qr.getRawData('png');
  if (!rawBlob) throw new Error('Failed to generate QR bitmap.');

  const blob = rawDataToBlob(rawBlob as Blob | Uint8Array, 'image/png');
  const bitmap = await createImageBitmap(blob);

  const hasFrame = design.frameStyle !== 'none';
  const hasCaption = Boolean(design.caption.trim());
  const pad = hasFrame ? Math.round(exportSize * 0.09) : 0;
  const topBanner =
    design.frameStyle === 'top-badge' || design.frameStyle === 'merchant-stand'
      ? Math.round(exportSize * 0.14)
      : 0;
  const bottomBanner =
    design.frameStyle === 'bottom-banner' ||
    design.frameStyle === 'clean-card' ||
    design.frameStyle === 'neon-violet' ||
    design.frameStyle === 'luxury-gold'
      ? Math.round(exportSize * 0.14)
      : 0;
  const captionExtra = hasCaption ? Math.round(exportSize * 0.08) : 0;

  const totalW = exportSize + pad * 2;
  const totalH = exportSize + pad * 2 + topBanner + bottomBanner + captionExtra;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  if (!design.transparentBg) {
    ctx.fillStyle =
      design.frameStyle === 'neon-violet' || design.frameStyle === 'luxury-gold'
        ? '#0d091a'
        : design.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);
  }

  if (hasFrame) {
    const r = Math.round(exportSize * 0.05);
    ctx.save();
    ctx.strokeStyle = design.frameColor || '#7c3aed';
    ctx.lineWidth = Math.max(3, Math.round(exportSize * 0.012));
    ctx.beginPath();
    ctx.roundRect(ctx.lineWidth / 2, ctx.lineWidth / 2, totalW - ctx.lineWidth, totalH - ctx.lineWidth, r);
    ctx.stroke();
    ctx.restore();
  }

  if (topBanner > 0 && design.frameText.trim()) {
    ctx.fillStyle = design.frameColor || '#7c3aed';
    ctx.fillRect(pad, Math.round(pad * 0.6), exportSize, Math.round(topBanner * 0.78));
    ctx.fillStyle = design.frameTextColor || '#ffffff';
    ctx.font = `700 ${Math.round(exportSize * 0.048)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(design.frameText.trim(), totalW / 2, Math.round(pad * 0.6 + (topBanner * 0.78) / 2));
  }

  const qrY = pad + topBanner;
  ctx.drawImage(bitmap, pad, qrY, exportSize, exportSize);

  if (bottomBanner > 0 && design.frameText.trim()) {
    const bannerY = qrY + exportSize + Math.round(pad * 0.35);
    const bannerH = Math.round(bottomBanner * 0.72);
    ctx.fillStyle = design.frameColor || '#7c3aed';
    ctx.beginPath();
    ctx.roundRect(pad, bannerY, exportSize, bannerH, Math.round(exportSize * 0.025));
    ctx.fill();
    ctx.fillStyle = design.frameTextColor || '#ffffff';
    ctx.font = `700 ${Math.round(exportSize * 0.045)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(design.frameText.trim(), totalW / 2, bannerY + bannerH / 2);
  }

  if (hasCaption) {
    ctx.fillStyle =
      design.frameStyle === 'neon-violet' || design.frameStyle === 'luxury-gold'
        ? '#e2e8f0'
        : '#334155';
    ctx.font = `500 ${Math.round(exportSize * 0.036)}px "DM Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(design.caption.trim(), totalW / 2, totalH - Math.round(captionExtra * 0.55));
  }

  return canvas;
}

export async function exportQrCode(
  payload: string,
  design: QRDesignConfig,
  format: ExportFormat,
  filenameBase: string,
  exportSize = 1024
): Promise<void> {
  const safeName = sanitizeFilename(filenameBase);

  if (format === 'SVG') {
    const qrSvg = new QRCodeStyling({
      ...buildQrStylingOptions(payload, design, exportSize),
      type: 'svg',
    });
    const rawSvg = await qrSvg.getRawData('svg');
    if (!rawSvg) throw new Error('Unable to render SVG.');
    const blob = rawDataToBlob(rawSvg as Blob | Uint8Array, 'image/svg+xml');
    triggerDownload(blob, `${safeName}.svg`);
    return;
  }

  const exportDesign =
    format === 'JPEG' && design.transparentBg
      ? { ...design, transparentBg: false, backgroundColor: '#ffffff' }
      : design;

  const canvas = await renderCompositeQrCanvas(payload, exportDesign, exportSize);

  if (format === 'PNG' || format === 'JPEG') {
    const mime = format === 'PNG' ? 'image/png' : 'image/jpeg';
    const ext = format === 'PNG' ? 'png' : 'jpg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
        mime,
        0.96
      );
    });
    triggerDownload(blob, `${safeName}.${ext}`);
    return;
  }

  // Print-ready PDF export
  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const maxDim = Math.min(pageW - 40, pageH - 60);
  const ratio = canvas.height / canvas.width;
  const drawW = maxDim;
  const drawH = drawW * ratio;
  const x = (pageW - drawW) / 2;
  const y = 32;

  pdf.setFontSize(16);
  pdf.text(filenameBase || 'QR Code Export', pageW / 2, 20, { align: 'center' });
  pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text(`Payload: ${payload.slice(0, 95)}${payload.length > 95 ? '...' : ''}`, pageW / 2, y + drawH + 10, {
    align: 'center',
  });
  pdf.save(`${safeName}.pdf`);
}

function stripHash(hex: string): string {
  return hex.replace('#', '').trim();
}

export async function exportBarcode(
  config: BarcodeConfig,
  format: ExportFormat,
  filenameBase: string
): Promise<void> {
  const check = validateAndPrepareBarcode(config.standard, config.value);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid barcode data.');
  }

  const info = BARCODE_STANDARDS[config.standard];
  const safeName = sanitizeFilename(filenameBase || `${config.standard}-${check.normalizedValue}`);

  const baseOpts: bwipjs.RenderOptions = {
    bcid: info.bwipBcid,
    text: check.bwipText,
    scale: Math.max(2, config.scale),
    height: config.height,
    includetext: config.includeText,
    textsize: config.textSize,
    textxalign: 'center',
    barcolor: stripHash(config.barColor),
    textcolor: stripHash(config.barColor),
    paddingwidth: config.padding,
    paddingheight: config.padding,
    ...(config.transparentBg ? {} : { backgroundcolor: stripHash(config.backgroundColor) }),
  };

  if (format === 'SVG') {
    const svgString = bwipjs.toSVG(baseOpts);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(blob, `${safeName}.svg`);
    return;
  }

  const canvas = document.createElement('canvas');
  bwipjs.toCanvas(canvas, {
    ...baseOpts,
    scale: Math.max(3, config.scale + 1),
    ...(format === 'JPEG' && config.transparentBg ? { backgroundcolor: 'ffffff' } : {}),
  });

  if (format === 'PNG' || format === 'JPEG') {
    const mime = format === 'PNG' ? 'image/png' : 'image/jpeg';
    const ext = format === 'PNG' ? 'png' : 'jpg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Barcode export failed'))),
        mime,
        0.98
      );
    });
    triggerDownload(blob, `${safeName}.${ext}`);
    return;
  }

  // PDF export
  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const targetW = Math.min(130, pageW - 40);
  const targetH = targetW * (canvas.height / canvas.width);
  pdf.setFontSize(15);
  pdf.text(`${info.label} — ${filenameBase}`, pageW / 2, 24, { align: 'center' });
  pdf.addImage(imgData, 'PNG', (pageW - targetW) / 2, 38, targetW, targetH);
  pdf.setFontSize(10);
  pdf.setTextColor(90);
  pdf.text(`Value: ${check.normalizedValue}`, pageW / 2, 38 + targetH + 12, { align: 'center' });
  pdf.save(`${safeName}.pdf`);
}

export async function exportUpiPaymentPoster(
  poster: UpiPosterConfig,
  format: 'PNG' | 'PDF',
  filenameBase: string
): Promise<void> {
  const uri = buildUpiUri({
    upiId: poster.upiId,
    payeeName: poster.payeeName,
    amount: poster.amount,
    currency: 'INR',
    note: poster.note,
  });

  const qrSize = 620;
  const qr = new QRCodeStyling({
    width: qrSize,
    height: qrSize,
    type: 'canvas',
    data: uri,
    margin: 14,
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: {
      type: 'rounded',
      color: poster.template === 'merchant-gold' ? '#1c1917' : '#1e1035',
    },
    backgroundOptions: { color: '#ffffff' },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: poster.template === 'pink-modern' ? '#db2777' : '#6d28d9',
    },
    cornersDotOptions: {
      type: 'dot',
      color: poster.template === 'pink-modern' ? '#9333ea' : '#ec4899',
    },
  });

  const rawBlob = await qr.getRawData('png');
  if (!rawBlob) throw new Error('Failed to render UPI QR code.');
  const blob = rawDataToBlob(rawBlob as Blob | Uint8Array, 'image/png');
  const bitmap = await createImageBitmap(blob);

  const width = 1000;
  const height = 1400;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable.');

  // Background gradient per template
  const grad = ctx.createLinearGradient(0, 0, width, height);
  if (poster.template === 'classic-violet') {
    grad.addColorStop(0, '#140c2b');
    grad.addColorStop(1, '#3b0764');
  } else if (poster.template === 'merchant-gold') {
    grad.addColorStop(0, '#09090b');
    grad.addColorStop(1, '#292524');
  } else if (poster.template === 'pink-modern') {
    grad.addColorStop(0, '#4a044e');
    grad.addColorStop(1, '#9d174d');
  } else {
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#ede9fe');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const isLight = poster.template === 'minimal-white';
  const primaryText = isLight ? '#0f172a' : '#ffffff';
  const mutedText = isLight ? '#475569' : '#cbd5e1';
  const accent = poster.template === 'merchant-gold' ? '#f59e0b' : '#ec4899';

  // Shop Name
  ctx.fillStyle = primaryText;
  ctx.font = '800 54px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(poster.shopName || poster.payeeName || 'Merchant Store', width / 2, 125);

  ctx.fillStyle = accent;
  ctx.font = '700 26px "DM Sans", sans-serif';
  ctx.fillText('SCAN & PAY WITH ANY UPI APP', width / 2, 180);

  // White QR Card
  const cardX = 140;
  const cardY = 240;
  const cardW = 720;
  const cardH = 740;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 36);
  ctx.fill();

  ctx.drawImage(bitmap, (width - qrSize) / 2, cardY + 55, qrSize, qrSize);

  // Payee details below card
  ctx.fillStyle = primaryText;
  ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(poster.payeeName, width / 2, 1065);

  ctx.fillStyle = mutedText;
  ctx.font = '500 28px "JetBrains Mono", monospace';
  ctx.fillText(`UPI ID: ${poster.upiId}`, width / 2, 1120);

  if (poster.amount && Number(poster.amount) > 0) {
    ctx.fillStyle = accent;
    ctx.font = '800 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`INR ${Number(poster.amount).toFixed(2)}`, width / 2, 1195);
  }

  if (poster.note) {
    ctx.fillStyle = mutedText;
    ctx.font = '400 24px "DM Sans", sans-serif';
    ctx.fillText(poster.note, width / 2, 1250);
  }

  ctx.fillStyle = mutedText;
  ctx.font = '500 20px "DM Sans", sans-serif';
  ctx.fillText(
    'QR generation encodes standard UPI payment instructions; verify receipt in your bank app.',
    width / 2,
    1340
  );

  const safeName = sanitizeFilename(filenameBase || `upi-poster-${poster.shopName}`);

  if (format === 'PNG') {
    const outBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Poster PNG failed'))),
        'image/png',
        0.98
      );
    });
    triggerDownload(outBlob, `${safeName}-poster.png`);
    return;
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const drawW = pageW - 24;
  const drawH = drawW * (height / width);
  const yOffset = Math.max(10, (pageH - drawH) / 2);
  pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 12, yOffset, drawW, drawH);
  pdf.save(`${safeName}-poster.pdf`);
}

export async function renderQrPngBlob(
  payload: string,
  design: QRDesignConfig,
  exportSize = 1024
): Promise<Blob> {
  const canvas = await renderCompositeQrCanvas(payload, design, exportSize);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('QR PNG render failed'))),
      'image/png',
      0.98
    );
  });
}

export async function renderBarcodePngBlob(config: BarcodeConfig): Promise<Blob> {
  const check = validateAndPrepareBarcode(config.standard, config.value);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid barcode data.');
  }
  const info = BARCODE_STANDARDS[config.standard];
  const canvas = document.createElement('canvas');
  bwipjs.toCanvas(canvas, {
    bcid: info.bwipBcid,
    text: check.bwipText,
    scale: Math.max(3, config.scale + 1),
    height: config.height,
    includetext: config.includeText,
    textsize: config.textSize,
    textxalign: 'center',
    barcolor: stripHash(config.barColor),
    textcolor: stripHash(config.barColor),
    paddingwidth: config.padding,
    paddingheight: config.padding,
    ...(config.transparentBg ? {} : { backgroundcolor: stripHash(config.backgroundColor) }),
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Barcode PNG render failed'))),
      'image/png',
      0.98
    );
  });
}

export async function copyPngBlobToClipboard(blob: Blob): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('Image clipboard copy is not supported in this browser.');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export async function exportBatchLabelSheetPdf(
  items: BatchItemInput[],
  mode: 'qr' | 'barcode',
  qrDesign: QRDesignConfig,
  barcodeConfig: BarcodeConfig,
  sheetTitle: string
): Promise<void> {
  const validItems = items.filter((item) => item.valid);
  if (validItems.length === 0) {
    throw new Error('No valid items to export.');
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const cols = 3;
  const rows = 4;
  const perPage = cols * rows;
  const marginX = 12;
  const startY = 24;
  const cellW = (pageW - marginX * 2) / cols;
  const cellH = 63;

  const drawHeader = (pageNum: number, totalPages: number) => {
    pdf.setFontSize(12);
    pdf.setTextColor(30);
    pdf.text(sheetTitle || 'Ultimate Barcode Studio — Batch Label Sheet', marginX, 14);
    pdf.setFontSize(8.5);
    pdf.setTextColor(110);
    pdf.text(`Page ${pageNum} of ${totalPages} · ${validItems.length} labels`, pageW - marginX, 14, {
      align: 'right',
    });
  };

  const totalPages = Math.ceil(validItems.length / perPage);
  drawHeader(1, totalPages);

  for (let i = 0; i < validItems.length; i++) {
    const pageIdx = Math.floor(i / perPage);
    const localIdx = i % perPage;
    if (i > 0 && localIdx === 0) {
      pdf.addPage();
      drawHeader(pageIdx + 1, totalPages);
    }

    const col = localIdx % cols;
    const row = Math.floor(localIdx / cols);
    const x = marginX + col * cellW;
    const y = startY + row * cellH;

    pdf.setDrawColor(220);
    pdf.roundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 2, 2);

    const item = validItems[i];

    if (mode === 'qr') {
      const canvas = await renderCompositeQrCanvas(
        item.normalizedValue,
        { ...qrDesign, frameStyle: 'none', caption: '', transparentBg: false },
        320
      );
      const dataUrl = canvas.toDataURL('image/png', 0.96);
      const qrDim = 36;
      pdf.addImage(dataUrl, 'PNG', x + (cellW - qrDim) / 2, y + 6, qrDim, qrDim);
    } else {
      const info = BARCODE_STANDARDS[barcodeConfig.standard];
      const check = validateAndPrepareBarcode(barcodeConfig.standard, item.normalizedValue);
      if (check.valid) {
        const canvas = document.createElement('canvas');
        bwipjs.toCanvas(canvas, {
          bcid: info.bwipBcid,
          text: check.bwipText,
          scale: 3,
          height: 14,
          includetext: barcodeConfig.includeText,
          textsize: 10,
          textxalign: 'center',
          barcolor: stripHash(barcodeConfig.barColor),
          textcolor: stripHash(barcodeConfig.barColor),
          backgroundcolor: 'ffffff',
          paddingwidth: 8,
          paddingheight: 6,
        });
        const maxW = cellW - 10;
        const maxH = 34;
        const ratio = canvas.height / canvas.width;
        let drawW = maxW;
        let drawH = drawW * ratio;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH / ratio;
        }
        pdf.addImage(
          canvas.toDataURL('image/png', 0.98),
          'PNG',
          x + (cellW - drawW) / 2,
          y + 8 + (maxH - drawH) / 2,
          drawW,
          drawH
        );
      }
    }

    pdf.setFontSize(9);
    pdf.setTextColor(20);
    pdf.text(item.label.slice(0, 26), x + cellW / 2, y + 48, { align: 'center' });
    pdf.setFontSize(7.5);
    pdf.setTextColor(100);
    pdf.text(item.normalizedValue.slice(0, 32), x + cellW / 2, y + 53.5, { align: 'center' });
  }

  pdf.save(`${sanitizeFilename(sheetTitle || 'batch-labels')}-sheet.pdf`);
}

