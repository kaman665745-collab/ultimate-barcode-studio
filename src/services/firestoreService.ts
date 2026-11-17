import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AppSettings,
  ErrorCorrectionLevel,
  ExportFormat,
  HistoryEntry,
  SavedProject,
} from '../types/studio';
import {
  BLUEPRINT_LIMITS,
  clampNonEmptyString,
  isValidFirestoreId,
  sanitizeHistoryForFirestore,
  sanitizeProjectForFirestore,
} from '../utils/firestoreSanitizer';

export interface CloudUserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  defaultExportFormat?: ExportFormat;
  defaultExportSize?: number;
  defaultEcc?: ErrorCorrectionLevel;
  defaultMargin?: number;
  createdAt?: number;
  updatedAt?: number;
}

function toMillis(val: unknown): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (
    typeof val === 'object' &&
    val !== null &&
    'toMillis' in val &&
    typeof (val as { toMillis: unknown }).toMillis === 'function'
  ) {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === 'number') return val;
  return Date.now();
}

export async function ensureCloudUserProfile(
  user: User,
  defaults: AppSettings
): Promise<CloudUserProfile | null> {
  if (!user.emailVerified) return null;
  const path = `users/${user.uid}/private/profile`;
  const ref = doc(db, 'users', user.uid, 'private', 'profile');

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: String(data.uid || user.uid),
        displayName: String(data.displayName || user.displayName || 'Studio Member'),
        email: String(data.email || user.email || ''),
        photoURL: typeof data.photoURL === 'string' ? data.photoURL : undefined,
        defaultExportFormat: data.defaultExportFormat as ExportFormat | undefined,
        defaultExportSize:
          typeof data.defaultExportSize === 'number' ? data.defaultExportSize : undefined,
        defaultEcc: data.defaultEcc as ErrorCorrectionLevel | undefined,
        defaultMargin: typeof data.defaultMargin === 'number' ? data.defaultMargin : undefined,
        createdAt: toMillis(data.createdAt),
        updatedAt: toMillis(data.updatedAt),
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const fallbackName = clampNonEmptyString(
    user.displayName || user.email?.split('@')[0] || 'Studio Member',
    BLUEPRINT_LIMITS.MAX_DISPLAY_NAME,
    'Studio Member'
  );
  const email = clampNonEmptyString(
    user.email || 'member@studio.local',
    BLUEPRINT_LIMITS.MAX_EMAIL,
    'member@studio.local'
  );

  const initialPayload: Record<string, unknown> = {
    uid: user.uid,
    displayName: fallbackName,
    email,
    defaultExportFormat: defaults.defaultExportFormat,
    defaultExportSize: defaults.defaultExportSize,
    defaultEcc: defaults.defaultEcc,
    defaultMargin: defaults.defaultMargin,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (user.photoURL && user.photoURL.length <= BLUEPRINT_LIMITS.MAX_PHOTO_URL) {
    initialPayload.photoURL = user.photoURL;
  }

  try {
    await setDoc(ref, initialPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    uid: user.uid,
    displayName: fallbackName,
    email,
    photoURL: user.photoURL || undefined,
    defaultExportFormat: defaults.defaultExportFormat,
    defaultExportSize: defaults.defaultExportSize,
    defaultEcc: defaults.defaultEcc,
    defaultMargin: defaults.defaultMargin,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function updateCloudUserProfile(
  uid: string,
  updates: {
    displayName?: string;
    photoURL?: string;
    defaultExportFormat?: ExportFormat;
    defaultExportSize?: number;
    defaultEcc?: ErrorCorrectionLevel;
    defaultMargin?: number;
  }
): Promise<void> {
  if (!isValidFirestoreId(uid)) throw new Error('Invalid user UID.');
  const path = `users/${uid}/private/profile`;
  const ref = doc(db, 'users', uid, 'private', 'profile');

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.displayName !== undefined) {
    payload.displayName = clampNonEmptyString(
      updates.displayName,
      BLUEPRINT_LIMITS.MAX_DISPLAY_NAME,
      'Studio Member'
    );
  }
  if (updates.photoURL !== undefined) {
    payload.photoURL = updates.photoURL.trim().slice(0, BLUEPRINT_LIMITS.MAX_PHOTO_URL);
  }
  if (updates.defaultExportFormat !== undefined) {
    payload.defaultExportFormat = updates.defaultExportFormat;
  }
  if (updates.defaultExportSize !== undefined) {
    payload.defaultExportSize = Math.min(4096, Math.max(256, Number(updates.defaultExportSize)));
  }
  if (updates.defaultEcc !== undefined) {
    payload.defaultEcc = updates.defaultEcc;
  }
  if (updates.defaultMargin !== undefined) {
    payload.defaultMargin = Math.min(64, Math.max(0, Number(updates.defaultMargin)));
  }

  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToUserProjects(
  uid: string,
  onProjects: (projects: SavedProject[]) => void
): Unsubscribe {
  const path = `users/${uid}/projects`;
  const q = query(collection(db, 'users', uid, 'projects'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedProject[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id || docSnap.id),
          name: String(d.name || 'Untitled'),
          kind: d.kind === 'barcode' ? 'barcode' : 'qr',
          category: d.category || 'custom',
          payload: String(d.payload || ''),
          favorite: Boolean(d.favorite),
          thumbnailDataUrl:
            typeof d.thumbnailDataUrl === 'string' ? d.thumbnailDataUrl : undefined,
          qrForm: d.qrForm as SavedProject['qrForm'],
          qrDesign: d.qrDesign as SavedProject['qrDesign'],
          barcodeConfig: d.barcodeConfig as SavedProject['barcodeConfig'],
          createdAt: toMillis(d.createdAt),
          updatedAt: toMillis(d.updatedAt),
        };
      });
      items.sort((a, b) => b.updatedAt - a.updatedAt);
      onProjects(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToUserHistory(
  uid: string,
  onHistory: (entries: HistoryEntry[]) => void
): Unsubscribe {
  const path = `users/${uid}/history`;
  const q = query(collection(db, 'users', uid, 'history'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: HistoryEntry[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id || docSnap.id),
          action:
            d.action === 'downloaded' || d.action === 'updated' ? d.action : 'created',
          kind: d.kind === 'barcode' ? 'barcode' : 'qr',
          title: String(d.title || 'Untitled'),
          category: String(d.category || 'custom'),
          payload: String(d.payload || ''),
          format: d.format as ExportFormat | undefined,
          timestamp: toMillis(d.createdAt),
          projectSnapshot: d.projectSnapshot as HistoryEntry['projectSnapshot'],
        };
      });
      items.sort((a, b) => b.timestamp - a.timestamp);
      onHistory(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function createSavedProjectInFirestore(
  uid: string,
  project: SavedProject
): Promise<SavedProject> {
  const sanitized = sanitizeProjectForFirestore(uid, project);
  const path = `users/${uid}/projects/${sanitized.id}`;
  const ref = doc(db, 'users', uid, 'projects', sanitized.id);

  try {
    await setDoc(ref, {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    ...project,
    id: sanitized.id,
    name: sanitized.name,
    payload: sanitized.payload,
    thumbnailDataUrl: sanitized.thumbnailDataUrl,
  };
}

export async function toggleFavoriteInFirestore(
  uid: string,
  projectId: string,
  favorite: boolean
): Promise<void> {
  const path = `users/${uid}/projects/${projectId}`;
  const ref = doc(db, 'users', uid, 'projects', projectId);
  try {
    await updateDoc(ref, {
      favorite,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function renameProjectInFirestore(
  uid: string,
  projectId: string,
  nextName: string
): Promise<void> {
  const path = `users/${uid}/projects/${projectId}`;
  const ref = doc(db, 'users', uid, 'projects', projectId);
  const safeName = clampNonEmptyString(
    nextName,
    BLUEPRINT_LIMITS.MAX_PROJECT_NAME,
    'Untitled Code'
  );
  try {
    await updateDoc(ref, {
      name: safeName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProjectFromFirestore(
  uid: string,
  projectId: string
): Promise<void> {
  const path = `users/${uid}/projects/${projectId}`;
  const ref = doc(db, 'users', uid, 'projects', projectId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addHistoryEntryToFirestore(
  uid: string,
  entry: HistoryEntry
): Promise<void> {
  const sanitized = sanitizeHistoryForFirestore(uid, entry);
  const path = `users/${uid}/history/${sanitized.id}`;
  const ref = doc(db, 'users', uid, 'history', sanitized.id);
  try {
    await setDoc(ref, {
      ...sanitized,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function clearUserHistoryInFirestore(
  uid: string,
  entryIds: string[]
): Promise<void> {
  if (entryIds.length === 0) return;
  const path = `users/${uid}/history`;
  try {
    for (let i = 0; i < entryIds.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = entryIds.slice(i, i + 400);
      for (const id of chunk) {
        if (isValidFirestoreId(id)) {
          batch.delete(doc(db, 'users', uid, 'history', id));
        }
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
