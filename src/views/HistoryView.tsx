import React, { useMemo, useState } from 'react';
import { HistoryEntry } from '../types/studio';
import { Clock, Download, FolderPlus, RotateCcw, Trash2, Search } from 'lucide-react';

interface HistoryViewProps {
  history: HistoryEntry[];
  onReopenEntry: (entry: HistoryEntry) => void;
  onClearHistory: () => Promise<void>;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onReopenEntry,
  onClearHistory,
}) => {
  const [filterAction, setFilterAction] = useState<'all' | 'created' | 'downloaded'>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((h) => {
      if (filterAction !== 'all' && h.action !== filterAction) return false;
      if (!q) return true;
      return (
        h.title.toLowerCase().includes(q) ||
        h.payload.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q)
      );
    });
  }, [history, filterAction, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Creation & Export History</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Personal audit log of your saved codes and exported files.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-rose-950/40 border border-rose-500/35 text-rose-200 hover:bg-rose-950/60 self-start whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Search history"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter history..."
            className="w-full bg-[#100d1b] border border-violet-400/25 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 self-start">
          {(['all', 'created', 'downloaded'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterAction(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterAction === tab
                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-2">
          <p className="font-display text-base font-semibold text-white">No history entries yet</p>
          <p className="text-xs text-slate-400">
            Generated projects and file exports will be logged here automatically.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl divide-y divide-white/10 overflow-hidden">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02]"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                  {entry.action === 'downloaded' ? (
                    <Download className="w-4 h-4 text-pink-400" />
                  ) : (
                    <FolderPlus className="w-4 h-4 text-violet-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{entry.title}</p>
                  <p className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="capitalize">{entry.action}</span>
                    {entry.format && <span>· {entry.format}</span>}
                    <span>· {entry.kind.toUpperCase()}</span>
                    <span>· {entry.category}</span>
                    <span className="inline-flex items-center gap-1">
                      · <Clock className="w-3 h-3" />
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </p>
                  <p className="text-xs font-mono text-violet-200/80 truncate mt-1">
                    {entry.payload}
                  </p>
                </div>
              </div>

              {entry.projectSnapshot && (
                <button
                  type="button"
                  onClick={() => onReopenEntry(entry)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] border border-white/10 text-slate-200 hover:bg-violet-600/30 shrink-0 self-start sm:self-center"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reopen
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
