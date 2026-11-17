import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  BarcodeConfig,
  BarcodeStandard,
  ExportFormat,
  QRDesignConfig,
} from '../types/studio';
import { BARCODE_STANDARDS } from '../utils/barcodeValidator';
import { MAX_BATCH_ITEMS, parseBatchItems } from '../utils/batchProcessor';
import { classifyDecodedPayload, DecodedAnalysis } from '../utils/scannerParser';
import {
  exportBarcode,
  exportBatchLabelSheetPdf,
  exportQrCode,
} from '../utils/exportStudio';
import { QrPreviewCanvas } from '../components/QrPreviewCanvas';
import { BarcodePreviewCanvas } from '../components/BarcodePreviewCanvas';
import {
  Layers,
  ScanLine,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertCircle,
  Upload,
  Camera,
  CameraOff,
  Copy,
  Check,
  Palette,
  ExternalLink,
  Trash2,
} from 'lucide-react';

interface BatchScanViewProps {
  qrDesign: QRDesignConfig;
  barcodeConfig: BarcodeConfig;
  onOpenInDesignStudio: (payload: string) => void;
  onRecordDownload: (
    kind: 'qr' | 'barcode',
    category: string,
    title: string,
    payload: string,
    format: ExportFormat
  ) => Promise<void>;
  onToast: (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    description?: string
  ) => void;
}

const SAMPLE_QR_BATCH = [
  'Main Storefront, https://ultimatebarcodestudio.app',
  'Table 01 Menu, https://menu.example.com/table/01',
  'Table 02 Menu, https://menu.example.com/table/02',
  'Guest WiFi, WIFI:T:WPA;S:Studio_Guest_5G;P:StudioGuest2026;;',
  'Support WhatsApp, https://wa.me/919876543210?text=Support',
  'Counter UPI, upi://pay?pa=merchant@okicici&pn=Apex%20Roasters&cu=INR',
].join('\n');

const SAMPLE_BARCODE_BATCH: Record<BarcodeStandard, string> = {
  code128: [
    'SKU Jacket S, UB-2026-JKT-01',
    'SKU Jacket M, UB-2026-JKT-02',
    'SKU Jacket L, UB-2026-JKT-03',
    'Pallet A12, UB-2026-PLT-112',
  ].join('\n'),
  ean13: [
    'Espresso Beans, 4006381333931',
    'Matcha Tin, 5901234123457',
    'Ceramic Mug, 8901030895524',
  ].join('\n'),
  upca: [
    'Retail Bottle, 036000291452',
    'Snack Pack, 012345678905',
  ].join('\n'),
  ean8: ['Mini Pack, 96385074', 'Travel Kit, 55123457'].join('\n'),
  code39: ['Asset 101, ASSET-101', 'Asset 102, ASSET-102', 'Rack B4, RACK-B4'].join('\n'),
  code93: ['Shelf 01, SHELF-01', 'Shelf 02, SHELF-02'].join('\n'),
  upce: ['Compact Pack, 04210005'].join('\n'),
  itf14: ['Master Carton 1, 10012345678902', 'Master Carton 2, 00012345678905'].join('\n'),
  interleaved2of5: ['Lot 001, 1234567890', 'Lot 002, 9876543210'].join('\n'),
  codabar: ['Lib Book 1, A123456B', 'Blood Bag 2, A987654C'].join('\n'),
  isbn10: ['Design Handbook, 0306406152'].join('\n'),
  isbn13: ['Studio Architecture, 9780306406157', 'Print Systems, 9780140449136'].join('\n'),
  'gs1-128': ['Pallet GTIN, (01)09501101530003', 'Batch Lot, (10)BATCH2026'].join('\n'),
};

interface NativeBarcodeMatch {
  rawValue?: string;
  format?: string;
}

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<NativeBarcodeMatch[]>;
}

const STANDARD_KEYS = Object.keys(BARCODE_STANDARDS) as BarcodeStandard[];

