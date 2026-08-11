import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './tokens';

export type Mode = 'system' | 'light' | 'dark';

type ThemeValue = {
  colors: ThemeColors;
  isDark: boolean;
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleDark: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

const MODE_KEY = 'asepo:theme-mode:v1';

export function AsepoThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  // Defaults to following the device's own setting — a fresh install should
  // already look right for a phone already in dark mode, not force light
  // until someone finds the toggle. Overridden below once a saved choice
  // (if any) loads in, and users can still pin Light or Dark explicitly from
  // Profile → Appearance.
  const [mode, setModeState] = useState<Mode>('system');

  // Loads once, after mount — matches how the rest of the app persists
  // (lib/storage.ts) — so the choice survives a restart instead of always
  // reopening in light mode no matter what was picked last time.
  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {
      // Storage being full or unavailable shouldn't block the toggle itself
      // — the choice just won't survive a restart this time.
    });
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
    return {
      isDark,
      colors: isDark ? darkColors : lightColors,
      mode,
      setMode,
      toggleDark: () => setMode(isDark ? 'light' : 'dark'),
    };
  }, [mode, systemScheme, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <AsepoThemeProvider>');
  return ctx;
}

/** Convenience for the common `const { colors } = useTheme()` case. */
export function useColors() {
  return useTheme().colors;
}
