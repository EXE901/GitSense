'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyTheme,
  isThemePreference,
  persistTheme,
  resolveInitialTheme,
  type ThemePreference,
} from '@/lib/theme';

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof document !== 'undefined' && isThemePreference(document.documentElement.dataset.theme)) {
      return document.documentElement.dataset.theme;
    }

    return 'dark';
  });

  useEffect(() => {
    const initialTheme = resolveInitialTheme();
    applyTheme(initialTheme);

    if (initialTheme !== theme) {
      queueMicrotask(() => setThemeState(initialTheme));
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme(nextTheme) {
        applyTheme(nextTheme);
        persistTheme(nextTheme);
        setThemeState(nextTheme);
      },
      toggleTheme() {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        persistTheme(nextTheme);
        setThemeState(nextTheme);
      },
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }

  return context;
}
