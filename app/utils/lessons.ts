import { SeededPRNG } from '@ketakketik/engine';

export type TrainingMode = 'practice' | 'lessons' | 'custom';
export interface FingerLesson {
  id: string;
  title: string;
  instruction: string;
  keys: string[];
  stage: number;
}

const groups = [
  ['f', 'j', 'Index fingers'], ['d', 'k', 'Middle fingers'],
  ['s', 'l', 'Ring fingers'], ['a', ';', 'Little fingers'],
  ['g', 'h', 'Index finger reaches'], ['r', 'u', 'Index fingers, upper row'],
  ['e', 'i', 'Middle fingers, upper row'], ['w', 'o', 'Ring fingers, upper row'],
  ['q', 'p', 'Little fingers, upper row'], ['t', 'y', 'Index finger reaches, upper row'],
  ['v', 'm', 'Index fingers, lower row'], ['c', ',', 'Middle fingers, lower row'],
  ['x', '.', 'Ring fingers, lower row'], ['z', "'", 'Little fingers'],
  ['b', 'n', 'Index finger reaches, lower row'],
];
const stages = ['Single keys', 'Repeated pairs', 'Alternating combinations', 'Mixed combinations'];

export const FINGER_LESSONS: FingerLesson[] = groups.flatMap(([left, right, fingers], group) =>
  stages.map((stageName, stage) => ({
    id: `${group}-${stage}`,
    title: `${left.toUpperCase()} + ${right.toUpperCase()} · ${stageName}`,
    instruction: `${fingers}. Keep your hands on the home row; use your thumbs for spaces.`,
    keys: [left, right], stage,
  })),
);

// Bring previously isolated finger movements together, one row at a time.
for (const [title, keys] of [
  ['Home row', 'asdfghjkl;'], ['Upper row', 'qwertyuiop'],
  ['Lower row', "zxcvbnm,.'"], ['All rows', "abcdefghijklmnopqrstuvwxyz;,.'"],
]) {
  FINGER_LESSONS.push({ id: `combined-${title}`, title: `${title} · Combined practice`,
    instruction: 'Combine finger movements while keeping a steady rhythm. Use your thumbs for spaces.',
    keys: [...keys], stage: 4 });
}

/** Predictable progression with varied drills; spaces also train both thumbs. */
export function generateFingerDrill(lesson: FingerLesson, variation = 0): string {
  const rng = new SeededPRNG(7919 + variation * 101 + FINGER_LESSONS.indexOf(lesson) * 31);
  const [a, b] = lesson.keys;
  if (lesson.stage === 0) return Array.from({ length: 24 }, (_, i) => lesson.keys[Math.floor(i / 3) % lesson.keys.length]).join(' ');
  if (lesson.stage === 1) return Array.from({ length: 24 }, (_, i) => lesson.keys[i % lesson.keys.length].repeat(2)).join(' ');
  if (lesson.stage === 2) {
    const patterns = [a + b, b + a, a + b + a, b + a + b, a + a + b, b + b + a];
    return Array.from({ length: 24 }, (_, i) => patterns[(i + variation) % patterns.length]).join(' ');
  }
  return Array.from({ length: 28 }, () => {
    const length = rng.nextInt(2, lesson.stage === 4 ? 8 : 6);
    return Array.from({ length }, () => lesson.keys[rng.nextInt(0, lesson.keys.length)]).join('');
  }).join(' ');
}
