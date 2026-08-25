"use client";

import { useI18n, type Locale } from "@/context/I18nContext";

/**
 * Dropdown that lets users switch between supported locales — closes #159.
 * Language preference is persisted to localStorage via I18nContext.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale, t, availableLocales } = useI18n();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value as Locale);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-text-muted">
      <span className="sr-only">{t.language.label}</span>
      <select
        value={locale}
        onChange={handleChange}
        aria-label={t.language.label}
        className="bg-transparent border border-border-subtle rounded px-2 py-1 text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
      >
        {availableLocales.map((loc) => (
          <option key={loc} value={loc}>
            {t.language[loc as keyof typeof t.language]}
          </option>
        ))}
      </select>
    </label>
  );
}
