/**
 * Tactile sound profile — Cherry MX Brown switch emulation.
 * Sawtooth downstroke with lowpass filter creates a muted, tactile bump sound;
 * sine upstroke provides a soft release tone.
 */

import type { SoundProfile } from './types';

export const TACTILE: SoundProfile = {
  name: 'tactile',
  keyDown: {
    waveform: 'sawtooth',
    frequency: 450,
    durationMs: 25,
    filterType: 'lowpass',
    filterFreq: 800,
    filterQ: 1,
    gain: 0.4,
  },
  keyUp: {
    waveform: 'sine',
    frequency: 300,
    durationMs: 15,
    filterType: 'lowpass',
    filterFreq: 500,
    filterQ: 1,
    gain: 0.15,
  },
};
