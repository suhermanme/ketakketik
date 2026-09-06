// ============================================================================
// KetakKetik — Audio Domain Types
// ============================================================================

/** Oscillator waveform type */
export type WaveformType = 'square' | 'sawtooth' | 'sine';

/** Filter type for audio node */
export type FilterType = 'bandpass' | 'lowpass';

/** Key press direction for sound generation */
export type KeyDirection = 'down' | 'up';

/** Sound profile for a single key event */
export interface SoundEventConfig {
  waveform: WaveformType;
  frequency: number;
  durationMs: number;
  filterType: FilterType;
  filterFreq: number;
  filterQ: number;
  gain: number;
}

/** Complete sound profile (key down + key up) */
export interface SoundProfile {
  name: 'clicky' | 'tactile' | 'linear';
  keyDown: SoundEventConfig;
  keyUp: SoundEventConfig;
}

/** Audio engine state */
export interface AudioState {
  initialized: boolean;
  activeProfile: SoundProfile;
  volume: number;
  isMuted: boolean;
}

/** Audio engine interface */
export interface AudioEngineInterface {
  init(): Promise<void>;
  playKey(key: string, direction: KeyDirection, profile: SoundProfile): void;
  setVolume(volume: number): void;
  setProfile(profile: SoundProfile): void;
  destroy(): void;
}
