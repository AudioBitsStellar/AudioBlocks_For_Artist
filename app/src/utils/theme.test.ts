import { afterEach, describe, expect, it } from "vitest";
import {
  applyThemeToDocument,
  DARK_SCHEME_QUERY,
  isThemePreference,
  normalizeThemePreference,
  prefersDarkColorScheme,
  readStoredThemePreference,
  resolveTheme,
  storeThemePreference,
  THEME_PREFERENCE_LABELS,
  THEME_STORAGE_KEY,
  themeInitScript,
} from "./theme";

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.removeProperty("color-scheme");
});

describe("theme preferences (#423)", () => {
  it("recognises the three supported preferences", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("solarized")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("falls back to following the OS for anything unrecognised", () => {
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference(undefined)).toBe("system");
    expect(normalizeThemePreference(42)).toBe("system");
  });

  it("labels every preference for the settings UI", () => {
    expect(THEME_PREFERENCE_LABELS.light).toBe("Light");
    expect(THEME_PREFERENCE_LABELS.dark).toBe("Dark");
    expect(THEME_PREFERENCE_LABELS.system).toBe("Match system");
  });
});

describe("resolveTheme", () => {
  it("passes explicit choices straight through", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("defers to the OS only for the system preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("treats a missing matchMedia as a light OS", () => {
    // jsdom ships no matchMedia, which is also what very old browsers look like.
    expect(prefersDarkColorScheme()).toBe(false);
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("theme persistence", () => {
  it("round-trips a preference through localStorage", () => {
    storeThemePreference("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredThemePreference()).toBe("dark");
  });

  it("treats an empty or corrupted value as 'system'", () => {
    expect(readStoredThemePreference()).toBe("system");
    localStorage.setItem(THEME_STORAGE_KEY, "not-a-theme");
    expect(readStoredThemePreference()).toBe("system");
  });
});

describe("applyThemeToDocument", () => {
  it("toggles the dark class, data attribute and native color scheme", () => {
    applyThemeToDocument("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("color-scheme")).toBe("dark");

    applyThemeToDocument("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.getPropertyValue("color-scheme")).toBe("light");
  });

  it("can target an explicit element", () => {
    const root = document.createElement("html");
    applyThemeToDocument("dark", root);
    expect(root.classList.contains("dark")).toBe(true);
  });
});

describe("themeInitScript", () => {
  it("reads the stored key and queries the OS before painting", () => {
    expect(themeInitScript).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(themeInitScript).toContain(JSON.stringify(DARK_SCHEME_QUERY));
    expect(themeInitScript).toContain('classList.toggle("dark"');
  });

  it("is a self-invoking expression with no syntax errors", () => {
    const run = new Function(themeInitScript);
    expect(() => run()).not.toThrow();
  });
});
