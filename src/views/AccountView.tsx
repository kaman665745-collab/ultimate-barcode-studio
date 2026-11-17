import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  AppSettings,
  ErrorCorrectionLevel,
  ExportFormat,
  HistoryEntry,
  NavSection,
  SavedProject,
} from '../types/studio';
import { validateProfileUpdate } from '../utils/authValidation';
import {
  Barcode,
  CheckCircle2,
  FolderOpen,
  History,
  Loader2,
  LogOut,
  MailCheck,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Star,
  User as UserIcon,
} from 'lucide-react';

interface AccountViewProps {
  projects: SavedProject[];
  history: HistoryEntry[];
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => Promise<void>;
  onNavigate: (section: NavSection) => void;
  onOpenProject: (project: SavedProject) => void;
  onToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  projects,
  history,
  settings,
  onUpdateSettings,
  onNavigate,
  onOpenProject,
  onToast,
}) => {
  const {
    user,
    isVerified,
    cloudProfile,
    authLoading,
    updateAccountProfile,
    resendVerificationEmail,
    refreshVerificationStatus,
    logout,
  } = useAuth();

  const [displayName, setDisplayName] = useState(
    cloudProfile?.displayName || user?.displayName || ''
  );
  const [photoURL, setPhotoURL] = useState(cloudProfile?.photoURL || user?.photoURL || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setDisplayName(cloudProfile?.displayName || user?.displayName || '');
    setPhotoURL(cloudProfile?.photoURL || user?.photoURL || '');
  }, [cloudProfile?.displayName, cloudProfile?.photoURL, user?.displayName, user?.photoURL]);

  if (!user) return null;

  const savedQrCount = projects.filter((p) => p.kind === 'qr').length;
  const savedBarcodeCount = projects.filter((p) => p.kind === 'barcode').length;
  const favoriteProjects = projects.filter((p) => p.favorite);
  const providerNames = user.providerData
    .map((p) => (p.providerId === 'google.com' ? 'Google' : 'Email & Password'))
    .join(', ');

  const initials = (displayName || user.email || 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateProfileUpdate(displayName, photoURL);
    if (!check.valid) {
      onToast('error', 'Invalid Profile Details', check.error);
      return;
    }
    setSavingProfile(true);
    try {
      await updateAccountProfile(displayName, photoURL);
      onToast('success', 'Account Updated', 'Your profile details have been saved.');
    } catch (err) {
      onToast(
        'error',
        'Update Failed',
        err instanceof Error ? err.message : 'Unable to update profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onToast('info', 'Signed Out', 'You are now browsing as a guest.');
      onNavigate('dashboard');
    } catch (err) {
      onToast('error', 'Logout Failed', err instanceof Error ? err.message : undefined);
    }
  };

  const inputCls =
    'w-full bg-[#100d1b] border border-violet-400/25 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Profile Hero Header */}
      <section className="glass-panel-elevated rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName || 'Profile avatar'}
              className="w-16 h-16 rounded-2xl object-cover border border-violet-400/40 shrink-0 bg-[#100d1b]"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-display text-xl font-bold shrink-0 shadow-lg">
              {initials || <UserIcon className="w-7 h-7" />}
            </div>
          )}

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white truncate">
                {user.displayName || displayName || 'Studio Member'}
              </h1>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/15 border border-emerald-400/35 text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 border border-amber-400/35 text-amber-300">
                  <MailCheck className="w-3 h-3" />
                  Unverified Email
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300 truncate">{user.email}</p>
            <p className="text-xs text-slate-400">
              Sign-in method: {providerNames || 'Firebase Auth'} · Isolated Cloud Workspace
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={authLoading}
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-950/45 border border-rose-500/35 text-rose-200 hover:bg-rose-950/70 transition-all shrink-0 self-start sm:self-center whitespace-nowrap"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </section>

      {/* Email Verification Alert if Unverified */}
      {!isVerified && (
        <section className="glass-panel rounded-2xl p-5 border border-amber-500/35 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-sm font-bold text-amber-200">
              Verify your email to enable cloud sync
            </h2>
            <p className="text-xs text-amber-100/80">
              Check your inbox for a verification email from Firebase Auth, then click Refresh Status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={authLoading}
              onClick={async () => {
                const verified = await refreshVerificationStatus();
                if (verified) {
                  onToast('success', 'Email Verified', 'Cloud sync is now active.');
                } else {
                  onToast('warning', 'Still Pending', 'Click the verification link in your inbox first.');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Status
            </button>
            <button
              type="button"
              disabled={authLoading}
              onClick={async () => {
                await resendVerificationEmail();
                onToast('success', 'Verification Email Sent');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/[0.08] border border-white/15 text-white hover:bg-white/[0.15] whitespace-nowrap"
            >
              Resend Link
            </button>
          </div>
        </section>
      )}

      {/* Account Stats Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('saved')}
          className="glass-panel rounded-2xl p-5 text-left hover:border-violet-400/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Saved QR Codes</span>
            <QrCode className="w-4 h-4 text-violet-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white tabular-nums">
            {savedQrCount}
          </p>
          <p className="mt-1 text-[11px] text-violet-300">Open My Saved Codes →</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('saved')}
          className="glass-panel rounded-2xl p-5 text-left hover:border-pink-400/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Saved Barcodes</span>
            <Barcode className="w-4 h-4 text-pink-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white tabular-nums">
            {savedBarcodeCount}
          </p>
          <p className="mt-1 text-[11px] text-pink-300">Manage barcodes →</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('history')}
          className="glass-panel rounded-2xl p-5 text-left hover:border-violet-400/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Creation History</span>
            <History className="w-4 h-4 text-purple-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white tabular-nums">
            {history.length}
          </p>
          <p className="mt-1 text-[11px] text-violet-300">View activity log →</p>
        </button>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Favorite Designs</span>
            <Star className="w-4 h-4 text-pink-400 fill-pink-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-pink-300 tabular-nums">
            {favoriteProjects.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Pinned cloud designs</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile & Cloud Preferences Form */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
            <ShieldCheck className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-base font-bold text-white">
              Profile & Account Settings
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="acc-display-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  id="acc-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="acc-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  id="acc-email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className={`${inputCls} opacity-60 cursor-not-allowed`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="acc-photo-url" className="block text-xs font-medium text-slate-300 mb-1.5">
                Profile Photo URL (Optional)
              </label>
              <input
                id="acc-photo-url"
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile || authLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile Changes
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 space-y-4">
            <h3 className="font-display text-sm font-bold text-white">
              Cloud Export Preferences
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="acc-fmt" className="block text-xs font-medium text-slate-300 mb-1">
                  Default Format
                </label>
                <select
                  id="acc-fmt"
                  value={settings.defaultExportFormat}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      defaultExportFormat: e.target.value as ExportFormat,
                    })
                  }
                  className={inputCls}
                >
                  <option value="PNG">PNG</option>
                  <option value="SVG">SVG</option>
                  <option value="JPEG">JPEG</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
              <div>
                <label htmlFor="acc-size" className="block text-xs font-medium text-slate-300 mb-1">
                  Resolution
                </label>
                <select
                  id="acc-size"
                  value={settings.defaultExportSize}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      defaultExportSize: Number(e.target.value),
                    })
                  }
                  className={inputCls}
                >
                  <option value={512}>512 px</option>
                  <option value={1024}>1024 px</option>
                  <option value={2048}>2048 px</option>
                  <option value={4096}>4096 px</option>
                </select>
              </div>
              <div>
                <label htmlFor="acc-ecc" className="block text-xs font-medium text-slate-300 mb-1">
                  QR ECC Level
                </label>
                <select
                  id="acc-ecc"
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
            </div>
          </div>
        </div>

        {/* Favorite Designs & Recent Activity Snapshot */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white">Favorite Designs</h2>
              <Star className="w-4 h-4 text-pink-400 fill-pink-400" />
            </div>

            {favoriteProjects.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                No favorites pinned yet. Star any saved QR code or barcode in My Saved Codes to quick-launch it here.
              </p>
            ) : (
              <ul className="space-y-2">
                {favoriteProjects.slice(0, 5).map((fav) => (
                  <li key={fav.id}>
                    <button
                      type="button"
                      onClick={() => onOpenProject(fav)}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{fav.name}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {fav.kind.toUpperCase()} · {fav.category}
                        </p>
                      </div>
                      <FolderOpen className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white">Recent Cloud Activity</h2>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-xs font-medium text-pink-300 hover:text-pink-200"
              >
                View All
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                Your saved projects and export activity will appear here once synced.
              </p>
            ) : (
              <ul className="space-y-2">
                {history.slice(0, 4).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-white/5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-200 truncate">{entry.title}</p>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {entry.action} · {entry.kind.toUpperCase()}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
