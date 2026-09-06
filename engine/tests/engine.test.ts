// ============================================================================
// KetakKetik Adaptive Learning Engine — Test Suite
// ============================================================================

import { describe, it, expect } from 'vitest';
import { AdaptiveEngine, generateTrainingSession, SeededPRNG } from '../src/engine';
import { KeyMatrix, SessionRecord, DEFAULT_CONFIG, WeakKey } from '../src/interfaces';

// ── Fixtures ────────────────────────────────────────────────────────────────

function createKeyMatrix(): KeyMatrix {
  const km: KeyMatrix = {};
  for (const key of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
    km[key] = {
      errorCount: 0,
      totalPresses: 1000,
      avgDownstrokeMs: 45,
      avgUpstrokeMs: 55,
      lastErrorTimestamp: null,
    };
  }
  return km;
}

function createSessions(count: number, weakKey?: string): SessionRecord[] {
  const sessions: SessionRecord[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const keyErrors: Record<string, number> = {};
    const keyPresses: Record<string, number> = {};
    if (weakKey) {
      keyErrors[weakKey] = i < 5 ? Math.floor(Math.random() * 5) + 2 : 0;
      keyPresses[weakKey] = 50;
    }
    for (const key of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
      if (key === weakKey) continue;
      keyErrors[key] = Math.floor(Math.random() * 2);
      keyPresses[key] = 30 + Math.floor(Math.random() * 20);
    }
    sessions.push({
      sessionId: `test-session-${i}`,
      timestamp: now - i * 3600000,
      wpm: 300 + Math.floor(Math.random() * 100),
      accuracy: weakKey && i < 5 ? 0.85 + Math.random() * 0.1 : 0.95 + Math.random() * 0.04,
      keyErrors,
      keyPresses,
      avgLatencyMs: 45 + Math.random() * 20,
    });
  }
  return sessions;
}

// ── Seeded PRNG Tests ───────────────────────────────────────────────────────

