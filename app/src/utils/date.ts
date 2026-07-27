/**
 * Date formatting utility for AudioBlocks (issue #177).
 *
 * Provides a single source of truth for date/time display across the
 * application, with locale-aware formatting via `Intl.DateTimeFormat` and
 * `Intl.RelativeTimeFormat` so it is ready for i18n.
 *
 * Usage:
 *   import { formatDate, DatePreset } from '@/utils/date';
 *   formatDate(new Date(), 'relative');           // "5 minutes ago"
 *   formatDate(new Date(), 'short');              // "Jul 24"
 *   formatDate(new Date(), 'full');               // "July 24, 2026"
 *   formatDate(new Date(), 'datetime');           // "Jul 24, 2026, 3:14 PM"
 */

export type DatePreset = 'relative' | 'short' | 'full' | 'datetime';

const DEFAULT_LOCALE = 'en-US';

/**
 * Internal helpers – each preset is implemented with the appropriate
 * `Intl` formatter so the locale argument is respected everywhere.
 */

function formatShort(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatFull(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * Returns a human-readable relative string for the date vs `now`.
 *
 * Thresholds (in seconds) chosen to match common UX expectations:
 *   < 60 s            → "just now"
 *   < 60 min          → "{n} minute(s) ago"
 *   < 24 h            → "{n} hour(s) ago"
 *   < 7 d             → "{n} day(s) ago"
 *   otherwise         → falls back to the `short` preset
 *
 * Uses `Intl.RelativeTimeFormat` so the output is localized.
 */
function formatRelative(date: Date, locale: string, now: Date = new Date()): string {
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSeconds < 45) return 'just now';
  if (absSeconds < 60 * 60) {
    return rtf.format(Math.round(diffSeconds / 60), 'minute');
  }
  if (absSeconds < 60 * 60 * 24) {
    return rtf.format(Math.round(diffSeconds / 3600), 'hour');
  }
  if (absSeconds < 60 * 60 * 24 * 7) {
    return rtf.format(Math.round(diffSeconds / 86400), 'day');
  }
  // Older than a week – show absolute short date instead.
  return formatShort(date, locale);
}

/**
 * Format a date according to one of the four presets.
 *
 * @param value   Date instance, ISO string, or epoch ms.
 * @param preset  One of 'relative' | 'short' | 'full' | 'datetime'.
 * @param locale  BCP-47 locale tag (defaults to 'en-US').
 */
export function formatDate(
  value: Date | string | number,
  preset: DatePreset = 'short',
  locale: string = DEFAULT_LOCALE,
): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  switch (preset) {
    case 'relative':
      return formatRelative(date, locale);
    case 'full':
      return formatFull(date, locale);
    case 'datetime':
      return formatDateTime(date, locale);
    case 'short':
    default:
      return formatShort(date, locale);
  }
}

export const DateFormats = {
  relative: 'relative',
  short: 'short',
  full: 'full',
  datetime: 'datetime',
} as const satisfies Record<DatePreset, DatePreset>;
