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

export type DatePreset = "relative" | "short" | "full" | "datetime";

const DEFAULT_LOCALE = "en-US";

/**
 * Internal helpers – each preset is implemented with the appropriate
 * `Intl` formatter so the locale argument is respected everywhere.
 */

function formatShort(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatFull(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absSeconds < 45) return "just now";
  if (absSeconds < 60 * 60) {
    return rtf.format(Math.round(diffSeconds / 60), "minute");
  }
  if (absSeconds < 60 * 60 * 24) {
    return rtf.format(Math.round(diffSeconds / 3600), "hour");
  }
  if (absSeconds < 60 * 60 * 24 * 7) {
    return rtf.format(Math.round(diffSeconds / 86400), "day");
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
  preset: DatePreset = "short",
  locale: string = DEFAULT_LOCALE
): string {
  const date =
    value instanceof Date
      ? value
      : // Date-only strings name a calendar day, so read them as local dates
        // rather than UTC midnight (which is the previous day west of UTC).
        ((typeof value === "string" ? parseLocalDate(value) : null) ?? new Date(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  switch (preset) {
    case "relative":
      return formatRelative(date, locale);
    case "full":
      return formatFull(date, locale);
    case "datetime":
      return formatDateTime(date, locale);
    case "short":
    default:
      return formatShort(date, locale);
  }
}

export const DateFormats = {
  relative: "relative",
  short: "short",
  full: "full",
  datetime: "datetime",
} as const satisfies Record<DatePreset, DatePreset>;

/* ------------------------------------------------------------------ *
 * Event dates (issue #673)
 *
 * Events store `date` and `time` as free-form strings ("2026-10-19",
 * "19-10-2026", "8:30 PM"). `new Date("2026-10-19")` parses as UTC midnight,
 * which west of UTC is still the previous evening, so these helpers always
 * build *local* dates instead.
 * ------------------------------------------------------------------ */

/**
 * Parses a date-only string as local midnight. Accepts `YYYY-MM-DD`,
 * `DD-MM-YYYY` and `DD/MM/YYYY`. Returns `null` for anything else, including
 * strings that aren't a real calendar date (e.g. `31-02-2030`).
 */
export function parseLocalDate(value: string): Date | null {
  const text = value.trim();
  let day: number, month: number, year: number;

  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(text))) {
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }

  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDate ? date : null;
}

/**
 * Parses a time of day: 24h `HH:MM` or 12h `H:MM AM/PM` (space optional).
 * Returns `null` when the text doesn't match.
 */
export function parseTimeOfDay(value: string): { hours: number; minutes: number } | null {
  const text = value.trim();

  const h24 = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(text);
  if (h24) return { hours: Number(h24[1]), minutes: Number(h24[2]) };

  const h12 = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i.exec(text);
  if (h12) {
    const hours = (Number(h12[1]) % 12) + (h12[3].toUpperCase() === "PM" ? 12 : 0);
    return { hours, minutes: Number(h12[2]) };
  }

  return null;
}

/**
 * Returns the moment an event stops counting as upcoming, in local time:
 * its start time when `time` parses, otherwise the end of its day (the next
 * local midnight). Returns `null` when `date` can't be parsed.
 */
export function getEventCutoff(date: string, time?: string): Date | null {
  const day = parseLocalDate(date);
  if (!day) return null;

  const start = time ? parseTimeOfDay(time) : null;
  if (start) {
    day.setHours(start.hours, start.minutes, 0, 0);
  } else {
    day.setDate(day.getDate() + 1);
  }
  return day;
}

/**
 * Whether an event is still upcoming at `now`.
 *
 * Rule: an event is upcoming until its start time, or until the end of its
 * day when it has no (parseable) time. Events whose date can't be parsed are
 * treated as upcoming so they aren't silently hidden.
 */
export function isEventUpcoming(
  event: { date: string; time?: string },
  now: Date = new Date()
): boolean {
  const cutoff = getEventCutoff(event.date, event.time);
  return cutoff === null || now.getTime() < cutoff.getTime();
}
