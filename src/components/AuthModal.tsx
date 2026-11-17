import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  validateEmailOnly,
  validateRegisterForm,
  validateSignInForm,
} from '../utils/authValidation';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

export type AuthModalMode = 'signin' | 'register' | 'forgot' | 'verify';

interface AuthModalProps {
  open: boolean;
  initialMode?: AuthModalMode;
  contextHint?: string;
  onClose: () => void;
  onAuthenticated?: () => void;
  onToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => void;
}

export const GoogleLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
    />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  initialMode = 'signin',
  contextHint,
  onClose,
  onAuthenticated,
  onToast,
}) => {
  const {
    user,
    isVerified,
    authLoading,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    resendVerificationEmail,
    refreshVerificationStatus,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (user && !isVerified) {
      setMode('verify');
    } else {
      setMode(initialMode);
    }
    setErrorMsg(null);
    setInfoMsg(null);
  }, [open, initialMode, user, isVerified]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await signInWithGoogle();
      onToast('success', 'Signed in with Google', 'Your cloud workspace is now synced.');
      onAuthenticated?.();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const check = validateSignInForm(email, password);
    if (!check.valid) {
      setErrorMsg(check.error || 'Invalid credentials.');
      return;
    }
    try {
      await signInWithEmail(email, password);
      onToast('success', 'Welcome back', 'Signed in to Ultimate Barcode Studio.');
      onAuthenticated?.();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign-in failed.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const check = validateRegisterForm(displayName, email, password, confirmPassword);
    if (!check.valid) {
      setErrorMsg(check.error || 'Please check your registration details.');
      return;
    }
    try {
      await registerWithEmail(displayName, email, password);
      setMode('verify');
      setInfoMsg(
        `Verification email sent to ${email.trim()}. Verify your inbox to unlock cloud saves.`
      );
      onToast('success', 'Account Created', 'Check your inbox to verify your email address.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const check = validateEmailOnly(email);
    if (!check.valid) {
      setErrorMsg(check.error || 'Please enter a valid email.');
      return;
    }
    try {
      await sendPasswordReset(email);
      setInfoMsg(
        `Password reset instructions have been sent to ${email.trim()}. Check your inbox or spam folder.`
      );
      onToast('info', 'Reset Email Sent', `Check ${email.trim()} for the reset link.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send password reset email.');
    }
  };

  const handleResendVerification = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await resendVerificationEmail();
      setInfoMsg('Verification link re-sent. Please check your inbox and spam folder.');
      onToast('success', 'Verification Email Sent');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to resend verification email.');
    }
  };

  const handleRefreshVerification = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const verified = await refreshVerificationStatus();
      if (verified) {
        onToast('success', 'Email Verified', 'Cloud saving and history are now unlocked.');
        onAuthenticated?.();
        onClose();
      } else {
        setErrorMsg(
          'Your email is still unverified. Click the link in your verification email first, then refresh.'
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to refresh verification status.');
    }
  };

  const inputCls =
    'w-full bg-[#0b0815] border border-violet-400/25 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md glass-panel-elevated rounded-3xl p-6 sm:p-7 space-y-5 my-auto border border-violet-400/30 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication dialog"
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1.5 pr-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-pink-300">
            <ShieldCheck className="w-4 h-4" />
            <span>Ultimate Barcode Studio Account</span>
          </div>
          <h2 id="auth-modal-title" className="font-display text-2xl font-bold text-white">
            {mode === 'signin' && 'Sign in to your Studio'}
            {mode === 'register' && 'Create your Studio Account'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'verify' && 'Verify your email address'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {contextHint ||
              (mode === 'verify'
                ? 'Email verification keeps your saved QR codes, barcodes, and personal history isolated and secure.'
                : 'Save projects to the cloud, track your export history, and access favorite designs across devices.')}
          </p>
        </div>

        {/* Mode Switcher Tabs (Sign In / Create Account) */}
        {(mode === 'signin' || mode === 'register') && (
          <div
            role="tablist"
            aria-label="Authentication Mode"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Official Google Sign-In Button */}
        {(mode === 'signin' || mode === 'register') && (
          <div className="space-y-4">
            <button
              type="button"
              disabled={authLoading}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 whitespace-nowrap"
            >
              <GoogleLogoSvg className="w-4 h-4 shrink-0" />
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                or use email
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            data-testid="auth-error-banner"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div
            role="status"
            data-testid="auth-info-banner"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/45 border border-emerald-500/40 text-xs text-emerald-200 leading-relaxed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleEmailSignIn} noValidate className="space-y-4">
            <div>
              <label htmlFor="auth-signin-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="auth-signin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-signin-password" className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="text-xs font-medium text-pink-300 hover:text-pink-200"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="auth-signin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white hover:brightness-110 disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sign In with Email</span>
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} noValidate className="space-y-3.5">
            <div>
              <label htmlFor="auth-reg-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                id="auth-reg-name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Rivera"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="auth-reg-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="auth-reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="auth-reg-password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters with letters & numbers"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="auth-reg-confirm" className="block text-xs font-medium text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <input
                id="auth-reg-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white hover:brightness-110 disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Free Account</span>
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} noValidate className="space-y-4">
            <div>
              <label htmlFor="auth-forgot-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Registered Email Address
              </label>
              <input
                id="auth-forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>Send Password Reset Link</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className="w-full text-center text-xs font-medium text-slate-300 hover:text-white py-1"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* Email Verification View */}
        {mode === 'verify' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/[0.04] border border-violet-400/25 p-4 flex items-start gap-3">
              <MailCheck className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
                <p className="font-semibold text-white">
                  Signed in as {user?.email || email}
                </p>
                <p>
                  Open the verification link we sent to your inbox, then click Refresh Status below to unlock cloud saves and history.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={authLoading}
                onClick={handleRefreshVerification}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:brightness-110 disabled:opacity-50"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>I&apos;ve Verified — Refresh Status</span>
              </button>

              <button
                type="button"
                disabled={authLoading}
                onClick={handleResendVerification}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] border border-white/15 text-slate-200 hover:bg-white/[0.12] disabled:opacity-50"
              >
                Resend Verification Email
              </button>

              {user && (
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={async () => {
                    await logout();
                    setMode('signin');
                    onToast('info', 'Signed Out');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out and switch account
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
