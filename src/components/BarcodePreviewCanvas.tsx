import React, { useEffect, useRef, useState } from 'react';
import bwipjs from 'bwip-js/browser';
import { BarcodeConfig } from '../types/studio';
import { BARCODE_STANDARDS, validateAndPrepareBarcode } from '../utils/barcodeValidator';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface BarcodePreviewCanvasProps {
  config: BarcodeConfig;
  onThumbnailReady?: (dataUrl: string) => void;
}

export const BarcodePreviewCanvas: React.FC<BarcodePreviewCanvasProps> = ({
  config,
  onThumbnailReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const validation = validateAndPrepareBarcode(config.standard, config.value);
  const info = BARCODE_STANDARDS[config.standard];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!validation.valid) {
      setRenderError(validation.error || 'Invalid barcode value.');
      return;
    }

    try {
      const strip = (hex: string) => hex.replace('#', '').trim();
      bwipjs.toCanvas(canvas, {
        bcid: info.bwipBcid,
        text: validation.bwipText,
        scale: config.scale,
        height: config.height,
        includetext: config.includeText,
        textsize: config.textSize,
        textxalign: 'center',
        barcolor: strip(config.barColor),
        textcolor: strip(config.barColor),
        paddingwidth: config.padding,
        paddingheight: config.padding,
        ...(config.transparentBg ? {} : { backgroundcolor: strip(config.backgroundColor) }),
      });
      setRenderError(null);
      if (onThumbnailReady) {
        onThumbnailReady(canvas.toDataURL('image/png'));
      }
    } catch (err) {
      setRenderError(
        err instanceof Error ? err.message : 'Unable to encode barcode with current settings.'
      );
    }
  }, [config, validation.valid, validation.bwipText, validation.error, info.bwipBcid, onThumbnailReady]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div
        data-testid="barcode-preview-frame"
        className={`w-full min-h-[200px] rounded-2xl border border-violet-400/20 flex items-center justify-center p-5 overflow-x-auto ${
          config.transparentBg ? 'transparency-checker' : 'bg-white/[0.03]'
        }`}
      >
        {!validation.valid || renderError ? (
          <div
            data-testid="barcode-error-box"
            className="flex flex-col items-center text-center gap-2 max-w-sm text-rose-300"
          >
            <AlertCircle className="w-7 h-7 text-rose-400" />
            <p className="text-sm font-medium">{renderError || validation.error}</p>
            <p className="text-xs text-slate-400">{info.rulesSummary}</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            data-testid="barcode-canvas"
            className="max-w-full h-auto rounded-lg shadow-lg"
          />
        )}
      </div>

      {validation.valid && !renderError && (
        <div className="w-full rounded-xl px-3.5 py-2.5 text-xs bg-emerald-950/35 border border-emerald-500/30 text-emerald-200 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {info.label} valid
          </span>
          <span className="font-mono tabular-nums text-[11px] opacity-90 truncate">
            {validation.checkDigitInfo || validation.normalizedValue}
          </span>
        </div>
      )}
    </div>
  );
};
