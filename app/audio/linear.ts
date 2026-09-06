/**
 * Linear sound profile — Cherry MX Red switch emulation.
 * Pure sine tones with gentle lowpass filtering produce a soft, quiet
 * keystroke with no click or tactile bump.
 */

import type { SoundProfile } from './types';

export const LINEAR: SoundProfile = {
  name: 'linear',
  keyDown: {
    waveform: 'sine',
    frequency: 600,
    durationMs: 20,
    filterType: 'lowpass',
    filterFreq: 1000,
    filterQ: 0.5,
    gain: 0.2,
  },
  keyUp: {
    waveform: 'sine',
    frequency: 500,
    durationMs: 12,
    filterType: 'lowpass',
    filterFreq: 800,
    filterQ: 0.5,
    gain: 0.12,
  },
};
