// ============================================================================
// KetakKetik — Typing Session Hook
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  CharState,
  SessionStats,
  WpmSample,
  EngineTrainingSession,
} from '@app/types/typing';
import { FINGER_LESSONS, generateFingerDrill, TrainingMode } from '@app/utils/lessons';
import { AdaptiveEngine, KeyMatrix, SessionRecord, WeakKey } from '@ketakketik/engine';

/** Initial session stats */
const INITIAL_STATS: SessionStats = {
  currentWpm: 0,
  averageWpm: 0,
  peakWpm: 0,
  accuracy: 100,
  totalKeystrokes: 0,
  totalErrors: 0,
  durationMs: 0,
  startedAt: 0,
  completedAt: null,
};

/**
 * React hook managing the typing session state machine.
 * Handles character tracking, WPM calculation, accuracy, and engine integration.
 */
export function useTypingSession(profileId: string, mode: TrainingMode = 'practice', lessonIndex = 0, customText = ''): {
  // Session data
  trainingString: string;
  currentIndex: number;
  charStates: CharState[];
  stats: SessionStats;
  wpmHistory: WpmSample[];

  // Engine data
  weakKeys: WeakKey[];
  progressTrend: 'improving' | 'stagnant' | 'declining';

  // Actions
  handleKeyDown: (event: KeyboardEvent) => void;
  handleKeyUp: (event: KeyboardEvent) => void;
  reset: () => void;
  regenerate: () => void;
  isSessionActive: boolean;
} {
  const [trainingString, setTrainingString] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [charStates, setCharStates] = useState<CharState[]>([]);
  const [stats, setStats] = useState<SessionStats>(INITIAL_STATS);
  const [wpmHistory, setWpmHistory] = useState<WpmSample[]>([]);
  const [weakKeys, setWeakKeys] = useState<WeakKey[]>([]);
  const [progressTrend, setProgressTrend] = useState<
    'improving' | 'stagnant' | 'declining'
  >('stagnant');
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  const lessonIndexRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const errorsRef = useRef<number>(0);
  const correctRef = useRef<number>(0);
  const peakWpmRef = useRef<number>(0);
  const keyPressesRef = useRef<Record<string, number>>({});
  const keyErrorsRef = useRef<Record<string, number>>({});
  const latencyRef = useRef<number[]>([]);
  const errorTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const engineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine({ profileId, sessionLength: 175, weakKeyCount: 3 }),
  );

  /** Generate a new training session from the engine */
  const generateSession = useCallback((): EngineTrainingSession => {
    const keyMatrix: KeyMatrix = {};
    const sessions: SessionRecord[] = [];
    const prevWeakKeys: WeakKey[] = [];
    const prevMatrix: KeyMatrix = {};

    const session = engineRef.current.generateSession(
      keyMatrix,
      sessions,
      prevWeakKeys,
      prevMatrix,
      lessonIndexRef.current++,
    );

    return session;
  }, [profileId]);

  /** Initialize or regenerate session */
  const regenerate = useCallback(() => {
    const session = generateSession();
    const text = mode === 'custom' ? customText : mode === 'lessons'
      ? generateFingerDrill(FINGER_LESSONS[lessonIndex], lessonIndexRef.current - 1)
      : session.trainingString;
    setTrainingString(text);
    setWeakKeys(mode !== 'practice' ? [] : session.weakKeys);
    setProgressTrend(session.progressDelta.overallTrend);
    resetSession();
    setCharStates([...text].map((_, i) => i === 0 ? 'CURRENT' : 'PENDING'));
  }, [generateSession, mode, lessonIndex, customText]);

  /** Reset the session without regenerating */
  const resetSession = useCallback(() => {
    setCurrentIndex(0);
    setCharStates((prev) =>
      prev.map((_, i) => i === 0 ? 'CURRENT' : 'PENDING'),
    );
    setStats(INITIAL_STATS);
    setWpmHistory([]);
    errorsRef.current = 0;
    correctRef.current = 0;
    peakWpmRef.current = 0;
    keyPressesRef.current = {};
    keyErrorsRef.current = {};
    latencyRef.current = [];
    errorTimersRef.current.forEach(timer => clearTimeout(timer));
    errorTimersRef.current.clear();
    startTimeRef.current = 0;
    setIsSessionActive(false);
  }, []);

  /** Restart the current lesson. */
  const reset = resetSession;

  /** Handle key down event */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key;

      if (currentIndex >= trainingString.length) return;
      if (key.length !== 1 && key !== 'Backspace') return;
      event.preventDefault();

      // Start session on first character keypress
      if (!isSessionActive && key.length === 1 && trainingString.length > 0) {
        setIsSessionActive(true);
        startTimeRef.current = Date.now();
        setStats((prev) => ({
          ...prev,
          startedAt: Date.now(),
        }));
      }


      const keyLower = key.toLowerCase();
      const targetChar = trainingString[currentIndex]?.toLowerCase();

      // Handle space bar
      if (key === ' ' && targetChar === ' ') {
        processCorrectKey(keyLower, event);
        return;
      }

      // Handle backspace
      if (key === 'Backspace') {
        if (currentIndex > 0) {
          clearTimeout(errorTimersRef.current.get(currentIndex - 1));
          clearTimeout(errorTimersRef.current.get(currentIndex));
          setCurrentIndex((i) => i - 1);
          setCharStates((prev) => {
            const next = [...prev];
            next[currentIndex - 1] = 'CURRENT';
            next[currentIndex] = 'PENDING';
            return next;
          });
        }
        return;
      }

      // Ignore non-character keys
      if (key.length !== 1) return;

      // Check if key matches current character
      if (keyLower === targetChar) {
        processCorrectKey(keyLower, event);
      } else {
        processErrorKey(keyLower, event);
      }
    },
    [currentIndex, trainingString, isSessionActive],
  );

  /** Process a correct keypress */
  const processCorrectKey = useCallback(
    (key: string, _event: KeyboardEvent): void => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;

      // Update character state
      setCharStates((prev) => {
        const next = [...prev];
        next[currentIndex] = 'CORRECT';
        if (currentIndex + 1 < next.length) {
          next[currentIndex + 1] = 'CURRENT';
        }
        return next;
      });

      // Update index
      const completed = currentIndex + 1 >= trainingString.length;
      setCurrentIndex(currentIndex + 1);
      if (completed) setIsSessionActive(false);

      // Update stats
      correctRef.current++;
      keyPressesRef.current[key] = (keyPressesRef.current[key] || 0) + 1;

      const durationMs = elapsed > 0 ? elapsed : 1;
      const wordsTyped = (currentIndex + 1) / 5;
      const currentWpm = Math.round((wordsTyped / Math.max(1000, elapsed)) * 60000);
      const totalKeystrokes = correctRef.current + errorsRef.current;
      const accuracy = totalKeystrokes > 0 ? Math.round((correctRef.current / totalKeystrokes) * 100) : 100;

      if (currentWpm > peakWpmRef.current) {
        peakWpmRef.current = currentWpm;
      }

      setStats({
        currentWpm,
        averageWpm: currentWpm,
        peakWpm: peakWpmRef.current,
        accuracy,
        totalKeystrokes,
        totalErrors: errorsRef.current,
        durationMs,
        startedAt: startTimeRef.current,
        completedAt: completed ? now : null,
      });

      // Auto-fade completed characters after delay
      clearTimeout(errorTimersRef.current.get(currentIndex));
      const timer = setTimeout(() => {
        setCharStates((prev) => {
          const next = [...prev];
          if (next[currentIndex] === 'CORRECT') {
            next[currentIndex] = 'COMPLETE';
          }
          return next;
        });
      }, 2000);
      errorTimersRef.current.set(currentIndex, timer);
    },
    [currentIndex, trainingString.length],
  );

  /** Process an error keypress */
  const processErrorKey = useCallback(
    (key: string, _event: KeyboardEvent): void => {
      errorsRef.current++;
      keyErrorsRef.current[key] = (keyErrorsRef.current[key] || 0) + 1;

      // Show error flash and shake
      setCharStates((prev) => {
        const next = [...prev];
        next[currentIndex] = 'ERROR';
        return next;
      });

      // Auto-correct after 200ms
      clearTimeout(errorTimersRef.current.get(currentIndex));
      const timer = setTimeout(() => {
        setCharStates((prev) => {
          const next = [...prev];
          if (next[currentIndex] === 'ERROR') next[currentIndex] = 'CURRENT';
          return next;
        });
      }, 200);
      errorTimersRef.current.set(currentIndex, timer);

      // Update stats
      const elapsed = Date.now() - startTimeRef.current;
      const totalKeystrokes = correctRef.current + errorsRef.current;
      const accuracy = totalKeystrokes > 0
        ? Math.round((correctRef.current / totalKeystrokes) * 100)
        : 100;

      setStats((prev) => ({
        ...prev,
        totalErrors: errorsRef.current,
        totalKeystrokes,
        accuracy,
        durationMs: elapsed,
      }));
    },
    [currentIndex],
  );

  /** Handle key up event (for audio) */
  const handleKeyUp = useCallback(
    (event: KeyboardEvent): void => {
      const key = event.key;
      if (key.length === 1 || key === ' ') {
        latencyRef.current.push(Date.now() - startTimeRef.current);
      }
    },
    [],
  );

  // Keep the rate and duration moving even while the typist pauses.
  const progressRef = useRef(currentIndex);
  progressRef.current = currentIndex;
  useEffect(() => {
    if (!isSessionActive) return;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const wpm = Math.round(progressRef.current * 12000 / Math.max(1000, elapsed));
      setStats(previous => previous.completedAt !== null ? previous : {
        ...previous, currentWpm: wpm, averageWpm: wpm, durationMs: elapsed,
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSessionActive]);

  useEffect(() => {
    if (!stats.startedAt) return;
    setWpmHistory(previous => {
      const sample = { elapsedMs: stats.durationMs, wpm: stats.currentWpm };
      const bucket = Math.floor(sample.elapsedMs / 1000);
      const last = previous[previous.length - 1];
      // Keep one sample per second, plus the exact final reading.
      return last && Math.floor(last.elapsedMs / 1000) === bucket
        ? [...previous.slice(0, -1), sample] : [...previous, sample];
    });
  }, [stats.startedAt, stats.durationMs, stats.currentWpm]);

  // Generate initial training text on mount
  useEffect(() => {
    engineRef.current = new AdaptiveEngine({ profileId, sessionLength: 175, weakKeyCount: 3 });
    lessonIndexRef.current = 0;
    regenerate();
  }, [profileId, regenerate]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      errorTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return {
    trainingString,
    currentIndex,
    charStates,
    stats,
    wpmHistory,
    weakKeys,
    progressTrend,
    handleKeyDown,
    handleKeyUp,
    reset,
    regenerate,
    isSessionActive,
  };
}
