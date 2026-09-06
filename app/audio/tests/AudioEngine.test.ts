import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../AudioEngine';
import { LINEAR } from '../linear';

function audioContext() {
  const nodes: any[] = [];
  const parameter = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
  const compressor = { ...node(), threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter() };
  const ctx = {
    state: 'suspended', currentTime: 0, destination: {}, compressor, nodes,
    resume: vi.fn(async () => { ctx.state = 'running'; }),
    close: vi.fn(async () => { ctx.state = 'closed'; }),
    createDynamicsCompressor: () => compressor,
    createGain: () => ({ ...node(), gain: parameter() }),
    createBiquadFilter: () => ({ ...node(), frequency: parameter(), Q: parameter() }),
    createOscillator: () => {
      let started = false;
      const oscillator = { ...node(), frequency: parameter(), type: '', onended: null as null | (() => void),
        start: vi.fn(() => { if (started) throw new Error('Oscillator cannot restart'); started = true; }), stop: vi.fn() };
      nodes.push(oscillator);
      return oscillator;
    },
  };
  vi.stubGlobal('window', { AudioContext: vi.fn(function () { return ctx; }) });
  return ctx;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('keyboard sound playback', () => {
  it('unlocks the context and connects sound to the speakers on the first key', async () => {
    const ctx = audioContext();
    const engine = new AudioEngine();
    await engine.playKey('a', 'down');
    expect(ctx.resume).toHaveBeenCalledOnce();
    expect(ctx.compressor.connect).toHaveBeenCalledWith(ctx.destination);
    expect(ctx.nodes[0].start).toHaveBeenCalledOnce();
    engine.destroy();
  });

  it('plays more than 32 events with fresh oscillators and cleans up ended notes', async () => {
    const ctx = audioContext();
    const engine = new AudioEngine();
    for (let i = 0; i < 80; i++) {
      await engine.playKey('a', i % 2 ? 'up' : 'down');
      ctx.nodes[i].onended();
      expect(ctx.nodes[i].disconnect).toHaveBeenCalledOnce();
    }
    expect(new Set(ctx.nodes).size).toBe(80);
    engine.destroy();
  });

  it('respects mute, profile changes, and a context suspended after initialization', async () => {
    const ctx = audioContext();
    const engine = new AudioEngine();
    engine.setVolume(0);
    await engine.playKey('a', 'down');
    expect(ctx.nodes).toHaveLength(0);
    engine.setVolume(0.8);
    engine.setProfile(LINEAR);
    ctx.state = 'suspended';
    await engine.playKey('a', 'up');
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(ctx.nodes[0].frequency.value).toBe(LINEAR.keyUp.frequency);
    engine.destroy();
    expect(ctx.close).toHaveBeenCalledOnce();
  });
});


describe('lesson feedback sounds', () => {
  it('plays an ascending celebration and a distinct descending mistake cue', async () => {
    const ctx = audioContext();
    const engine = new AudioEngine();
    await engine.playFeedback('complete');
    expect(ctx.nodes.map(node => node.frequency.value)).toEqual([523.25, 659.25, 783.99, 1046.5]);
    expect(ctx.nodes[3].start.mock.calls[0][0]).toBeGreaterThan(ctx.nodes[0].start.mock.calls[0][0]);
    await engine.playFeedback('mistake');
    expect(ctx.nodes.slice(4).map(node => node.frequency.value)).toEqual([220, 146.83]);
    expect(ctx.nodes[4].type).toBe('triangle');
    for (const node of ctx.nodes) { node.onended(); expect(node.disconnect).toHaveBeenCalledOnce(); }
    engine.destroy();
  });

  it('mutes both feedback sounds at zero volume', async () => {
    const ctx = audioContext();
    const engine = new AudioEngine(undefined, 0);
    await engine.playFeedback('complete');
    await engine.playFeedback('mistake');
    expect(ctx.nodes).toHaveLength(0);
    engine.destroy();
  });
});
