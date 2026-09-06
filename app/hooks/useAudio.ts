// ============================================================================
// KetakKetik — Audio Engine Hook
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { SoundProfile, KeyDirection } from '@app/types/audio';
import { AudioEngine } from '@app/audio/AudioEngine';
import { CLICKY } from '@app/audio/clicky';
import { TACTILE } from '@app/audio/tactile';
import { LINEAR } from '@app/audio/linear';

/** Predefined sound profiles */
const SOUND_PROFILES: Record<string, SoundProfile> = {
  clicky: CLICKY,
  tactile: TACTILE,
  linear: LINEAR,
};

/**
 * React hook providing audio engine state and methods.
 */
export function useAudio(): {
  state: {
    initialized: boolean;
    activeProfile: SoundProfile;
    volume: number;
    isMuted: boolean;
  };
  init: () => Promise<void>;
  playKey: (key: string, direction: KeyDirection) => void;
  playFeedback: (kind: 'complete' | 'mistake') => void;
  setProfile: (profile: 'clicky' | 'tactile' | 'linear') => void;
  setVolume: (volume: number) => void;
} {
  const [state, setState] = useState<{
    initialized: boolean;
    activeProfile: SoundProfile;
    volume: number;
    isMuted: boolean;
  }>({
    initialized: false,
    activeProfile: CLICKY,
    volume: 0.8,
    isMuted: false,
  });

  const engineRef = useRef<AudioEngine | null>(null);

  const init = useCallback(async (): Promise<void> => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine(CLICKY, 0.8);
    }
    await engineRef.current.init();
    setState((prev) => ({ ...prev, initialized: true }));
  }, []);

  const playKey = useCallback(
    (key: string, direction: KeyDirection): void => {
      if (!engineRef.current) {
        engineRef.current = new AudioEngine(state.activeProfile, state.volume);
      }
      void engineRef.current.playKey(key, direction, state.activeProfile)
        .then(() => setState(prev => prev.initialized ? prev : { ...prev, initialized: true }))
        .catch(error => console.error('Unable to play keyboard sound:', error));
    },
    [state.activeProfile, state.volume],
  );

  const playFeedback = useCallback((kind: 'complete' | 'mistake') => {
    if (!engineRef.current) engineRef.current = new AudioEngine(state.activeProfile, state.volume);
    void engineRef.current.playFeedback(kind)
      .catch(error => console.error('Unable to play feedback sound:', error));
  }, [state.activeProfile, state.volume]);

  const setProfile = useCallback(
    (profileName: 'clicky' | 'tactile' | 'linear'): void => {
      const profile = SOUND_PROFILES[profileName];
      if (!profile) return;
      if (engineRef.current) {
        engineRef.current.setProfile(profile);
      }
      setState((prev) => ({ ...prev, activeProfile: profile }));
    },
    [],
  );

  const setVolume = useCallback((volume: number): void => {
    if (engineRef.current) {
      engineRef.current.setVolume(volume);
    }
    setState((prev) => ({
      ...prev,
      volume,
      isMuted: volume === 0,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return { state, init, playKey, playFeedback, setProfile, setVolume };
}
