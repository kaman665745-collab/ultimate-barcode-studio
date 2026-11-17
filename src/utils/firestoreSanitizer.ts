import { ExportFormat, HistoryEntry, SavedProject } from '../types/studio';

export const BLUEPRINT_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  MAX_ID_LENGTH: 128,
  MAX_DISPLAY_NAME: 120,
  MAX_EMAIL: 254,
  MAX_PHOTO_URL: 2048,
  MAX_PROJECT_NAME: 140,
  MAX_CATEGORY: 64,
  MAX_PAYLOAD: 4000,
  MAX_THUMBNAIL: 200000,
} as const;

export function isValidFirestoreId(id: string): boolean {
  return (
    typeof id === 'string' &&
    id.length >= 1 &&
    id.length <= BLUEPRINT_LIMITS.MAX_ID_LENGTH &&
    BLUEPRINT_LIMITS.ID_PATTERN.test(id)
  );
}

export function normalizeSafeId(raw: string, fallbackPrefix = 'item'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, BLUEPRINT_LIMITS.MAX_ID_LENGTH);
  if (cleaned.length >= 1 && BLUEPRINT_LIMITS.ID_PATTERN.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`;
}

export function clampNonEmptyString(
  val: string,
  maxLength: number,
  fallback: string
): string {
  const trimmed = (val || '').trim();
  const base = trimmed.length > 0 ? trimmed : fallback;
  return base.slice(0, maxLength);
}

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        output[key] = stripUndefinedDeep(val);
      }
    }
    return output as T;
  }
  return value;
}

export interface SanitizedProjectDoc {
  id: string;
  ownerId: string;
  name: string;
  kind: 'qr' | 'barcode';
  category: string;
  payload: string;
  favorite: boolean;
  thumbnailDataUrl?: string;
  qrForm?: Record<string, unknown>;
  qrDesign?: Record<string, unknown>;
  barcodeConfig?: Record<string, unknown>;
}

export function sanitizeProjectForFirestore(
  ownerId: string,
  project: SavedProject
): SanitizedProjectDoc {
  if (!isValidFirestoreId(ownerId)) {
    throw new Error('Invalid owner UID format.');
  }

  const safeId = isValidFirestoreId(project.id)
    ? project.id
    : normalizeSafeId(project.id, project.kind);

  const docData: SanitizedProjectDoc = {
    id: safeId,
    ownerId,
    name: clampNonEmptyString(project.name, BLUEPRINT_LIMITS.MAX_PROJECT_NAME, 'Untitled Code'),
    kind: project.kind === 'barcode' ? 'barcode' : 'qr',
    category: clampNonEmptyString(
      String(project.category || 'custom'),
      BLUEPRINT_LIMITS.MAX_CATEGORY,
      'custom'
    ),
    payload: clampNonEmptyString(
      project.payload,
      BLUEPRINT_LIMITS.MAX_PAYLOAD,
      'https://ultimatebarcodestudio.app'
    ),
    favorite: Boolean(project.favorite),
  };

  if (
    project.thumbnailDataUrl &&
    project.thumbnailDataUrl.length <= BLUEPRINT_LIMITS.MAX_THUMBNAIL
  ) {
    docData.thumbnailDataUrl = project.thumbnailDataUrl;
  }

  if (project.qrForm) {
    docData.qrForm = stripUndefinedDeep(project.qrForm as Record<string, unknown>);
  }
  if (project.qrDesign) {
    docData.qrDesign = stripUndefinedDeep(project.qrDesign as unknown as Record<string, unknown>);
  }
  if (project.barcodeConfig) {
    docData.barcodeConfig = stripUndefinedDeep(
      project.barcodeConfig as unknown as Record<string, unknown>
    );
  }

  return docData;
}

export interface SanitizedHistoryDoc {
  id: string;
  ownerId: string;
  action: 'created' | 'downloaded' | 'updated';
  kind: 'qr' | 'barcode';
  title: string;
  category: string;
  payload: string;
  format?: ExportFormat;
  projectSnapshot?: Record<string, unknown>;
}

const VALID_FORMATS: ExportFormat[] = ['PNG', 'SVG', 'JPEG', 'PDF'];

export function sanitizeHistoryForFirestore(
  ownerId: string,
  entry: HistoryEntry
): SanitizedHistoryDoc {
  if (!isValidFirestoreId(ownerId)) {
    throw new Error('Invalid owner UID format.');
  }

  const safeId = isValidFirestoreId(entry.id)
    ? entry.id
    : normalizeSafeId(entry.id, 'hist');

  const docData: SanitizedHistoryDoc = {
    id: safeId,
    ownerId,
    action:
      entry.action === 'downloaded' || entry.action === 'updated' ? entry.action : 'created',
    kind: entry.kind === 'barcode' ? 'barcode' : 'qr',
    title: clampNonEmptyString(entry.title, BLUEPRINT_LIMITS.MAX_PROJECT_NAME, 'Untitled Code'),
    category: clampNonEmptyString(entry.category, BLUEPRINT_LIMITS.MAX_CATEGORY, 'custom'),
    payload: clampNonEmptyString(
      entry.payload,
      BLUEPRINT_LIMITS.MAX_PAYLOAD,
      'https://ultimatebarcodestudio.app'
    ),
  };

  if (entry.format && VALID_FORMATS.includes(entry.format)) {
    docData.format = entry.format;
  }

  if (entry.projectSnapshot) {
    docData.projectSnapshot = stripUndefinedDeep(
      entry.projectSnapshot as unknown as Record<string, unknown>
    );
  }

  return docData;
}
