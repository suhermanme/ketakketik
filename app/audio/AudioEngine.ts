/** Procedural keyboard sounds with one fresh oscillator per keystroke. */
import type { SoundProfile } from './types';
import { CLICKY } from './clicky';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private voices = new Set<OscillatorNode>();

  constructor(private currentProfile: SoundProfile = CLICKY, private volume = 0.75) {
    this.setVolume(volume);
  }

  /** Call from a user gesture so the browser can unlock audio. */
  async init(): Promise<void> {
    if (!this.ctx || this.ctx.state === 'closed') {
      const ctor = window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!ctor) throw new Error('Web Audio API not available');
      this.ctx = new ctor();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -6;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.002;
      this.compressor.release.value = 0.02;
      this.compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  async playKey(_key: string, type: 'down' | 'up', profile?: SoundProfile): Promise<void> {
    await this.init();
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.compressor || this.volume === 0) return;
    const config = (profile ?? this.currentProfile)[type === 'down' ? 'keyDown' : 'keyUp'];
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    oscillator.type = config.waveform;
    oscillator.frequency.value = config.frequency;
    filter.type = config.filterType;
    filter.frequency.value = config.filterFreq;
    filter.Q.value = config.filterQ;
    const start = ctx.currentTime;
    const stop = start + config.durationMs / 1000;
    const level = this.volume * config.gain * 10 ** ((Math.random() - 0.5) / 20);
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
      this.voices.delete(oscillator);
    };
    oscillator.start(start);
    oscillator.stop(stop);
  }

  /** A bright ascending fanfare or a brief, descending mistake cue. */
  async playFeedback(kind: 'complete' | 'mistake'): Promise<void> {
    await this.init();
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.compressor || this.volume === 0) return;
    const notes = kind === 'complete' ? [523.25, 659.25, 783.99, 1046.5] : [220, 146.83];
    const spacing = kind === 'complete' ? 0.11 : 0.065;
    const duration = kind === 'complete' ? 0.25 : 0.09;
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + index * spacing;
      const stop = start + duration;
      oscillator.type = kind === 'complete' ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.22, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);
      oscillator.connect(gain);
      gain.connect(this.compressor!);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.voices.delete(oscillator);
      };
      oscillator.start(start);
      oscillator.stop(stop);
    });
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setProfile(profile: SoundProfile): void {
    this.currentProfile = profile;
  }

  destroy(): void {
    for (const voice of this.voices) {
      voice.stop();
      voice.disconnect();
    }
    this.voices.clear();
    this.compressor?.disconnect();
    this.compressor = null;
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
  }
}
