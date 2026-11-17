import React from 'react';
import { AuthModalMode, GoogleLogoSvg } from './AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { NavSection } from '../types/studio';
import { Lock, MailCheck, RefreshCw, ShieldCheck, UserPlus, LogIn, QrCode } from 'lucide-react';

interface ProtectedGateProps {
  sectionTitle: string;
  description: string;
  onOpenAuth: (mode: AuthModalMode) => void;
  onNavigateGuestTool: (section: NavSection) => void;
  onToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => void;
}

export const ProtectedGate: React.FC<ProtectedGateProps> = ({
  sectionTitle,
  description,
  onOpenAuth,
  onNavigateGuestTool,
  onToast,
}) => {
  const {
    user,
    isVerified,
    authLoading,
    signInWithGoogle,
    resendVerificationEmail,
    refreshVerificationStatus,
    logout,
  } = useAuth();

  const needsVerification = Boolean(user && !isVerified);

  const handleQuickGoogle = async () => {
    try {
      await signInWithGoogle();
      onToast('success', 'Signed in with Google', 'Your protected workspace is now unlocked.');
    } catch (err) {
      onToast(
        'error',
        'Google Sign-In Failed',
        err instanceof Error ? err.message : 'Please try again.'
      );
    }
  };

  return (
    <section
      data-testid="protected-route-gate"
      className="glass-panel-elevated rounded-3xl p-7 sm:p-10 max-w-2xl mx-auto text-center space-y-6 my-4"
    >
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-600/30 to-pink-500/30 border border-violet-400/40 flex items-center justify-center shadow-lg">
        {needsVerification ? (
          <MailCheck className="w-7 h-7 text-pink-300" />
        ) : (
          <Lock className="w-7 h-7 text-violet-300" />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-pink-300">
          {needsVerification ? 'Email Verification Required' : 'Account Required'}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
          {needsVerification ? `Verify your email to access ${sectionTitle}` : `Sign in to access ${sectionTitle}`}
        </h1>
        <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          {needsVerification
            ? `You are signed in as ${user?.email}. Please verify your email address so your saved QR codes, barcodes, and personal history remain isolated to your verified account.`
            : description}
        </p>
      </div>

      {needsVerification ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={authLoading}
            onClick={async () => {
              try {
                const ok = await refreshVerificationStatus();
                if (ok) {
                  onToast('success', 'Email Verified', 'Cloud workspace unlocked.');
                } else {
                  onToast(
                    'warning',
                    'Not verified yet',
                    'Click the verification link in your email inbox first.'
                  );
                }
              } catch (err) {
                onToast('error', 'Verification Check Failed', err instanceof Error ? err.message : undefined);
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Verification Status
          </button>

          <button
            type="button"
            disabled={authLoading}
            onClick={async () => {
              try {
                await resendVerificationEmail();
                onToast('success', 'Verification Email Sent', `Sent to ${user?.email}`);
              } catch (err) {
                onToast('error', 'Resend Failed', err instanceof Error ? err.message : undefined);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/[0.06] border border-white/15 text-slate-200 hover:bg-white/[0.12] whitespace-nowrap"
          >
            Resend Email
          </button>

          <button
            type="button"
            disabled={authLoading}
            onClick={() => logout()}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={authLoading}
              onClick={handleQuickGoogle}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 shadow-md transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <GoogleLogoSvg className="w-4 h-4" />
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAuth('signin')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 transition-all whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              Sign in with Email
            </button>

            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.06] border border-violet-400/30 text-white hover:bg-white/[0.12] transition-all whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 text-pink-300" />
              Create Account
            </button>
          </div>
        </div>
      )}

      <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-violet-400" />
          Guest mode lets you create & download QR codes and barcodes anytime.
        </span>
        <button
          type="button"
          onClick={() => onNavigateGuestTool('create-qr')}
          className="inline-flex items-center gap-1.5 font-semibold text-pink-300 hover:text-pink-200 whitespace-nowrap"
        >
          <QrCode className="w-3.5 h-3.5" />
          Continue as Guest in QR Generator
        </button>
      </div>
    </section>
  );
};
