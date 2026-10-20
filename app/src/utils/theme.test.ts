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

  it("applies dark class and data-theme when localStorage contains 'dark'", () => {
    // Create a fake DOM and localStorage.
    const fakeDoc = {
      documentElement: {
        classList: {
          toggle: vi.fn(),
        },
        dataset: {},
        style: {
          setProperty: vi.fn(),
        },
      },
    };

    const fakeStorage: Record<string, string> = {};
    fakeStorage[THEME_STORAGE_KEY] = "dark";

    // Evaluate the script with mocked globals.
    const scriptFn = new Function(
      "localStorage",
      "window",
      "document",
      `
      ${themeInitScript}
    `
    );

    scriptFn(fakeStorage, { matchMedia: () => ({ matches: false }) }, fakeDoc);

    expect(fakeDoc.documentElement.classList.toggle).toHaveBeenCalledWith("dark", true);
    expect(fakeDoc.documentElement.dataset.theme).toBe("dark");
    expect(fakeDoc.documentElement.style.setProperty).toHaveBeenCalledWith("color-scheme", "dark");
  });

  it("removes dark class and sets data-theme when localStorage contains 'light'", () => {
    const fakeDoc = {
      documentElement: {
        classList: {
          toggle: vi.fn(),
        },
        dataset: {},
        style: {
          setProperty: vi.fn(),
        },
      },
    };

    const fakeStorage: Record<string, string> = {};
    fakeStorage[THEME_STORAGE_KEY] = "light";

    const scriptFn = new Function(
      "localStorage",
      "window",
      "document",
      `
      ${themeInitScript}
    `
    );

    scriptFn(fakeStorage, { matchMedia: () => ({ matches: false }) }, fakeDoc);

    expect(fakeDoc.documentElement.classList.toggle).toHaveBeenCalledWith("dark", false);
    expect(fakeDoc.documentElement.dataset.theme).toBe("light");
    expect(fakeDoc.documentElement.style.setProperty).toHaveBeenCalledWith(
      "color-scheme",
      "light"
    );
  });

  it("applies dark class when OS prefers dark and localStorage is empty or 'system'", () => {
    const fakeDoc = {
      documentElement: {
        classList: {
          toggle: vi.fn(),
        },
        dataset: {},
        style: {
          setProperty: vi.fn(),
        },
      },
    };

    const fakeStorage: Record<string, string> = {}; // empty

    const scriptFn = new Function(
      "localStorage",
      "window",
      "document",
      `
      ${themeInitScript}
    `
    );

    scriptFn(fakeStorage, { matchMedia: () => ({ matches: true }) }, fakeDoc);

    expect(fakeDoc.documentElement.classList.toggle).toHaveBeenCalledWith("dark", true);
    expect(fakeDoc.documentElement.dataset.theme).toBe("dark");
    expect(fakeDoc.documentElement.style.setProperty).toHaveBeenCalledWith("color-scheme", "dark");
  });

  it("applies light theme when OS prefers light and storage is empty", () => {
    const fakeDoc = {
      documentElement: {
        classList: {
          toggle: vi.fn(),
        },
        dataset: {},
        style: {
          setProperty: vi.fn(),
        },
      },
    };

    const fakeStorage: Record<string, string> = {}; // empty

    const scriptFn = new Function(
      "localStorage",
      "window",
      "document",
      `
      ${themeInitScript}
    `
    );

    scriptFn(fakeStorage, { matchMedia: () => ({ matches: false }) }, fakeDoc);

    expect(fakeDoc.documentElement.classList.toggle).toHaveBeenCalledWith("dark", false);
    expect(fakeDoc.documentElement.dataset.theme).toBe("light");
    expect(fakeDoc.documentElement.style.setProperty).toHaveBeenCalledWith(
      "color-scheme",
      "light"
    );
  });

  it("agrees with utils/theme for all light/dark/system scenarios", () => {
    // This test ensures the inline script logic always matches the utility functions.
    // Test cases: (storage value, OS preference) -> expected resolved theme.
    const testCases: Array<[string | null, boolean, "light" | "dark"]> = [
      ["light", false, "light"],
      ["light", true, "light"],
      ["dark", false, "dark"],
      ["dark", true, "dark"],
      ["system", false, "light"],
      ["system", true, "dark"],
      [null, false, "light"],
      [null, true, "dark"],
    ];

    testCases.forEach(([storageValue, osIsDark, expected]) => {
      const fakeDoc = {
        documentElement: {
          classList: {
            toggle: vi.fn(),
          },
          dataset: {},
          style: {
            setProperty: vi.fn(),
          },
        },
      };

      const fakeStorage: Record<string, string> = {};
      if (storageValue) {
        fakeStorage[THEME_STORAGE_KEY] = storageValue;
      }

      const scriptFn = new Function(
        "localStorage",
        "window",
        "document",
        `
        ${themeInitScript}
      `
      );

      scriptFn(fakeStorage, { matchMedia: () => ({ matches: osIsDark }) }, fakeDoc);

      const isDark = expected === "dark";
      expect(
        fakeDoc.documentElement.classList.toggle,
        `Case: storage=${storageValue}, osIsDark=${osIsDark}`
      ).toHaveBeenCalledWith("dark", isDark);
      expect(fakeDoc.documentElement.dataset.theme).toBe(expected);
      expect(fakeDoc.documentElement.style.setProperty).toHaveBeenCalledWith(
        "color-scheme",
        expected
      );
    });
  });
});
