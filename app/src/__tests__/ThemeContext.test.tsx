import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { useTheme, ThemeProvider } from "@/context/ThemeContext";
import { THEME_STORAGE_KEY, DARK_SCHEME_QUERY } from "@/utils/theme";
import TopHeader from "@/components/TopHeader";

// Mock matchMedia for system preference testing.
function mockMatchMedia(isDark: boolean) {
  const mockQuery = {
    matches: isDark,
    media: DARK_SCHEME_QUERY,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(), // deprecated but used by some libraries
    removeListener: vi.fn(),
  };

  window.matchMedia = vi.fn().mockImplementation(() => mockQuery);
  return mockQuery;
}

// A test component that uses the theme hook.
function TestComponent() {
  const { preference, resolvedTheme, isDark, toggleTheme, setPreference } = useTheme();
  return (
    <div>
      <p data-testid="preference">{preference}</p>
      <p data-testid="resolved-theme">{resolvedTheme}</p>
      <p data-testid="is-dark">{isDark ? "true" : "false"}</p>
      <button onClick={toggleTheme} data-testid="toggle-button">
        Toggle
      </button>
      <button onClick={() => setPreference("light")} data-testid="set-light">
        Set Light
      </button>
      <button onClick={() => setPreference("dark")} data-testid="set-dark">
        Set Dark
      </button>
      <button onClick={() => setPreference("system")} data-testid="set-system">
        Set System
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.removeProperty("color-scheme");
  vi.clearAllMocks();
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.removeProperty("color-scheme");
  vi.restoreAllMocks();
});

describe("ThemeContext (#423)", () => {
  describe("initial value read from storage", () => {
    it("defaults to system preference when storage is empty", async () => {
      mockMatchMedia(false); // Light OS preference
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("preference")).toHaveTextContent("system");
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
      });
    });

    it("reads stored 'dark' preference from localStorage", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("preference")).toHaveTextContent("dark");
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
        expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      });
    });

    it("reads stored 'light' preference from localStorage", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "light");
      mockMatchMedia(true); // Dark OS, but light is explicitly chosen

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("preference")).toHaveTextContent("light");
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
        expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      });
    });

    it("applies the theme to the document on mount", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true);
        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(document.documentElement.style.getPropertyValue("color-scheme")).toBe("dark");
      });
    });
  });

  describe("toggleTheme", () => {
    it("switches from light to dark", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "light");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const toggleButton = await screen.findByTestId("toggle-button");

      act(() => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
        expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      });

      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("switches from dark to light", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const toggleButton = await screen.findByTestId("toggle-button");

      act(() => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
        expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      });

      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("persists the toggled choice to localStorage", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "light");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const toggleButton = await screen.findByTestId("toggle-button");

      act(() => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
      });
    });

    it("respects OS preference when toggling from system choice", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "system");
      mockMatchMedia(true); // OS prefers dark

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
      });

      const toggleButton = screen.getByTestId("toggle-button");

      act(() => {
        fireEvent.click(toggleButton);
      });

      // Toggle should switch to light (opposite of resolved dark).
      await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
      });
    });
  });

  describe("system preference following", () => {
    it("resolves to dark when OS prefers dark and preference is system", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "system");
      const mockQuery = mockMatchMedia(true); // OS prefers dark

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
        expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      });
    });

    it("resolves to light when OS prefers light and preference is system", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "system");
      mockMatchMedia(false); // OS prefers light

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
        expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      });
    });

    it("updates theme when OS preference changes", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "system");
      const mockQuery = mockMatchMedia(false); // OS prefers light initially

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
      });

      // Simulate OS changing to dark preference.
      act(() => {
        mockQuery.matches = true;
        const event = new MediaQueryListEvent("change", {
          matches: true,
          media: DARK_SCHEME_QUERY,
        });
        mockQuery.addEventListener.mock.calls[0]?.[1](event);
      });

      await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
        expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      });

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("does not track OS changes when preference is not system", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      const mockQuery = mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
      });

      // Simulate OS changing to light preference.
      act(() => {
        mockQuery.matches = false;
        const event = new MediaQueryListEvent("change", {
          matches: false,
          media: DARK_SCHEME_QUERY,
        });
        mockQuery.addEventListener.mock.calls[0]?.[1](event);
      });

      // Should still be dark because the preference is explicitly set.
      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    });
  });

  describe("document <html> element sync", () => {
    it("sets the dark class on dark theme", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true);
      });
    });

    it("removes the dark class on light theme", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "light");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(false);
      });
    });

    it("sets data-theme attribute to resolved theme", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe("dark");
      });

      const toggleButton = screen.getByTestId("toggle-button");
      act(() => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe("light");
      });
    });

    it("sets color-scheme CSS property to resolved theme", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.style.getPropertyValue("color-scheme")).toBe("dark");
      });
    });
  });

  describe("setPreference", () => {
    it("sets preference to light and persists", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "system");
      mockMatchMedia(true);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const setLightButton = await screen.findByTestId("set-light");

      act(() => {
        fireEvent.click(setLightButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("preference")).toHaveTextContent("light");
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
      });
    });

    it("sets preference to dark and persists", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "light");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const setDarkButton = await screen.findByTestId("set-dark");

      act(() => {
        fireEvent.click(setDarkButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("preference")).toHaveTextContent("dark");
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
      });
    });

    it("sets preference to system and starts tracking OS", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      const mockQuery = mockMatchMedia(true); // OS prefers dark

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const setSystemButton = await screen.findByTestId("set-system");

      act(() => {
        fireEvent.click(setSystemButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("preference")).toHaveTextContent("system");
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
      });

      // Change OS preference and verify it tracks.
      act(() => {
        mockQuery.matches = false;
        const event = new MediaQueryListEvent("change", {
          matches: false,
          media: DARK_SCHEME_QUERY,
        });
        mockQuery.addEventListener.mock.calls[0]?.[1](event);
      });

      await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
      });
    });
  });

  describe("TopHeader toggle aria-pressed", () => {
    it("reflects isDark state on the theme toggle button", async () => {
      localStorage.setItem(THEME_STORAGE_KEY, "light");
      mockMatchMedia(false);

      render(
        <ThemeProvider>
          <TopHeader onMenuClick={() => {}} />
        </ThemeProvider>
      );

      const toggleButton = await screen.findByRole("button", {
        name: /switch to dark mode/i,
      });

      expect(toggleButton).toHaveAttribute("aria-pressed", "false");

      act(() => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        const updatedButton = screen.getByRole("button", {
          name: /switch to light mode/i,
        });
        expect(updatedButton).toHaveAttribute("aria-pressed", "true");
      });
    });
  });

  describe("works without ThemeProvider (standalone)", () => {
    it("uses a fallback theme state when no provider is mounted", () => {
      mockMatchMedia(false);

      render(<TestComponent />);

      // Should render without crashing and use fallback state.
      expect(screen.getByTestId("preference")).toBeInTheDocument();
      expect(screen.getByTestId("resolved-theme")).toBeInTheDocument();
    });
  });
});
