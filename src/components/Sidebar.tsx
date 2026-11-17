import React from 'react';
import { AppSettings, NavSection } from '../types/studio';
import { AdPlacementSlot } from './AdPlacementSlot';
import { useAuth } from '../contexts/AuthContext';
import { AuthModalMode } from './AuthModal';
import {
  LayoutDashboard,
  QrCode,
  Barcode,
  IndianRupee,
  Palette,
  Layers,
  FolderHeart,
  LayoutGrid,
  History,
  Settings,
  HelpCircle,
  UserCircle2,
  Lock,
  LogIn,
  LogOut,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  savedCount: number;
  settings: AppSettings;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAuth: (mode: AuthModalMode) => void;
}

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  protected?: boolean;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create-qr', label: 'Create QR Code', icon: QrCode },
  { id: 'create-barcode', label: 'Create Barcode', icon: Barcode },
  { id: 'upi-studio', label: 'UPI QR Studio', icon: IndianRupee },
  { id: 'design-studio', label: 'Design Studio', icon: Palette },
  { id: 'batch-scan', label: 'Batch & Scanner', icon: Layers },
  { id: 'saved', label: 'My Saved Codes', icon: FolderHeart, protected: true },
  { id: 'templates', label: 'Templates', icon: LayoutGrid },
  { id: 'history', label: 'History', icon: History, protected: true },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help Center', icon: HelpCircle },
  { id: 'account', label: 'My Account', icon: UserCircle2, protected: true },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  savedCount,
  settings,
  mobileOpen,
  onCloseMobile,
  onOpenAuth,
}) => {
  const { user, isVerified, logout } = useAuth();
  const isUnlocked = Boolean(user && isVerified);

  const initials = (user?.displayName || user?.email || 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const navContent = (
    <div className="flex flex-col h-full py-5 px-4">
      <div className="flex items-center justify-between px-2 mb-6">
        <button
          type="button"
          onClick={() => {
            onNavigate('dashboard');
            onCloseMobile();
          }}
          className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-950/60 shrink-0">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block font-display text-sm font-bold tracking-tight text-white truncate">
              Ultimate Barcode
            </span>
            <span className="block text-[11px] font-medium text-pink-300/90 tracking-wide">
              Studio
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Studio Navigation" className="flex-1 space-y-1 overflow-y-auto pr-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                onCloseMobile();
              }}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-violet-600/30 via-purple-600/20 to-pink-500/15 text-white border border-violet-400/35 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-pink-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'saved' && isUnlocked && (
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {savedCount}
                </span>
              )}
              {item.protected && !isUnlocked && (
                <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
        <AdPlacementSlot zone="sidebar" settings={settings} />

        {user ? (
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                onNavigate('account');
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 text-left group"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profile'}
                  className="w-8 h-8 rounded-lg object-cover border border-violet-400/35 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate group-hover:text-pink-200">
                  {user.displayName || user.email?.split('@')[0] || 'Account'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {isVerified ? user.email : 'Verify email to sync'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                void logout();
                onCloseMobile();
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 border border-white/10 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-violet-950/60 to-pink-950/40 border border-violet-400/25 p-3 space-y-2">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Guest Mode active. Sign in to save QR codes &amp; history to your cloud account.
            </p>
            <button
              type="button"
              onClick={() => {
                onOpenAuth('signin');
                onCloseMobile();
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 transition-all whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In / Join Free
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[264px] shrink-0 border-r border-white/10 bg-[#0b0914]/90 backdrop-blur-xl min-h-screen sticky top-0 h-screen">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#0b0914] border-r border-white/15 h-full z-10">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
