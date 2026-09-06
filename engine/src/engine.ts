import { WORDS } from './wordList';
// ============================================================================
// KetakKetik Adaptive Learning Engine — Implementation
// ============================================================================

import {
  KeyMatrix,
  SessionRecord,
  WeakKey,
  TrainingSession,
  SessionConfig,
  ProgressDelta,
  AdaptiveEngineConfig,
  DEFAULT_CONFIG,
} from './interfaces';

// ─────────────────────────────────────────────────────────────────────────────
// Seeded PRNG (Mulberry / LCG variant — deterministic, no deps)
// ─────────────────────────────────────────────────────────────────────────────

export class SeededPRNG {
  private state: number;

  constructor(seed: number) {
    // Ensure positive seed in valid range
    this.state = ((seed >>> 0) % 0x7fffffff) + 1;
  }

  /** Return next integer in [0, 2^31 - 1] */
  next(): number {
    // LCG parameters (glibc)
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state;
  }

  /** Return float in [0, 1) */
  random(): number {
    return this.next() / 0x80000000;
  }

  /** Return integer in [min, max) */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.random() * (max - min));
  }

  /** Fisher-Yates shuffle of array (in-place, deterministic) */
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hash utility for deterministic seeding
// ─────────────────────────────────────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function createSeed(profileId: string, dateStr: string): number {
  return hashString(profileId + dateStr);
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistics helpers
// ─────────────────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sqDiffs = values.map((v) => (v - m) ** 2);
  return Math.sqrt(mean(sqDiffs));
}

function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  return denominator !== 0 ? numerator / denominator : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Compute Weighted Weakness Scores
// ─────────────────────────────────────────────────────────────────────────────