describe('SeededPRNG', () => {
  it('deterministic for same seed', () => {
    const r1 = new SeededPRNG(42);
    const r2 = new SeededPRNG(42);
    const v1 = Array.from({ length: 10 }, () => r1.next());
    const v2 = Array.from({ length: 10 }, () => r2.next());
    expect(v1).toEqual(v2);
  });

  it('different for different seeds', () => {
    const r1 = new SeededPRNG(42);
    const r2 = new SeededPRNG(43);
    const v1 = Array.from({ length: 10 }, () => r1.next());
    const v2 = Array.from({ length: 10 }, () => r2.next());
    expect(v1).not.toEqual(v2);
  });

  it('values in [0, 2^31 - 1]', () => {
    const rng = new SeededPRNG(123);
    const MAX = 0x7fffffff;
    for (let i = 0; i < 100; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(MAX);
    }
  });

  it('random() in [0, 1)', () => {
    const rng = new SeededPRNG(456);
    for (let i = 0; i < 100; i++) {
      const val = rng.random();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('nextInt in [min, max)', () => {
    const rng = new SeededPRNG(789);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(10, 20);
      expect(val).toBeGreaterThanOrEqual(10);
      expect(val).toBeLessThan(20);
    }
  });

  it('deterministic shuffle', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const r1 = new SeededPRNG(999);
    const r2 = new SeededPRNG(999);
    expect(r1.shuffle(arr)).toEqual(r2.shuffle([...arr]));
  });
});

// ── Weakness Score Tests ────────────────────────────────────────────────────

describe('Weakness Scoring', () => {
  it('high error rate key is identified as weak', () => {
    const km = createKeyMatrix();
    km['z'] = { errorCount: 150, totalPresses: 500, avgDownstrokeMs: 80, avgUpstrokeMs: 90, lastErrorTimestamp: Date.now() };

    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const result = engine.generateSession(km, createSessions(10, 'z'), [], createKeyMatrix());
    expect(result.weakKeys.map((w) => w.key)).toContain('z');
  });

  it('high latency key is identified as weak', () => {
    const km = createKeyMatrix();
    km['q'] = { errorCount: 10, totalPresses: 100, avgDownstrokeMs: 200, avgUpstrokeMs: 250, lastErrorTimestamp: Date.now() };

    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const result = engine.generateSession(km, createSessions(10), [], createKeyMatrix());
    expect(result.weakKeys.map((w) => w.key)).toContain('q');
  });

  it('handles zero-press keys gracefully', () => {
    const km = createKeyMatrix();
    km['z'] = { errorCount: 0, totalPresses: 0, avgDownstrokeMs: 0, avgUpstrokeMs: 0, lastErrorTimestamp: null };
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    expect(() => engine.generateSession(km, [], [], createKeyMatrix())).not.toThrow();
  });
});

// ── Training String Tests ───────────────────────────────────────────────────

describe('Training String Generation', () => {
  it('respects configured session length', () => {
    const km = createKeyMatrix();
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test', sessionLength: 200 });
    const result = engine.generateSession(km, createSessions(10), [], createKeyMatrix());
    expect(result.trainingString.length).toBe(200);
  });

  it('deterministic for same inputs', () => {
    const km = createKeyMatrix();
    const sessions = createSessions(10);
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const r1 = engine.generateSession(km, sessions, [], createKeyMatrix());
    const r2 = engine.generateSession(km, sessions, [], createKeyMatrix());
    expect(r1.trainingString).toBe(r2.trainingString);
  });

  it('different output for different profile IDs', () => {
    const km = createKeyMatrix();
    const sessions = createSessions(10);
    const e1 = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'p1' });
    const e2 = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'p2' });
    const r1 = e1.generateSession(km, sessions, [], createKeyMatrix());
    const r2 = e2.generateSession(km, sessions, [], createKeyMatrix());
    expect(r1.trainingString).not.toBe(r2.trainingString);
  });

  it('no more than maxConsecutive identical keys', () => {
    const km = createKeyMatrix();
    for (const key of Object.keys(km)) {
      km[key] = { ...km[key], errorCount: 100, totalPresses: 200, avgDownstrokeMs: 100, avgUpstrokeMs: 100 };
    }
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test', maxConsecutive: 3 });
    const result = engine.generateSession(km, createSessions(10), [], createKeyMatrix());

    for (let i = 3; i < result.trainingString.length; i++) {
      const chunk = result.trainingString.slice(i - 3, i + 1);
      expect(new Set(chunk.split('')).size).toBeGreaterThan(1);
    }
  });

  it('includes weak keys in the string', () => {
    const km = createKeyMatrix();
    km['z'] = { errorCount: 200, totalPresses: 300, avgDownstrokeMs: 120, avgUpstrokeMs: 130, lastErrorTimestamp: Date.now() };
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const result = engine.generateSession(km, createSessions(10, 'z'), [], createKeyMatrix());
    expect(result.trainingString).toContain('z');
  });

  it('handles empty inputs gracefully', () => {
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    expect(() => engine.generateSession({}, [], [], {})).not.toThrow();
  });
});

// ── Progress Delta Tests ────────────────────────────────────────────────────

