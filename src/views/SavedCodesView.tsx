import React, { useMemo, useState } from 'react';
import { ExportFormat, SavedProject } from '../types/studio';
import { exportBarcode, exportQrCode } from '../utils/exportStudio';
import { DEFAULT_QR_DESIGN } from '../data/presets';
import {
  Search,
  Star,
  Copy,
  Trash2,
  FolderOpen,
  Download,
  Edit3,
  Check,
  X,
  QrCode,
  Barcode,
} from 'lucide-react';

interface SavedCodesViewProps {
  projects: SavedProject[];
  defaultExportSize: number;
  initialSearch?: string;
  onOpenProject: (project: SavedProject) => void;
  onToggleFavorite: (id: string) => Promise<void>;
  onRenameProject: (id: string, nextName: string) => Promise<void>;
  onDuplicateProject: (project: SavedProject) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onRecordDownload: (title: string, payload: string, format: ExportFormat) => Promise<void>;
  onToast: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const SavedCodesView: React.FC<SavedCodesViewProps> = ({
  projects,
  defaultExportSize,
  initialSearch = '',
  onOpenProject,
  onToggleFavorite,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
  onRecordDownload,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  React.useEffect(() => {
    if (initialSearch) setSearchQuery(initialSearch);
  }, [initialSearch]);
  const [filterKind, setFilterKind] = useState<'all' | 'qr' | 'barcode' | 'favorites'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      if (filterKind === 'qr' && p.kind !== 'qr') return false;
      if (filterKind === 'barcode' && p.kind !== 'barcode') return false;
      if (filterKind === 'favorites' && !p.favorite) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.payload.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [projects, searchQuery, filterKind]);

  const startRename = (proj: SavedProject) => {
    setEditingId(proj.id);
    setDraftName(proj.name);
  };

  const commitRename = async (id: string) => {
    if (draftName.trim()) {
      await onRenameProject(id, draftName.trim());
      onToast('success', 'Project Renamed');
    }
    setEditingId(null);
  };

  const handleQuickDownload = async (proj: SavedProject) => {
    if (proj.kind === 'qr') {
      await exportQrCode(
        proj.payload,
        proj.qrDesign || DEFAULT_QR_DESIGN,
        'PNG',
        proj.name,
        defaultExportSize
      );
    } else if (proj.barcodeConfig) {
      await exportBarcode(proj.barcodeConfig, 'PNG', proj.name);
    }
    await onRecordDownload(proj.name, proj.payload, 'PNG');
    onToast('success', 'Downloaded PNG', `${proj.name}.png saved.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">My Saved Codes</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Manage, rename, duplicate, favorite, and reopen your cloud-synced QR &amp; barcode projects.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Search saved codes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project name, category, or data..."
            className="w-full bg-[#100d1b] border border-violet-400/25 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 self-start">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'qr', label: 'QR Codes' },
              { id: 'barcode', label: 'Barcodes' },
              { id: 'favorites', label: 'Favorites' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterKind(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filterKind === tab.id
                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved List */}
      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-2">
          <p className="font-display text-base font-semibold text-white">No matching projects found</p>
          <p className="text-xs text-slate-400">
            Save a QR code or barcode from any generator to organize it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((proj) => (
            <article
              key={proj.id}
              data-testid={`saved-card-${proj.id}`}
              className="glass-panel rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-violet-400/35 transition-all"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-16 h-16 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {proj.thumbnailDataUrl ? (
                    <img
                      src={proj.thumbnailDataUrl}
                      alt={proj.name}
                      className="w-full h-full object-contain bg-white p-1"
                    />
                  ) : proj.kind === 'qr' ? (
                    <QrCode className="w-7 h-7 text-violet-400" />
                  ) : (
                    <Barcode className="w-7 h-7 text-pink-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {editingId === proj.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        aria-label="New project name"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && commitRename(proj.id)}
                        className="w-full bg-[#100d1b] border border-violet-400 rounded-lg px-2 py-1 text-xs text-white"
                      />
                      <button
                        type="button"
                        aria-label="Save name"
                        onClick={() => commitRename(proj.id)}
                        className="p-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel rename"
                        onClick={() => setEditingId(null)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-sm font-bold text-white truncate">
                        {proj.name}
                      </h2>
                      <button
                        type="button"
                        aria-label={`Favorite ${proj.name}`}
                        onClick={() => onToggleFavorite(proj.id)}
                        className="p-1 rounded-lg hover:bg-white/[0.06] shrink-0"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            proj.favorite ? 'text-pink-400 fill-pink-400' : 'text-slate-500'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {proj.kind.toUpperCase()} · {proj.category} ·{' '}
                    {new Date(proj.updatedAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs font-mono text-violet-200/90 truncate mt-1.5">
                    {proj.payload}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => onOpenProject(proj)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600/30 border border-violet-400/40 text-white hover:bg-violet-600/45 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Edit
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Download ${proj.name}`}
                    onClick={() => handleQuickDownload(proj)}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08]"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Rename ${proj.name}`}
                    onClick={() => startRename(proj)}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Duplicate ${proj.name}`}
                    onClick={async () => {
                      await onDuplicateProject(proj);
                      onToast('success', 'Project Duplicated');
                    }}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${proj.name}`}
                    onClick={async () => {
                      await onDeleteProject(proj.id);
                      onToast('info', 'Project Deleted', proj.name);
                    }}
                    className="p-2 rounded-lg text-rose-300 hover:text-rose-200 hover:bg-rose-500/15"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
