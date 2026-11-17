import React, { useState } from 'react';
import {
  CornerDotStyle,
  CornerSquareStyle,
  DotStyle,
  ErrorCorrectionLevel,
  ExportFormat,
  FrameStyle,
  QRDesignConfig,
} from '../types/studio';
import { DESIGN_PRESETS } from '../data/presets';
import { QrPreviewCanvas } from '../components/QrPreviewCanvas';
import { ExportBar } from '../components/ExportBar';
import {
  copyPngBlobToClipboard,
  exportQrCode,
  renderQrPngBlob,
} from '../utils/exportStudio';
import {
  Undo2,
  Redo2,
  BookmarkPlus,
  Upload,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface DesignStudioViewProps {
  payload: string;
  design: QRDesignConfig;
  defaultExportSize: number;
  onChangePayload: (next: string) => void;
  onChangeDesign: (next: QRDesignConfig) => void;
  onSaveProject: (name: string, payload: string, thumbnail?: string) => Promise<boolean>;
  onRecordDownload: (title: string, payload: string, format: ExportFormat) => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

const DOT_STYLES: { id: DotStyle; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'dots', label: 'Dots' },
  { id: 'extra-rounded', label: 'Extra Rounded' },
  { id: 'classy', label: 'Classy' },
  { id: 'classy-rounded', label: 'Classy Rounded' },
];

const CORNER_SQUARE_STYLES: { id: CornerSquareStyle; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'extra-rounded', label: 'Rounded' },
  { id: 'dot', label: 'Circle' },
];

const CORNER_DOT_STYLES: { id: CornerDotStyle; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'dot', label: 'Dot' },
];

const FRAME_STYLES: { id: FrameStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'clean-card', label: 'Clean Card' },
  { id: 'bottom-banner', label: 'Bottom Banner' },
  { id: 'top-badge', label: 'Top Badge' },
  { id: 'neon-violet', label: 'Neon Violet' },
  { id: 'luxury-gold', label: 'Luxury Gold' },
  { id: 'merchant-stand', label: 'Merchant Stand' },
];