describe('Progress Delta', () => {
  it('identifies improved keys', () => {
    // prevKm: 'z' was very weak (50% error rate, high latency)
    const prevKm: KeyMatrix = {};
    for (const key of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
      prevKm[key] = { errorCount: 0, totalPresses: 1000, avgDownstrokeMs: 45, avgUpstrokeMs: 55, lastErrorTimestamp: null };
    }
    prevKm['z'] = { errorCount: 100, totalPresses: 200, avgDownstrokeMs: 150, avgUpstrokeMs: 160, lastErrorTimestamp: Date.now() };
    prevKm['x'] = { errorCount: 80, totalPresses: 200, avgDownstrokeMs: 130, avgUpstrokeMs: 140, lastErrorTimestamp: Date.now() };
    prevKm['y'] = { errorCount: 60, totalPresses: 200, avgDownstrokeMs: 120, avgUpstrokeMs: 130, lastErrorTimestamp: Date.now() };

    // curKm: 'z' fully improved (0 errors, best latency — not a weak key)
    // 'x' and 'y' remain weak
    const curKm: KeyMatrix = {};
    for (const key of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
      curKm[key] = { errorCount: 0, totalPresses: 1000, avgDownstrokeMs: 45, avgUpstrokeMs: 55, lastErrorTimestamp: null };
    }
    curKm['z'] = { errorCount: 0, totalPresses: 2000, avgDownstrokeMs: 45, avgUpstrokeMs: 55, lastErrorTimestamp: null };
    curKm['x'] = { errorCount: 80, totalPresses: 200, avgDownstrokeMs: 130, avgUpstrokeMs: 140, lastErrorTimestamp: Date.now() };
    curKm['y'] = { errorCount: 60, totalPresses: 200, avgDownstrokeMs: 120, avgUpstrokeMs: 130, lastErrorTimestamp: Date.now() };

    // Previous weak keys were z, x, y
    const prevWeak: WeakKey[] = [
      { key: 'z', weaknessScore: 0.95, errorRate: 0.5, latencyDeviation: 0.3, recencyWeight: 0.2, volatility: 0.1 },
      { key: 'x', weaknessScore: 0.85, errorRate: 0.4, latencyDeviation: 0.25, recencyWeight: 0.15, volatility: 0.08 },
      { key: 'y', weaknessScore: 0.75, errorRate: 0.3, latencyDeviation: 0.2, recencyWeight: 0.12, volatility: 0.06 },
    ];

    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const result = engine.generateSession(curKm, [], prevWeak, prevKm);
    expect(result.progressDelta.improvedKeys).toContain('z');
    expect(result.progressDelta.overallTrend).toBe('improving');
  });

  it('identifies worsened keys', () => {
    const curKm = createKeyMatrix();
    const prevKm = createKeyMatrix();
    prevKm['a'] = { errorCount: 1, totalPresses: 1000, avgDownstrokeMs: 30, avgUpstrokeMs: 40, lastErrorTimestamp: null };
    curKm['a'] = { errorCount: 50, totalPresses: 200, avgDownstrokeMs: 100, avgUpstrokeMs: 110, lastErrorTimestamp: Date.now() };

    const curWeak: WeakKey[] = [
      { key: 'a', weaknessScore: 0.95, errorRate: 0.25, latencyDeviation: 0.3, recencyWeight: 0.2, volatility: 0.1 },
      { key: 'b', weaknessScore: 0.8, errorRate: 0.15, latencyDeviation: 0.2, recencyWeight: 0.1, volatility: 0.05 },
      { key: 'c', weaknessScore: 0.7, errorRate: 0.1, latencyDeviation: 0.15, recencyWeight: 0.08, volatility: 0.04 },
    ];
    const prevWeak: WeakKey[] = [
      { key: 'x', weaknessScore: 0.9, errorRate: 0.4, latencyDeviation: 0.25, recencyWeight: 0.15, volatility: 0.08 },
      { key: 'y', weaknessScore: 0.8, errorRate: 0.3, latencyDeviation: 0.2, recencyWeight: 0.12, volatility: 0.06 },
      { key: 'z', weaknessScore: 0.7, errorRate: 0.2, latencyDeviation: 0.15, recencyWeight: 0.1, volatility: 0.05 },
    ];

    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const result = engine.generateSession(curKm, [], prevWeak, prevKm);
    expect(result.progressDelta.worsenedKeys).toContain('a');
    expect(result.progressDelta.overallTrend).toBe('declining');
  });

  it('reports stagnant when equal', () => {
    const curKm = createKeyMatrix();
    const prevKm = createKeyMatrix();
    const curWeak: WeakKey[] = [
      { key: 'a', weaknessScore: 0.9, errorRate: 0.1, latencyDeviation: 0.2, recencyWeight: 0.1, volatility: 0.05 },
      { key: 'b', weaknessScore: 0.8, errorRate: 0.08, latencyDeviation: 0.15, recencyWeight: 0.08, volatility: 0.04 },
      { key: 'c', weaknessScore: 0.7, errorRate: 0.07, latencyDeviation: 0.12, recencyWeight: 0.07, volatility: 0.03 },
    ];
    const prevWeak: WeakKey[] = [
      { key: 'd', weaknessScore: 0.9, errorRate: 0.1, latencyDeviation: 0.2, recencyWeight: 0.1, volatility: 0.05 },
      { key: 'e', weaknessScore: 0.8, errorRate: 0.08, latencyDeviation: 0.15, recencyWeight: 0.08, volatility: 0.04 },
      { key: 'f', weaknessScore: 0.7, errorRate: 0.07, latencyDeviation: 0.12, recencyWeight: 0.07, volatility: 0.03 },
    ];

    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const result = engine.generateSession(curKm, [], prevWeak, prevKm);
    expect(result.progressDelta.overallTrend).toBe('stagnant');
  });
});

// ── Session Config Tests ────────────────────────────────────────────────────

