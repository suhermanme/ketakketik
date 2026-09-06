// ============================================================================
// KetakKetik Persistence Layer — Database Schema & Initialization
// ============================================================================

import {
  DATABASE_NAME,
  CURRENT_SCHEMA_VERSION,
  META_KEY,
  PersistenceError,
  PersistenceErrorType,
} from './types';

// ── Object Store Names ─────────────────────────────────────────────────────────

const PROFILES_STORE = 'profiles';
const SESSIONS_STORE = 'sessions';
const WPM_HISTORY_STORE = 'wpm_history';
const KEY_ERRORS_STORE = 'key_errors';
const LATENCY_LOGS_STORE = 'latency_logs';
const META_STORE = '_meta';

// ── Schema Creation Helpers ────────────────────────────────────────────────────

// @ts-expect-error - intentionally unused, kept for potential future use
function _createAllStores(db: IDBDatabase): void {
  db.createObjectStore(PROFILES_STORE);
  db.createObjectStore(SESSIONS_STORE);
  db.createObjectStore(WPM_HISTORY_STORE);
  db.createObjectStore(KEY_ERRORS_STORE);
  db.createObjectStore(LATENCY_LOGS_STORE);
  db.createObjectStore(META_STORE, { keyPath: 'key' });
}

// Note: createAllIndexes is no longer used directly.
// During onupgradeneeded, indexes are created in createSchemaWithIndexes
// which captures store references from createObjectStore.
// This function is kept as a reference for future migration patterns.

// Internal: create stores with indexes in one pass (for onupgradeneeded)
function createSchemaWithIndexes(db: IDBDatabase): void {
  // profiles
  const profilesStore = db.createObjectStore(PROFILES_STORE);
  profilesStore.createIndex('active_idx', 'active', { unique: true });

  // sessions
  const sessionsStore = db.createObjectStore(SESSIONS_STORE);
  sessionsStore.createIndex('profile_time_idx', ['profileId', 'timestamp']);
  sessionsStore.createIndex('profile_idx', 'profileId');

  // wpm_history
  const wpmStore = db.createObjectStore(WPM_HISTORY_STORE);
  wpmStore.createIndex('profile_time_idx', ['profileId', 'timestamp']);
  wpmStore.createIndex('profile_idx', 'profileId');

  // key_errors
  const errorsStore = db.createObjectStore(KEY_ERRORS_STORE);
  errorsStore.createIndex('profile_key_idx', ['profileId', 'key'], { unique: true });

  // latency_logs
  const latencyStore = db.createObjectStore(LATENCY_LOGS_STORE);
  latencyStore.createIndex('profile_key_time_idx', ['profileId', 'key', 'timestamp']);
  latencyStore.createIndex('profile_idx', 'profileId');

  // _meta
  db.createObjectStore(META_STORE, { keyPath: 'key' });
}

// ── Database Creation ──────────────────────────────────────────────────────────

export function createDatabase(db: IDBDatabase): void {
  createSchemaWithIndexes(db);
}

// ── Migration ──────────────────────────────────────────────────────────────────

export async function migrateSchema(db: IDBDatabase, currentVersion: number): Promise<void> {
  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    createSchemaWithIndexes(db);
  }

  // Always ensure meta entry exists
  await putMetaEntry(db);
}

async function putMetaEntry(db: IDBDatabase): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(META_STORE, 'readwrite');
    const store = transaction.objectStore(META_STORE);
    const request = store.put({ key: META_KEY, value: CURRENT_SCHEMA_VERSION });

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.DB_OPEN_FAILED, 'Failed to write meta entry'));
  });
}

// ── Database Initialization ────────────────────────────────────────────────────

let _dbPromise: Promise<IDBDatabase> | null = null;

export function initializeDatabase(): Promise<IDBDatabase> {
  if (_dbPromise !== null) {
    return _dbPromise;
  }

  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, CURRENT_SCHEMA_VERSION);

    request.onerror = () => {
      _dbPromise = null;
      reject(
        new PersistenceError(PersistenceErrorType.DB_OPEN_FAILED, 'Failed to open IndexedDB database'),
      );
    };

    request.onsuccess = () => {
      const db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const currentVersion = event.oldVersion;

      if (currentVersion < CURRENT_SCHEMA_VERSION) {
        migrateSchema(db, currentVersion).catch((err) => {
          reject(err);
        });
      }
    };
  });

  return _dbPromise;
}

// ── Database Reset (for testing/debugging) ─────────────────────────────────────

export function resetDatabase(): void {
  if (_dbPromise !== null) {
    _dbPromise.catch(() => { /* ignore */ });
    _dbPromise = null;
  }
  indexedDB.deleteDatabase(DATABASE_NAME);
}
