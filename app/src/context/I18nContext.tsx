'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import en, { type Translations } from '@/locales/en';
import es from '@/locales/es';

export type Locale = 'en' | 'es';

const LOCALE_STORAGE_KEY = 'audioblocks_locale';

const locales: Record<Locale, Translations> = { en, es };

const DEFAULT_LOCALE: Locale = 'en';

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readPersistedLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return (stored as Locale) in locales ? (stored as Locale) : DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readPersistedLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
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

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}

export default I18nContext;
