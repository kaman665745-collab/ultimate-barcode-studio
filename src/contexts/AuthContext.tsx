import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { AppSettings } from '../types/studio';
import {
  CloudUserProfile,
  ensureCloudUserProfile,
  updateCloudUserProfile,
} from '../services/firestoreService';
import { DEFAULT_SETTINGS } from '../services/storage';
import { mapFirebaseAuthError } from '../utils/authValidation';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  authLoading: boolean;
  isVerified: boolean;
  cloudProfile: CloudUserProfile | null;
  userRevision: number;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (displayName: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  updateAccountProfile: (displayName: string, photoURL: string) => Promise<void>;
  syncCloudProfileSettings: (settings: AppSettings) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [cloudProfile, setCloudProfile] = useState<CloudUserProfile | null>(null);
  const [userRevision, setUserRevision] = useState(0);

  const loadCloudProfile = useCallback(async (firebaseUser: User) => {
    if (!firebaseUser.emailVerified) {
      setCloudProfile(null);
      return;
    }
    try {
      const profile = await ensureCloudUserProfile(firebaseUser, DEFAULT_SETTINGS);
      setCloudProfile(profile);
    } catch (err) {
      console.error('Failed to sync cloud user profile:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setUserRevision((v) => v + 1);
      if (nextUser && nextUser.emailVerified) {
        await loadCloudProfile(nextUser);
      } else {
        setCloudProfile(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [loadCloudProfile]);

  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.emailVerified) {
        await loadCloudProfile(result.user);
      }
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  }, [loadCloudProfile]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setAuthLoading(true);
      try {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (result.user.emailVerified) {
          await loadCloudProfile(result.user);
        }
      } catch (err) {
        throw new Error(mapFirebaseAuthError(err));
      } finally {
        setAuthLoading(false);
      }
    },
    [loadCloudProfile]
  );

  const registerWithEmail = useCallback(
    async (displayName: string, email: string, password: string) => {
      setAuthLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: displayName.trim() });
        await sendEmailVerification(cred.user);
        setUserRevision((v) => v + 1);
      } catch (err) {
        throw new Error(mapFirebaseAuthError(err));
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) throw new Error('No active user session found.');
    setAuthLoading(true);
    try {
      await sendEmailVerification(current);
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const refreshVerificationStatus = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return false;
    setAuthLoading(true);
    try {
      await current.reload();
      await current.getIdToken(true);
      setUser(auth.currentUser);
      setUserRevision((v) => v + 1);
      if (auth.currentUser?.emailVerified) {
        await loadCloudProfile(auth.currentUser);
        return true;
      }
      return false;
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  }, [loadCloudProfile]);

  const updateAccountProfile = useCallback(async (displayName: string, photoURL: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Please sign in to update your profile.');
    setAuthLoading(true);
    try {
      const cleanName = displayName.trim();
      const cleanPhoto = photoURL.trim();
      await updateProfile(current, {
        displayName: cleanName,
        photoURL: cleanPhoto || null,
      });
      if (current.emailVerified) {
        await updateCloudUserProfile(current.uid, {
          displayName: cleanName,
          photoURL: cleanPhoto,
        });
        setCloudProfile((prev) =>
          prev
            ? {
                ...prev,
                displayName: cleanName,
                photoURL: cleanPhoto || undefined,
                updatedAt: Date.now(),
              }
            : prev
        );
      }
      setUserRevision((v) => v + 1);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('{')) {
        throw err;
      }
      throw new Error(mapFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const syncCloudProfileSettings = useCallback(async (nextSettings: AppSettings) => {
    const current = auth.currentUser;
    if (!current || !current.emailVerified) return;
    await updateCloudUserProfile(current.uid, {
      defaultExportFormat: nextSettings.defaultExportFormat,
      defaultExportSize: nextSettings.defaultExportSize,
      defaultEcc: nextSettings.defaultEcc,
      defaultMargin: nextSettings.defaultMargin,
    });
    setCloudProfile((prev) =>
      prev
        ? {
            ...prev,
            defaultExportFormat: nextSettings.defaultExportFormat,
            defaultExportSize: nextSettings.defaultExportSize,
            defaultEcc: nextSettings.defaultEcc,
            defaultMargin: nextSettings.defaultMargin,
            updatedAt: Date.now(),
          }
        : prev
    );
  }, []);

  const logout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      setCloudProfile(null);
      setUser(null);
      setUserRevision((v) => v + 1);
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        authLoading,
        isVerified: Boolean(user?.emailVerified),
        cloudProfile,
        userRevision,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        refreshVerificationStatus,
        updateAccountProfile,
        syncCloudProfileSettings,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
