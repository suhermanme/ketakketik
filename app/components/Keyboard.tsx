// ============================================================================
// KetakKetik — Virtual Keyboard Component
// ============================================================================

import React from 'react';
import { QWERTY_LAYOUT, KeyPosition } from '@app/utils/keymap';
import { EffectiveTheme } from '@app/types/ui';

export interface KeyboardProps {
  activeKeys: Set<string>;
  errorKeys: Set<string>;
  weakKeys: string[];
  effectiveTheme: EffectiveTheme;
}

function getKeyGradient(
  keyPos: KeyPosition,
  activeKeys: Set<string>,
  errorKeys: Set<string>,
  weakKeys: string[],
  effectiveTheme: EffectiveTheme,
): string {
  const keyLower = keyPos.key.toLowerCase();
  const isActive = activeKeys.has(keyLower);
  const isError = errorKeys.has(keyLower);
  const isWeak = weakKeys.includes(keyLower);

  if (isError) {
    return effectiveTheme === 'dark'
      ? 'from-red-900/40 to-red-800/20'
      : 'from-red-400/40 to-red-300/20';
  }
  if (isActive) {
    return effectiveTheme === 'dark'
      ? 'from-blue-400/50 to-blue-300/30'
      : 'from-blue-600/40 to-blue-500/20';
  }
  if (isWeak) {
    return effectiveTheme === 'dark'
      ? 'from-amber-400/30 to-amber-300/15'
      : 'from-amber-500/30 to-amber-400/15';
  }
  return effectiveTheme === 'dark'
    ? 'from-gray-700/40 to-gray-800/20'
    : 'from-gray-300/40 to-gray-200/20';
}

function getKeyBorder(_keyPos: KeyPosition, effectiveTheme: EffectiveTheme): string {
  return effectiveTheme === 'dark'
    ? 'border-gray-600/30'
    : 'border-gray-400/30';
}

function getKeyTextColor(effectiveTheme: EffectiveTheme): string {
  return effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700';
}

export const Keyboard: React.FC<KeyboardProps> = ({
  activeKeys,
  errorKeys,
  weakKeys,
  effectiveTheme,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-1.5 p-2 sm:p-4 select-none" aria-label="Virtual keyboard">
      {QWERTY_LAYOUT.map((row, rowIndex) => (
        <div key={rowIndex} className="grid gap-1 w-full" style={{ gridTemplateColumns: 'repeat(42, minmax(0, 1fr))' }}>
          {row.map((keyPos, index) => (
            <KeyCell
              key={keyPos.key}
              keyPos={keyPos}
              activeKeys={activeKeys}
              errorKeys={errorKeys}
              weakKeys={weakKeys}
              effectiveTheme={effectiveTheme}
              columnStart={keyPos.isSpace ? 9 : index * 4 + rowIndex + 1}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

interface KeyCellProps {
  keyPos: KeyPosition;
  activeKeys: Set<string>;
  errorKeys: Set<string>;
  weakKeys: string[];
  effectiveTheme: EffectiveTheme;
  columnStart: number;
}

const KeyCell: React.FC<KeyCellProps> = ({
  keyPos,
  activeKeys,
  errorKeys,
  weakKeys,
  effectiveTheme,
  columnStart,
}) => {
  const keyLower = keyPos.key.toLowerCase();
  const isActive = activeKeys.has(keyLower);
  const isError = errorKeys.has(keyLower);
  const isWeak = weakKeys.includes(keyLower);

  const gradient = getKeyGradient(keyPos, activeKeys, errorKeys, weakKeys, effectiveTheme);
  const border = getKeyBorder(keyPos, effectiveTheme);
  const textColor = getKeyTextColor(effectiveTheme);

  return (
    <div
      className={`
        relative flex items-center justify-center
        rounded-md border ${border}
        bg-gradient-to-t ${gradient}
        ${textColor}
        h-9 sm:h-12 min-w-0
        transition-all duration-150
        ${isActive ? 'translate-y-0.5 ring-2 ring-blue-500 shadow-inner' : 'shadow-sm'}
        ${isError ? 'animate-error-shake' : ''}
        ${isWeak && !isError ? 'animate-weak-key-pulse' : ''}
      `}
      style={{ gridColumn: `${columnStart} / span ${keyPos.isSpace ? 24 : 4}` }}
      data-pressed={isActive}
      role="presentation"
      aria-label={`Key ${keyPos.label}`}
    >
      <span className="text-xs sm:text-sm font-medium tracking-tight">{keyPos.label}</span>
      {isWeak && !isError && (
        <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-amber-400" />
      )}
    </div>
  );
};
