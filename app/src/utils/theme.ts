/**
 * Theme plumbing for artist-portal dark mode (#423).
 *
 * The portal ships three user-facing choices — light, dark and "match system" —
 * persisted under a single `theme` key in `localStorage`. Resolution is pure so
 * it can be unit-tested without a DOM, and the actual DOM write is kept in one
 * place (`applyThemeToDocument`) so the runtime never drifts from the tests.
 *
 * Colour values are **not** set here. `app/src/app/globals.css` owns the
 * palette: toggling the `dark` class on `<html>` flips every token atomically
 * and no component has to know which theme is active.
 */

export type ThemePreference = "light" | "dark" | "system";

/** What `preference` collapses to once the OS setting is taken into account. */
export type ResolvedTheme = "light" | "dark";

/**
 * Kept as the historical `theme` key so existing installs keep their choice.
 * Values are now preferences, so `"system"` is also accepted.
 */
export const THEME_STORAGE_KEY = "theme";

export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "Match system",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** Unknown / missing / corrupted values fall back to following the OS. */
export function normalizeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : "system";
}

/**
 * Whether the OS asks for a dark UI. `matchMedia` is missing in some test
 * environments and in very old browsers — both count as "no preference", which
 * resolves to the light theme rather than throwing.
 */
export function prefersDarkColorScheme(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia(DARK_SCHEME_QUERY).matches;
  } catch {
    return false;
  }
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean = prefersDarkColorScheme()
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Private-mode Safari and blocked storage both throw on access.
    return "system";
  }
}

export function storeThemePreference(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage full or blocked — the in-memory theme still applies for this tab.
  }
}

/**
 * The single place that writes theme state to the DOM: toggles the `dark`
 * class consumed by `@custom-variant dark` in `globals.css`, and mirrors it
 * onto `data-theme` and `color-scheme` for native form controls and scrollbars.
 */
export function applyThemeToDocument(resolved: ResolvedTheme, root?: HTMLElement): void {
  if (typeof document === "undefined" && !root) return;
  const target = root ?? document.documentElement;
  const isDark = resolved === "dark";
  target.classList.toggle("dark", isDark);
  target.dataset.theme = resolved;
  target.style.setProperty("color-scheme", resolved);
}

/**
 * Blocking script inlined into `<head>` so the stored theme is on `<html>`
 * before the first paint. Without it the server sends the light palette and
 * every dark-mode user sees a white flash before React hydrates.
 */
export const themeInitScript = [
  "(function(){try{",
  `var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||"system";`,
  `var d=p==="dark"||(p==="system"&&window.matchMedia(${JSON.stringify(DARK_SCHEME_QUERY)}).matches);`,
  "var e=document.documentElement;",
  'e.classList.toggle("dark",d);',
  'e.dataset.theme=d?"dark":"light";',
  'e.style.setProperty("color-scheme",d?"dark":"light");',
  "}catch(_){}})();",
].join("");
