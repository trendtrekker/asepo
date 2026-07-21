import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './tokens';

type Mode = 'system' | 'light' | 'dark';

type ThemeValue = {
  colors: ThemeColors;
  isDark: boolean;
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleDark: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function AsepoThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  // Defaults to light to match the design prototype. Users opt into dark (or
  // 'system') from Profile → Appearance.
  const [mode, setMode] = useState<Mode>('light');

  const value = useMemo<ThemeValue>(() => {
    const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
    return {
      isDark,
      colors: isDark ? darkColors : lightColors,
      mode,
      setMode,
      toggleDark: () => setMode(isDark ? 'light' : 'dark'),
    };
  }, [mode, systemScheme]);

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
