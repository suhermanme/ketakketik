// ============================================================================
// KetakKetik — Theme Toggle Component
// ============================================================================

import React from 'react';
import { ThemeMode, EffectiveTheme } from '@app/types/ui';

export interface ThemeToggleProps {
  mode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  onToggle: (mode: ThemeMode) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  mode,
  effectiveTheme,
  onToggle,
}) => {
  const modes: ThemeMode[] = ['light', 'dark', 'auto'];

  const getButtonStyle = (m: ThemeMode): string => {
    const isActive = mode === m;
    if (isActive) {
      return effectiveTheme === 'dark'
        ? 'bg-blue-500/30 text-blue-300 border-blue-500/40'
        : 'bg-blue-500/20 text-blue-700 border-blue-500/40';
    }
    return effectiveTheme === 'dark'
      ? 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/40 border-gray-700/30'
      : 'bg-white/60 text-gray-500 hover:bg-gray-100/60 border-gray-300/30';
  };

  return (
    <div
      className={`
        inline-flex rounded-lg p-0.5
        ${effectiveTheme === 'dark'
          ? 'bg-gray-800/40 border border-gray-700/30'
          : 'bg-white/60 border border-gray-300/30'}
      `}
      role="radiogroup"
      aria-label="Theme mode"
    >
      {modes.map((m) => (
        <button
          key={m}
          aria-label={m === 'auto' ? 'System theme' : `${m} theme`}
          title={m === 'auto' ? 'System theme' : `${m} theme`}
          role="radio"
          aria-checked={mode === m}
          onClick={() => onToggle(m)}
          className={`
            px-2.5 py-1 text-xs font-medium rounded-md
            border transition-all duration-150
            ${getButtonStyle(m)}
          `}
        >
          {m === 'light' ? '☀' : m === 'dark' ? '☾' : '⚙'}
        </button>
      ))}
    </div>
  );
};
