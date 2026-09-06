// ============================================================================
// KetakKetik — Keyboard Layout (QWERTY)
// ============================================================================

/** Represents a single key on the virtual keyboard */
export interface KeyPosition {
  key: string;
  label: string;
  col: number;
  row: number;
  width: number;
  isSpace: boolean;
}

/** QWERTY layout definition (10 columns, 5 rows + space) */
export const QWERTY_LAYOUT: KeyPosition[][] = [
  [
    { key: 'q', label: 'Q', col: 0, row: 0, width: 1, isSpace: false },
    { key: 'w', label: 'W', col: 1, row: 0, width: 1, isSpace: false },
    { key: 'e', label: 'E', col: 2, row: 0, width: 1, isSpace: false },
    { key: 'r', label: 'R', col: 3, row: 0, width: 1, isSpace: false },
    { key: 't', label: 'T', col: 4, row: 0, width: 1, isSpace: false },
    { key: 'y', label: 'Y', col: 5, row: 0, width: 1, isSpace: false },
    { key: 'u', label: 'U', col: 6, row: 0, width: 1, isSpace: false },
    { key: 'i', label: 'I', col: 7, row: 0, width: 1, isSpace: false },
    { key: 'o', label: 'O', col: 8, row: 0, width: 1, isSpace: false },
    { key: 'p', label: 'P', col: 9, row: 0, width: 1, isSpace: false },
  ],
  [
    { key: 'a', label: 'A', col: 0, row: 1, width: 1, isSpace: false },
    { key: 's', label: 'S', col: 1, row: 1, width: 1, isSpace: false },
    { key: 'd', label: 'D', col: 2, row: 1, width: 1, isSpace: false },
    { key: 'f', label: 'F', col: 3, row: 1, width: 1, isSpace: false },
    { key: 'g', label: 'G', col: 4, row: 1, width: 1, isSpace: false },
    { key: 'h', label: 'H', col: 5, row: 1, width: 1, isSpace: false },
    { key: 'j', label: 'J', col: 6, row: 1, width: 1, isSpace: false },
    { key: 'k', label: 'K', col: 7, row: 1, width: 1, isSpace: false },
    { key: 'l', label: 'L', col: 8, row: 1, width: 1, isSpace: false },
    { key: ';', label: ';', col: 9, row: 1, width: 1, isSpace: false },
  ],
  [
    { key: 'z', label: 'Z', col: 0.5, row: 2, width: 1, isSpace: false },
    { key: 'x', label: 'X', col: 1.5, row: 2, width: 1, isSpace: false },
    { key: 'c', label: 'C', col: 2.5, row: 2, width: 1, isSpace: false },
    { key: 'v', label: 'V', col: 3.5, row: 2, width: 1, isSpace: false },
    { key: 'b', label: 'B', col: 4.5, row: 2, width: 1, isSpace: false },
    { key: 'n', label: 'N', col: 5.5, row: 2, width: 1, isSpace: false },
    { key: 'm', label: 'M', col: 6.5, row: 2, width: 1, isSpace: false },
    { key: ',', label: ',', col: 7.5, row: 2, width: 1, isSpace: false },
    { key: '.', label: '.', col: 8.5, row: 2, width: 1, isSpace: false },
    { key: "'", label: "'", col: 9.5, row: 2, width: 1, isSpace: false },
  ],
  [
    {
      key: ' ',
      label: 'Space',
      col: 1,
      row: 3,
      width: 8,
      isSpace: true,
    },
  ],
];

/** Flat array of all keys for quick lookup */
export const ALL_KEYS: KeyPosition[] = QWERTY_LAYOUT.flat();

/** Map from key char to position */
export const KEY_MAP: Map<string, KeyPosition> = new Map();

for (const key of ALL_KEYS) {
  KEY_MAP.set(key.key, key);
}

/** Get the position for a given key character */
export function getKeyPosition(key: string): KeyPosition | undefined {
  return KEY_MAP.get(key.toLowerCase());
}

/** Check if a key exists in the layout */
export function isLayoutKey(key: string): boolean {
  return KEY_MAP.has(key.toLowerCase());
}

/** Get the row index for a key */
export function getKeyRow(key: string): number {
  const pos = getKeyPosition(key);
  return pos?.row ?? -1;
}

/** Get the column index for a key */
export function getKeyCol(key: string): number {
  const pos = getKeyPosition(key);
  return pos?.col ?? -1;
}

/** Get the width (in column units) for a key */
export function getKeyWidth(key: string): number {
  const pos = getKeyPosition(key);
  return pos?.width ?? 1;
}
