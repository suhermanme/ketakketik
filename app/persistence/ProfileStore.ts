// ============================================================================
// KetakKetik Persistence Layer — ProfileStore (Business Logic)
// ============================================================================

import { initializeDatabase } from './schema';
import {
  read,
  write,
  remove,
  getByIndex,
  getAllByIndex,
  getByIndexRange,
  iterateAll,
  deleteByProfile,
  generateUuid,
  profileScopedKey,
} from './idb-wrapper';
import {
  Profile,
  Session,
  WpmEntry,
  KeyError,
  LatencyLog,
  KeyMatrix,
  WeakKey,
  ProfileStats,
  SessionRecord,
  SessionData,
  DateRange,
  AdaptiveInputs,
  PersistenceError,
  PersistenceErrorType,
  KeyDirection,
  ThemeMode,
  cloneDeep,
} from './types';

// ── ProfileStore Class ─────────────────────────────────────────────────────────

export class ProfileStore {
  private db: IDBDatabase | null = null;
  private currentProfileId: string | null = null;

  // ── Database Access ──────────────────────────────────────────────────────

  private async ensureDb(): Promise<IDBDatabase> {
    if (this.db === null) {
      this.db = await initializeDatabase();
    }
    return this.db;
  }

  // ── ID Generation ────────────────────────────────────────────────────────

  private generateId(): string {
    return generateUuid();
  }

  // ── Profile Lifecycle ────────────────────────────────────────────────────

  async createProfile(name: string): Promise<Profile> {
    const db = await this.ensureDb();
    const id = this.generateId();
    const now = Date.now();

    const profile: Profile = {
      id,
      name,
      avatar: '',
      theme: ThemeMode.AUTO,
      createdAt: now,
      lastActive: now,
      active: false,
    };

    await write<Profile>(db, 'profiles', profile);

    // If no active profile exists, activate this one
    const activeProfile = await getByIndex<Profile>(db, 'profiles', 'active_idx', 'active' as string);
    if (activeProfile === null) {
      profile.active = true;
      this.currentProfileId = id;
      await write<Profile>(db, 'profiles', profile);
    }

    return cloneDeep(profile);
  }

  async switchProfile(id: string): Promise<void> {
    const db = await this.ensureDb();

    // Deactivate current
    if (this.currentProfileId !== null) {
      const current = await read<Profile>(db, 'profiles', this.currentProfileId);
      if (current !== undefined) {
        current.active = false;
        await write<Profile>(db, 'profiles', current);
      }
    }

    // Activate new
    const target = await read<Profile>(db, 'profiles', id);
    if (target === undefined) {
      throw new PersistenceError(PersistenceErrorType.PROFILE_NOT_FOUND, `Profile not found: ${id}`);
    }

    target.active = true;
    target.lastActive = Date.now();
    await write<Profile>(db, 'profiles', target);

    this.currentProfileId = id;
  }

  async getCurrentProfile(): Promise<Profile | null> {
    const db = await this.ensureDb();
    const active = await getByIndex<Profile>(db, 'profiles', 'active_idx', 1 as unknown as string | number);
    return active !== null ? cloneDeep(active) : null;
  }

  async listProfiles(): Promise<Profile[]> {
    const db = await this.ensureDb();
    const profiles = await iterateAll(db, 'profiles') as Profile[];
    return cloneDeep(profiles);
  }

  async deleteProfile(id: string): Promise<void> {
    const db = await this.ensureDb();

    // Verify profile exists
    const profile = await read<Profile>(db, 'profiles', id);
    if (profile === undefined) {
      throw new PersistenceError(PersistenceErrorType.PROFILE_NOT_FOUND, `Profile not found: ${id}`);
    }

    // Cascade delete all associated data
    await deleteByProfile(db, 'sessions', id, 'profile_idx');
    await deleteByProfile(db, 'wpm_history', id, 'profile_idx');
    await deleteByProfile(db, 'key_errors', id, 'profile_key_idx');
    await deleteByProfile(db, 'latency_logs', id, 'profile_idx');

    // Delete profile
    await remove(db, 'profiles', id);

    // If current profile was deleted, activate another
    if (this.currentProfileId === id) {
      const remaining = await iterateAll(db, 'profiles') as Profile[];
      if (remaining.length > 0) {
        const next = remaining[0];
        next.active = true;
        await write<Profile>(db, 'profiles', next);
        this.currentProfileId = next.id;
      } else {
        this.currentProfileId = null;
      }
    }
  }

