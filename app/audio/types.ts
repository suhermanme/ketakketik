/**
 * Sound profile type definitions for KetakKetik audio engine.
 * Maps mechanical keyboard switch characteristics to procedural synthesis parameters.
 */

export interface SoundProfile {
  name: 'clicky' | 'tactile' | 'linear';
  keyDown: SoundEvent;
  keyUp: SoundEvent;
}

export interface SoundEvent {
  waveform: 'square' | 'sawtooth' | 'sine';
  frequency: number;
  durationMs: number;
  filterType: 'bandpass' | 'lowpass';
  filterFreq: number;
  filterQ: number;
  gain: number;
}

export enum SoundProfileName {
  CLICKY = 'clicky',
  TACTILE = 'tactile',
  LINEAR = 'linear',
}