describe('Session Config', () => {
  it('short bias for high error rates', () => {
    const km = createKeyMatrix();
    for (const key of Object.keys(km)) km[key].errorCount = Math.floor(km[key].totalPresses * 0.4);
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const result = engine.generateSession(km, createSessions(10), [], createKeyMatrix());
    expect(result.sessionConfig.wordLengthBias).toBe('short');
  });

  it('long bias for low error rates', () => {
    const km = createKeyMatrix();
    for (const key of Object.keys(km)) km[key].errorCount = 0;
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const result = engine.generateSession(km, createSessions(10), [], createKeyMatrix());
    expect(result.sessionConfig.wordLengthBias).toBe('long');
  });

  it('adjusts WPM by difficulty multiplier', () => {
    const km = createKeyMatrix();
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test', difficultyMultiplier: 1.5 });
    const result = engine.generateSession(km, createSessions(10), [], createKeyMatrix());
    expect(result.sessionConfig.targetWpm).toBeGreaterThan(500);
  });
});

// ── Edge Case Tests ─────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  it('empty key matrix', () => {
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    expect(() => engine.generateSession({}, [], [], {})).not.toThrow();
  });

  it('single session', () => {
    const km = createKeyMatrix();
    km['z'] = { errorCount: 10, totalPresses: 50, avgDownstrokeMs: 100, avgUpstrokeMs: 110, lastErrorTimestamp: Date.now() };
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    expect(() => engine.generateSession(km, createSessions(1, 'z'), [], createKeyMatrix())).not.toThrow();
  });

  it('all keys at 100% accuracy', () => {
    const km = createKeyMatrix();
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const result = engine.generateSession(km, createSessions(10), [], createKeyMatrix());
    expect(result.trainingString.length).toBeGreaterThan(0);
    expect(result.weakKeys.length).toBe(3);
  });

  it('exactly 3 keys', () => {
    const km: KeyMatrix = {
      a: { errorCount: 50, totalPresses: 100, avgDownstrokeMs: 100, avgUpstrokeMs: 110, lastErrorTimestamp: Date.now() },
      b: { errorCount: 30, totalPresses: 100, avgDownstrokeMs: 80, avgUpstrokeMs: 90, lastErrorTimestamp: Date.now() },
      c: { errorCount: 10, totalPresses: 100, avgDownstrokeMs: 60, avgUpstrokeMs: 70, lastErrorTimestamp: null },
    };
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const result = engine.generateSession(km, createSessions(5), [], {});
    expect(result.weakKeys.length).toBe(3);
  });
});

// ── Performance Tests ───────────────────────────────────────────────────────

describe('Performance', () => {
  it('completes in under 5ms', () => {
    const km = createKeyMatrix();
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const start = performance.now();
    engine.generateSession(km, createSessions(20), [], createKeyMatrix());
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
  });

  it('handles all 26 keys', () => {
    const km = createKeyMatrix();
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    expect(() => engine.generateSession(km, createSessions(20), [], createKeyMatrix())).not.toThrow();
  });
});

// ── Integration Tests ───────────────────────────────────────────────────────

