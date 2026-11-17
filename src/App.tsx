import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppSettings,
  BarcodeConfig,
  BarcodeStandard,
  ExportFormat,
  HistoryEntry,
  NavSection,
  QRDesignConfig,
  QrCategory,
  QrFormState,
  SavedProject,
  ToastMessage,
} from './types/studio';
import {
  QR_CATEGORY_META,
  createDefaultQrFormState,
  buildQrPayload,
} from './utils/qrPayload';
import { BARCODE_STANDARDS } from './utils/barcodeValidator';
import {
  DEFAULT_QR_DESIGN,
  MARKETPLACE_TEMPLATES,
  MarketplaceTemplate,
} from './data/presets';
import {
  DEFAULT_SETTINGS,
  clearAllStudioData,
  initializeStudioStorage,
  saveSettingsToDb,
} from './services/storage';
import {
  addHistoryEntryToFirestore,
  clearUserHistoryInFirestore,
  createSavedProjectInFirestore,
  deleteProjectFromFirestore,
  renameProjectInFirestore,
  subscribeToUserHistory,
  subscribeToUserProjects,
  toggleFavoriteInFirestore,
} from './services/firestoreService';
import { useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { AdPlacementSlot } from './components/AdPlacementSlot';
import { ToastContainer } from './components/ToastContainer';
import { AuthModal, AuthModalMode } from './components/AuthModal';
import { ProtectedGate } from './components/ProtectedGate';
import { DashboardView } from './views/DashboardView';
import { CreateQrView } from './views/CreateQrView';
import { CreateBarcodeView } from './views/CreateBarcodeView';
import { UpiStudioView } from './views/UpiStudioView';
import { DesignStudioView } from './views/DesignStudioView';
import { BatchScanView } from './views/BatchScanView';
import { SavedCodesView } from './views/SavedCodesView';
import { TemplatesView } from './views/TemplatesView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { HelpCenterView } from './views/HelpCenterView';
import { AccountView } from './views/AccountView';
import { ArrowRight, LogIn, Menu, Plus, Search, UserCircle2 } from 'lucide-react';

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  'create-qr': 'Create QR Code',
  'create-barcode': 'Create Barcode',
  'upi-studio': 'UPI QR Studio',
  'design-studio': 'Design Studio',
  'batch-scan': 'Batch & Scanner',
  saved: 'My Saved Codes',
  templates: 'Templates',
  history: 'History',
  settings: 'Settings',
  help: 'Help Center',
  account: 'My Account',
};

interface QuickJumpItem {
  id: string;
  label: string;
  group: string;
  onSelect: () => void;
}

