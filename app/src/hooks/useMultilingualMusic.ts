'use client';

import { useI18n } from '@/context/I18nContext';
import { MusicMetadata, MultilingualText, SupportedLanguage } from '@/types';

/**
 * Hook for working with multilingual music metadata
 * Provides utilities for creating, updating, and accessing multilingual content
 */
export function useMultilingualMusic() {
  const { locale } = useI18n();

  /**
   * Get text in current locale, fallback to primary language if not available
   */
  const getLocalizedText = (multilingualText: MultilingualText, primaryLang: SupportedLanguage = 'en'): string => {
    return multilingualText[locale] ?? multilingualText[primaryLang] ?? '';
  };

  /**
   * Create a new multilingual text object
   */
  const createMultilingualText = (text: string | Partial<MultilingualText>): MultilingualText => {
    if (typeof text === 'string') {
      return { [locale]: text };
    }
    return text as MultilingualText;
  };

  /**
   * Update multilingual text for a specific language
   */
  const updateMultilingualText = (
    multilingualText: MultilingualText,
    language: SupportedLanguage,
    text: string
  ): MultilingualText => {
    return {
      ...multilingualText,
      [language]: text,
    };
  };

  /**
   * Add translation to existing multilingual text
   */
  const addTranslation = (
    multilingualText: MultilingualText,
    language: SupportedLanguage,
    translation: string
  ): MultilingualText => {
    if (!translation.trim()) {
      const { [language]: _, ...rest } = multilingualText;
      return rest;
    }
    return updateMultilingualText(multilingualText, language, translation);
  };

  /**
   * Get available languages in a multilingual text
   */
  const getAvailableLanguages = (multilingualText: MultilingualText): SupportedLanguage[] => {
    return Object.keys(multilingualText) as SupportedLanguage[];
  };

  /**
   * Check if a multilingual text has content in all specified languages
   */
  const isCompleteTranslation = (
    multilingualText: MultilingualText,
    requiredLanguages: SupportedLanguage[] = ['en', 'es']
  ): boolean => {
    return requiredLanguages.every((lang) => multilingualText[lang]?.trim());
  };

  return {
    locale,
    getLocalizedText,
    createMultilingualText,
    updateMultilingualText,
    addTranslation,
    getAvailableLanguages,
    isCompleteTranslation,
  };
}
