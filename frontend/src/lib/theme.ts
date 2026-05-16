export type ThemePreference = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'gitsense:theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'dark' || value === 'light';
}

export function getSystemTheme(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function readStoredTheme(): ThemePreference | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (isThemePreference(storedTheme)) {
      return storedTheme;
    }

    if (storedTheme) {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveInitialTheme(): ThemePreference {
  return readStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: ThemePreference): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function persistTheme(theme: ThemePreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  }
}