export const BatchScanView: React.FC<BatchScanViewProps> = ({
  qrDesign,
  barcodeConfig,
  onOpenInDesignStudio,
  onRecordDownload,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'batch' | 'scanner'>('batch');

  // Batch generator state
  const [batchMode, setBatchMode] = useState<'qr' | 'barcode'>('qr');
  const [batchStandard, setBatchStandard] = useState<BarcodeStandard>(barcodeConfig.standard);
  const [sheetTitle, setSheetTitle] = useState('Studio Print Label Sheet');
  const [rawBatchText, setRawBatchText] = useState(SAMPLE_QR_BATCH);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Scanner state
  const [scanResult, setScanResult] = useState<DecodedAnalysis | null>(null);
  const [scanFormatBadge, setScanFormatBadge] = useState<string>('');
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string>('');
  const [scanError, setScanError] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [copiedScan, setCopiedScan] = useState(false);

  // Live Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const parsedBatch = useMemo(
    () => parseBatchItems(rawBatchText, batchMode, batchStandard),
    [rawBatchText, batchMode, batchStandard]
  );

  const validItems = useMemo(
    () => parsedBatch.items.filter((item) => item.valid),
    [parsedBatch.items]
  );

  const invalidCount = parsedBatch.items.length - validItems.length;

  const stopCamera = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'scanner' && cameraActive) {
      stopCamera();
    }
  }, [activeTab, cameraActive]);

  const handleLoadSample = () => {
    if (batchMode === 'qr') {
      setRawBatchText(SAMPLE_QR_BATCH);
    } else {
      setRawBatchText(SAMPLE_BARCODE_BATCH[batchStandard] || SAMPLE_BARCODE_BATCH.code128);
    }
    onToast('info', 'Sample Batch Loaded', 'Edit any Label, Value row or export directly to PDF.');
  };

  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '').trim();
      if (!content) {
        onToast('error', 'Empty File', 'The uploaded CSV/TXT file contains no rows.');
        return;
      }
      setRawBatchText(content);
      onToast('success', 'Batch Imported', `Loaded rows from ${file.name}.`);
    };
    reader.readAsText(file);
  };

  const handleExportBatchPdf = async () => {
    if (validItems.length === 0) {
      onToast('error', 'No valid items', 'Fix validation errors or enter at least one item.');
      return;
    }
    setExportingPdf(true);
    try {
      await exportBatchLabelSheetPdf(
        parsedBatch.items,
        batchMode,
        qrDesign,
        { ...barcodeConfig, standard: batchStandard },
        sheetTitle
      );
      await onRecordDownload(
        batchMode,
        batchMode === 'qr' ? 'batch-qr' : batchStandard,
        `${sheetTitle} (${validItems.length} labels)`,
        `${validItems.length} items`,
        'PDF'
      );
      onToast(
        'success',
        'Batch Label Sheet Exported',
        `Saved ${validItems.length} print-ready labels across ${Math.ceil(validItems.length / 12)} A4 page(s).`
      );
    } catch (err) {
      onToast(
        'error',
        'Batch Export Failed',
        err instanceof Error ? err.message : 'Unable to build batch PDF.'
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const decodeCanvasFrame = async (
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): Promise<{ value: string; format: string } | null> => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, width, height);
    const qrHit = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
    if (qrHit?.data) {
      return { value: qrHit.data, format: 'QR_CODE' };
    }

    const DetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
      }
    ).BarcodeDetector;
    if (DetectorCtor) {
      try {
        const detector = new DetectorCtor();
        const matches = await detector.detect(canvas);
        if (matches?.[0]?.rawValue) {
          return {
            value: matches[0].rawValue,
            format: (matches[0].format || 'BARCODE').toUpperCase(),
          };
        }
      } catch {
        // Native detector not supported for this frame
      }
    }
    return null;
  };

  const handleScanImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanError('Please upload a PNG, JPEG, WebP, or SVG image containing a QR or barcode.');
      return;
    }
    setScanError('');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setScanPreviewUrl(dataUrl);
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1400;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 400) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 400) * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const found = await decodeCanvasFrame(canvas, canvas.width, canvas.height);
        if (found) {
          setScanResult(classifyDecodedPayload(found.value));
          setScanFormatBadge(found.format);
          onToast('success', 'Code Decoded', `Detected ${found.format} payload.`);
        } else {
          setScanResult(null);
          setScanFormatBadge('');
          setScanError(
            'No readable QR code found in this image. Ensure sharp edges, adequate quiet margin, and clear contrast.'
          );
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Live camera access is unavailable in this browser context. Use Image Upload above to decode QR/barcodes.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);

      requestAnimationFrame(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => undefined);

        const tick = async (ts: number) => {
          if (!streamRef.current || !videoRef.current) return;
          if (
            videoRef.current.readyState >= 2 &&
            ts - lastScanTimeRef.current > 240 &&
            videoRef.current.videoWidth > 0
          ) {
            lastScanTimeRef.current = ts;
            const canvas = hiddenCanvasRef.current || document.createElement('canvas');
            hiddenCanvasRef.current = canvas;
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const hit = await decodeCanvasFrame(canvas, canvas.width, canvas.height);
              if (hit) {
                setScanResult(classifyDecodedPayload(hit.value));
                setScanFormatBadge(hit.format);
                setScanError('');
                stopCamera();
                onToast('success', 'Camera Scan Complete', `Captured ${hit.format}.`);
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      });
    } catch (err) {
      stopCamera();
      setCameraError(
        err instanceof Error
          ? `Camera unavailable: ${err.message}. You can always upload or drop an image file above.`
          : 'Camera permission declined or no camera hardware detected.'
      );
    }
  };

  const inputCls =
    'w-full bg-[#100d1b] border border-violet-400/25 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Batch Label Sheet & Scanner</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Generate multi-label print-ready A4 PDF sheets or decode & inspect QR/barcodes from images or camera.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Batch and Scanner Mode"
          className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/10 self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'batch'}
            onClick={() => setActiveTab('batch')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'batch'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Batch Label Sheet
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'scanner'}
            onClick={() => setActiveTab('scanner')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'scanner'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            QR & Barcode Scanner
          </button>
        </div>
      </div>

      {activeTab === 'batch' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Batch Controls */}
          <div className="lg:col-span-6 glass-panel rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBatchMode('qr');
                    if (rawBatchText === SAMPLE_BARCODE_BATCH[batchStandard]) {
                      setRawBatchText(SAMPLE_QR_BATCH);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    batchMode === 'qr'
                      ? 'bg-violet-600/35 border border-violet-400 text-white'
                      : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  QR Code Batch
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchMode('barcode');
                    if (rawBatchText === SAMPLE_QR_BATCH) {
                      setRawBatchText(SAMPLE_BARCODE_BATCH[batchStandard]);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    batchMode === 'barcode'
                      ? 'bg-pink-600/35 border border-pink-400 text-white'
                      : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  Barcode Batch
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] border border-white/10 text-violet-300 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Load Sample Batch
                </button>
                <button
                  type="button"
                  onClick={() => setRawBatchText('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="batch-sheet-title" className="block text-xs font-medium text-slate-300 mb-1.5">
                  PDF Sheet Header Title
                </label>
                <input
                  id="batch-sheet-title"
                  type="text"
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  className={inputCls}
                />
              </div>

              {batchMode === 'barcode' && (
                <div>
                  <label htmlFor="batch-bc-standard" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Barcode Symbology
                  </label>
                  <select
                    id="batch-bc-standard"
                    value={batchStandard}
                    onChange={(e) => {
                      const nextStd = e.target.value as BarcodeStandard;
                      setBatchStandard(nextStd);
                      setRawBatchText(SAMPLE_BARCODE_BATCH[nextStd] || SAMPLE_BARCODE_BATCH.code128);
                    }}
                    className={inputCls}
                  >
                    {STANDARD_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {BARCODE_STANDARDS[key].label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="batch-items-textarea" className="text-xs font-medium text-slate-300">
                  Items (One per line — use <code className="font-mono text-pink-300">Label, Value</code> or raw values)
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 hover:text-white cursor-pointer">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Import CSV/TXT
                  <input
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCsvUpload(file);
                    }}
                  />
                </label>
              </div>
              <textarea
                id="batch-items-textarea"
                rows={8}
                value={rawBatchText}
                onChange={(e) => setRawBatchText(e.target.value)}
                placeholder={'Store Link, https://example.com\nTable 01, https://example.com/1'}
                className={`${inputCls} font-mono text-xs leading-relaxed`}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 tabular-nums">
                  {validItems.length} valid · {invalidCount} invalid (max {MAX_BATCH_ITEMS} labels/sheet)
                </span>
                {parsedBatch.truncatedCount > 0 && (
                  <span className="text-amber-300">
                    +{parsedBatch.truncatedCount} extra rows trimmed at {MAX_BATCH_ITEMS} limit
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={validItems.length === 0 || exportingPdf}
              onClick={handleExportBatchPdf}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 disabled:opacity-45 transition-all"
            >
              <Printer className="w-4 h-4" />
              {exportingPdf
                ? 'Rendering A4 Print Sheet...'
                : `Export Print-Ready PDF Sheet (${validItems.length} Labels)`}
            </button>
          </div>

          {/* Live Validation & Visual Label Sheet Preview */}
          <div className="lg:col-span-6 space-y-5">
            <div className="glass-panel-elevated rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-bold text-white">
                  Live Sheet Preview ({Math.min(6, validItems.length)} of {validItems.length})
                </h2>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  A4 Grid · 12 labels/page
                </span>
              </div>

              {validItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-xl">
                  Enter valid items or click &ldquo;Load Sample Batch&rdquo; to preview labels.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {validItems.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-[#0e0b19] border border-white/10 p-3 flex flex-col items-center gap-2"
                    >
                      {batchMode === 'qr' ? (
                        <QrPreviewCanvas
                          payload={item.normalizedValue}
                          design={{ ...qrDesign, frameStyle: 'none', caption: '' }}
                          previewSize={108}
                          showReliabilityBadge={false}
                        />
                      ) : (
                        <div className="w-full scale-90 origin-center">
                          <BarcodePreviewCanvas
                            config={{
                              ...barcodeConfig,
                              standard: batchStandard,
                              value: item.normalizedValue,
                              scale: 2,
                              height: 12,
                            }}
                          />
                        </div>
                      )}
                      <div className="w-full flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{item.label}</p>
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            {item.normalizedValue}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Download PNG for ${item.label}`}
                          onClick={async () => {
                            if (batchMode === 'qr') {
                              await exportQrCode(item.normalizedValue, qrDesign, 'PNG', item.label, 1024);
                            } else {
                              await exportBarcode(
                                { ...barcodeConfig, standard: batchStandard, value: item.normalizedValue },
                                'PNG',
                                item.label
                              );
                            }
                            onToast('success', 'Label Exported', `${item.label}.png saved.`);
                          }}
                          className="p-2 rounded-lg bg-white/[0.06] hover:bg-violet-600/30 text-slate-200 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Row-by-row validation ledger */}
            {parsedBatch.items.length > 0 && (
              <div className="glass-panel rounded-2xl p-5 space-y-3">
                <h3 className="font-display text-sm font-bold text-white">Row Validation Status</h3>
                <div className="max-h-60 overflow-y-auto divide-y divide-white/10 pr-1">
                  {parsedBatch.items.map((item) => (
                    <div key={item.id} className="py-2 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{item.label}</p>
                        <p className="font-mono text-[11px] text-slate-400 truncate">
                          {item.value}
                        </p>
                        {!item.valid && item.error && (
                          <p className="text-[11px] text-rose-300 mt-0.5">{item.error}</p>
                        )}
                      </div>
                      {item.valid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Upload & Live Camera Scanner */}
          <div className="lg:col-span-6 glass-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h2 className="font-display text-lg font-bold text-white">Decode Image or Camera</h2>
                <p className="text-xs text-slate-400">
                  100% client-side decoding — no images leave your device.
                </p>
              </div>
              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 border border-rose-400/40 text-rose-200 hover:bg-rose-500/30 whitespace-nowrap"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  Stop Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] border border-violet-400/30 text-white hover:bg-violet-600/25 whitespace-nowrap"
                >
                  <Camera className="w-3.5 h-3.5 text-pink-300" />
                  Start Camera Scan
                </button>
              )}
            </div>

            {cameraError && (
              <div className="p-3.5 rounded-xl bg-amber-950/35 border border-amber-500/35 text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {cameraActive && (
              <div className="relative rounded-2xl overflow-hidden border border-violet-400/40 bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full max-h-72 object-cover"
                />
                <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 text-[11px] text-slate-200 text-center">
                  Point camera steadily at any QR code or supported barcode
                </div>
              </div>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleScanImageFile(f);
              }}
              className={`rounded-2xl border border-dashed p-6 text-center transition-colors ${
                dragOver
                  ? 'border-pink-400 bg-pink-500/10'
                  : 'border-violet-400/35 bg-white/[0.02]'
              }`}
            >
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Upload className="w-6 h-6 text-violet-400" />
                <span className="text-sm font-semibold text-white">
                  Upload or drop a QR / Barcode image
                </span>
                <span className="text-xs text-slate-400">
                  Supports PNG, JPEG, WebP, and exported studio cards
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleScanImageFile(f);
                  }}
                />
              </label>
            </div>

            {scanPreviewUrl && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <img
                  src={scanPreviewUrl}
                  alt="Uploaded code preview"
                  className="w-16 h-16 object-contain rounded-lg bg-white p-1 shrink-0"
                />
                <div className="text-xs text-slate-300">
                  <p className="font-semibold text-white">Inspected Image</p>
                  <p className="text-slate-400 mt-0.5">
                    {scanResult
                      ? `Decoded as ${scanFormatBadge || 'QR_CODE'}`
                      : 'Ready for inspection'}
                  </p>
                </div>
              </div>
            )}

            {scanError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/35 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}
          </div>

          {/* Decoded Inspector Output */}
          <div className="lg:col-span-6 glass-panel-elevated rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
              <h2 className="font-display text-lg font-bold text-white">Decoded Payload Inspector</h2>
              {scanFormatBadge && (
                <span className="text-xs font-mono text-pink-300">{scanFormatBadge}</span>
              )}
            </div>

            {!scanResult ? (
              <div className="py-12 text-center space-y-2">
                <ScanLine className="w-8 h-8 text-violet-400/70 mx-auto" />
                <p className="text-sm font-medium text-slate-200">No code scanned yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Upload any QR image or start your camera to parse URLs, UPI payment URIs, WiFi credentials, vCards, or product numbers.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-[#0c0916] border border-violet-400/25 p-4 space-y-2">
                  <p className="text-xs font-semibold text-pink-300">{scanResult.typeLabel}</p>
                  <p
                    data-testid="scanner-decoded-raw"
                    className="text-xs font-mono text-white break-all"
                  >
                    {scanResult.raw}
                  </p>
                </div>

                {scanResult.details.length > 0 && (
                  <div className="divide-y divide-white/10 rounded-xl bg-white/[0.02] border border-white/10 px-4">
                    {scanResult.details.map((d) => (
                      <div key={d.label} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-slate-400">{d.label}</span>
                        <span className="font-medium text-white text-right break-all">{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(scanResult.raw);
                      setCopiedScan(true);
                      setTimeout(() => setCopiedScan(false), 1800);
                      onToast('info', 'Copied Decoded Data');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] border border-white/15 text-white hover:bg-white/[0.12]"
                  >
                    {copiedScan ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedScan ? 'Copied' : 'Copy Raw Data'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenInDesignStudio(scanResult.raw)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Re-Design in Studio
                  </button>

                  {scanResult.safeActionUrl && (
                    <a
                      href={scanResult.safeActionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.04] border border-violet-400/25 text-violet-200 hover:bg-violet-600/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Link
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
