import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  DateFormats,
  getEventCutoff,
  isEventUpcoming,
  parseLocalDate,
  parseTimeOfDay,
} from "./date";

describe("formatDate utility", () => {
  // Pin "now" so relative tests are deterministic.
  const NOW = new Date("2026-07-27T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("input handling", () => {
    it("accepts a Date instance", () => {
      expect(formatDate(NOW, "short")).toBeTruthy();
    });

    it("accepts an ISO string", () => {
      expect(formatDate("2026-07-27T12:00:00Z", "short")).toBeTruthy();
    });

    it("accepts an epoch ms number", () => {
      expect(formatDate(NOW.getTime(), "short")).toBeTruthy();
    });

    it("returns empty string for invalid dates", () => {
      expect(formatDate("not-a-date", "short")).toBe("");
      expect(formatDate(Number.NaN, "short")).toBe("");
    });
  });

  describe("short preset", () => {
    it("formats with month abbreviation and day", () => {
      const out = formatDate("2026-07-24T12:00:00Z", "short", "en-US");
      expect(out).toMatch(/Jul/);
      expect(out).toMatch(/24/);
    });
  });

  describe("full preset", () => {
    it("formats with full month name and year", () => {
      const out = formatDate("2026-07-24T12:00:00Z", "full", "en-US");
      expect(out).toBe("July 24, 2026");
    });
  });

  describe("datetime preset", () => {
    it("includes date and time", () => {
      const out = formatDate("2026-07-24T15:14:00Z", "datetime", "en-US");
      expect(out).toMatch(/Jul/);
      expect(out).toMatch(/24/);
      expect(out).toMatch(/2026/);
      // Time component – should include a colon
      expect(out).toMatch(/:/);
    });
  });

  describe("relative preset", () => {
    it('returns "just now" for very recent dates', () => {
      expect(formatDate(new Date(NOW.getTime() - 10_000), "relative")).toBe("just now");
    });

    it("uses minutes for under an hour", () => {
      const out = formatDate(new Date(NOW.getTime() - 5 * 60_000), "relative");
      expect(out).toMatch(/minute/);
    });

    it("uses hours for under a day", () => {
      const out = formatDate(new Date(NOW.getTime() - 3 * 60 * 60_000), "relative");
      expect(out).toMatch(/hour/);
    });

    it("uses days for under a week", () => {
      const out = formatDate(new Date(NOW.getTime() - 2 * 24 * 60 * 60_000), "relative");
      expect(out).toMatch(/day/);
    });

    it("falls back to short format for dates older than a week", () => {
      const out = formatDate(new Date(NOW.getTime() - 30 * 24 * 60 * 60_000), "relative");
      // Should look like a short date (e.g. "Jun 27"), not include "ago" or "day".
      expect(out).not.toMatch(/ago/);
      expect(out).not.toMatch(/last/);
    });

    it("supports future dates", () => {
      const out = formatDate(new Date(NOW.getTime() + 5 * 60_000), "relative");
      // Intl.RelativeTimeFormat will produce "in 5 minutes"
      expect(out.length).toBeGreaterThan(0);
    });
  });

  describe("locale support", () => {
    it("honours a French locale for the full preset", () => {
      const out = formatDate("2026-07-24T12:00:00Z", "full", "fr-FR");
      expect(out).toBe("24 juillet 2026");
    });
  });

  describe("export surface", () => {
    it("exposes DateFormats constant", () => {
      expect(DateFormats.relative).toBe("relative");
      expect(DateFormats.short).toBe("short");
      expect(DateFormats.full).toBe("full");
      expect(DateFormats.datetime).toBe("datetime");
    });
  });
});