  // ── Session Recording ────────────────────────────────────────────────────

  async recordSession(sessionData: SessionData): Promise<void> {
    const db = await this.ensureDb();

    // Store session metadata
    const session: Session = {
      id: sessionData.sessionId,
      profileId: sessionData.profileId,
      startedAt: sessionData.startedAt,
      completedAt: sessionData.completedAt,
      type: sessionData.type,
      config: sessionData.config ?? {},
    };
    await write<Session>(db, 'sessions', session);

    // Store WPM entry
    const wpmEntry: WpmEntry = {
      id: this.generateId(),
      profileId: sessionData.profileId,
      sessionId: sessionData.sessionId,
      timestamp: sessionData.completedAt,
      avgWpm: sessionData.avgWpm,
      peakWpm: sessionData.peakWpm,
      accuracy: sessionData.accuracy,
      textSample: sessionData.textSample,
      durationMs: sessionData.durationMs,
    };
    await write<WpmEntry>(db, 'wpm_history', wpmEntry);

    // Update profile lastActive
    const profile = await read<Profile>(db, 'profiles', sessionData.profileId);
    if (profile !== undefined) {
      profile.lastActive = sessionData.completedAt;
      await write<Profile>(db, 'profiles', profile);
    }
  }

  // ── Per-Session Key Data ─────────────────────────────────────────────────

  async recordSessionKeyData(
    sessionId: string,
    keyErrors: Record<string, number>,
    keyPresses: Record<string, number>,
    avgLatencyMs: number,
  ): Promise<void> {
    const db = await this.ensureDb();

    // Update session config with key data
    const session = await read<Session>(db, 'sessions', sessionId);
    if (session === undefined) {
      throw new PersistenceError(
        PersistenceErrorType.DB_OPEN_FAILED,
        `Session not found: ${sessionId}`,
      );
    }

    session.config.keyErrors = keyErrors;
    session.config.keyPresses = keyPresses;
    session.config.avgLatencyMs = avgLatencyMs;

    await write<Session>(db, 'sessions', session);
  }

  async getHistory(profileId: string, range?: DateRange): Promise<WpmEntry[]> {
    const db = await this.ensureDb();

    if (range !== undefined) {
      const rangeKey = [profileId, range.from] as [string, number];
      const rangeTo = [profileId, range.to] as [string, number];
      const keyRange = IDBKeyRange.bound(rangeKey, rangeTo, false, false);
      return await getByIndexRange<WpmEntry>(db, 'wpm_history', 'profile_time_idx', keyRange);
    }

    return getAllByIndex<WpmEntry>(db, 'wpm_history', 'profile_idx', profileId);
  }

  // ── Profile Statistics ───────────────────────────────────────────────────

