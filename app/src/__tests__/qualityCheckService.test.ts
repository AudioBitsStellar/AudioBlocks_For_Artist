/**
 * The #465 quality-check pipeline: analysis → issues → score → verdict →
 * notification → localStorage → the bell, and the mute switch on the way.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MOCK_QUALITY_CHECKS,
  analyseMaster,
  latestQualityCheckForSong,
  loadQualityChecks,
  markQualityCheckSeen,
  runQualityCheck,
  saveQualityCheck,
  scoreOf,
  summarizeResult,
  toArtistNotification,
  unreadQualityChecks,
  verdictFor,
  type MasterAnalysis,
  type QualityCheckResult,
} from "@/services/qualityCheckService";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "@/services/notificationPreferences";
import { filterByPreferences, mergeById } from "@/services/notificationService";

const CHECKS_KEY = "audioblocks:quality-checks:v1";
const PREFS_KEY = "audioblocks:notification-preferences:v1";

const cleanMaster = (overrides: Partial<MasterAnalysis> = {}): MasterAnalysis => ({
  metadata: { durationSec: 210, sampleRateHz: 44100, bitrateKbps: 320 },
  peakAmplitude: 0.95,
  integratedLufs: -13,
  channelCount: 2,
  silentRatio: 0.01,
  ...overrides,
});

const codesFor = (analysis: MasterAnalysis) => analyseMaster(analysis).map((issue) => issue.code);

const result = (overrides: Partial<QualityCheckResult> = {}): QualityCheckResult => ({
  id: "qc_song_1",
  songId: "song_1",
  songTitle: "Midnight Drive",
  verdict: "passed",
  score: 100,
  issues: [],
  checkedAt: "2026-09-01T10:00:00.000Z",
  seen: false,
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("analyseMaster", () => {
  it("passes a well-behaved master with no issues", () => {
    expect(analyseMaster(cleanMaster())).toEqual([]);
  });

  it("treats a full-scale peak as clipping and a near-one as merely hot", () => {
    expect(codesFor(cleanMaster({ peakAmplitude: 1.002 }))).toContain("clipping");
    expect(codesFor(cleanMaster({ peakAmplitude: 0.99 }))).toEqual(["hotPeaks"]);
  });

  it("flags loudness in both directions, naming the measured LUFS", () => {
    const tooLoud = analyseMaster(cleanMaster({ integratedLufs: -6.5 }));
    expect(tooLoud[0].code).toBe("loudnessHigh");
    expect(tooLoud[0].message).toContain("-6.5 LUFS");
    expect(codesFor(cleanMaster({ integratedLufs: -21 }))).toContain("loudnessLow");
  });

  it("flags under-spec sample rate and bitrate but not over-spec ones", () => {
    expect(
      codesFor(
        cleanMaster({ metadata: { durationSec: 210, sampleRateHz: 22050, bitrateKbps: 128 } })
      )
    ).toEqual(["sampleRate", "lowBitrate"]);
    expect(
      codesFor(
        cleanMaster({ metadata: { durationSec: 210, sampleRateHz: 48000, bitrateKbps: 1411 } })
      )
    ).toEqual([]);
  });

  it("mentions mono and dead air", () => {
    expect(codesFor(cleanMaster({ channelCount: 1 }))).toContain("monoMaster");
    expect(codesFor(cleanMaster({ silentRatio: 0.4 }))).toContain("longSilence");
  });

  it("fails a sub-30-second upload, which earns no royalties", () => {
    const issues = analyseMaster(
      cleanMaster({ metadata: { durationSec: 12, sampleRateHz: 44100, bitrateKbps: 320 } })
    );
    expect(issues.find((issue) => issue.code === "shortDuration")?.severity).toBe("error");
  });
});

describe("scoring", () => {
  it("weights errors harder than warnings and warnings than notes", () => {
    expect(scoreOf([{ code: "clipping", severity: "error", message: "x" }])).toBe(75);
    expect(scoreOf([{ code: "hotPeaks", severity: "warning", message: "x" }])).toBe(90);
    expect(scoreOf([{ code: "monoMaster", severity: "info", message: "x" }])).toBe(97);
  });

  it("never leaves the 0-100 range", () => {
    const many = Array.from({ length: 10 }, () => ({
      code: "clipping" as const,
      severity: "error" as const,
      message: "x",
    }));
    expect(scoreOf(many)).toBe(0);
    expect(scoreOf([])).toBe(100);
  });

  it("fails on a single blocking issue regardless of score", () => {
    expect(verdictFor([{ code: "clipping", severity: "error", message: "x" }], 75)).toBe("failed");
    expect(verdictFor([], 100)).toBe("passed");
    const warnings = [
      { code: "hotPeaks" as const, severity: "warning" as const, message: "x" },
      { code: "loudnessHigh" as const, severity: "warning" as const, message: "y" },
    ];
    expect(verdictFor(warnings, scoreOf(warnings))).toBe("review");
  });
});

describe("runQualityCheck", () => {
  it("is deterministic for a given analysis and timestamp", () => {
    const input = {
      songId: "song_9",
      songTitle: "Static Bloom",
      analysis: cleanMaster({ peakAmplitude: 1.01 }),
      checkedAt: "2026-09-02T08:00:00.000Z",
    };

    expect(runQualityCheck(input)).toEqual(runQualityCheck(input));
    expect(runQualityCheck(input)).toMatchObject({
      id: "qc_song_9",
      verdict: "failed",
      seen: false,
    });
  });

  it("persists nothing on its own", () => {
    runQualityCheck({ songId: "song_1", songTitle: "x", analysis: cleanMaster() });

    expect(loadQualityChecks()).toEqual([]);
  });
});

describe("notifications", () => {
  it("surfaces the leading issue rather than a bare score", () => {
    const checked = runQualityCheck({
      songId: "song_1",
      songTitle: "Static Bloom",
      analysis: cleanMaster({ peakAmplitude: 1.01, silentRatio: 0.4 }),
    });

    expect(summarizeResult(checked)).toContain("clipping");
    expect(summarizeResult(checked)).toMatch(/lower the limiter ceiling/i);
  });

  it("maps a result onto a qualityCheck notification that links back to the song", () => {
    const notification = toArtistNotification(
      result({ id: "qc_42", songId: "song_42", songTitle: "Paper Moon" })
    );

    expect(notification).toMatchObject({
      id: "quality_check_qc_42",
      kind: "qualityCheck",
      read: false,
    });
    expect(notification.href).toContain("song=song_42");
    expect(notification.title).toBe("Master passed the quality check");
  });

  it("reads a seen result as an already-read notification", () => {
    expect(toArtistNotification(result({ seen: true })).read).toBe(true);
  });

  it("keeps the newest entry when a stored check replaces the seeded one", () => {
    const seeded = toArtistNotification(result({ id: "qc_song_1" }));
    const rerun = toArtistNotification(
      result({ id: "qc_song_1", verdict: "failed", score: 40, seen: false })
    );

    const merged = mergeById([seeded], [rerun]);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("Master failed the quality check");
  });
});

describe("local persistence", () => {
  it("starts empty and tolerates corrupt storage", () => {
    expect(loadQualityChecks()).toEqual([]);

    localStorage.setItem(CHECKS_KEY, "not json");
    expect(loadQualityChecks()).toEqual([]);

    localStorage.setItem(CHECKS_KEY, JSON.stringify({ nope: true }));
    expect(loadQualityChecks()).toEqual([]);
  });

  it("stores newest first and replaces an earlier result for the same song", () => {
    saveQualityCheck(result({ checkedAt: "2026-09-01T10:00:00.000Z" }));
    saveQualityCheck(
      result({ verdict: "failed", score: 60, checkedAt: "2026-09-03T10:00:00.000Z" })
    );

    const stored = loadQualityChecks();
    expect(stored).toHaveLength(1);
    expect(stored[0].verdict).toBe("failed");
  });

  it("orders by check time and caps history length", () => {
    for (let i = 0; i < 25; i++) {
      saveQualityCheck(
        result({
          id: `qc_${i}`,
          songId: `song_${i}`,
          checkedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
        })
      );
    }

    const stored = loadQualityChecks();
    expect(stored).toHaveLength(20);
    expect(stored[0].id).toBe("qc_24");
  });

  it("marks a result seen, which is what clears the unread dot", () => {
    saveQualityCheck(result());

    markQualityCheckSeen("qc_song_1");

    expect(loadQualityChecks()[0].seen).toBe(true);
    expect(unreadQualityChecks()).toEqual([]);
  });

  it("finds the latest report for a song", () => {
    saveQualityCheck(
      result({ id: "qc_song_a_v1", songId: "song_a", checkedAt: "2026-08-01T00:00:00.000Z" })
    );
    saveQualityCheck(
      result({ id: "qc_song_a_v2", songId: "song_a", checkedAt: "2026-09-01T00:00:00.000Z" })
    );
    saveQualityCheck(result({ id: "qc_song_b", songId: "song_b" }));

    expect(latestQualityCheckForSong("song_a")?.checkedAt).toBe("2026-09-01T00:00:00.000Z");
    expect(latestQualityCheckForSong("song_missing")).toBeUndefined();
  });
});

describe("reporting to analytics", () => {
  const track = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", "write-key-under-test");
    Object.assign(window, { analytics: { track } });
  });

  afterEach(() => {
    delete (window as { analytics?: unknown }).analytics;
    track.mockClear();
  });

  it("emits verdict, score and issue count when a result is recorded", () => {
    saveQualityCheck(result({ verdict: "review", score: 80 }));

    expect(track).toHaveBeenCalledWith("quality_check_published", {
      songId: "song_1",
      verdict: "review",
      score: 80,
      issueCount: 0,
    });
  });
});

describe("the artist's mute switch", () => {
  it("defaults quality checks to in-app only", () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES.qualityCheck).toEqual({ email: false, inApp: true });
  });

  it("gives preferences saved before #465 the new default instead of undefined", () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ newFan: { email: true, inApp: true } }));

    expect(loadNotificationPreferences().qualityCheck).toEqual({ email: false, inApp: true });
  });

  it("hides quality-check notifications once muted", () => {
    const notification = toArtistNotification(result());
    saveNotificationPreferences({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      qualityCheck: { email: false, inApp: false },
    });

    expect(filterByPreferences([notification], loadNotificationPreferences())).toEqual([]);
    expect(filterByPreferences([notification], DEFAULT_NOTIFICATION_PREFERENCES)).toHaveLength(1);
  });
});

describe("MOCK_QUALITY_CHECKS", () => {
  it("shows the artist both a clean master and a failing one", () => {
    expect(MOCK_QUALITY_CHECKS.map((check) => check.verdict).sort()).toEqual(["failed", "passed"]);
    for (const check of MOCK_QUALITY_CHECKS) {
      expect(check.score).toBe(scoreOf(check.issues));
      expect(check.verdict).toBe(verdictFor(check.issues, check.score));
    }
  });
});
