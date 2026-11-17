import React from 'react';
import { HistoryEntry, NavSection, QrCategory, SavedProject } from '../types/studio';
import { QR_CATEGORY_META } from '../utils/qrPayload';
import {
  QrCode,
  Barcode,
  IndianRupee,
  Palette,
  ArrowRight,
  Star,
  Download,
  FolderOpen,
  Clock,
  Layers,
} from 'lucide-react';

interface DashboardViewProps {
  projects: SavedProject[];
  history: HistoryEntry[];
  onNavigate: (section: NavSection) => void;
  onQuickCreateQr: (category: QrCategory) => void;
  onOpenProject: (project: SavedProject) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  history,
  onNavigate,
  onQuickCreateQr,
  onOpenProject,
}) => {
  const totalQrCodes = projects.filter((p) => p.kind === 'qr').length;
  const totalBarcodes = projects.filter((p) => p.kind === 'barcode').length;
  const favoriteDesigns = projects.filter((p) => p.favorite);
  const recentDownloads = history.filter((h) => h.action === 'downloaded').slice(0, 5);
  const recentProjects = projects.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="glass-panel-elevated rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-violet-600/25 to-pink-500/20 blur-3xl pointer-events-none"
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-white text-balance">
              Ultimate Barcode Studio
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Create Any QR Code. Design Any Barcode. Unlimited Possibilities. Generate production-grade QR designs, validated retail barcodes, and printable UPI payment posters directly in your browser.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('create-qr')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-violet-950/60 hover:brightness-110 transition-all whitespace-nowrap"
            >
              <QrCode className="w-4 h-4" />
              New QR Code
            </button>
            <button
              type="button"
              onClick={() => onNavigate('create-barcode')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-white/[0.06] border border-violet-400/30 text-white hover:bg-white/[0.12] transition-all whitespace-nowrap"
            >
              <Barcode className="w-4 h-4 text-pink-300" />
              New Barcode
            </button>
          </div>
        </div>
      </section>

      {/* Core KPI Stats */}
      <section aria-label="Workspace Summary" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Total QR Codes Created</p>
          <p
            data-testid="stat-total-qr"
            className="mt-2 font-display text-3xl font-bold text-white tabular-nums"
          >
            {totalQrCodes}
          </p>
          <p className="mt-1 text-xs text-slate-400">Saved across 15 QR formats</p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Total Barcodes Created</p>
          <p
            data-testid="stat-total-barcodes"
            className="mt-2 font-display text-3xl font-bold text-white tabular-nums"
          >
            {totalBarcodes}
          </p>
          <p className="mt-1 text-xs text-slate-400">EAN, UPC, CODE 128, ISBN & GS1</p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Favorite Designs</p>
          <p
            data-testid="stat-favorites"
            className="mt-2 font-display text-3xl font-bold text-pink-300 tabular-nums"
          >
            {favoriteDesigns.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Pinned for fast reuse</p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Recent Downloads</p>
          <p
            data-testid="stat-downloads"
            className="mt-2 font-display text-3xl font-bold text-violet-300 tabular-nums"
          >
            {history.filter((h) => h.action === 'downloaded').length}
          </p>
          <p className="mt-1 text-xs text-slate-400">PNG · SVG · JPEG · PDF exports</p>
        </div>
      </section>

      {/* Quick Create */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-white">Quick Create</h2>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('batch-scan')}
              className="text-xs font-semibold text-violet-300 hover:text-white inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5" />
              Batch &amp; Scanner
            </button>
            <button
              type="button"
              onClick={() => onNavigate('templates')}
              className="text-xs font-semibold text-pink-300 hover:text-pink-200 inline-flex items-center gap-1 whitespace-nowrap"
            >
              Browse Templates
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onQuickCreateQr('website')}
            className="glass-panel rounded-2xl p-5 text-left hover:border-violet-400/45 hover:bg-white/[0.05] transition-all group"
          >
            <QrCode className="w-6 h-6 text-violet-400 mb-3" />
            <p className="font-display font-semibold text-white group-hover:text-pink-200 transition-colors">
              Website & Link QR
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Encode any URL with custom colors, gradients, and center logo.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('upi-studio')}
            className="glass-panel rounded-2xl p-5 text-left hover:border-pink-400/45 hover:bg-white/[0.05] transition-all group"
          >
            <IndianRupee className="w-6 h-6 text-pink-400 mb-3" />
            <p className="font-display font-semibold text-white group-hover:text-pink-200 transition-colors">
              UPI Payment Poster
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Build standard Indian UPI payment QRs with shop standee layouts.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('create-barcode')}
            className="glass-panel rounded-2xl p-5 text-left hover:border-violet-400/45 hover:bg-white/[0.05] transition-all group"
          >
            <Barcode className="w-6 h-6 text-purple-400 mb-3" />
            <p className="font-display font-semibold text-white group-hover:text-pink-200 transition-colors">
              Product Barcode
            </p>
            <p className="text-xs text-slate-400 mt-1">
              CODE 128, EAN-13, UPC-A, ISBN-13 & GS1-128 with check-digit validation.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('design-studio')}
            className="glass-panel rounded-2xl p-5 text-left hover:border-pink-400/45 hover:bg-white/[0.05] transition-all group"
          >
            <Palette className="w-6 h-6 text-pink-300 mb-3" />
            <p className="font-display font-semibold text-white group-hover:text-pink-200 transition-colors">
              QR Design Studio
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Style dots, eyes, frames, logos, and run real-time scan reliability checks.
            </p>
          </button>
        </div>
      </section>

      {/* Two-column Workspace Feeds */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recently Created & Saved Projects */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-white">
              Recently Created Codes & Saved Projects
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('saved')}
              className="text-xs font-medium text-violet-300 hover:text-white inline-flex items-center gap-1"
            >
              View All ({projects.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-slate-400">No saved codes yet.</p>
              <button
                type="button"
                onClick={() => onNavigate('create-qr')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500"
              >
                Create Your First Code
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {recentProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{proj.name}</p>
                      {proj.favorite && <Star className="w-3.5 h-3.5 text-pink-400 fill-pink-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {proj.kind === 'qr'
                        ? QR_CATEGORY_META[proj.category as QrCategory]?.label || proj.category
                        : proj.category.toUpperCase()}{' '}
                      · <span className="font-mono">{proj.payload}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenProject(proj)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] border border-white/10 text-slate-200 hover:bg-violet-600/30 hover:border-violet-400/40 shrink-0 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Favorites & Recent Downloads */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white">Favorite Designs</h2>
              <Star className="w-4 h-4 text-pink-400" />
            </div>
            {favoriteDesigns.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                Star any saved QR or barcode to pin it here for instant access.
              </p>
            ) : (
              <ul className="space-y-2">
                {favoriteDesigns.slice(0, 4).map((fav) => (
                  <li key={fav.id}>
                    <button
                      type="button"
                      onClick={() => onOpenProject(fav)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-colors"
                    >
                      <p className="text-xs font-semibold text-white truncate">{fav.name}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {fav.kind.toUpperCase()} · {fav.category}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white">Recent Downloads</h2>
              <Download className="w-4 h-4 text-violet-300" />
            </div>
            {recentDownloads.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                Exported PNG, SVG, JPEG, and PDF files appear in your download log.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentDownloads.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-white/5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-slate-200 font-medium truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {item.format || 'PNG'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
