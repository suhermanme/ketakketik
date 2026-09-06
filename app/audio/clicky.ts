/**
 * Clicky sound profile — Cherry MX Blue switch emulation.
 * High-frequency square wave with bandpass filter produces the characteristic
 * sharp click with resonant mid-range ring.
 */

import type { SoundProfile } from './types';

export const CLICKY: SoundProfile = {
  name: 'clicky',
  keyDown: {
    waveform: 'square',
    frequency: 2800,
    durationMs: 45,
    filterType: 'bandpass',
    filterFreq: 3000,
    filterQ: 2,
    gain: 0.3,
  },
  keyUp: {
    waveform: 'square',
    frequency: 3200,
    durationMs: 25,
    filterType: 'bandpass',
    filterFreq: 3500,
    filterQ: 2,
    gain: 0.25,
  },
};
