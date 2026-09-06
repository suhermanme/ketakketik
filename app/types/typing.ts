// ============================================================================
// KetakKetik — Typing Domain Types
// ============================================================================

/** Character display state in the typing canvas */
export type CharState =
  | 'PENDING'
  | 'CURRENT'
  | 'CORRECT'
  | 'COMPLETE'
  | 'FADED'
  | 'ERROR';

/** Typed event from a key press */
export interface TypingKeyEvent {
  key: string;
  direction: 'down' | 'up';
  timestamp: number;
  isCorrect: boolean;
}

/** Per-session aggregated statistics */
export interface SessionStats {
  currentWpm: number;
  averageWpm: number;
  peakWpm: number;
  accuracy: number;
  totalKeystrokes: number;
  totalErrors: number;
  durationMs: number;
  startedAt: number;
  completedAt: number | null;
}

/** Raw key event data for engine ingestion */
export interface KeyEventData {
  key: string;
  direction: 'down' | 'up';
  latencyMs: number;
  isCorrect: boolean;
}

/** Session configuration from the engine */
export interface EngineSessionConfig {
  targetWpm: number;
  accuracyThreshold: number;
  difficultyMultiplier: number;
  weakKeyFocus: string[];
  wordLengthBias: 'short' | 'medium' | 'long' | 'mixed';
}

/** Progress delta from the engine */
export interface EngineProgressDelta {
  previousWeakKeys: string[];
  currentWeakKeys: string[];
  improvedKeys: string[];
  worsenedKeys: string[];
  overallTrend: 'improving' | 'stagnant' | 'declining';
}

/** Weak key data from the engine */
export interface EngineWeakKey {
  key: string;
  weaknessScore: number;
  errorRate: number;
  latencyDeviation: number;
  recencyWeight: number;
  volatility: number;
}

/** Complete training session from the engine */
export interface EngineTrainingSession {
  trainingString: string;
  weakKeys: EngineWeakKey[];
  sessionConfig: EngineSessionConfig;
  progressDelta: EngineProgressDelta;
}

/** Session record for persistence */
export interface SessionRecord {
  sessionId: string;
  timestamp: number;
  wpm: number;
  accuracy: number;
  keyErrors: Record<string, number>;
  keyPresses: Record<string, number>;
  avgLatencyMs: number;
}

export interface WpmSample {
  elapsedMs: number;
  wpm: number;
}
