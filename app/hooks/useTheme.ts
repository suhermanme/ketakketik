// ============================================================================
// KetakKetik — Theme Hook
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { ThemeMode, EffectiveTheme } from '@app/types/ui';

const STORAGE_KEY = 'ketakketik-theme-mode';

/**
 * Hook for managing theme mode (light/dark/auto) with system preference
 * detection and localStorage persistence.
 */
export function useTheme(): {
  mode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setMode: (mode: ThemeMode) => void;
} {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
    return 'auto';
  });

  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(() => getEffectiveTheme('auto'));
  const effectiveTheme = mode === 'auto' ? systemTheme : mode;

  // Apply theme class to document body
  useEffect(() => {
    document.body.classList.toggle('theme-dark', effectiveTheme === 'dark');
    document.documentElement.style.colorScheme = effectiveTheme;
  }, [effectiveTheme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent): void => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Persist theme mode to localStorage
  const setMode = useCallback((newMode: ThemeMode): void => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  return { mode, effectiveTheme, setMode };
}

/**
 * Determine the effective theme based on mode and system preference.
 */
function getEffectiveTheme(mode: ThemeMode): EffectiveTheme {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  // Auto: use system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