describe('Integration', () => {
  it('full workflow: identify weaknesses and generate training', () => {
    const km = createKeyMatrix();
    km['z'] = { errorCount: 200, totalPresses: 400, avgDownstrokeMs: 150, avgUpstrokeMs: 160, lastErrorTimestamp: Date.now() };
    km['q'] = { errorCount: 150, totalPresses: 500, avgDownstrokeMs: 130, avgUpstrokeMs: 140, lastErrorTimestamp: Date.now() - 86400000 };
    km['x'] = { errorCount: 100, totalPresses: 600, avgDownstrokeMs: 120, avgUpstrokeMs: 130, lastErrorTimestamp: Date.now() - 172800000 };

    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'user-123' });
    const result = engine.generateSession(km, createSessions(20, 'z'), [], createKeyMatrix());

    expect(result.trainingString.length).toBe(175);
    expect(result.weakKeys.length).toBe(3);
    expect(result.sessionConfig.weakKeyFocus.length).toBe(3);
    expect(result.progressDelta.currentWeakKeys.length).toBe(3);

    const wkNames = result.weakKeys.map((w) => w.key);
    expect(wkNames).toContain('z');
    expect(wkNames).toContain('q');
    expect(wkNames).toContain('x');

    for (const key of wkNames) expect(result.trainingString).toContain(key);
  });

  it('progressive improvement tracking', () => {
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'user-456' });

    // Session 1: User struggles with 'z' and 'q'
    const km1: KeyMatrix = {};
    for (const key of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
      km1[key] = { errorCount: 0, totalPresses: 1000, avgDownstrokeMs: 45, avgUpstrokeMs: 55, lastErrorTimestamp: null };
    }
    km1['z'] = { errorCount: 200, totalPresses: 400, avgDownstrokeMs: 150, avgUpstrokeMs: 160, lastErrorTimestamp: Date.now() };
    km1['q'] = { errorCount: 150, totalPresses: 500, avgDownstrokeMs: 130, avgUpstrokeMs: 140, lastErrorTimestamp: Date.now() };
    const r1 = engine.generateSession(km1, createSessions(10, 'z'), [], createKeyMatrix());

    // Session 2: 'z' fully improved (0 errors, best latency — not weak)
    // 'q' still weak
    const km2: KeyMatrix = {};
    for (const key of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
      km2[key] = { errorCount: 0, totalPresses: 1000, avgDownstrokeMs: 45, avgUpstrokeMs: 55, lastErrorTimestamp: null };
    }
    km2['z'] = { errorCount: 0, totalPresses: 2000, avgDownstrokeMs: 45, avgUpstrokeMs: 55, lastErrorTimestamp: null };
    km2['q'] = { errorCount: 150, totalPresses: 500, avgDownstrokeMs: 130, avgUpstrokeMs: 140, lastErrorTimestamp: Date.now() };
    const r2 = engine.generateSession(km2, createSessions(10), r1.weakKeys, km1);

    expect(r2.progressDelta.improvedKeys).toContain('z');
    expect(r2.progressDelta.overallTrend).toBe('improving');
  });

  it('stateless: same inputs produce same outputs', () => {
    const km = createKeyMatrix();
    km['z'] = { errorCount: 200, totalPresses: 400, avgDownstrokeMs: 150, avgUpstrokeMs: 160, lastErrorTimestamp: Date.now() };
    const sessions = createSessions(10, 'z');

    const results = Array.from({ length: 5 }, () => generateTrainingSession(km, sessions, [], createKeyMatrix()));
    for (let i = 1; i < results.length; i++) {
      expect(results[i].trainingString).toBe(results[0].trainingString);
      expect(results[i].weakKeys.map((w) => w.key)).toEqual(results[0].weakKeys.map((w) => w.key));
    }
  });
});

// ── Configuration Tests ─────────────────────────────────────────────────────

describe('Configuration', () => {
  it('custom session length', () => {
    const km = createKeyMatrix();
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test', sessionLength: 300 });
    const result = engine.generateSession(km, createSessions(10), [], createKeyMatrix());
    expect(result.trainingString.length).toBe(300);
  });

  it('custom weak key count', () => {
    const km = createKeyMatrix();
    const engine = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test', weakKeyCount: 5 });
    const result = engine.generateSession(km, createSessions(10), [], createKeyMatrix());
    expect(result.weakKeys.length).toBe(5);
  });

  it('withConfig returns new instance', () => {
    const e1 = new AdaptiveEngine({ ...DEFAULT_CONFIG, profileId: 'test' });
    const e2 = e1.withConfig({ sessionLength: 250 });
    expect(e1.getConfig().sessionLength).toBe(175);
    expect(e2.getConfig().sessionLength).toBe(250);
    expect(e1).not.toBe(e2);
  });
});

describe('English word lessons', () => {
  it('uses whole dictionary words at every requested length', async () => {
    const { WORDS } = await import('../src/wordList');
    const dictionary = new Set(WORDS);
    for (let length = 1; length <= 300; length++) {
      const engine = new AdaptiveEngine({ profileId: 'words', sessionLength: length });
      const text = engine.generateSession({}, [], [], {}).trainingString;
      expect(text.length).toBe(length);
      expect(text).toBe(text.trim());
      expect(text.split(' ').every(word => dictionary.has(word))).toBe(true);
    }
  });

  it('targets weak letters using complete words', async () => {
    const { WORDS } = await import('../src/wordList');
    const km = createKeyMatrix();
    for (const key of 'zqx') km[key].errorCount = 900;
    const text = new AdaptiveEngine({ profileId: 'focused' }).generateSession(km, [], [], {}).trainingString;
    expect(text.split(' ').every(word => WORDS.includes(word))).toBe(true);
    for (const key of 'zqx') expect(text).toContain(key);
  });

  it('changes lessons with the lesson index while remaining reproducible', () => {
    const engine = new AdaptiveEngine({ profileId: 'new-text' });
    const first = engine.generateSession({}, [], [], {}, 0).trainingString;
    const second = engine.generateSession({}, [], [], {}, 1).trainingString;
    expect(second).not.toBe(first);
    expect(engine.generateSession({}, [], [], {}, 1).trainingString).toBe(second);
  });
});
