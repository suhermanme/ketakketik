import { describe, expect, it } from 'vitest';
import { FINGER_LESSONS, generateFingerDrill } from '../lessons';
import { ALL_KEYS } from '../keymap';

describe('finger lessons', () => {
  it('progresses from single keys to repeats, alternating patterns, and longer combinations', () => {
    const drills = FINGER_LESSONS.slice(0, 4).map(lesson => generateFingerDrill(lesson).split(' '));
    expect(drills[0].every(word => word.length === 1)).toBe(true);
    expect(drills[1]).toContain('ff');
    expect(drills[1]).toContain('jj');
    expect(drills[2]).toContain('fjf');
    expect(drills[2]).toContain('jfj');
    expect(drills[3].some(word => word.length > 3)).toBe(true);
  });

  it('covers every displayed keyboard key and uses only the selected lesson keys', () => {
    const covered = new Set<string>();
    for (const lesson of FINGER_LESSONS) {
      const text = generateFingerDrill(lesson);
      expect(text.trim()).toBe(text);
      for (const key of text) {
        covered.add(key);
        expect(key === ' ' || lesson.keys.includes(key)).toBe(true);
      }
    }
    for (const key of ALL_KEYS) expect(covered.has(key.key)).toBe(true);
  });

  it('generates reproducible variations for complex drills', () => {
    const lesson = FINGER_LESSONS[3];
    expect(generateFingerDrill(lesson, 1)).toBe(generateFingerDrill(lesson, 1));
    expect(generateFingerDrill(lesson, 1)).not.toBe(generateFingerDrill(lesson, 2));
  });
});