describe("event date helpers (#673)", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
    vi.useRealTimers();
  });

  describe("parseLocalDate", () => {
    it("parses YYYY-MM-DD as local midnight", () => {
      const date = parseLocalDate("2026-10-19");
      expect(date).not.toBeNull();
      expect([date!.getFullYear(), date!.getMonth(), date!.getDate(), date!.getHours()]).toEqual([
        2026, 9, 19, 0,
      ]);
    });

    it("parses DD-MM-YYYY and DD/MM/YYYY", () => {
      expect(parseLocalDate("19-10-2026")?.getDate()).toBe(19);
      expect(parseLocalDate(" 24/08/2025 ")?.getMonth()).toBe(7);
    });

    it("rejects malformed and impossible dates", () => {
      expect(parseLocalDate("")).toBeNull();
      expect(parseLocalDate("Oct 19")).toBeNull();
      expect(parseLocalDate("2026-10-19T10:00:00Z")).toBeNull();
      expect(parseLocalDate("31-02-2030")).toBeNull();
    });
  });

  describe("parseTimeOfDay", () => {
    it.each([
      ["18:30", 18, 30],
      ["0:05", 0, 5],
      ["6:30 PM", 18, 30],
      ["8:30PM", 20, 30],
      ["12:15 am", 0, 15],
      ["12:00 PM", 12, 0],
    ])("parses %s", (text, hours, minutes) => {
      expect(parseTimeOfDay(text)).toEqual({ hours, minutes });
    });

    it.each(["", "25:00", "13:00 PM", "noon", "8PM"])("rejects %j", (text) => {
      expect(parseTimeOfDay(text)).toBeNull();
    });
  });

  describe("getEventCutoff", () => {
    it("uses the start time when present", () => {
      const cutoff = getEventCutoff("2026-10-19", "8:30 PM");
      expect([cutoff!.getDate(), cutoff!.getHours(), cutoff!.getMinutes()]).toEqual([19, 20, 30]);
    });

    it("falls back to the end of the day without a parseable time", () => {
      for (const time of [undefined, "", "TBA"]) {
        const cutoff = getEventCutoff("2026-10-31", time);
        expect([cutoff!.getMonth(), cutoff!.getDate(), cutoff!.getHours()]).toEqual([10, 1, 0]);
      }
    });

    it("returns null for an unparseable date", () => {
      expect(getEventCutoff("someday", "8:30 PM")).toBeNull();
    });
  });

  // UTC-8, UTC and UTC+9. 10:00 local time on 2026-10-19 in each zone.
  describe.each([
    ["America/Los_Angeles", "2026-10-19T10:00:00-07:00"],
    ["UTC", "2026-10-19T10:00:00Z"],
    ["Asia/Tokyo", "2026-10-19T10:00:00+09:00"],
  ])("isEventUpcoming in %s", (tz, now) => {
    beforeEach(() => {
      process.env.TZ = tz;
      vi.useFakeTimers();
      vi.setSystemTime(new Date(now));
    });

    it("keeps an event today without a time upcoming", () => {
      expect(isEventUpcoming({ date: "2026-10-19" })).toBe(true);
      expect(isEventUpcoming({ date: "19-10-2026", time: "" })).toBe(true);
    });

    it("keeps an event later today upcoming until it starts", () => {
      expect(isEventUpcoming({ date: "2026-10-19", time: "8:30 PM" })).toBe(true);
      expect(isEventUpcoming({ date: "2026-10-19", time: "10:01" })).toBe(true);
    });

    it("moves an event to past once its start time has passed", () => {
      expect(isEventUpcoming({ date: "2026-10-19", time: "10:00" })).toBe(false);
      expect(isEventUpcoming({ date: "2026-10-19", time: "9:00 AM" })).toBe(false);
    });

    it("treats yesterday as past and tomorrow as upcoming", () => {
      expect(isEventUpcoming({ date: "2026-10-18" })).toBe(false);
      expect(isEventUpcoming({ date: "2026-10-18", time: "11:59 PM" })).toBe(false);
      expect(isEventUpcoming({ date: "2026-10-20", time: "00:00" })).toBe(true);
    });

    it("formats a date-only string as the same calendar day", () => {
      expect(formatDate("2026-10-19", "full", "en-US")).toBe("October 19, 2026");
    });
  });

  it("switches from upcoming to past at the end of the day", () => {
    process.env.TZ = "America/Los_Angeles";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T23:59:59-07:00"));
    expect(isEventUpcoming({ date: "2026-10-19" })).toBe(true);
    vi.setSystemTime(new Date("2026-10-20T00:00:00-07:00"));
    expect(isEventUpcoming({ date: "2026-10-19" })).toBe(false);
  });

  it("treats events with an unparseable date as upcoming", () => {
    expect(isEventUpcoming({ date: "TBA" }, new Date("2026-10-19T00:00:00Z"))).toBe(true);
  });
});
