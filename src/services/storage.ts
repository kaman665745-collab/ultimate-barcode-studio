import { openDB, IDBPDatabase } from 'idb';
import { AppSettings, HistoryEntry, SavedProject } from '../types/studio';
import { SEED_PROJECTS } from '../data/presets';

const DB_NAME = 'ultimate_barcode_studio_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_HISTORY = 'history';
const STORE_SETTINGS = 'settings';
const SETTINGS_KEY = 'user_settings';
const SEED_FLAG_KEY = 'ubs_seeded_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultExportFormat: 'PNG',
  defaultExportSize: 1024,
  defaultEcc: 'Q',
  defaultMargin: 16,
  adsenseEnabled: false,
  adsensePublisherId: '',
  adsenseSlots: {
    header: false,
    sidebar: false,
    content: false,
  },
};

let dbPromise: Promise<IDBPDatabase> | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          const store = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          const store = db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS);
        }
      },
    });
  }
  return dbPromise;
}

export async function initializeStudioStorage(): Promise<{
  projects: SavedProject[];
  history: HistoryEntry[];
  settings: AppSettings;
}> {
  try {
    const db = await getDb();
    let projects = (await db.getAll(STORE_PROJECTS)) as SavedProject[];
    let history = (await db.getAll(STORE_HISTORY)) as HistoryEntry[];
    const storedSettings = (await db.get(STORE_SETTINGS, SETTINGS_KEY)) as AppSettings | undefined;

    const alreadySeeded = typeof window !== 'undefined' && window.localStorage.getItem(SEED_FLAG_KEY) === '1';

    if (projects.length === 0 && !alreadySeeded) {
      const tx = db.transaction([STORE_PROJECTS, STORE_HISTORY], 'readwrite');
      for (const proj of SEED_PROJECTS) {
        await tx.objectStore(STORE_PROJECTS).put(proj);
        const h: HistoryEntry = {
          id: `hist-${proj.id}`,
          action: 'created',
          kind: proj.kind,
          title: proj.name,
          category: proj.category,
          payload: proj.payload,
          timestamp: proj.createdAt,
          projectSnapshot: {
            name: proj.name,
            kind: proj.kind,
            category: proj.category,
            payload: proj.payload,
            qrDesign: proj.qrDesign,
            barcodeConfig: proj.barcodeConfig,
          },
        };
        await tx.objectStore(STORE_HISTORY).put(h);
      }
      await tx.done;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SEED_FLAG_KEY, '1');
      }
      projects = [...SEED_PROJECTS];
      history = (await db.getAll(STORE_HISTORY)) as HistoryEntry[];
    }

    projects.sort((a, b) => b.updatedAt - a.updatedAt);
    history.sort((a, b) => b.timestamp - a.timestamp);

    return {
      projects,
      history,
      settings: storedSettings ? { ...DEFAULT_SETTINGS, ...storedSettings } : DEFAULT_SETTINGS,
    };
  } catch {
    return {
      projects: [...SEED_PROJECTS],
      history: [],
      settings: DEFAULT_SETTINGS,
    };
  }
}

export async function saveProjectToDb(project: SavedProject): Promise<void> {
  const db = await getDb();
  await db.put(STORE_PROJECTS, project);
}

export async function deleteProjectFromDb(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_PROJECTS, id);
}

export async function addHistoryEntryToDb(entry: HistoryEntry): Promise<void> {
  const db = await getDb();
  await db.put(STORE_HISTORY, entry);
}

export async function clearHistoryInDb(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_HISTORY);
}

export async function saveSettingsToDb(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.put(STORE_SETTINGS, settings, SETTINGS_KEY);
}

export async function clearAllStudioData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORE_PROJECTS, STORE_HISTORY, STORE_SETTINGS], 'readwrite');
  await tx.objectStore(STORE_PROJECTS).clear();
  await tx.objectStore(STORE_HISTORY).clear();
  await tx.objectStore(STORE_SETTINGS).clear();
  await tx.done;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SEED_FLAG_KEY, '1');
  }
}
