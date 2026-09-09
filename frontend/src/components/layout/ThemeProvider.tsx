'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useSyncExternalStore,
  ReactNode,
} from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
});

export function useTheme() {
  return useContext(ThemeContext);
}

const THEME_KEY = 'theme';

function readStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' || t === 'system' ? t : 'system';
  } catch {
    return 'system';
  }
}

/**
 * localStorage-backed theme store.
 * `theme-change` (custom event) covers same-tab writes; `storage` covers other tabs.
 */
function subscribeTheme(onChange: () => void) {
  window.addEventListener('theme-change', onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener('theme-change', onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getThemeSnapshot(): Theme {
  return readStoredTheme();
}

function getThemeServerSnapshot(): Theme {
  return 'system';
}

function subscribeSystemTheme(onChange: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getSystemThemeSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getSystemThemeServerSnapshot(): boolean {
  return false;
}

/**
 * Theme state lives in external stores (localStorage + media query) and is read
 * with useSyncExternalStore — no setState-in-effect needed, SSR/hydration safe
 * via server snapshots. The inline script in layout.tsx has already applied the
 * correct class to <html> before hydration, so there is no visual flash.
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    getSystemThemeServerSnapshot
  );

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;

  // Only touches the DOM (an external system) — never React state.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // storage unavailable — theme falls back to per-session default
    }
    window.dispatchEvent(new Event('theme-change'));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
