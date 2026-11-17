import React from 'react';
import { AppSettings, ErrorCorrectionLevel, ExportFormat, SavedProject } from '../types/studio';
import { Download, RotateCcw, Shield, Trash2 } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  projects: SavedProject[];
  onUpdateSettings: (next: AppSettings) => Promise<void>;
  onClearAllData: () => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  projects,
  onUpdateSettings,
  onClearAllData,
  onToast,
}) => {
  const handleExportBackup = () => {
    const data = JSON.stringify({ exportedAt: new Date().toISOString(), projects }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultimate-barcode-studio-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('success', 'Backup Downloaded', `${projects.length} projects exported as JSON.`);
  };

  const inputCls =
    'w-full bg-[#100d1b] border border-violet-400/25 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Studio Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Configure export defaults, optional monetization slots, and local IndexedDB storage.
        </p>
      </div>

      {/* Export Defaults */}
      <section className="glass-panel rounded-2xl p-6 space-y-5">
        <h2 className="font-display text-base font-bold text-white pb-3 border-b border-white/10">
          Export & Generation Defaults
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-default-fmt" className="block text-xs font-medium text-slate-300 mb-1.5">
              Default Export Format
            </label>
            <select
              id="set-default-fmt"
              value={settings.defaultExportFormat}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  defaultExportFormat: e.target.value as ExportFormat,
                })
              }
              className={inputCls}
            >
              <option value="PNG">PNG (Raster High-Res)</option>
              <option value="SVG">SVG (Vector Print)</option>
              <option value="JPEG">JPEG (Compressed)</option>
              <option value="PDF">PDF (Print Sheet)</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-default-size" className="block text-xs font-medium text-slate-300 mb-1.5">
              Default Export Resolution
            </label>
            <select
              id="set-default-size"
              value={settings.defaultExportSize}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  defaultExportSize: Number(e.target.value),
                })
              }
              className={inputCls}
            >
              <option value={512}>512 x 512 px</option>
              <option value={1024}>1024 x 1024 px</option>
              <option value={2048}>2048 x 2048 px</option>
              <option value={4096}>4096 x 4096 px</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-default-ecc" className="block text-xs font-medium text-slate-300 mb-1.5">
              Default QR Error Correction
            </label>
            <select
              id="set-default-ecc"
              value={settings.defaultEcc}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  defaultEcc: e.target.value as ErrorCorrectionLevel,
                })
              }
              className={inputCls}
            >
              <option value="L">L (7%)</option>
              <option value="M">M (15%)</option>
              <option value="Q">Q (25%)</option>
              <option value="H">H (30%)</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-default-margin" className="block text-xs font-medium text-slate-300 mb-1.5">
              Default Quiet Zone Margin (px)
            </label>
            <input
              id="set-default-margin"
              type="number"
              min={0}
              max={48}
              value={settings.defaultMargin}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  defaultMargin: Number(e.target.value),
                })
              }
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Google AdSense Readiness (Disabled by Default) */}
      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              Google AdSense Readiness (Disabled by Default)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure reserved header, sidebar, and content ad zones for future monetization. No ad scripts are loaded automatically.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settings.adsenseEnabled}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  adsenseEnabled: e.target.checked,
                })
              }
              className="rounded border-violet-400/40 bg-[#100d1b] text-violet-600"
            />
            Preview Slots
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-adsense-pub" className="block text-xs font-medium text-slate-300 mb-1.5">
              AdSense Publisher ID (Optional)
            </label>
            <input
              id="set-adsense-pub"
              type="text"
              value={settings.adsensePublisherId}
              onChange={(e) =>
                onUpdateSettings({ ...settings, adsensePublisherId: e.target.value })
              }
              placeholder="ca-pub-xxxxxxxxxxxxxxxx"
              className={`${inputCls} font-mono`}
            />
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-slate-300">Active Placement Zones</p>
            <div className="flex flex-wrap gap-4">
              {(['header', 'sidebar', 'content'] as const).map((zone) => (
                <label
                  key={zone}
                  className="inline-flex items-center gap-2 text-xs text-slate-300 capitalize cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={settings.adsenseSlots[zone]}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        adsenseSlots: {
                          ...settings.adsenseSlots,
                          [zone]: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-violet-400/40 bg-[#100d1b] text-violet-600"
                  />
                  {zone}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Local Privacy & Data Storage */}
      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
          <Shield className="w-5 h-5 text-violet-400" />
          <h2 className="font-display text-base font-bold text-white">
            Local Storage & Privacy Controls
          </h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Code generation runs directly in your browser. When signed in with a verified account, saved projects and export defaults sync privately to your isolated Firestore workspace.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.07] border border-violet-400/30 text-white hover:bg-white/[0.12]"
          >
            <Download className="w-4 h-4 text-violet-300" />
            Export JSON Backup ({projects.length})
          </button>

          <button
            type="button"
            onClick={async () => {
              await onUpdateSettings({
                ...settings,
                defaultExportFormat: 'PNG',
                defaultExportSize: 1024,
                defaultEcc: 'Q',
                defaultMargin: 16,
                adsenseEnabled: false,
                adsensePublisherId: '',
                adsenseSlots: { header: false, sidebar: false, content: false },
              });
              onToast('info', 'Settings Reset', 'Default studio preferences restored.');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-slate-200 hover:bg-white/[0.08]"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Preferences
          </button>

          <button
            type="button"
            onClick={onClearAllData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-950/45 border border-rose-500/35 text-rose-200 hover:bg-rose-950/70"
          >
            <Trash2 className="w-4 h-4" />
            Clear Local Database
          </button>
        </div>
      </section>
    </div>
  );
};
