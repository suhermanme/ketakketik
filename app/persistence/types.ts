// ============================================================================
// KetakKetik Persistence Layer — TypeScript Types
// ============================================================================

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export enum SessionType {
  ADAPTIVE = 'adaptive',
  CUSTOM = 'custom',
  PRACTICE = 'practice',
}

export enum KeyDirection {
  DOWN = 'down',
  UP = 'up',
}

// ── Persistence Error Codes ────────────────────────────────────────────────────

export enum PersistenceErrorType {
  DB_OPEN_FAILED = 'DB_OPEN_FAILED',
  STORE_NOT_FOUND = 'STORE_NOT_FOUND',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INDEX_NOT_FOUND = 'INDEX_NOT_FOUND',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  CASCADE_DELETE_FAILED = 'CASCADE_DELETE_FAILED',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  DB_VERSION_MISMATCH = 'DB_VERSION_MISMATCH',
  IDB_OPERATION_FAILED = 'IDB_OPERATION_FAILED',
}

// ── PersistenceError ───────────────────────────────────────────────────────────

export class PersistenceError extends Error {
  public readonly code: PersistenceErrorType;

  constructor(code: PersistenceErrorType, message: string) {
    super(message);
    this.name = 'PersistenceError';
    this.code = code;

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, PersistenceError.prototype);
  }

  toJSON(): { name: string; code: PersistenceErrorType; message: string } {
    return { name: this.name, code: this.code, message: this.message };
  }
}

// ── Profile ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  theme: ThemeMode;
  createdAt: number;
  lastActive: number;
  active: boolean;
}

// ── Session (stored in IndexedDB) ──────────────────────────────────────────────

export interface Session {
  id: string;
  profileId: string;
  startedAt: number;
  completedAt: number;
  type: SessionType;
  config: Record<string, unknown>;
}

// ── WPM History ────────────────────────────────────────────────────────────────

export interface WpmEntry {
  id: string;
  profileId: string;
  sessionId: string;
  timestamp: number;
  avgWpm: number;
  peakWpm: number;
  accuracy: number;
  textSample: string;
  durationMs: number;
}

// ── Key Error ──────────────────────────────────────────────────────────────────

export interface KeyError {
  id: string;
  profileId: string;
  key: string;
  errorCount: number;
  totalPresses: number;
  lastErrorTimestamp: number;
}

// ── Latency Log ────────────────────────────────────────────────────────────────

export interface LatencyLog {
  id: string;
  profileId: string;
  key: string;
  latencyMs: number;
  timestamp: number;
  direction: KeyDirection;
}

// ── Meta Store ─────────────────────────────────────────────────────────────────

export interface MetaEntry {
  key: 'schema_version';
  value: number;
}

// ── Derived Types ──────────────────────────────────────────────────────────────

export interface KeyData {
  errorCount: number;
  totalPresses: number;
  avgDownstrokeMs: number;
  avgUpstrokeMs: number;
  lastErrorTimestamp: number;
}

export type KeyMatrix = Record<string, KeyData>;

export interface ProfileStats {
  totalSessions: number;
  avgWpm: number;
  peakWpm: number;
  avgAccuracy: number;
  totalErrors: number;
  totalPresses: number;
  weakestKeys: WeakKey[];
  strongestKeys: WeakKey[];
  wpmTrend: number[];
  accuracyTrend: number[];
}

export interface WeakKey {
  key: string;
  weaknessScore: number;
  errorRate: number;
  latencyDeviation: number;
  recencyWeight: number;
  volatility: number;
}

// ── Session Data (for recording) ───────────────────────────────────────────────

export interface SessionData {
  sessionId: string;
  profileId: string;
  startedAt: number;
  completedAt: number;
  type: SessionType;
  avgWpm: number;
  peakWpm: number;
  accuracy: number;
  textSample: string;
  durationMs: number;
  config?: Record<string, unknown>;
}

// ── Date Range ─────────────────────────────────────────────────────────────────

export interface DateRange {
  from: number;
  to: number;
}

// ── Adaptive Inputs ────────────────────────────────────────────────────────────

export interface AdaptiveInputs {
  keyMatrix: KeyMatrix;
  recentSessions: SessionRecord[];
  previousWeakKeys: WeakKey[];
  previousKeyMatrix: KeyMatrix;
}

// ── Engine Session Record (for persistence storage) ────────────────────────────

export interface SessionRecord {
  sessionId: string;
  timestamp: number;
  wpm: number;
  accuracy: number;
  keyErrors: Record<string, number>;
  keyPresses: Record<string, number>;
  avgLatencyMs: number;
}

// ── Schema Constants ───────────────────────────────────────────────────────────

export const DATABASE_NAME = 'ketakketik' as const;
export const CURRENT_SCHEMA_VERSION = 1 as const;
export const META_KEY = 'schema_version' as const;

// ── Safe Deep Clone Helper ─────────────────────────────────────────────────────

export function cloneDeep<T>(value: T): T {
  return structuredClone(value);
}
