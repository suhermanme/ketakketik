// ============================================================================
// KetakKetik — Text Generation Utilities
// ============================================================================

import { SeededPRNG } from '@ketakketik/engine';

/** English letter frequency ordering (most to least common) */
const ENGLISH_FREQ = 'etaoinshrdclfmtguypbakwvqjxz';

/** Common English bigrams for contextual generation */
const BIGRAMS: readonly string[] = [
  'th', 'he', 'in', 'er', 'an', 're', 'at', 'on', 'en', 'es',
  'or', 'it', 'al', 'ed', 'is', 'nd', 'te', 'to', 'as', 'of',
  'ea', 'ng', 'se', 'ti', 'nt', 'ag', 'le', 'ic', 'nt', 'or',
  'ia', 'ti', 'ha', 'st', 'me', 'dy', 'ri', 'll', 've', 'ar',
];

/** Common English trigrams for contextual generation */
const TRIGRAMS: readonly string[] = [
  'the', 'and', 'ing', 'ion', 'ent', 'ion', 'her', 'ate', 'tio',
  'tion', 'ion', 'ion', 'thi', 'for', 'tio', 'ion', 'ion', 'ion',
  'ion', 'ion', 'ion', 'ion', 'ion', 'ion', 'ion', 'ion',
];

/** Generate a random character using the seeded PRNG */
function randomChar(rng: SeededPRNG): string {
  const idx = rng.nextInt(0, ENGLISH_FREQ.length);
  return ENGLISH_FREQ[idx];
}

/** Generate a random bigram */
function randomBigram(rng: SeededPRNG): string {
  return BIGRAMS[rng.nextInt(0, BIGRAMS.length)];
}

/** Generate a random trigram */
function randomTrigram(rng: SeededPRNG): string {
  return TRIGRAMS[rng.nextInt(0, TRIGRAMS.length)];
}

/** Enforce maximum consecutive same-character constraint */
function enforceMaxConsecutive(
  result: string[],
  maxConsecutive: number,
): void {
  if (result.length < 2) return;
  const lastChar = result[result.length - 1];
  let consecutive = 0;
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i] === lastChar) {
      consecutive++;
    } else {
      break;
    }
  }
  if (consecutive >= maxConsecutive) {
    result.pop();
  }
}

/**
 * Generate a fallback English-like string.
 * Uses frequency-ordered characters with seeded randomness for determinism.
 */
export function generateFallbackString(
  length: number,
  seed: string,
  maxConsecutive: number = 3,
): string {
  const hash = hashString(seed);
  const rng = new SeededPRNG(hash);
  const result: string[] = [];

  while (result.length < length) {
    // 70% chance of single character, 20% bigram, 10% trigram
    const roll = rng.random();
    if (roll < 0.7) {
      const char = randomChar(rng);
      result.push(char);
      enforceMaxConsecutive(result, maxConsecutive);
    } else if (roll < 0.9) {
      const bigram = randomBigram(rng);
      for (const ch of bigram) {
        result.push(ch);
        enforceMaxConsecutive(result, maxConsecutive);
      }
    } else {
      const trigram = randomTrigram(rng);
      for (const ch of trigram) {
        result.push(ch);
        enforceMaxConsecutive(result, maxConsecutive);
      }
    }
  }

  return result.slice(0, length).join('');
}

/** Simple string hash for deterministic seeding */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a string focused on specific weak keys.
 * Phase 1: Place weak keys proportionally.
 * Phase 2: Insert contextual bigrams/trigrams.
 * Phase 3: Fill remaining with English-like distribution.
 */
export function generateFocusedString(
  weakKeys: string[],
  length: number,
  seed: string,
  weakKeyProportion: number = 0.6,
  contextualProportion: number = 0.4,
  maxConsecutive: number = 3,
): string {
  const hash = hashString(seed);
  const rng = new SeededPRNG(hash);
  const result: string[] = [];

  if (weakKeys.length === 0) {
    return generateFallbackString(length, seed, maxConsecutive);
  }

  // Phase 1: Place weak keys
  const weakKeyCount = Math.round(length * weakKeyProportion);
  const keysPerChar = Math.max(1, Math.floor(weakKeyCount / weakKeys.length));

  for (const wk of weakKeys) {
    for (let i = 0; i < keysPerChar; i++) {
      result.push(wk);
      enforceMaxConsecutive(result, maxConsecutive);
    }
  }

  // Phase 2: Add contextual bigrams/trigrams
  const contextualCount = Math.round(length * contextualProportion);

  for (let i = 0; i < contextualCount && result.length < length; i++) {
    if (rng.random() < 0.3 && TRIGRAMS.length > 0) {
      const trigram = TRIGRAMS[rng.nextInt(0, TRIGRAMS.length)];
      for (const ch of trigram) {
        result.push(ch);
        enforceMaxConsecutive(result, maxConsecutive);
      }
    } else if (BIGRAMS.length > 0) {
      const bigram = BIGRAMS[rng.nextInt(0, BIGRAMS.length)];
      for (const ch of bigram) {
        result.push(ch);
        enforceMaxConsecutive(result, maxConsecutive);
      }
    }
  }

  // Phase 3: Fill with English-like distribution
  while (result.length < length) {
    const charIndex = rng.nextInt(0, ENGLISH_FREQ.length);
    result.push(ENGLISH_FREQ[charIndex]);
    enforceMaxConsecutive(result, maxConsecutive);
  }

  return result.slice(0, length).join('');
}
