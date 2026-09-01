"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import en, { type Translations } from "@/locales/en";
import es from "@/locales/es";

export type Locale = "en" | "es";

const LOCALE_STORAGE_KEY = "audioblocks_locale";

const locales: Record<Locale, Translations> = { en, es };

const DEFAULT_LOCALE: Locale = "en";

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isSupportedLocale(value: string | null): value is Locale {
  // Object.hasOwn, not `in`: `in` walks the prototype chain, so a stored value
  // of "constructor" or "toString" would pass and then index `locales` to a
  // function instead of a translation table, leaving every label undefined.
  return value !== null && Object.hasOwn(locales, value);
}

function readPersistedLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    // Safari private mode and blocked site data both throw here.
    return DEFAULT_LOCALE;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readPersistedLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (!isSupportedLocale(next)) return;
    setLocaleState(next);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Persisting is a convenience; an unavailable store must not break the
      // switch itself.
    }
  }, []);

  return (
    <I18nContext.Provider
      value={{
        locale,
        t: locales[locale],
        setLocale,
        availableLocales: Object.keys(locales) as Locale[],
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

/**
 * The i18n context if one is mounted, otherwise null.
 *
 * For components that are merely i18n-aware rather than i18n-dependent — a
 * language switcher has nothing to switch without a provider, and should not
 * bring the tree down over it. Anything that genuinely needs translations must
 * keep using useI18n(), which still throws.
 */
export function useOptionalI18n(): I18nContextValue | null {
  return useContext(I18nContext);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

export default I18nContext;