export const DesignStudioView: React.FC<DesignStudioViewProps> = ({
  payload,
  design,
  defaultExportSize,
  onChangePayload,
  onChangeDesign,
  onSaveProject,
  onRecordDownload,
  onToast,
}) => {
  const [undoStack, setUndoStack] = useState<QRDesignConfig[]>([]);
  const [redoStack, setRedoStack] = useState<QRDesignConfig[]>([]);
  const [projectName, setProjectName] = useState('Custom Styled QR');
  const [thumbnail, setThumbnail] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const commitDesign = (next: QRDesignConfig) => {
    setUndoStack((prev) => [...prev.slice(-24), design]);
    setRedoStack([]);
    onChangeDesign(next);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, design]);
    onChangeDesign(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, design]);
    onChangeDesign(next);
  };

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onToast('error', 'Invalid Logo File', 'Upload PNG, SVG, JPEG, or WebP logo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      commitDesign({
        ...design,
        logoDataUrl: String(reader.result || ''),
        ecc: design.ecc === 'L' || design.ecc === 'M' ? 'H' : design.ecc,
      });
      onToast('success', 'Center Logo Applied', 'Error correction automatically boosted for reliable scanning.');
    };
    reader.readAsDataURL(file);
  };

  const handleExport = async (format: ExportFormat, size: number) => {
    if (!payload.trim()) {
      onToast('error', 'Empty QR payload', 'Enter QR content before exporting.');
      return;
    }
    await exportQrCode(payload, design, format, projectName, size);
    await onRecordDownload(projectName, payload, format);
    onToast('success', `Exported ${format}`, `${projectName} saved at ${size}px.`);
  };

  const handleSave = async () => {
    if (!payload.trim()) {
      onToast('error', 'Empty QR payload', 'Enter QR content before saving.');
      return;
    }
    try {
      const saved = await onSaveProject(projectName.trim() || 'Custom Styled QR', payload, thumbnail);
      if (saved) {
        onToast('success', 'Design Saved', 'Synced securely to your cloud account.');
      }
    } catch (err) {
      onToast(
        'error',
        'Save Failed',
        err instanceof Error ? err.message : 'Unable to save design.'
      );
    }
  };

  const inputCls =
    'w-full bg-[#100d1b] border border-violet-400/25 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-violet-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">QR Design Studio</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Customize colors, gradients, module shapes, eyes, center logos, and frames with live scan verification.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            aria-label="Undo design change"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.05] border border-white/10 text-slate-200 hover:bg-white/[0.1] disabled:opacity-35 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            aria-label="Redo design change"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.05] border border-white/10 text-slate-200 hover:bg-white/[0.1] disabled:opacity-35 transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
            Redo
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 transition-all whitespace-nowrap"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Save Design
          </button>
        </div>
      </div>

      {/* 12 Ready-Made Presets Strip */}
      <section className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-white">Ready-Made Style Templates</h2>
          <button
            type="button"
            onClick={() => commitDesign(DESIGN_PRESETS[4].design)}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Default
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {DESIGN_PRESETS.map((preset) => {
            const active = design.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => commitDesign({ ...preset.design, logoDataUrl: design.logoDataUrl })}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 ${
                  active
                    ? 'bg-violet-600/30 border-pink-400 text-white'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/25"
                  style={{
                    background: preset.design.gradient.enabled
                      ? `linear-gradient(135deg, ${preset.design.gradient.colorStops[0]}, ${preset.design.gradient.colorStops[1]})`
                      : preset.design.foregroundColor,
                  }}
                />
                <span className="truncate">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* Payload & Project Name */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-sm font-bold text-white">Content & Label</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ds-proj-name" className="block text-xs text-slate-400 mb-1">
                  Design Name
                </label>
                <input
                  id="ds-proj-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="ds-payload" className="block text-xs text-slate-400 mb-1">
                  Encoded QR Data / URL
                </label>
                <input
                  id="ds-payload"
                  type="text"
                  value={payload}
                  onChange={(e) => onChangePayload(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
          </div>

          {/* Colors & Gradients */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-white">Colors & Gradients</h3>
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={design.gradient.enabled}
                  onChange={(e) =>
                    commitDesign({
                      ...design,
                      gradient: { ...design.gradient, enabled: e.target.checked },
                    })
                  }
                  className="rounded border-violet-400/40 bg-[#100d1b] text-violet-600"
                />
                Enable Gradient
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {!design.gradient.enabled ? (
                <div>
                  <label htmlFor="ds-fg-color" className="block text-xs text-slate-400 mb-1">
                    Foreground Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="ds-fg-color"
                      type="color"
                      value={design.foregroundColor}
                      onChange={(e) =>
                        commitDesign({ ...design, foregroundColor: e.target.value, presetId: undefined })
                      }
                      className="h-9 w-11 rounded-lg bg-transparent border border-white/15 cursor-pointer"
                    />
                    <span className="font-mono text-xs text-slate-300">{design.foregroundColor}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="ds-grad-1" className="block text-xs text-slate-400 mb-1">
                      Gradient Start
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="ds-grad-1"
                        type="color"
                        value={design.gradient.colorStops[0]}
                        onChange={(e) =>
                          commitDesign({
                            ...design,
                            presetId: undefined,
                            gradient: {
                              ...design.gradient,
                              colorStops: [e.target.value, design.gradient.colorStops[1]],
                            },
                          })
                        }
                        className="h-9 w-11 rounded-lg bg-transparent border border-white/15 cursor-pointer"
                      />
                      <span className="font-mono text-xs text-slate-300">
                        {design.gradient.colorStops[0]}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ds-grad-2" className="block text-xs text-slate-400 mb-1">
                      Gradient End
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="ds-grad-2"
                        type="color"
                        value={design.gradient.colorStops[1]}
                        onChange={(e) =>
                          commitDesign({
                            ...design,
                            presetId: undefined,
                            gradient: {
                              ...design.gradient,
                              colorStops: [design.gradient.colorStops[0], e.target.value],
                            },
                          })
                        }
                        className="h-9 w-11 rounded-lg bg-transparent border border-white/15 cursor-pointer"
                      />
                      <span className="font-mono text-xs text-slate-300">
                        {design.gradient.colorStops[1]}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="ds-bg-color" className="block text-xs text-slate-400 mb-1">
                  Background
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="ds-bg-color"
                    type="color"
                    disabled={design.transparentBg}
                    value={design.backgroundColor}
                    onChange={(e) =>
                      commitDesign({ ...design, backgroundColor: e.target.value, presetId: undefined })
                    }
                    className="h-9 w-11 rounded-lg bg-transparent border border-white/15 cursor-pointer disabled:opacity-40"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={design.transparentBg}
                      onChange={(e) => commitDesign({ ...design, transparentBg: e.target.checked })}
                      className="rounded border-violet-400/40 bg-[#100d1b] text-violet-600"
                    />
                    Transparent
                  </label>
                </div>
              </div>
            </div>

            {design.gradient.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div>
                  <label htmlFor="ds-grad-type" className="block text-xs text-slate-400 mb-1">
                    Gradient Type
                  </label>
                  <select
                    id="ds-grad-type"
                    value={design.gradient.type}
                    onChange={(e) =>
                      commitDesign({
                        ...design,
                        gradient: {
                          ...design.gradient,
                          type: e.target.value as 'linear' | 'radial',
                        },
                      })
                    }
                    className={inputCls}
                  >
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="ds-grad-rot" className="text-slate-400">
                      Angle
                    </label>
                    <span className="font-mono text-violet-300">{design.gradient.rotation}°</span>
                  </div>
                  <input
                    id="ds-grad-rot"
                    type="range"
                    min={0}
                    max={360}
                    value={design.gradient.rotation}
                    onChange={(e) =>
                      commitDesign({
                        ...design,
                        gradient: { ...design.gradient, rotation: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-violet-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dots & Finder Eyes */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-sm font-bold text-white">Dot & Eye Geometry</h3>
            <div>
              <p className="text-xs text-slate-400 mb-2">Module Dot Style</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DOT_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => commitDesign({ ...design, dotStyle: st.id, presetId: undefined })}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      design.dotStyle === st.id
                        ? 'bg-violet-600/35 border-violet-400 text-white'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div>
                <label htmlFor="ds-corner-sq" className="block text-xs text-slate-400 mb-1">
                  Corner Eye Frame
                </label>
                <select
                  id="ds-corner-sq"
                  value={design.cornerSquareStyle}
                  onChange={(e) =>
                    commitDesign({
                      ...design,
                      cornerSquareStyle: e.target.value as CornerSquareStyle,
                    })
                  }
                  className={inputCls}
                >
                  {CORNER_SQUARE_STYLES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ds-corner-dot" className="block text-xs text-slate-400 mb-1">
                  Corner Eye Center
                </label>
                <select
                  id="ds-corner-dot"
                  value={design.cornerDotStyle}
                  onChange={(e) =>
                    commitDesign({
                      ...design,
                      cornerDotStyle: e.target.value as CornerDotStyle,
                    })
                  }
                  className={inputCls}
                >
                  {CORNER_DOT_STYLES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ds-eye-sq-color" className="block text-xs text-slate-400 mb-1">
                  Eye Frame Color
                </label>
                <input
                  id="ds-eye-sq-color"
                  type="color"
                  value={design.cornerSquareColor || design.foregroundColor}
                  onChange={(e) => commitDesign({ ...design, cornerSquareColor: e.target.value })}
                  className="h-9 w-14 rounded-lg bg-transparent border border-white/15 cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="ds-eye-dot-color" className="block text-xs text-slate-400 mb-1">
                  Eye Center Color
                </label>
                <input
                  id="ds-eye-dot-color"
                  type="color"
                  value={design.cornerDotColor || design.foregroundColor}
                  onChange={(e) => commitDesign({ ...design, cornerDotColor: e.target.value })}
                  className="h-9 w-14 rounded-lg bg-transparent border border-white/15 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Center Logo Upload */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-white">Center Brand Logo</h3>
              {design.logoDataUrl && (
                <button
                  type="button"
                  onClick={() => commitDesign({ ...design, logoDataUrl: undefined })}
                  className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Logo
                </button>
              )}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleLogoFile(file);
              }}
              className={`rounded-xl border border-dashed p-4 text-center transition-colors ${
                dragOver
                  ? 'border-pink-400 bg-pink-500/10'
                  : 'border-violet-400/35 bg-white/[0.02]'
              }`}
            >
              <label className="flex flex-col items-center gap-1.5 cursor-pointer">
                <Upload className="w-5 h-5 text-violet-400" />
                <span className="text-xs font-medium text-slate-200">
                  Drag & drop logo image or click to browse
                </span>
                <span className="text-[11px] text-slate-400">
                  PNG or SVG with transparent background recommended
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoFile(f);
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="ds-logo-size" className="text-slate-400">
                    Logo Scale
                  </label>
                  <span className="font-mono tabular-nums text-violet-300">
                    {Math.round(design.logoSize * 100)}%
                  </span>
                </div>
                <input
                  id="ds-logo-size"
                  type="range"
                  min={0.15}
                  max={0.45}
                  step={0.01}
                  value={design.logoSize}
                  onChange={(e) => commitDesign({ ...design, logoSize: Number(e.target.value) })}
                  className="w-full accent-pink-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="ds-logo-margin" className="text-slate-400">
                    Logo Padding
                  </label>
                  <span className="font-mono tabular-nums text-violet-300">
                    {design.logoMargin} px
                  </span>
                </div>
                <input
                  id="ds-logo-margin"
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={design.logoMargin}
                  onChange={(e) => commitDesign({ ...design, logoMargin: Number(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={design.logoHideBackgroundDots}
                onChange={(e) =>
                  commitDesign({ ...design, logoHideBackgroundDots: e.target.checked })
                }
                className="rounded border-violet-400/40 bg-[#100d1b] text-violet-600"
              />
              Clear QR dots behind center logo (improves legibility)
            </label>
          </div>

          {/* Frame, Text, Margin & Error Correction */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-sm font-bold text-white">Frame, Margin & Precision</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ds-frame-style" className="block text-xs text-slate-400 mb-1">
                  Frame Style
                </label>
                <select
                  id="ds-frame-style"
                  value={design.frameStyle}
                  onChange={(e) =>
                    commitDesign({ ...design, frameStyle: e.target.value as FrameStyle })
                  }
                  className={inputCls}
                >
                  {FRAME_STYLES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ds-ecc" className="block text-xs text-slate-400 mb-1">
                  Error Correction Level
                </label>
                <select
                  id="ds-ecc"
                  value={design.ecc}
                  onChange={(e) =>
                    commitDesign({ ...design, ecc: e.target.value as ErrorCorrectionLevel })
                  }
                  className={inputCls}
                >
                  <option value="L">L — 7% (Cleanest matrix)</option>
                  <option value="M">M — 15% (Standard)</option>
                  <option value="Q">Q — 25% (Recommended)</option>
                  <option value="H">H — 30% (Best with center logo)</option>
                </select>
              </div>
              <div>
                <label htmlFor="ds-frame-text" className="block text-xs text-slate-400 mb-1">
                  Frame Banner Text
                </label>
                <input
                  id="ds-frame-text"
                  type="text"
                  value={design.frameText}
                  onChange={(e) => commitDesign({ ...design, frameText: e.target.value })}
                  placeholder="SCAN TO OPEN"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="ds-caption" className="block text-xs text-slate-400 mb-1">
                  Footer Caption
                </label>
                <input
                  id="ds-caption"
                  type="text"
                  value={design.caption}
                  onChange={(e) => commitDesign({ ...design, caption: e.target.value })}
                  placeholder="Optional subtitle below QR"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10">
              <div>
                <label htmlFor="ds-frame-color" className="block text-xs text-slate-400 mb-1">
                  Frame Accent
                </label>
                <input
                  id="ds-frame-color"
                  type="color"
                  value={design.frameColor}
                  onChange={(e) => commitDesign({ ...design, frameColor: e.target.value })}
                  className="h-9 w-12 rounded-lg bg-transparent border border-white/15 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="ds-margin" className="text-slate-400">
                    Quiet Zone Margin
                  </label>
                  <span className="font-mono tabular-nums text-violet-300">{design.margin} px</span>
                </div>
                <input
                  id="ds-margin"
                  type="range"
                  min={0}
                  max={40}
                  value={design.margin}
                  onChange={(e) => commitDesign({ ...design, margin: Number(e.target.value) })}
                  className="w-full accent-violet-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="ds-qr-size" className="text-slate-400">
                    Base Canvas Size
                  </label>
                  <span className="font-mono tabular-nums text-violet-300">{design.size} px</span>
                </div>
                <input
                  id="ds-qr-size"
                  type="range"
                  min={200}
                  max={512}
                  step={16}
                  value={design.size}
                  onChange={(e) => commitDesign({ ...design, size: Number(e.target.value) })}
                  className="w-full accent-pink-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Live Studio Preview & Export Center */}
        <div className="lg:col-span-5 glass-panel-elevated rounded-2xl p-5 space-y-4 sticky top-20">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">Live Studio Preview</h2>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {design.dotStyle} · {design.ecc}
            </span>
          </div>

          <QrPreviewCanvas
            payload={payload || 'https://ultimatebarcodestudio.app'}
            design={design}
            previewSize={224}
            showReliabilityBadge={true}
            onThumbnailReady={setThumbnail}
          />

          <ExportBar
            defaultSize={defaultExportSize}
            onExport={handleExport}
            onCopyPayload={() => {
              navigator.clipboard.writeText(payload);
              onToast('info', 'Copied QR data', payload);
            }}
            onCopyImage={async (size) => {
              try {
                const blob = await renderQrPngBlob(payload || 'https://ultimatebarcodestudio.app', design, size);
                await copyPngBlobToClipboard(blob);
                onToast('success', 'Styled QR PNG Copied', 'Paste directly into your design or doc.');
              } catch (err) {
                onToast(
                  'error',
                  'Clipboard Copy Unavailable',
                  err instanceof Error ? err.message : 'Download PNG instead.'
                );
              }
            }}
            copyLabel="Copy QR Data"
          />
        </div>
      </div>
    </div>
  );
};
