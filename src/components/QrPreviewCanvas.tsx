import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import jsQR from 'jsqr';
import { QRDesignConfig } from '../types/studio';
import { buildQrStylingOptions } from '../utils/exportStudio';
import { analyzeDesignReliability, ScanReliabilityReport } from '../utils/contrastAndScan';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface QrPreviewCanvasProps {
  payload: string;
  design: QRDesignConfig;
  previewSize?: number;
  showReliabilityBadge?: boolean;
  onReliabilityChange?: (report: ScanReliabilityReport) => void;
  onThumbnailReady?: (dataUrl: string) => void;
}

export const QrPreviewCanvas: React.FC<QrPreviewCanvasProps> = ({
  payload,
  design,
  previewSize = 260,
  showReliabilityBadge = true,
  onReliabilityChange,
  onThumbnailReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrInstanceRef = useRef<QRCodeStyling | null>(null);
  const [decodePassed, setDecodePassed] = useState<boolean | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options = buildQrStylingOptions(payload, design, previewSize);
    if (!qrInstanceRef.current) {
      qrInstanceRef.current = new QRCodeStyling(options);
      container.innerHTML = '';
      qrInstanceRef.current.append(container);
    } else {
      qrInstanceRef.current.update(options);
    }

    let cancelled = false;
    const runScanCheck = async () => {
      // Wait for qr-code-styling internal canvas drawing promise if present
      const internalPromise = (qrInstanceRef.current as unknown as { _canvasDrawingPromise?: Promise<void> })
        ?._canvasDrawingPromise;
      if (internalPromise) {
        try {
          await internalPromise;
        } catch {
          // ignore
        }
      }
      if (cancelled) return;
      const canvas = container.querySelector('canvas');
      if (!canvas || canvas.width === 0 || canvas.height === 0) return;

      try {
        // Composite onto a solid canvas so transparent backgrounds still decode accurately
        const probe = document.createElement('canvas');
        probe.width = canvas.width;
        probe.height = canvas.height;
        const pCtx = probe.getContext('2d', { willReadFrequently: true });
        if (!pCtx) return;
        pCtx.fillStyle = design.transparentBg ? '#ffffff' : design.backgroundColor || '#ffffff';
        pCtx.fillRect(0, 0, probe.width, probe.height);
        pCtx.drawImage(canvas, 0, 0);

        const imageData = pCtx.getImageData(0, 0, probe.width, probe.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        const ok = Boolean(decoded && decoded.data);
        if (!cancelled) {
          setDecodePassed(ok);
          if (onThumbnailReady) {
            onThumbnailReady(canvas.toDataURL('image/png'));
          }
        }
      } catch {
        if (!cancelled) setDecodePassed(null);
      }
    };

    const timer = setTimeout(() => {
      void runScanCheck();
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [payload, design, previewSize, onThumbnailReady]);

  const report = analyzeDesignReliability(design, decodePassed);

  useEffect(() => {
    onReliabilityChange?.(report);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.status, report.contrastScore, report.warnings.length, decodePassed]);

  const hasFrame = design.frameStyle !== 'none';
  const isDarkFrame =
    design.frameStyle === 'neon-violet' || design.frameStyle === 'luxury-gold';

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div
        data-testid="qr-preview-frame"
        className={`relative flex flex-col items-center justify-center transition-all duration-200 ${
          design.transparentBg ? 'transparency-checker' : ''
        } ${hasFrame ? 'p-4 rounded-2xl' : 'p-2 rounded-xl'}`}
        style={{
          backgroundColor: design.transparentBg
            ? undefined
            : isDarkFrame
            ? '#0c0818'
            : design.backgroundColor,
          border: hasFrame
            ? `2px solid ${design.frameColor || '#7c3aed'}`
            : '1px solid rgba(167,139,250,0.18)',
          boxShadow:
            design.frameStyle === 'neon-violet'
              ? `0 0 28px -6px ${design.frameColor || '#a855f7'}`
              : '0 18px 36px -14px rgba(0,0,0,0.55)',
        }}
      >
        {(design.frameStyle === 'top-badge' || design.frameStyle === 'merchant-stand') &&
          design.frameText.trim() && (
            <div
              className="w-full py-1.5 px-3 mb-3 rounded-lg text-center text-xs font-bold tracking-wide"
              style={{
                backgroundColor: design.frameColor,
                color: design.frameTextColor,
              }}
            >
              {design.frameText}
            </div>
          )}

        <div
          ref={containerRef}
          data-testid="qr-canvas-container"
          className="flex items-center justify-center overflow-hidden rounded-lg"
          style={{ width: previewSize, height: previewSize }}
        />

        {(design.frameStyle === 'bottom-banner' ||
          design.frameStyle === 'clean-card' ||
          design.frameStyle === 'neon-violet' ||
          design.frameStyle === 'luxury-gold') &&
          design.frameText.trim() && (
            <div
              className="w-full py-1.5 px-3 mt-3 rounded-lg text-center text-xs font-bold tracking-wide"
              style={{
                backgroundColor: design.frameColor,
                color: design.frameTextColor,
              }}
            >
              {design.frameText}
            </div>
          )}

        {design.caption.trim() && (
          <p
            className="mt-2 text-xs font-medium text-center max-w-[240px] truncate"
            style={{ color: isDarkFrame ? '#e2e8f0' : '#475569' }}
          >
            {design.caption}
          </p>
        )}
      </div>

      {showReliabilityBadge && (
        <div
          data-testid="qr-reliability-status"
          className={`w-full rounded-xl px-3.5 py-2.5 text-xs border ${
            report.status === 'reliable'
              ? 'bg-emerald-950/35 border-emerald-500/30 text-emerald-200'
              : report.status === 'caution'
              ? 'bg-amber-950/35 border-amber-500/30 text-amber-200'
              : 'bg-rose-950/40 border-rose-500/35 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2 font-semibold">
            <span className="flex items-center gap-1.5">
              {report.status === 'reliable' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {report.status === 'caution' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
              {report.status === 'risk' && <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />}
              {report.status === 'reliable'
                ? 'Scan Verified'
                : report.status === 'caution'
                ? 'Moderate Scan Caution'
                : 'Low Scan Reliability'}
            </span>
            <span className="font-mono tabular-nums opacity-85">
              Contrast {report.contrastScore}:1 · ECC {design.ecc}
            </span>
          </div>
          {report.warnings.length > 0 && (
            <ul className="mt-1.5 space-y-1 text-[11px] opacity-90 list-disc pl-4">
              {report.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
