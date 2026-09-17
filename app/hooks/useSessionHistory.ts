// ============================================================================
// KetakKetik — Session History Hook
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { WpmEntry } from '@app/persistence/types';
import { ProfileStats } from '@app/persistence/types';
import { ProfileStore } from '@app/persistence/ProfileStore';

/** Loading state for history fetches */
interface LoadingState {
  sessions: boolean;
  stats: boolean;
}

export interface UseSessionHistoryReturn {
  /** Fetched session entries */
  sessions: WpmEntry[];
  /** Fetched profile statistics */
  stats: ProfileStats | null;
  /** Loading state per resource */
  loading: LoadingState;
  /** Errors encountered during fetch */
  errors: Record<string, Error | null>;
  /** Fetch session history for a profile */
  fetchHistory: (profileId: string) => Promise<void>;
  /** Fetch aggregated profile stats */
  fetchStats: (profileId: string) => Promise<void>;
  /** Reset all state */
  reset: () => void;
}

/**
 * React hook providing access to session history and profile statistics
 * from IndexedDB via ProfileStore.
 */
export function useSessionHistory(): UseSessionHistoryReturn {
  const [sessions, setSessions] = useState<WpmEntry[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    sessions: false,
    stats: false,
  });
  const [errors, setErrors] = useState<Record<string, Error | null>>({
    sessions: null,
    stats: null,
  });

  const storeRef = useRef<ProfileStore | null>(null);
  const pendingRef = useRef<Record<string, Promise<void> | null>>({
    sessions: null,
    stats: null,
  });

  const getStore = useCallback(async (): Promise<ProfileStore> => {
    if (!storeRef.current) {
      storeRef.current = new ProfileStore();
    }
    return storeRef.current;
  }, []);

  const fetchHistory = useCallback(async (profileId: string): Promise<void> => {
    // Deduplicate concurrent calls
    if (pendingRef.current.sessions) {
      return pendingRef.current.sessions;
    }

    const promise = (async (): Promise<void> => {
      setLoading((prev) => ({ ...prev, sessions: true }));
      setErrors((prev) => ({ ...prev, sessions: null }));
      try {
        const store = await getStore();
        const data = await store.getHistory(profileId);
        // Sort most recent first
        data.sort((a, b) => b.timestamp - a.timestamp);
        setSessions(data);
      } catch (err) {
        setErrors((prev) => ({ ...prev, sessions: err instanceof Error ? err : new Error(String(err)) }));
      } finally {
        setLoading((prev) => ({ ...prev, sessions: false }));
        pendingRef.current.sessions = null;
      }
    })();

    pendingRef.current.sessions = promise;
    return promise;
  }, [getStore]);

  const fetchStats = useCallback(async (profileId: string): Promise<void> => {
    // Deduplicate concurrent calls
    if (pendingRef.current.stats) {
      return pendingRef.current.stats;
    }

    const promise = (async (): Promise<void> => {
      setLoading((prev) => ({ ...prev, stats: true }));
      setErrors((prev) => ({ ...prev, stats: null }));
      try {
        const store = await getStore();
        const data = await store.getStats(profileId);
        setStats(data);
      } catch (err) {
        setErrors((prev) => ({ ...prev, stats: err instanceof Error ? err : new Error(String(err)) }));
      } finally {
        setLoading((prev) => ({ ...prev, stats: false }));
        pendingRef.current.stats = null;
      }
    })();

    pendingRef.current.stats = promise;
    return promise;
  }, [getStore]);

  const reset = useCallback((): void => {
    setSessions([]);
    setStats(null);
    setLoading({ sessions: false, stats: false });
    setErrors({ sessions: null, stats: null });
    pendingRef.current = { sessions: null, stats: null };
  }, []);

  return { sessions, stats, loading, errors, fetchHistory, fetchStats, reset };
}