export default function App() {
  const { user, authReady, isVerified, cloudProfile, syncCloudProfileSettings } = useAuth();

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [storageReady, setStorageReady] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');
  const [authContextHint, setAuthContextHint] = useState<string | undefined>(undefined);

  const [qrForm, setQrForm] = useState<QrFormState>(() => createDefaultQrFormState());
  const [qrDesign, setQrDesign] = useState<QRDesignConfig>(() => ({ ...DEFAULT_QR_DESIGN }));
  const [studioPayload, setStudioPayload] = useState<string>('https://ultimatebarcodestudio.app');

  const [barcodeConfig, setBarcodeConfig] = useState<BarcodeConfig>({
    standard: 'code128',
    value: 'UB-2026-PRO-001',
    scale: 3,
    height: 18,
    includeText: true,
    textSize: 11,
    barColor: '#09090b',
    backgroundColor: '#ffffff',
    transparentBg: false,
    padding: 16,
  });

  const [globalSearch, setGlobalSearch] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openAuthModal = useCallback((mode: AuthModalMode = 'signin', hint?: string) => {
    setAuthModalMode(mode);
    setAuthContextHint(hint);
    setAuthModalOpen(true);
  }, []);

  // Load local preferences (works immediately in Guest Mode too)
  useEffect(() => {
    let active = true;
    initializeStudioStorage().then((data) => {
      if (!active) return;
      setSettings(data.settings);
      setStorageReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Merge cloud export defaults when verified user profile loads
  useEffect(() => {
    if (!cloudProfile) return;
    setSettings((prev) => ({
      ...prev,
      defaultExportFormat: cloudProfile.defaultExportFormat || prev.defaultExportFormat,
      defaultExportSize: cloudProfile.defaultExportSize || prev.defaultExportSize,
      defaultEcc: cloudProfile.defaultEcc || prev.defaultEcc,
      defaultMargin:
        typeof cloudProfile.defaultMargin === 'number'
          ? cloudProfile.defaultMargin
          : prev.defaultMargin,
    }));
  }, [cloudProfile]);

  // Real-time Firestore sync scoped strictly to authenticated & verified owner
  useEffect(() => {
    if (!authReady) return;
    if (!user || !isVerified) {
      setProjects([]);
      setHistory([]);
      return;
    }

    const unsubProjects = subscribeToUserProjects(user.uid, (nextProjects) => {
      setProjects(nextProjects);
    });
    const unsubHistory = subscribeToUserHistory(user.uid, (nextHistory) => {
      setHistory(nextHistory);
    });

    return () => {
      unsubProjects();
      unsubHistory();
    };
  }, [authReady, user, isVerified]);

  const requireVerifiedAccountForSave = useCallback(
    (actionLabel: string): boolean => {
      if (!user) {
        openAuthModal(
          'signin',
          `Sign in or create a free account to ${actionLabel}. Your current design stays intact.`
        );
        pushToast('info', 'Sign in required to save', 'Sign in to save projects to your cloud account.');
        return false;
      }
      if (!isVerified) {
        openAuthModal(
          'verify',
          `Verify your email address (${user.email}) before saving projects to the cloud.`
        );
        pushToast('warning', 'Email verification required', 'Verify your inbox to unlock cloud saving.');
        return false;
      }
      return true;
    },
    [user, isVerified, openAuthModal, pushToast]
  );

  const handleSaveQrProject = async (
    name: string,
    payload: string,
    designOverride?: QRDesignConfig,
    thumbnail?: string
  ): Promise<boolean> => {
    if (!requireVerifiedAccountForSave('save this QR code')) {
      return false;
    }
    if (!user) return false;

    const now = Date.now();
    const project: SavedProject = {
      id: `qr-${now}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      kind: 'qr',
      category: qrForm.category,
      payload,
      qrForm: { ...qrForm },
      qrDesign: { ...(designOverride || qrDesign) },
      favorite: false,
      thumbnailDataUrl: thumbnail,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await createSavedProjectInFirestore(user.uid, project);
    await addHistoryEntryToFirestore(user.uid, {
      id: `hist-${now}-${Math.random().toString(36).slice(2, 5)}`,
      action: 'created',
      kind: 'qr',
      title: saved.name,
      category: qrForm.category,
      payload: saved.payload,
      timestamp: now,
      projectSnapshot: {
        name: saved.name,
        kind: saved.kind,
        category: saved.category,
        payload: saved.payload,
        qrForm: saved.qrForm,
        qrDesign: saved.qrDesign,
      },
    });
    return true;
  };

  const handleSaveBarcodeProject = async (
    name: string,
    payload: string,
    thumbnail?: string
  ): Promise<boolean> => {
    if (!requireVerifiedAccountForSave('save this barcode')) {
      return false;
    }
    if (!user) return false;

    const now = Date.now();
    const project: SavedProject = {
      id: `bc-${now}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      kind: 'barcode',
      category: barcodeConfig.standard,
      payload,
      barcodeConfig: { ...barcodeConfig, value: payload },
      favorite: false,
      thumbnailDataUrl: thumbnail,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await createSavedProjectInFirestore(user.uid, project);
    await addHistoryEntryToFirestore(user.uid, {
      id: `hist-${now}-${Math.random().toString(36).slice(2, 5)}`,
      action: 'created',
      kind: 'barcode',
      title: saved.name,
      category: barcodeConfig.standard,
      payload: saved.payload,
      timestamp: now,
      projectSnapshot: {
        name: saved.name,
        kind: saved.kind,
        category: saved.category,
        payload: saved.payload,
        barcodeConfig: saved.barcodeConfig,
      },
    });
    return true;
  };

  const handleRecordDownload = async (
    kind: 'qr' | 'barcode',
    category: string,
    title: string,
    payload: string,
    format: ExportFormat
  ) => {
    // Guests can download freely; cloud history logs automatically when authenticated & verified
    if (!user || !isVerified) return;
    await addHistoryEntryToFirestore(user.uid, {
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      action: 'downloaded',
      kind,
      title,
      category,
      payload,
      format,
      timestamp: Date.now(),
    });
  };

  const handleOpenProject = (proj: SavedProject) => {
    if (proj.kind === 'qr') {
      if (proj.qrForm) {
        setQrForm({ ...createDefaultQrFormState(), ...proj.qrForm });
      }
      if (proj.qrDesign) {
        setQrDesign({ ...proj.qrDesign });
      }
      setStudioPayload(proj.payload);
      setActiveSection('design-studio');
      pushToast('info', 'Project Loaded', `Opened "${proj.name}" in Design Studio.`);
    } else if (proj.barcodeConfig) {
      setBarcodeConfig({ ...proj.barcodeConfig });
      setActiveSection('create-barcode');
      pushToast('info', 'Barcode Loaded', `Opened "${proj.name}".`);
    }
  };

  const handleApplyTemplate = (tpl: MarketplaceTemplate) => {
    if (tpl.kind === 'qr' && tpl.qrDesign) {
      setQrDesign({ ...tpl.qrDesign });
      setStudioPayload(tpl.samplePayload);
      if (tpl.qrCategory) {
        setQrForm((prev) => ({ ...prev, category: tpl.qrCategory! }));
      }
      setActiveSection('design-studio');
      pushToast('success', 'Template Applied', `${tpl.title} loaded into Design Studio.`);
    } else if (tpl.kind === 'barcode' && tpl.barcodeConfig) {
      setBarcodeConfig({ ...tpl.barcodeConfig });
      setActiveSection('create-barcode');
      pushToast('success', 'Barcode Template Applied', tpl.title);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    if (!user || !isVerified) return;
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    await toggleFavoriteInFirestore(user.uid, id, !target.favorite);
  };

  const handleRenameProject = async (id: string, nextName: string) => {
    if (!user || !isVerified) return;
    await renameProjectInFirestore(user.uid, id, nextName);
  };

  const handleDuplicateProject = async (proj: SavedProject) => {
    if (!user || !isVerified) return;
    const now = Date.now();
    const copy: SavedProject = {
      ...proj,
      id: `${proj.kind}-copy-${now}-${Math.random().toString(36).slice(2, 5)}`,
      name: `${proj.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };
    await createSavedProjectInFirestore(user.uid, copy);
  };

  const handleDeleteProject = async (id: string) => {
    if (!user || !isVerified) return;
    await deleteProjectFromFirestore(user.uid, id);
  };

  const handleUpdateSettings = async (next: AppSettings) => {
    await saveSettingsToDb(next);
    setSettings(next);
    if (user && isVerified) {
      await syncCloudProfileSettings(next);
    }
  };

  const handleReopenHistory = (entry: HistoryEntry) => {
    if (!entry.projectSnapshot) return;
    const snap = entry.projectSnapshot;
    if (snap.kind === 'qr') {
      if (snap.qrDesign) setQrDesign({ ...snap.qrDesign });
      setStudioPayload(snap.payload);
      setActiveSection('design-studio');
    } else if (snap.barcodeConfig) {
      setBarcodeConfig({ ...snap.barcodeConfig });
      setActiveSection('create-barcode');
    }
  };

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault();
        searchInputRef.current?.focus();
        setSearchDropdownOpen(true);
      } else if (ev.key === 'Escape') {
        setSearchDropdownOpen(false);
      }
    };
    const onDocClick = (ev: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(ev.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onDocClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, []);

  const quickJumpResults = useMemo<QuickJumpItem[]>(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    const results: QuickJumpItem[] = [];

    (Object.keys(SECTION_TITLES) as NavSection[]).forEach((sec) => {
      const title = SECTION_TITLES[sec];
      if (title.toLowerCase().includes(q)) {
        results.push({
          id: `sec-${sec}`,
          label: title,
          group: 'Workspace',
          onSelect: () => setActiveSection(sec),
        });
      }
    });

    (Object.keys(QR_CATEGORY_META) as QrCategory[]).forEach((cat) => {
      const meta = QR_CATEGORY_META[cat];
      if (meta.label.toLowerCase().includes(q) || meta.shortDesc.toLowerCase().includes(q)) {
        results.push({
          id: `qr-${cat}`,
          label: `${meta.label} QR`,
          group: 'QR Generator',
          onSelect: () => {
            setQrForm((prev) => ({ ...prev, category: cat }));
            setActiveSection('create-qr');
          },
        });
      }
    });

    (Object.keys(BARCODE_STANDARDS) as BarcodeStandard[]).forEach((std) => {
      const info = BARCODE_STANDARDS[std];
      if (info.label.toLowerCase().includes(q) || info.category.toLowerCase().includes(q)) {
        results.push({
          id: `bc-${std}`,
          label: `${info.label} Barcode`,
          group: 'Barcode Standard',
          onSelect: () => {
            setBarcodeConfig((prev) => ({ ...prev, standard: std, value: info.sampleValue }));
            setActiveSection('create-barcode');
          },
        });
      }
    });

    MARKETPLACE_TEMPLATES.forEach((tpl) => {
      if (tpl.title.toLowerCase().includes(q) || tpl.category.toLowerCase().includes(q)) {
        results.push({
          id: `tpl-${tpl.id}`,
          label: tpl.title,
          group: 'Template',
          onSelect: () => handleApplyTemplate(tpl),
        });
      }
    });

    projects.forEach((proj) => {
      if (proj.name.toLowerCase().includes(q) || proj.payload.toLowerCase().includes(q)) {
        results.push({
          id: `proj-${proj.id}`,
          label: proj.name,
          group: 'Saved Project',
          onSelect: () => handleOpenProject(proj),
        });
      }
    });

    return results.slice(0, 7);
  }, [globalSearch, projects]);

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    if (quickJumpResults.length > 0) {
      quickJumpResults[0].onSelect();
      setSearchDropdownOpen(false);
      return;
    }
    setActiveSection('saved');
    setSearchDropdownOpen(false);
  };

  const isAuthenticatedAndVerified = Boolean(user && isVerified);

  return (
    <div className="min-h-screen bg-[#07060b] text-slate-100 flex">
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        savedCount={projects.length}
        settings={settings}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenAuth={(mode) => openAuthModal(mode)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Studio Bar */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07060b]/85 backdrop-blur-xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-xl bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-display text-sm sm:text-base font-bold text-white truncate">
              {SECTION_TITLES[activeSection]}
            </span>
          </div>

          <div ref={searchBoxRef} className="hidden md:block relative max-w-sm w-full">
            <form onSubmit={handleGlobalSearchSubmit} className="flex items-center relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                aria-label="Quick jump to QR types, barcodes, templates, or saved codes"
                value={globalSearch}
                onFocus={() => setSearchDropdownOpen(true)}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                placeholder="Quick jump (QR, EAN-13, UPI, Batch)... Ctrl+K"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </form>

            {searchDropdownOpen && globalSearch.trim().length > 0 && (
              <div
                role="listbox"
                aria-label="Quick jump results"
                className="absolute left-0 right-0 mt-2 rounded-2xl bg-[#120e21]/95 backdrop-blur-xl border border-violet-400/30 shadow-2xl overflow-hidden z-50"
              >
                {quickJumpResults.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-400">
                    No direct tools match &ldquo;{globalSearch}&rdquo;. Press Enter to search Saved Codes.
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {quickJumpResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          item.onSelect();
                          setSearchDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-violet-600/25 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{item.label}</p>
                          <p className="text-[11px] text-pink-300/90">{item.group}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => setActiveSection('account')}
                aria-label="Open My Account"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.06] border border-violet-400/25 text-white hover:bg-white/[0.12] transition-colors whitespace-nowrap"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    className="w-5 h-5 rounded-md object-cover"
                  />
                ) : (
                  <UserCircle2 className="w-4 h-4 text-pink-300" />
                )}
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0] || 'Account'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] border border-violet-400/30 text-white hover:bg-white/[0.12] transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-pink-300" />
                Sign In
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSection('create-qr')}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Code</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto space-y-6">
          <AdPlacementSlot zone="header" settings={settings} />

          {!storageReady || !authReady ? (
            <div className="glass-panel rounded-2xl p-8 text-sm text-slate-400">
              Loading studio workspace...
            </div>
          ) : (
            <div key={activeSection} className="animate-view-enter">
              {activeSection === 'dashboard' && (
                <DashboardView
                  projects={projects}
                  history={history}
                  onNavigate={setActiveSection}
                  onQuickCreateQr={(cat: QrCategory) => {
                    setQrForm((prev) => ({ ...prev, category: cat }));
                    setActiveSection('create-qr');
                  }}
                  onOpenProject={handleOpenProject}
                />
              )}

              {activeSection === 'create-qr' && (
                <CreateQrView
                  form={qrForm}
                  design={qrDesign}
                  defaultExportSize={settings.defaultExportSize}
                  onChangeForm={setQrForm}
                  onOpenDesignStudio={() => {
                    const p = buildQrPayload(qrForm);
                    if (p) setStudioPayload(p);
                    setActiveSection('design-studio');
                  }}
                  onSaveProject={(name, payload, thumb) =>
                    handleSaveQrProject(name, payload, undefined, thumb)
                  }
                  onRecordDownload={(title, payload, format) =>
                    handleRecordDownload('qr', qrForm.category, title, payload, format)
                  }
                  onToast={pushToast}
                />
              )}

              {activeSection === 'create-barcode' && (
                <CreateBarcodeView
                  config={barcodeConfig}
                  onChangeConfig={setBarcodeConfig}
                  onSaveProject={handleSaveBarcodeProject}
                  onRecordDownload={(title, payload, format) =>
                    handleRecordDownload('barcode', barcodeConfig.standard, title, payload, format)
                  }
                  onToast={pushToast}
                />
              )}

              {activeSection === 'upi-studio' && (
                <UpiStudioView
                  defaultExportSize={settings.defaultExportSize}
                  onSaveProject={(name, payload, design, thumb) =>
                    handleSaveQrProject(name, payload, design, thumb)
                  }
                  onRecordDownload={(title, payload, format) =>
                    handleRecordDownload('qr', 'upi', title, payload, format)
                  }
                  onToast={pushToast}
                />
              )}

              {activeSection === 'design-studio' && (
                <DesignStudioView
                  payload={studioPayload}
                  design={qrDesign}
                  defaultExportSize={settings.defaultExportSize}
                  onChangePayload={setStudioPayload}
                  onChangeDesign={setQrDesign}
                  onSaveProject={(name, payload, thumb) =>
                    handleSaveQrProject(name, payload, qrDesign, thumb)
                  }
                  onRecordDownload={(title, payload, format) =>
                    handleRecordDownload('qr', qrForm.category, title, payload, format)
                  }
                  onToast={pushToast}
                />
              )}

              {activeSection === 'batch-scan' && (
                <BatchScanView
                  qrDesign={qrDesign}
                  barcodeConfig={barcodeConfig}
                  onOpenInDesignStudio={(scannedPayload) => {
                    setStudioPayload(scannedPayload);
                    setActiveSection('design-studio');
                    pushToast('info', 'Loaded in Design Studio', 'Customize colors, logo & frame.');
                  }}
                  onRecordDownload={handleRecordDownload}
                  onToast={pushToast}
                />
              )}

              {activeSection === 'saved' &&
                (isAuthenticatedAndVerified ? (
                  <SavedCodesView
                    projects={projects}
                    defaultExportSize={settings.defaultExportSize}
                    initialSearch={globalSearch}
                    onOpenProject={handleOpenProject}
                    onToggleFavorite={handleToggleFavorite}
                    onRenameProject={handleRenameProject}
                    onDuplicateProject={handleDuplicateProject}
                    onDeleteProject={handleDeleteProject}
                    onRecordDownload={(title, payload, format) =>
                      handleRecordDownload('qr', 'saved', title, payload, format)
                    }
                    onToast={pushToast}
                  />
                ) : (
                  <ProtectedGate
                    sectionTitle="My Saved Codes"
                    description="Your saved QR codes, custom logo designs, and product barcodes are privately stored per account. Sign in or create a free account to manage your saved library."
                    onOpenAuth={(mode) => openAuthModal(mode)}
                    onNavigateGuestTool={setActiveSection}
                    onToast={pushToast}
                  />
                ))}

              {activeSection === 'templates' && (
                <TemplatesView onApplyTemplate={handleApplyTemplate} />
              )}

              {activeSection === 'history' &&
                (isAuthenticatedAndVerified ? (
                  <HistoryView
                    history={history}
                    onReopenEntry={handleReopenHistory}
                    onClearHistory={async () => {
                      if (!user) return;
                      await clearUserHistoryInFirestore(
                        user.uid,
                        history.map((h) => h.id)
                      );
                      pushToast('info', 'History Cleared');
                    }}
                  />
                ) : (
                  <ProtectedGate
                    sectionTitle="Creation & Export History"
                    description="Track every generated QR code, barcode export, and timestamped snapshot privately in your cloud history log."
                    onOpenAuth={(mode) => openAuthModal(mode)}
                    onNavigateGuestTool={setActiveSection}
                    onToast={pushToast}
                  />
                ))}

              {activeSection === 'settings' && (
                <SettingsView
                  settings={settings}
                  projects={projects}
                  onUpdateSettings={async (next) => {
                    await handleUpdateSettings(next);
                    pushToast('success', 'Settings Updated');
                  }}
                  onClearAllData={async () => {
                    await clearAllStudioData();
                    setSettings(DEFAULT_SETTINGS);
                    pushToast('info', 'Local Preferences Cleared');
                  }}
                  onToast={pushToast}
                />
              )}

              {activeSection === 'help' && <HelpCenterView />}

              {activeSection === 'account' &&
                (user ? (
                  <AccountView
                    projects={projects}
                    history={history}
                    settings={settings}
                    onUpdateSettings={async (next) => {
                      await handleUpdateSettings(next);
                      pushToast('success', 'Cloud Preferences Updated');
                    }}
                    onNavigate={setActiveSection}
                    onOpenProject={handleOpenProject}
                    onToast={pushToast}
                  />
                ) : (
                  <ProtectedGate
                    sectionTitle="My Account"
                    description="Manage your profile photo, display name, email verification status, cloud export defaults, and saved library."
                    onOpenAuth={(mode) => openAuthModal(mode)}
                    onNavigateGuestTool={setActiveSection}
                    onToast={pushToast}
                  />
                ))}
            </div>
          )}

          <AdPlacementSlot zone="content" settings={settings} />
        </main>
      </div>

      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        contextHint={authContextHint}
        onClose={() => setAuthModalOpen(false)}
        onToast={pushToast}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
