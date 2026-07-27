import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, DateFormats } from './date';

describe('formatDate utility', () => {
  // Pin "now" so relative tests are deterministic.
  const NOW = new Date('2026-07-27T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('input handling', () => {
    it('accepts a Date instance', () => {
      expect(formatDate(NOW, 'short')).toBeTruthy();
    });

    it('accepts an ISO string', () => {
      expect(formatDate('2026-07-27T12:00:00Z', 'short')).toBeTruthy();
    });

    it('accepts an epoch ms number', () => {
      expect(formatDate(NOW.getTime(), 'short')).toBeTruthy();
    });

    it('returns empty string for invalid dates', () => {
      expect(formatDate('not-a-date', 'short')).toBe('');
      expect(formatDate(Number.NaN, 'short')).toBe('');
    });
  });

  describe('short preset', () => {
    it('formats with month abbreviation and day', () => {
      const out = formatDate('2026-07-24T12:00:00Z', 'short', 'en-US');
      expect(out).toMatch(/Jul/);
      expect(out).toMatch(/24/);
    });
  });

  describe('full preset', () => {
    it('formats with full month name and year', () => {
      const out = formatDate('2026-07-24T12:00:00Z', 'full', 'en-US');
      expect(out).toBe('July 24, 2026');
    });
  });

  describe('datetime preset', () => {
    it('includes date and time', () => {
      const out = formatDate('2026-07-24T15:14:00Z', 'datetime', 'en-US');
      expect(out).toMatch(/Jul/);
      expect(out).toMatch(/24/);
      expect(out).toMatch(/2026/);
      // Time component – should include a colon
      expect(out).toMatch(/:/);
    });
  });

  describe('relative preset', () => {
    it('returns "just now" for very recent dates', () => {
      expect(formatDate(new Date(NOW.getTime() - 10_000), 'relative')).toBe('just now');
    });

    it('uses minutes for under an hour', () => {
      const out = formatDate(new Date(NOW.getTime() - 5 * 60_000), 'relative');
      expect(out).toMatch(/minute/);
    });

    it('uses hours for under a day', () => {
      const out = formatDate(new Date(NOW.getTime() - 3 * 60 * 60_000), 'relative');
      expect(out).toMatch(/hour/);
    });

    it('uses days for under a week', () => {
      const out = formatDate(new Date(NOW.getTime() - 2 * 24 * 60 * 60_000), 'relative');
      expect(out).toMatch(/day/);
    });

    it('falls back to short format for dates older than a week', () => {
      const out = formatDate(new Date(NOW.getTime() - 30 * 24 * 60 * 60_000), 'relative');
      // Should look like a short date (e.g. "Jun 27"), not include "ago" or "day".
      expect(out).not.toMatch(/ago/);
      expect(out).not.toMatch(/last/);
    });

    it('supports future dates', () => {
      const out = formatDate(new Date(NOW.getTime() + 5 * 60_000), 'relative');
      // Intl.RelativeTimeFormat will produce "in 5 minutes"
      expect(out.length).toBeGreaterThan(0);
    });
  });

  describe('locale support', () => {
    it('honours a French locale for the full preset', () => {
      const out = formatDate('2026-07-24T12:00:00Z', 'full', 'fr-FR');
      expect(out).toBe('24 juillet 2026');
    });
  });

  describe('export surface', () => {
    it('exposes DateFormats constant', () => {
      expect(DateFormats.relative).toBe('relative');
      expect(DateFormats.short).toBe('short');
      expect(DateFormats.full).toBe('full');
      expect(DateFormats.datetime).toBe('datetime');
    });
  });
});