function computeRawScores(
  keyMatrix: KeyMatrix,
  sessions: SessionRecord[],
): { scores: Map<string, WeakKey>; globalMeanLatency: number } {
  // Calculate global mean latency across all keys
  const latencies: number[] = [];
  for (const keyData of Object.values(keyMatrix)) {
    const avg = (keyData.avgDownstrokeMs + keyData.avgUpstrokeMs) / 2;
    if (keyData.totalPresses > 0) latencies.push(avg);
  }
  const globalMeanLatency = mean(latencies);

  // Ensure we have a valid global mean
  const effectiveGlobalMean = globalMeanLatency > 0 ? globalMeanLatency : 100;

  const scores = new Map<string, WeakKey>();

  for (const [key, keyData] of Object.entries(keyMatrix)) {
    // --- Error rate (0 to 1) ---
    const errorRate = safeDivide(keyData.errorCount, keyData.totalPresses);

    // --- Latency deviation (normalized from global mean) ---
    const avgLatency = safeDivide(
      keyData.avgDownstrokeMs + keyData.avgUpstrokeMs,
      2,
      0,
    );
    const latencyDeviation =
      keyData.totalPresses > 0
        ? Math.abs(avgLatency - effectiveGlobalMean) / effectiveGlobalMean
        : 0;

    // --- Recency weight (from recent sessions) ---
    const recentSessions = sessions.slice(0, Math.min(5, sessions.length));
    let recentErrors = 0;
    let recentTotal = 0;
    for (const session of recentSessions) {
      recentErrors += session.keyErrors[key] || 0;
      recentTotal += session.keyPresses[key] || 0;
    }
    const recentErrorRate = safeDivide(recentErrors, recentTotal);

    // 2x multiplier if key had recent errors
    const recencyWeight = recentErrors > 0 ? recentErrorRate * 2.0 : recentErrorRate;

    // --- Volatility (coefficient of variation of per-session accuracy) ---
    const sessionAccuracies: number[] = [];
    for (const session of sessions) {
      const keyAccuracy = safeDivide(
        (session.keyPresses[key] || 0) - (session.keyErrors[key] || 0),
        session.keyPresses[key] || 1,
      );
      sessionAccuracies.push(keyAccuracy);
    }
    const volatility =
      sessionAccuracies.length >= 2
        ? stdDev(sessionAccuracies) / (mean(sessionAccuracies) > 0 ? mean(sessionAccuracies) : 1)
        : 0;

    // --- Weighted sum ---
    const rawScore =
      0.45 * errorRate +
      0.30 * latencyDeviation +
      0.15 * recencyWeight +
      0.10 * volatility;

    scores.set(key, {
      key,
      weaknessScore: rawScore,
      errorRate,
      latencyDeviation,
      recencyWeight,
      volatility,
    });
  }

  return { scores, globalMeanLatency: effectiveGlobalMean };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Normalize scores to [0, 1]
// ─────────────────────────────────────────────────────────────────────────────

function normalizeScores(scores: Map<string, WeakKey>): Map<string, WeakKey> {
  const values = Array.from(scores.values());
  if (values.length === 0) return scores;

  const rawScores = values.map((w) => w.weaknessScore);
  const minScore = Math.min(...rawScores);
  const maxScore = Math.max(...rawScores);
  const range = maxScore - minScore;

  if (range <= 0) {
    // All scores are equal — return as-is
    return scores;
  }

  const normalized = new Map<string, WeakKey>();
  for (const [key, weakKey] of scores) {
    normalized.set(key, {
      ...weakKey,
      weaknessScore: (weakKey.weaknessScore - minScore) / range,
    });
  }

  return normalized;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Identify top weakest keys
// ─────────────────────────────────────────────────────────────────────────────

function getTopWeakest(
  scores: Map<string, WeakKey>,
  count: number,
): WeakKey[] {
  const sorted = Array.from(scores.values()).sort((a, b) => b.weaknessScore - a.weaknessScore);
  return sorted.slice(0, count);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Generate contextual bigrams and trigrams
// ─────────────────────────────────────────────────────────────────────────────

/** Select complete English words, favoring words containing weak keys.
 * sessionLength includes spaces; never truncate the final word.
 */
function generateTrainingString(
  weakKeys: WeakKey[],
  config: AdaptiveEngineConfig,
  rng: SeededPRNG,
): string {
  const target = Math.max(0, Math.floor(config.sessionLength));
  if (!Number.isFinite(target) || target === 0) return '';
  const words = WORDS.filter(word => ![...word].some((char, i) =>
    i >= config.maxConsecutive &&
    word.slice(i - config.maxConsecutive, i + 1).split('').every(c => c === char),
  ));
  const result: string[] = [];
  let length = 0;
  const uncovered = weakKeys.filter(wk => words.some(word => word.includes(wk.key)));
  while (length < target) {
    const remaining = target - length - (result.length ? 1 : 0);
    // A one-character remainder cannot hold a separator and another word.
    const candidates = words.filter(word => word.length <= remaining && word.length !== remaining - 1);
    if (!candidates.length) break;
    const focus = uncovered[0];
    const focused = candidates.filter(word => focus
      ? word.includes(focus.key)
      : weakKeys.some(wk => word.includes(wk.key)));
    let pool = focused.length && (focus || rng.random() < config.weakKeyFocusProportion)
      ? focused : candidates;
    const varied = pool.filter(word => word !== result[result.length - 1]);
    if (varied.length) pool = varied;
    const word = pool[rng.nextInt(0, pool.length)];
    length += word.length + (result.length ? 1 : 0);
    result.push(word);
    for (let i = uncovered.length - 1; i >= 0; i--) {
      if (word.includes(uncovered[i].key)) uncovered.splice(i, 1);
    }
  }
  return result.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6: Calculate progress delta
// ─────────────────────────────────────────────────────────────────────────────

function calculateProgressDelta(
  currentWeakKeys: WeakKey[],
  previousWeakKeys: WeakKey[],
  currentKeyMatrix: KeyMatrix,
  previousKeyMatrix: KeyMatrix,
): ProgressDelta {
  const currentKeys = new Set(currentWeakKeys.map((wk) => wk.key));
  const previousKeys = new Set(previousWeakKeys.map((wk) => wk.key));

  // Improved keys: were weak before, and error rate has decreased
  // (regardless of whether the key is still in the current weak set
  // — e.g., a key may still be slow but have fewer errors)
  const improvedKeys: string[] = [];
  for (const prevKey of previousKeys) {
    const prevRate = safeDivide(previousKeyMatrix[prevKey]?.errorCount ?? 0, previousKeyMatrix[prevKey]?.totalPresses ?? 1);
    const currRate = safeDivide(currentKeyMatrix[prevKey]?.errorCount ?? 0, currentKeyMatrix[prevKey]?.totalPresses ?? 1);
    if (currRate < prevRate) {
      improvedKeys.push(prevKey);
    }
  }

  // Worsened keys: were NOT weak before, and error rate has increased
  // AND the key is now in the current weak set
  const worsenedKeys: string[] = [];
  for (const currKey of currentKeys) {
    if (!previousKeys.has(currKey)) {
      const prevRate = safeDivide(previousKeyMatrix[currKey]?.errorCount ?? 0, previousKeyMatrix[currKey]?.totalPresses ?? 1);
      const currRate = safeDivide(currentKeyMatrix[currKey]?.errorCount ?? 0, currentKeyMatrix[currKey]?.totalPresses ?? 1);
      if (currRate > prevRate) {
        worsenedKeys.push(currKey);
      }
    }
  }

  let overallTrend: 'improving' | 'stagnant' | 'declining';
  if (improvedKeys.length > worsenedKeys.length) {
    overallTrend = 'improving';
  } else if (worsenedKeys.length > improvedKeys.length) {
    overallTrend = 'declining';
  } else {
    overallTrend = 'stagnant';
  }

  return {
    previousWeakKeys: Array.from(previousKeys),
    currentWeakKeys: Array.from(currentKeys),
    improvedKeys,
    worsenedKeys,
    overallTrend,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 7: Generate session config
// ─────────────────────────────────────────────────────────────────────────────

function generateSessionConfig(
  weakKeys: WeakKey[],
  config: AdaptiveEngineConfig,
): SessionConfig {
  const avgErrorRate = mean(weakKeys.map((wk) => wk.errorRate));
  const baseAccuracyThreshold = 0.95;
  const accuracyThreshold = Math.max(0.7, baseAccuracyThreshold - avgErrorRate * 0.5);

  const baseTargetWpm = 500;
  const difficultyAdjustment = config.difficultyMultiplier * (1 + weakKeys.length * 0.1);
  const targetWpm = Math.round(baseTargetWpm * difficultyAdjustment);

  let wordLengthBias: SessionConfig['wordLengthBias'] = 'mixed';
  if (avgErrorRate > 0.3) wordLengthBias = 'short';
  else if (avgErrorRate > 0.15) wordLengthBias = 'medium';
  else if (avgErrorRate < 0.05) wordLengthBias = 'long';

  return {
    targetWpm,
    accuracyThreshold: Math.round(accuracyThreshold * 100) / 100,
    difficultyMultiplier: config.difficultyMultiplier,
    weakKeyFocus: weakKeys.map((wk) => wk.key),
    wordLengthBias,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export class AdaptiveEngine {
  private config: AdaptiveEngineConfig;

  constructor(config?: Partial<AdaptiveEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process user data and produce a training session.
   *
   * @param keyMatrix - Per-key performance data
   * @param sessions - Recent session history (sorted newest first)
   * @param previousWeakKeys - Weak keys from the last training session
   * @param previousKeyMatrix - Previous key matrix for progress comparison
   * @returns TrainingSession with generated string and metadata
   */
  generateSession(
    keyMatrix: KeyMatrix,
    sessions: SessionRecord[],
    previousWeakKeys: WeakKey[],
    previousKeyMatrix: KeyMatrix,
    lessonIndex = 0,
  ): TrainingSession {
    const profileDate = new Date().toISOString().slice(0, 10);
    const seed = createSeed(this.config.profileId, `${profileDate}:${lessonIndex}`);
    const rng = new SeededPRNG(seed);

    // Step 1: Compute raw weakness scores
    const { scores } = computeRawScores(keyMatrix, sessions);

    // Step 2: Normalize to [0, 1]
    const normalizedScores = normalizeScores(scores);

    // Step 3: Get top weakest keys
    const weakKeys = getTopWeakest(normalizedScores, this.config.weakKeyCount);

    // Step 4: Generate training string
    const trainingString = generateTrainingString(weakKeys, this.config, rng);

    // Step 5: Generate session config
    const sessionConfig = generateSessionConfig(weakKeys, this.config);

    // Step 6: Calculate progress delta
    const progressDelta = calculateProgressDelta(
      weakKeys,
      previousWeakKeys,
      keyMatrix,
      previousKeyMatrix,
    );

    return {
      trainingString,
      weakKeys,
      sessionConfig,
      progressDelta,
    };
  }

  /** Update configuration (returns new instance for immutability) */
  withConfig(overrides: Partial<AdaptiveEngineConfig>): AdaptiveEngine {
    return new AdaptiveEngine({ ...this.config, ...overrides });
  }

  /** Get current config */
  getConfig(): AdaptiveEngineConfig {
    return { ...this.config };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience function for stateless usage
// ─────────────────────────────────────────────────────────────────────────────

export function generateTrainingSession(
  keyMatrix: KeyMatrix,
  sessions: SessionRecord[],
  previousWeakKeys: WeakKey[],
  previousKeyMatrix: KeyMatrix,
  configOverrides?: Partial<AdaptiveEngineConfig>,
): TrainingSession {
  const engine = new AdaptiveEngine(configOverrides);
  return engine.generateSession(keyMatrix, sessions, previousWeakKeys, previousKeyMatrix);
}