  async getStats(profileId: string): Promise<ProfileStats> {
    const db = await this.ensureDb();

    const sessions = await getAllByIndex<WpmEntry>(db, 'wpm_history', 'profile_idx', profileId);
    const errors = await getAllByIndex<KeyError>(db, 'key_errors', 'profile_key_idx', profileId);

    const totalSessions = sessions.length;
    const avgWpm = totalSessions > 0 ? sessions.reduce((sum, s) => sum + s.avgWpm, 0) / totalSessions : 0;
    const peakWpm = totalSessions > 0 ? Math.max(...sessions.map((s) => s.peakWpm)) : 0;
    const avgAccuracy = totalSessions > 0 ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions : 0;
    const totalErrors = errors.reduce((sum, e) => sum + e.errorCount, 0);
    const totalPresses = errors.reduce((sum, e) => sum + e.totalPresses, 0);

    const weakestKeys = await this.getWeakestKeys(profileId, 10);
    const strongestKeys = await this.getStrongestKeys(profileId, 10);

    // Compute trends (last 10 sessions)
    const sortedSessions = [...sessions].sort((a, b) => a.timestamp - b.timestamp);
    const recentSessions = sortedSessions.slice(-10);
    const wpmTrend = recentSessions.map((s) => s.avgWpm);
    const accuracyTrend = recentSessions.map((s) => s.accuracy);

    return {
      totalSessions,
      avgWpm: Math.round(avgWpm * 100) / 100,
      peakWpm,
      avgAccuracy: Math.round(avgAccuracy * 10000) / 10000,
      totalErrors,
      totalPresses,
      weakestKeys,
      strongestKeys,
      wpmTrend,
      accuracyTrend,
    };
  }

  // ── Key Event Recording ──────────────────────────────────────────────────

  async recordKeyEvent(
    key: string,
    type: 'error' | 'press',
    latencyMs?: number,
  ): Promise<void> {
    const db = await this.ensureDb();
    const profile = await this.getCurrentProfile();
    if (profile === null) {
      throw new PersistenceError(PersistenceErrorType.PROFILE_NOT_FOUND, 'No active profile');
    }

    const profileId = profile.id;
    const now = Date.now();

    if (type === 'error') {
      // Update or create KeyError
      const existing = await getByIndex<KeyError>(db, 'key_errors', 'profile_key_idx', profileScopedKey(profileId, key));

      if (existing !== null) {
        existing.errorCount += 1;
        existing.totalPresses += 1;
        existing.lastErrorTimestamp = now;
        await write<KeyError>(db, 'key_errors', existing);
      } else {
        const newError: KeyError = {
          id: this.generateId(),
          profileId,
          key,
          errorCount: 1,
          totalPresses: 1,
          lastErrorTimestamp: now,
        };
        await write<KeyError>(db, 'key_errors', newError);
      }
    } else if (type === 'press') {
      // Update KeyError totalPresses
      const existing = await getByIndex<KeyError>(db, 'key_errors', 'profile_key_idx', profileScopedKey(profileId, key));

      if (existing !== null) {
        existing.totalPresses += 1;
        await write<KeyError>(db, 'key_errors', existing);
      } else {
        const newKey: KeyError = {
          id: this.generateId(),
          profileId,
          key,
          errorCount: 0,
          totalPresses: 1,
          lastErrorTimestamp: 0,
        };
        await write<KeyError>(db, 'key_errors', newKey);
      }

      // Record latency if provided
      if (latencyMs !== undefined) {
        const latencyLog: LatencyLog = {
          id: this.generateId(),
          profileId,
          key,
          latencyMs,
          timestamp: now,
          direction: KeyDirection.DOWN,
        };
        await write<LatencyLog>(db, 'latency_logs', latencyLog);
      }
    }
  }

  // ── Key Matrix ───────────────────────────────────────────────────────────

  async getKeyMatrix(profileId: string): Promise<KeyMatrix> {
    const db = await this.ensureDb();
    const errors = await getAllByIndex<KeyError>(db, 'key_errors', 'profile_key_idx', profileId);

    const keyMatrix: KeyMatrix = {};

    for (const error of errors) {
      const avgLatency = await this.getAvgLatency(db, profileId, error.key);
      keyMatrix[error.key] = {
        errorCount: error.errorCount,
        totalPresses: error.totalPresses,
        avgDownstrokeMs: avgLatency,
        avgUpstrokeMs: avgLatency * 0.7, // Estimate: upstroke is ~70% of downstroke
        lastErrorTimestamp: error.lastErrorTimestamp,
      };
    }

    return cloneDeep(keyMatrix);
  }

