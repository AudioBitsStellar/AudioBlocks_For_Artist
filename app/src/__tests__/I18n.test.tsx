import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider, useI18n } from "@/context/I18nContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import en from "@/locales/en";
import es from "@/locales/es";

/**
 * #159 — the i18n context, the locale tables and the switcher all existed, but
 * nothing mounted the provider and nothing rendered the switcher, so the
 * feature was unreachable. These tests cover the wiring as well as the
 * behaviour, because every piece passing in isolation is exactly what hid it.
 */

const STORAGE_KEY = "audioblocks_locale";

function LocaleProbe() {
  const { locale } = useI18n();
  return <span data-testid="locale">{locale}</span>;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("I18nProvider", () => {
  it("defaults to English when nothing is stored", async () => {
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("en"));
  });

  it("restores a persisted locale", async () => {
    localStorage.setItem(STORAGE_KEY, "es");
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("es"));
  });

  it("ignores a stored locale that is not supported", async () => {
    localStorage.setItem(STORAGE_KEY, "fr");
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("en"));
  });

  // The original check was `stored in locales`, and `in` walks the prototype
  // chain — so "constructor" passed and indexed `locales` to a function rather
  // than a translation table, leaving every label undefined.
  it.each(["constructor", "toString", "hasOwnProperty", "valueOf"])(
    "ignores the inherited property %s stored as a locale",
    async (poison) => {
      localStorage.setItem(STORAGE_KEY, poison);
      render(
        <I18nProvider>
          <LocaleProbe />
        </I18nProvider>,
      );
      await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("en"));
    },
  );

  it("survives a localStorage that throws on read", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("en"));
  });

  it("throws a useful error when used outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<LocaleProbe />)).toThrow(/within an I18nProvider/);
    spy.mockRestore();
  });
});

describe("LanguageSwitcher", () => {
  it("lists every available locale", async () => {
    render(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>,
    );
    const select = await screen.findByRole("combobox");
    expect(select.querySelectorAll("option")).toHaveLength(2);
  });

  it("switches the active locale and persists the choice", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <LanguageSwitcher />
        <LocaleProbe />
      </I18nProvider>,
    );

    await user.selectOptions(await screen.findByRole("combobox"), "es");

    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("es"));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("es");
  });

  it("keeps working when localStorage rejects the write", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    render(
      <I18nProvider>
        <LanguageSwitcher />
        <LocaleProbe />
      </I18nProvider>,
    );

    await user.selectOptions(await screen.findByRole("combobox"), "es");

    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("es"));
  });
});

describe("locale tables", () => {
  /** Every dotted leaf path in a nested translation object. */
  function leafPaths(value: unknown, prefix = ""): string[] {
    if (typeof value !== "object" || value === null) return [prefix];
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      leafPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }

  it("Spanish covers every key English defines", () => {
    const esPaths = new Set(leafPaths(es));
    expect(leafPaths(en).filter((path) => !esPaths.has(path))).toEqual([]);
  });

  it("Spanish defines no key English does not have", () => {
    const enPaths = new Set(leafPaths(en));
    expect(leafPaths(es).filter((path) => !enPaths.has(path))).toEqual([]);
  });

  it("no translation is left empty", () => {
    for (const table of [en, es]) {
      const empties = leafPaths(table).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], table);
        return typeof value === "string" && value.trim() === "";
      });
      expect(empties).toEqual([]);
    }
  });
});
