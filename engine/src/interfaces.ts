// ============================================================================
// KetakKetik Adaptive Learning Engine — Interfaces
// ============================================================================

// ── Input Types ─────────────────────────────────────────────────────────────

export interface KeyData {
  errorCount: number;
  totalPresses: number;
  avgDownstrokeMs: number;
  avgUpstrokeMs: number;
  lastErrorTimestamp: number | null;
}

export type KeyMatrix = Record<string, KeyData>;

export interface SessionRecord {
  sessionId: string;
  timestamp: number;
  wpm: number;
  accuracy: number;
  keyErrors: Record<string, number>;
  keyPresses: Record<string, number>;
  avgLatencyMs: number;
}

// ── Internal Scoring Types ─────────────────────────────────────────────────

export interface WeakKey {
  key: string;
  weaknessScore: number;
  errorRate: number;
  latencyDeviation: number;
  recencyWeight: number;
  volatility: number;
}

// ── Output Types ────────────────────────────────────────────────────────────

export interface SessionConfig {
  targetWpm: number;
  accuracyThreshold: number;
  difficultyMultiplier: number;
  weakKeyFocus: string[];
  wordLengthBias: 'short' | 'medium' | 'long' | 'mixed';
}

export interface ProgressDelta {
  previousWeakKeys: string[];
  currentWeakKeys: string[];
  improvedKeys: string[];
  worsenedKeys: string[];
  overallTrend: 'improving' | 'stagnant' | 'declining';
}

export interface TrainingSession {
  trainingString: string;
  weakKeys: WeakKey[];
  sessionConfig: SessionConfig;
  progressDelta: ProgressDelta;
}

// ── User Configuration ──────────────────────────────────────────────────────

export interface AdaptiveEngineConfig {
  profileId: string;
  difficultyMultiplier: number;
  sessionLength: number;
  recentSessionsCount: number;
  weakKeyCount: number;
  weakKeyFocusProportion: number;
  contextualProportion: number;
  maxConsecutive: number;
  minDataPoints: number;
}

// ── Default Configuration ───────────────────────────────────────────────────

export const DEFAULT_CONFIG: AdaptiveEngineConfig = {
  profileId: '',
  difficultyMultiplier: 1.0,
  sessionLength: 175,
  recentSessionsCount: 20,
  weakKeyCount: 3,
  weakKeyFocusProportion: 0.60,
  contextualProportion: 0.40,
  maxConsecutive: 3,
  minDataPoints: 10,
};