  private async getAvgLatency(db: IDBDatabase, profileId: string, key: string): Promise<number> {
    const logs = await getAllByIndex<LatencyLog>(db, 'latency_logs', 'profile_key_time_idx', profileScopedKey(profileId, key));

    if (logs.length === 0) {
      return 0;
    }

    const total = logs.reduce((sum, log) => sum + log.latencyMs, 0);
    return Math.round(total / logs.length);
  }

  // ── Weak Keys ────────────────────────────────────────────────────────────

  async getWeakestKeys(profileId: string, count: number = 3): Promise<WeakKey[]> {
    const db = await this.ensureDb();
    const errors = await getAllByIndex<KeyError>(db, 'key_errors', 'profile_key_idx', profileId);

    // Compute global mean latency
    const allLogs = await getAllByIndex<LatencyLog>(db, 'latency_logs', 'profile_idx', profileId);
    const globalMeanLatency = allLogs.length > 0
      ? allLogs.reduce((sum, log) => sum + log.latencyMs, 0) / allLogs.length
      : 1;

    const weakKeys: WeakKey[] = [];

    for (const error of errors) {
      if (error.totalPresses === 0) {
        continue;
      }

      const errorRate = error.errorCount / error.totalPresses;
      const avgLatency = await this.getAvgLatency(db, profileId, error.key);
      const latencyDeviation = globalMeanLatency > 0
        ? Math.abs(avgLatency - globalMeanLatency) / globalMeanLatency
        : 0;

      // Recency weight: errors in last 5 sessions weighted 2x
      const recentSessions = await this.getRecentSessions(db, profileId, 5);
      const recentErrors = recentSessions.reduce(
        (sum, s) => sum + (s.keyErrors[error.key] ?? 0),
        0,
      );
      const recencyWeight = recentErrors > 0 ? recentErrors * 2.0 : 0;

      // Volatility: coefficient of variation of session accuracy
      const sessionAccuracies = recentSessions.map((s) => s.accuracy);
      const volatility = this.computeVolatility(sessionAccuracies);

      // Weighted weakness score
      const weaknessScore =
        0.45 * errorRate +
        0.30 * latencyDeviation +
        0.15 * recencyWeight +
        0.10 * volatility;

      weakKeys.push({
        key: error.key,
        weaknessScore: Math.round(weaknessScore * 10000) / 10000,
        errorRate: Math.round(errorRate * 10000) / 10000,
        latencyDeviation: Math.round(latencyDeviation * 10000) / 10000,
        recencyWeight: Math.round(recencyWeight * 10000) / 10000,
        volatility: Math.round(volatility * 10000) / 10000,
      });
    }

    // Sort by weakness score descending, take top N
    weakKeys.sort((a, b) => b.weaknessScore - a.weaknessScore);
    return cloneDeep(weakKeys.slice(0, count));
  }

  async getStrongestKeys(profileId: string, count: number = 10): Promise<WeakKey[]> {
    const db = await this.ensureDb();
    const errors = await getAllByIndex<KeyError>(db, 'key_errors', 'profile_key_idx', profileId);

    const allLogs = await getAllByIndex<LatencyLog>(db, 'latency_logs', 'profile_idx', profileId);
    const globalMeanLatency = allLogs.length > 0
      ? allLogs.reduce((sum, log) => sum + log.latencyMs, 0) / allLogs.length
      : 1;

    const strongKeys: WeakKey[] = [];

    for (const error of errors) {
      if (error.totalPresses === 0) {
        continue;
      }

      const errorRate = error.errorCount / error.totalPresses;
      const avgLatency = await this.getAvgLatency(db, profileId, error.key);
      const latencyDeviation = globalMeanLatency > 0
        ? Math.abs(avgLatency - globalMeanLatency) / globalMeanLatency
        : 0;

      const recentSessions = await this.getRecentSessions(db, profileId, 5);
      const recentErrors = recentSessions.reduce(
        (sum, s) => sum + (s.keyErrors[error.key] ?? 0),
        0,
      );
      const recencyWeight = recentErrors > 0 ? recentErrors * 2.0 : 0;

      const sessionAccuracies = recentSessions.map((s) => s.accuracy);
      const volatility = this.computeVolatility(sessionAccuracies);

      const weaknessScore =
        0.45 * errorRate +
        0.30 * latencyDeviation +
        0.15 * recencyWeight +
        0.10 * volatility;

      strongKeys.push({
        key: error.key,
        weaknessScore: Math.round(weaknessScore * 10000) / 10000,
        errorRate: Math.round(errorRate * 10000) / 10000,
        latencyDeviation: Math.round(latencyDeviation * 10000) / 10000,
        recencyWeight: Math.round(recencyWeight * 10000) / 10000,
        volatility: Math.round(volatility * 10000) / 10000,
      });
    }

    // Sort by weakness score ascending (strongest = lowest weakness)
    strongKeys.sort((a, b) => a.weaknessScore - b.weaknessScore);
    return cloneDeep(strongKeys.slice(0, count));
  }

