import React, { useState } from 'react';
import { BarcodeConfig, BarcodeStandard, ExportFormat } from '../types/studio';
import {
  BARCODE_STANDARDS,
  validateAndPrepareBarcode,
} from '../utils/barcodeValidator';
import { BarcodePreviewCanvas } from '../components/BarcodePreviewCanvas';
import { ExportBar } from '../components/ExportBar';
import {
  copyPngBlobToClipboard,
  exportBarcode,
  renderBarcodePngBlob,
} from '../utils/exportStudio';
import { BookmarkPlus, Info, RotateCcw } from 'lucide-react';

interface CreateBarcodeViewProps {
  config: BarcodeConfig;
  onChangeConfig: (next: BarcodeConfig) => void;
  onSaveProject: (name: string, payload: string, thumbnail?: string) => Promise<boolean>;
  onRecordDownload: (title: string, payload: string, format: ExportFormat) => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

const STANDARD_KEYS = Object.keys(BARCODE_STANDARDS) as BarcodeStandard[];

export const CreateBarcodeView: React.FC<CreateBarcodeViewProps> = ({
  config,
  onChangeConfig,
  onSaveProject,
  onRecordDownload,
  onToast,
}) => {
  const [projectName, setProjectName] = useState(
    `${BARCODE_STANDARDS[config.standard].label} Barcode`
  );
  const [thumbnail, setThumbnail] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const info = BARCODE_STANDARDS[config.standard];
  const validation = validateAndPrepareBarcode(config.standard, config.value);

  const handleStandardChange = (std: BarcodeStandard) => {
    const nextInfo = BARCODE_STANDARDS[std];
    onChangeConfig({
      ...config,
      standard: std,
      value: nextInfo.sampleValue,
    });
    setProjectName(`${nextInfo.label} Barcode`);
  };

  const handleSave = async () => {
    if (!validation.valid) {
      onToast('error', 'Invalid barcode input', validation.error);
      return;
    }
    setSaving(true);
    try {
      const saved = await onSaveProject(
        projectName.trim() || `${info.label} Barcode`,
        validation.normalizedValue,
        thumbnail
      );
      if (saved) {
        onToast('success', 'Barcode Saved', 'Synced securely to your cloud account.');
      }
    } catch (err) {
      onToast(
        'error',
        'Save Failed',
        err instanceof Error ? err.message : 'Unable to save barcode.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!validation.valid) {
      onToast('error', 'Cannot export invalid barcode', validation.error);
      return;
    }
    const title = projectName.trim() || `${info.label}-${validation.normalizedValue}`;
    await exportBarcode(config, format, title);
    await onRecordDownload(title, validation.normalizedValue, format);
    onToast('success', `Exported ${format}`, `${title} downloaded.`);
  };

  const inputCls =
    'w-full bg-[#100d1b] border border-violet-400/25 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500';
  const labelCls = 'block text-xs font-medium text-slate-300 mb-1.5';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Professional Barcode Generator</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Generate 13 international barcode symbologies with automatic Mod-10/Mod-11 check-digit verification.
        </p>
      </div>

      {/* Symbology Selector */}
      <div
        role="tablist"
        aria-label="Barcode Standards"
        className="flex flex-wrap gap-2"
      >
        {STANDARD_KEYS.map((key) => {
          const active = config.standard === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleStandardChange(key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-sm'
                  : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-white/[0.09] hover:text-white'
              }`}
            >
              {BARCODE_STANDARDS[key].label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Panel */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 className="font-display text-lg font-bold text-white">{info.label}</h2>
              <p className="text-xs text-slate-400">{info.category}</p>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, value: info.sampleValue })}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Use Sample
            </button>
          </div>

          <div>
            <label htmlFor="bc-project-name" className={labelCls}>
              Project Name
            </label>
            <input
              id="bc-project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="bc-value-input" className={labelCls}>
              Barcode Data / Identifier
            </label>
            <input
              id="bc-value-input"
              type="text"
              value={config.value}
              onChange={(e) => onChangeConfig({ ...config, value: e.target.value })}
              placeholder={info.placeholder}
              className={`${inputCls} font-mono`}
            />
            <p className="mt-1.5 text-xs text-slate-400">{info.rulesSummary}</p>
          </div>

          {info.isProductIdentifier && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-950/30 border border-violet-400/25 text-xs text-slate-300">
              <Info className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
              <span>
                Check digits are mathematically validated, but generating a barcode does not mean a product number is officially registered with GS1 or an ISBN agency.
              </span>
            </div>
          )}

          {/* Dimensions & Appearance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <label htmlFor="bc-scale" className="text-slate-300 font-medium">
                  Bar Width Scale
                </label>
                <span className="font-mono tabular-nums text-violet-300">{config.scale}x</span>
              </div>
              <input
                id="bc-scale"
                type="range"
                min={1}
                max={6}
                step={1}
                value={config.scale}
                onChange={(e) => onChangeConfig({ ...config, scale: Number(e.target.value) })}
                className="w-full accent-violet-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <label htmlFor="bc-height" className="text-slate-300 font-medium">
                  Bar Height
                </label>
                <span className="font-mono tabular-nums text-violet-300">{config.height} mm</span>
              </div>
              <input
                id="bc-height"
                type="range"
                min={8}
                max={40}
                step={1}
                value={config.height}
                onChange={(e) => onChangeConfig({ ...config, height: Number(e.target.value) })}
                className="w-full accent-pink-500"
              />
            </div>

            <div>
              <label htmlFor="bc-bar-color" className={labelCls}>
                Bar & Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="bc-bar-color"
                  type="color"
                  value={config.barColor}
                  onChange={(e) => onChangeConfig({ ...config, barColor: e.target.value })}
                  className="h-10 w-12 rounded-lg border border-white/15 bg-transparent cursor-pointer"
                />
                <span className="font-mono text-xs text-slate-300">{config.barColor}</span>
              </div>
            </div>

            <div>
              <label htmlFor="bc-bg-color" className={labelCls}>
                Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="bc-bg-color"
                  type="color"
                  disabled={config.transparentBg}
                  value={config.backgroundColor}
                  onChange={(e) => onChangeConfig({ ...config, backgroundColor: e.target.value })}
                  className="h-10 w-12 rounded-lg border border-white/15 bg-transparent cursor-pointer disabled:opacity-40"
                />
                <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.transparentBg}
                    onChange={(e) => onChangeConfig({ ...config, transparentBg: e.target.checked })}
                    className="rounded border-violet-400/40 bg-[#100d1b] text-violet-600"
                  />
                  Transparent
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
            <label className="inline-flex items-center gap-2.5 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeText}
                onChange={(e) => onChangeConfig({ ...config, includeText: e.target.checked })}
                className="rounded border-violet-400/40 bg-[#100d1b] text-violet-600"
              />
              Show Human-Readable Text
            </label>

            {config.includeText && (
              <div className="flex items-center gap-2">
                <label htmlFor="bc-text-size" className="text-xs text-slate-400">
                  Text Size
                </label>
                <input
                  id="bc-text-size"
                  type="number"
                  min={8}
                  max={18}
                  value={config.textSize}
                  onChange={(e) => onChangeConfig({ ...config, textSize: Number(e.target.value) })}
                  className="w-16 bg-[#100d1b] border border-white/15 rounded-lg px-2 py-1 text-xs font-mono text-white"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!validation.valid || saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.08] border border-violet-400/35 text-white hover:bg-violet-600/30 disabled:opacity-45 transition-all"
          >
            <BookmarkPlus className="w-4 h-4 text-pink-300" />
            {saving ? 'Saving...' : 'Save Barcode Project'}
          </button>
        </div>

        {/* Live Barcode Preview & Export */}
        <div className="lg:col-span-6 glass-panel-elevated rounded-2xl p-6 space-y-5 sticky top-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">Real-Time Barcode Preview</h2>
            <span className="text-xs font-mono text-slate-400">{info.label}</span>
          </div>

          <BarcodePreviewCanvas config={config} onThumbnailReady={setThumbnail} />

          <ExportBar
            showSizeSelector={false}
            disabled={!validation.valid}
            onExport={(fmt) => handleExport(fmt)}
            onCopyPayload={() => {
              navigator.clipboard.writeText(validation.normalizedValue);
              onToast('info', 'Copied Barcode Value', validation.normalizedValue);
            }}
            onCopyImage={async () => {
              try {
                const blob = await renderBarcodePngBlob(config);
                await copyPngBlobToClipboard(blob);
                onToast('success', 'Barcode PNG Copied', 'Ready to paste directly.');
              } catch (err) {
                onToast(
                  'error',
                  'Clipboard Copy Unavailable',
                  err instanceof Error ? err.message : 'Download PNG instead.'
                );
              }
            }}
            copyLabel="Copy Normalized Value"
          />
        </div>
      </div>
    </div>
  );
};
