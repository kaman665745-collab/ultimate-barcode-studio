export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length >= 3 && trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
}

export function validateEmailOnly(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter your email address.' };
  }
  if (!isValidEmail(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address (e.g. name@company.com).' };
  }
  return { valid: true };
}

export function validateSignInForm(email: string, password: string): ValidationResult {
  const emailCheck = validateEmailOnly(email);
  if (!emailCheck.valid) return emailCheck;

  if (!password) {
    return { valid: false, error: 'Please enter your password.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }
  return { valid: true };
}

export function validateRegisterForm(
  displayName: string,
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult {
  const name = displayName.trim();
  if (name.length < 2) {
    return { valid: false, error: 'Display name must be at least 2 characters.' };
  }
  if (name.length > 120) {
    return { valid: false, error: 'Display name must be 120 characters or fewer.' };
  }

  const emailCheck = validateEmailOnly(email);
  if (!emailCheck.valid) return emailCheck;

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must include at least one letter and one number.',
    };
  }
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match.' };
  }
  return { valid: true };
}

export function validateProfileUpdate(displayName: string, photoURL: string): ValidationResult {
  const trimmedName = displayName.trim();
  if (trimmedName.length < 2 || trimmedName.length > 120) {
    return {
      valid: false,
      error: 'Display name must be between 2 and 120 characters.',
    };
  }
  const trimmedPhoto = photoURL.trim();
  if (trimmedPhoto) {
    if (trimmedPhoto.length > 2048) {
      return { valid: false, error: 'Photo URL must be 2048 characters or fewer.' };
    }
    try {
      const parsed = new URL(trimmedPhoto);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { valid: false, error: 'Photo URL must start with https:// or http://.' };
      }
    } catch {
      return { valid: false, error: 'Please enter a valid image URL for your profile photo.' };
    }
  }
  return { valid: true };
}

export function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const message = error instanceof Error ? error.message : String(error || '');

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/invalid-email':
      return 'The email address is badly formatted.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters with letters and numbers.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Allow popups for this site and try again.';
    case 'auth/cancelled-popup-request':
      return 'Authentication request was cancelled. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts detected. Please wait a moment before trying again.';
    case 'auth/network-request-failed':
      return 'Network error while connecting to authentication services. Check your connection.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method). You can use Continue with Google immediately, or enable Email/Password in Firebase Console.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support for assistance.';
    case 'auth/requires-recent-login':
      return 'For security, please sign out and sign back in before performing this action.';
    default:
      if (message.includes('auth/')) {
        return message.replace(/^Firebase:\s*/i, '');
      }
      return message || 'Authentication failed. Please try again.';
  }
}
