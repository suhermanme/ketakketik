// ============================================================================
// KetakKetik Persistence Layer — Raw IndexedDB Wrapper
// ============================================================================

import {
  PersistenceError,
  PersistenceErrorType,
  cloneDeep,
} from './types';

// ── Type-safe IDB helpers ──────────────────────────────────────────────────────

type IdbReadMode = 'readonly' | 'readwrite';

function toTransactionMode(mode: IdbReadMode): IDBTransactionMode {
  return mode;
}

// ── Generic Read ───────────────────────────────────────────────────────────────

export function read<T>(
  db: IDBDatabase,
  storeName: string,
  key: string | number,
  mode: IdbReadMode = 'readonly',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, toTransactionMode(mode));
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result as T | undefined;
      if (result === undefined) {
        resolve(undefined as unknown as T);
      } else {
        resolve(cloneDeep(result));
      }
    };

    request.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.STORE_NOT_FOUND, `Failed to read from store: ${storeName}`));
  });
}

// ── Generic Write ──────────────────────────────────────────────────────────────

export function write<T>(
  db: IDBDatabase,
  storeName: string,
  value: T,
  mode: IdbReadMode = 'readwrite',
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, toTransactionMode(mode));
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.TRANSACTION_FAILED, `Failed to write to store: ${storeName}`));
  });
}

// ── Generic Delete ─────────────────────────────────────────────────────────────

export function remove(
  db: IDBDatabase,
  storeName: string,
  key: string | number,
  mode: IdbReadMode = 'readwrite',
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, toTransactionMode(mode));
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.TRANSACTION_FAILED, `Failed to delete from store: ${storeName}`));
  });
}

// ── Generic Clear ──────────────────────────────────────────────────────────────

export function clearStore(
  db: IDBDatabase,
  storeName: string,
  mode: IdbReadMode = 'readwrite',
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, toTransactionMode(mode));
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.TRANSACTION_FAILED, `Failed to clear store: ${storeName}`));
  });
}

// ── Generic Count ──────────────────────────────────────────────────────────────

export function count(
  db: IDBDatabase,
  storeName: string,
  key?: string | number | IDBKeyRange,
  mode: IdbReadMode = 'readonly',
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const transaction = db.transaction(storeName, toTransactionMode(mode));
    const store = transaction.objectStore(storeName);
    const request = key !== undefined ? store.count(key) : store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.STORE_NOT_FOUND, `Failed to count in store: ${storeName}`));
  });
}

// ── Index-based Query ──────────────────────────────────────────────────────────

export function getByIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  keyValue: string | number,
  mode: IdbReadMode = 'readonly',
): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const transaction = db.transaction(storeName, toTransactionMode(mode));
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.get(keyValue);

    request.onsuccess = () => {
      const result = request.result as T | undefined;
      resolve(result ?? null);
    };

    request.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.INDEX_NOT_FOUND, `Failed to query index: ${indexName} in ${storeName}`));
  });
}

// ── Index-based Range Query (returns all matching records) ─────────────────────

export interface IdbCursorResult<T> {
  results: T[];
  hasMore: boolean;
}

export function getAllByIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  keyValue: string | number,
  mode: IdbReadMode = 'readonly',
): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const transaction = db.transaction(storeName, toTransactionMode(mode));
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(keyValue);

    request.onsuccess = () => {
      const results = request.result as T[];
      resolve(cloneDeep(results));
    };

    request.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.INDEX_NOT_FOUND, `Failed to query index: ${indexName} in ${storeName}`));
  });
}

// ── Index-based Range Query (with IDBKeyRange) ─────────────────────────────────

export function getByIndexRange<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  range: IDBKeyRange,
  mode: IdbReadMode = 'readonly',
): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const transaction = db.transaction(storeName, toTransactionMode(mode));
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(range);

    request.onsuccess = () => {
      const results = request.result as T[];
      resolve(cloneDeep(results));
    };

    request.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.INDEX_NOT_FOUND, `Failed to query index range: ${indexName} in ${storeName}`));
  });
}

// ── Iterate Cursor (all records in a store) ────────────────────────────────────

export function iterateAll<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IdbReadMode = 'readonly',
): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const transaction = db.transaction(storeName, toTransactionMode(mode));
    const store = transaction.objectStore(storeName);
    const request = store.openCursor();
    const results: T[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor !== null) {
        results.push(cloneDeep(cursor.value as T));
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.STORE_NOT_FOUND, `Failed to iterate store: ${storeName}`));
  });
}

// ── Transaction with Auto-Cleanup ──────────────────────────────────────────────

export interface TransactionContext {
  db: IDBDatabase;
  storeName: string;
  objectStore: IDBObjectStore;
  abort: () => void;
}

export function beginTransaction(
  db: IDBDatabase,
  storeName: string,
  mode: IdbReadMode = 'readwrite',
): TransactionContext {
  const transaction = db.transaction(storeName, toTransactionMode(mode));
  const objectStore = transaction.objectStore(storeName);

  return {
    db,
    storeName,
    objectStore,
    abort: () => transaction.abort(),
  };
}

// ── Batch Write ────────────────────────────────────────────────────────────────

export function batchWrite<T>(
  db: IDBDatabase,
  storeName: string,
  records: T[],
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    for (const record of records) {
      store.put(record);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.TRANSACTION_FAILED, `Batch write failed on store: ${storeName}`));
  });
}

// ── Batch Delete by Profile ────────────────────────────────────────────────────

export async function deleteByProfile(
  db: IDBDatabase,
  storeName: string,
  profileId: string,
  indexName: string,
): Promise<void> {
  const records = await getAllByIndex(db, storeName, indexName, profileId);

  if (records.length === 0) {
    return;
  }

  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);

  for (const record of records) {
    // Use the first indexed key component as the delete key
    // For profile-scoped stores, the key path is typically 'id'
    const idKey = (record as Record<string, unknown>).id as string | number | undefined;
    if (idKey !== undefined) {
      store.delete(idKey);
    }
  }

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(new PersistenceError(PersistenceErrorType.CASCADE_DELETE_FAILED, `Cascade delete failed on store: ${storeName}`));
  });
}

// ── UUID Generation ────────────────────────────────────────────────────────────

let _uuidCounter = 0;

export function generateUuid(): string {
  const timestamp = Date.now().toString(36);
  const counter = (_uuidCounter++).toString(36).padStart(4, '0');
  const random = crypto.getRandomValues(new Uint32Array(4));
  const randomHex = Array.from(random)
    .map((n) => n.toString(36).padStart(8, '0'))
    .join('');

  return `${timestamp}-${counter}-${randomHex}`;
}

// ── Profile-Spaced Key Prefix ──────────────────────────────────────────────────

export function profileScopedKey(profileId: string, suffix: string): string {
  return `${profileId}::${suffix}`;
}
