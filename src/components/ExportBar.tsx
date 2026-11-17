import React, { useState } from 'react';
import { ExportFormat } from '../types/studio';
import { Download, FileImage, FileCode, FileText, Copy, Check, ImageDown } from 'lucide-react';

interface ExportBarProps {
  defaultSize?: number;
  showSizeSelector?: boolean;
  disabled?: boolean;
  onExport: (format: ExportFormat, size: number) => Promise<void>;
  onCopyPayload?: () => void;
  onCopyImage?: (size: number) => Promise<void>;
  copyLabel?: string;
}

const EXPORT_SIZES = [512, 1024, 2048, 4096];

export const ExportBar: React.FC<ExportBarProps> = ({
  defaultSize = 1024,
  showSizeSelector = true,
  disabled = false,
  onExport,
  onCopyPayload,
  onCopyImage,
  copyLabel = 'Copy Data',
}) => {
  const [exportSize, setExportSize] = useState<number>(defaultSize);
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);

  const handleExport = async (fmt: ExportFormat) => {
    if (disabled || busyFormat) return;
    setBusyFormat(fmt);
    try {
      await onExport(fmt, exportSize);
    } finally {
      setBusyFormat(null);
    }
  };

  const handleCopy = () => {
    if (!onCopyPayload) return;
    onCopyPayload();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCopyImg = async () => {
    if (!onCopyImage || disabled || copyingImage) return;
    setCopyingImage(true);
    try {
      await onCopyImage(exportSize);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 1800);
    } finally {
      setCopyingImage(false);
    }
  };

  return (
    <div className="space-y-3 w-full">
      {showSizeSelector && (
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="export-resolution-select"
            className="text-xs font-medium text-slate-300"
          >
            Export Resolution
          </label>
          <select
            id="export-resolution-select"
            value={exportSize}
            onChange={(e) => setExportSize(Number(e.target.value))}
            className="bg-[#131020] border border-violet-400/25 rounded-lg px-2.5 py-1.5 text-xs font-mono tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {EXPORT_SIZES.map((sz) => (
              <option key={sz} value={sz}>
                {sz} x {sz} px
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          disabled={disabled || busyFormat !== null}
          onClick={() => handleExport('PNG')}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 disabled:opacity-45 transition-all whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          {busyFormat === 'PNG' ? 'Saving...' : 'PNG'}
        </button>

        <button
          type="button"
          disabled={disabled || busyFormat !== null}
          onClick={() => handleExport('SVG')}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] border border-violet-400/25 text-white hover:bg-white/[0.11] disabled:opacity-45 transition-all whitespace-nowrap"
        >
          <FileCode className="w-3.5 h-3.5 shrink-0 text-violet-300" />
          {busyFormat === 'SVG' ? 'Saving...' : 'SVG'}
        </button>

        <button
          type="button"
          disabled={disabled || busyFormat !== null}
          onClick={() => handleExport('JPEG')}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] border border-violet-400/25 text-white hover:bg-white/[0.11] disabled:opacity-45 transition-all whitespace-nowrap"
        >
          <FileImage className="w-3.5 h-3.5 shrink-0 text-pink-300" />
          {busyFormat === 'JPEG' ? 'Saving...' : 'JPEG'}
        </button>

        <button
          type="button"
          disabled={disabled || busyFormat !== null}
          onClick={() => handleExport('PDF')}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] border border-violet-400/25 text-white hover:bg-white/[0.11] disabled:opacity-45 transition-all whitespace-nowrap"
        >
          <FileText className="w-3.5 h-3.5 shrink-0 text-purple-300" />
          {busyFormat === 'PDF' ? 'Saving...' : 'PDF'}
        </button>
      </div>

      {(onCopyPayload || onCopyImage) && (
        <div
          className={`grid gap-2 ${
            onCopyPayload && onCopyImage ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {onCopyPayload && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-slate-200 hover:bg-white/[0.08] disabled:opacity-45 transition-colors whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Copied Data
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {copyLabel}
                </>
              )}
            </button>
          )}

          {onCopyImage && (
            <button
              type="button"
              disabled={disabled || copyingImage}
              onClick={handleCopyImg}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] border border-violet-400/25 text-slate-200 hover:bg-violet-600/20 disabled:opacity-45 transition-colors whitespace-nowrap"
            >
              {copiedImage ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  PNG Copied
                </>
              ) : (
                <>
                  <ImageDown className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                  {copyingImage ? 'Rendering...' : 'Copy PNG'}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