  // ── Adaptive Engine Integration ──────────────────────────────────────────

  async getAdaptiveInputs(profileId: string): Promise<AdaptiveInputs> {
    const db = await this.ensureDb();

    const keyMatrix = await this.getKeyMatrix(profileId);
    const recentSessions = await this.getRecentSessions(db, profileId, 20);
    const previousWeakKeys = await this.getWeakestKeys(profileId, 3);

    // Previous key matrix: from last 3 sessions
    const previousSessions = await this.getRecentSessions(db, profileId, 3);
    const previousKeyMatrix: KeyMatrix = {};
    for (const session of previousSessions) {
      for (const [key, errorCount] of Object.entries(session.keyErrors)) {
        if (errorCount > 0 && !previousKeyMatrix[key]) {
          const presses = session.keyPresses[key] ?? 0;
          previousKeyMatrix[key] = {
            errorCount,
            totalPresses: presses,
            avgDownstrokeMs: 0,
            avgUpstrokeMs: 0,
            lastErrorTimestamp: session.timestamp,
          };
        }
      }
    }

    return {
      keyMatrix: cloneDeep(keyMatrix),
      recentSessions: cloneDeep(recentSessions),
      previousWeakKeys: cloneDeep(previousWeakKeys),
      previousKeyMatrix: cloneDeep(previousKeyMatrix),
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private async getRecentSessions(db: IDBDatabase, profileId: string, count: number): Promise<SessionRecord[]> {
    const allSessions = await getAllByIndex<Session>(db, 'sessions', 'profile_idx', profileId);
    const sorted = [...allSessions].sort((a, b) => b.startedAt - a.startedAt);
    const recent = sorted.slice(0, count);

    const result: SessionRecord[] = [];

    for (const session of recent) {
      const config = session.config as Record<string, unknown>;
      const keyErrors = (config.keyErrors as Record<string, number>) ?? {};
      const keyPresses = (config.keyPresses as Record<string, number>) ?? {};
      const avgLatencyMs = (config.avgLatencyMs as number) ?? 0;

      result.push({
        sessionId: session.id,
        timestamp: session.startedAt,
        wpm: 0, // Will be filled from wpm_history
        accuracy: 0, // Will be filled from wpm_history
        keyErrors,
        keyPresses,
        avgLatencyMs,
      });
    }

    // Fill in WPM and accuracy from wpm_history
    for (const record of result) {
      const wpmEntries = await getAllByIndex<WpmEntry>(db, 'wpm_history', 'profile_idx', profileId);
      const matching = wpmEntries.find((e) => e.sessionId === record.sessionId);
      if (matching !== undefined) {
        record.wpm = matching.avgWpm;
        record.accuracy = matching.accuracy;
      }
    }

    return cloneDeep(result);
  }

  private computeVolatility(accuracies: number[]): number {
    if (accuracies.length < 2) {
      return 0;
    }

    const mean = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;
    if (mean === 0) {
      return 0;
    }

    const variance = accuracies.reduce((sum, a) => sum + (a - mean) ** 2, 0) / accuracies.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / mean;
  }
}
