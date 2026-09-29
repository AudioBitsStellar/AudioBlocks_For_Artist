"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyThemeToDocument,
  DARK_SCHEME_QUERY,
  prefersDarkColorScheme,
  readStoredThemePreference,
  resolveTheme,
  storeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/utils/theme";

export interface ThemeContextValue {
  /** The user's explicit choice. */
  preference: ThemePreference;
  /** `preference` after the OS setting has been taken into account. */
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
  /** Flip between light and dark, leaving "match system" behind. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * The one implementation, used either by `ThemeProvider` or — when a component
 * is rendered outside a provider (component tests, isolated stories) — directly
 * by `useTheme`. `active` gates the side effects so exactly one of the two
 * instances ever touches storage or the DOM.
 *
 * The first render deliberately resolves to the light theme instead of reading
 * `localStorage` synchronously: that keeps the server and client markup
 * identical, while `ThemeScript` has already painted the correct palette in
 * `<head>`. Nothing is re-applied until the stored preference is read, so there
 * is no flash in either direction.
 */
function useThemeState(active: boolean): ThemeContextValue {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    setPreference(readStoredThemePreference());
    setSystemPrefersDark(prefersDarkColorScheme());
    setIsReady(true);
  }, [active]);

  const resolvedTheme = resolveTheme(preference, systemPrefersDark);

  useEffect(() => {
    if (!active || !isReady) return;
    applyThemeToDocument(resolvedTheme);
  }, [active, isReady, resolvedTheme]);

  // Track the OS while (and only while) the artist asked to match it.
  useEffect(() => {
    if (!active || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia(DARK_SCHEME_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    query.addEventListener?.("change", handleChange);
    return () => query.removeEventListener?.("change", handleChange);
  }, [active]);

  const setPreferenceValue = useCallback((next: ThemePreference) => {
    setPreference(next);
    storeThemePreference(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference((current) => {
      const next = resolveTheme(current, prefersDarkColorScheme()) === "dark" ? "light" : "dark";
      storeThemePreference(next);
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      preference,
      resolvedTheme,
      isDark: resolvedTheme === "dark",
      setPreference: setPreferenceValue,
      toggleTheme,
    }),
    [preference, resolvedTheme, setPreferenceValue, toggleTheme]
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useThemeState(true);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Read or change the active theme. Works with or without a `ThemeProvider` so
 * shared components (e.g. `TopHeader`) keep working in isolation.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  const standalone = useThemeState(context === null);
  return context ?? standalone;
}
