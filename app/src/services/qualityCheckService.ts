/**
 * AI quality-check results for uploaded masters (#465).
 *
 * The AudioBlocks quality checker runs on the backend and isn't wired up yet,
 * so this module owns the *shape* of a result and everything the artist portal
 * does with one: scoring a master analysis into issues, persisting results
 * locally, and turning them into in-app notifications that respect the
 * artist's `qualityCheck` preference.
 *
 * `runQualityCheck` is a deterministic stand-in for the model — same input
 * analysis, same output — so the UI and its tests are written against the real
 * contract and only the producer has to be swapped when the endpoint lands.
 * The rules it encodes are the ones mastering engineers actually check:
 * clipping, streaming loudness targets, sample rate, bitrate, mono masters and
 * long stretches of digital silence.
 *
 * Pure functions with no React dependency, matching
 * `notificationPreferences.ts`.
 */

import { useMemo, useSyncExternalStore } from "react";
import { analytics } from "@/lib/analytics";
import type { ArtistNotification } from "@/services/notificationService";
import type { AudioMetadata } from "@/utils/audioMetadata";

export type QualityCheckVerdict = "passed" | "review" | "failed";

export type QualityCheckSeverity = "info" | "warning" | "error";

export type QualityCheckIssueCode =
  | "clipping"
  | "hotPeaks"
  | "loudnessHigh"
  | "loudnessLow"
  | "sampleRate"
  | "lowBitrate"
  | "monoMaster"
  | "longSilence"
  | "shortDuration";

export interface QualityCheckIssue {
  code: QualityCheckIssueCode;
  severity: QualityCheckSeverity;
  /** Written for the artist, not the engineer: what to do about it. */
  message: string;
}

/** Measurements taken from the decoded master before it is scored. */
export interface MasterAnalysis {
  metadata: AudioMetadata;
  /** Loudest sample across all channels, 0..1+; above ~0.999 is clipping. */
  peakAmplitude: number;
  /** Integrated loudness in LUFS. Streaming platforms normalise to about -14. */
  integratedLufs: number;
  channelCount: number;
  /** Share of the track that is digital black, 0..1. */
  silentRatio: number;
}

export interface QualityCheckResult {
  id: string;
  songId: string;
  songTitle: string;
  verdict: QualityCheckVerdict;
  /** 0-100; the higher the closer to release-ready. */
  score: number;
  issues: QualityCheckIssue[];
  /** ISO 8601. */
  checkedAt: string;
  /** True once the artist has opened the report, which clears the unread dot. */
  seen: boolean;
}

/** Points taken off a perfect score per severity — see `scoreOf`. */
const SEVERITY_PENALTY: Record<QualityCheckSeverity, number> = {
  error: 25,
  warning: 10,
  info: 3,
};

/** A master at or above this peak is treated as clipping. */
const CLIPPING_THRESHOLD = 0.999;
/** Peaks this close to full scale leave the distributor no headroom. */
const HOT_PEAK_THRESHOLD = 0.98;
/** Below this the artist should expect to be turned *up* by the platform. */
const LOUDNESS_FLOOR_LUFS = -18;
/** Above this the master is hotter than streaming targets and will be turned down. */
const LOUDNESS_CEILING_LUFS = -9;
const TARGET_SAMPLE_RATE_HZ = 44100;
const MINIMUM_BITRATE_KBPS = 192;
const LONG_SILENT_RATIO = 0.25;
const MINIMUM_DURATION_SEC = 30;
/** A score at or above this with no errors is a clean pass. */
const PASSING_SCORE = 85;

/** Inspect a decoded master and return the issues worth telling the artist about. */
export function analyseMaster(analysis: MasterAnalysis): QualityCheckIssue[] {
  const issues: QualityCheckIssue[] = [];

  if (analysis.peakAmplitude >= CLIPPING_THRESHOLD) {
    issues.push({
      code: "clipping",
      severity: "error",
      message: "The master is clipping. Lower the limiter ceiling and re-export.",
    });
  } else if (analysis.peakAmplitude >= HOT_PEAK_THRESHOLD) {
    issues.push({
      code: "hotPeaks",
      severity: "warning",
      message: "Peaks are right at full scale, which leaves no headroom for encoding.",
    });
  }

  if (analysis.integratedLufs > LOUDNESS_CEILING_LUFS) {
    issues.push({
      code: "loudnessHigh",
      severity: "warning",
      message: `At ${analysis.integratedLufs.toFixed(1)} LUFS the master is louder than streaming targets and platforms will turn it down.`,
    });
  } else if (analysis.integratedLufs < LOUDNESS_FLOOR_LUFS) {
    issues.push({
      code: "loudnessLow",
      severity: "warning",
      message: `At ${analysis.integratedLufs.toFixed(1)} LUFS the master will sound quiet next to other releases.`,
    });
  }

  if (analysis.metadata.sampleRateHz < TARGET_SAMPLE_RATE_HZ) {
    issues.push({
      code: "sampleRate",
      severity: "warning",
      message: `Sample rate is ${(analysis.metadata.sampleRateHz / 1000).toFixed(1)} kHz. Export at 44.1 kHz or higher.`,
    });
  }

  if (analysis.metadata.bitrateKbps < MINIMUM_BITRATE_KBPS) {
    issues.push({
      code: "lowBitrate",
      severity: "warning",
      message: `Bitrate is ${analysis.metadata.bitrateKbps} kbps, below the ${MINIMUM_BITRATE_KBPS} kbps minimum for a release master.`,
    });
  }

  if (analysis.channelCount === 1) {
    issues.push({
      code: "monoMaster",
      severity: "info",
      message: "This is a mono master. Fine for some genres, but worth double-checking it's intentional.",
    });
  }

  if (analysis.silentRatio > LONG_SILENT_RATIO) {
    issues.push({
      code: "longSilence",
      severity: "warning",
      message: "More than a quarter of the track is digital silence. Trim the dead air at the start and end.",
    });
  }

  if (analysis.metadata.durationSec < MINIMUM_DURATION_SEC) {
    issues.push({
      code: "shortDuration",
      severity: "error",
      message: "At under 30 seconds the track won't qualify for royalty payout.",
    });
  }

  return issues;
}

/** 100 minus a penalty per issue, weighted by severity, clamped to 0-100. */
export function scoreOf(issues: QualityCheckIssue[]): number {
  const penalty = issues.reduce((total, issue) => total + SEVERITY_PENALTY[issue.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

/** One blocking error fails the check; otherwise the score decides. */
export function verdictFor(issues: QualityCheckIssue[], score: number): QualityCheckVerdict {
  if (issues.some((issue) => issue.severity === "error")) return "failed";
  return score >= PASSING_SCORE ? "passed" : "review";
}

export interface QualityCheckInput {
  songId: string;
  songTitle: string;
  analysis: MasterAnalysis;
  /** Injectable so callers (and tests) control the timestamp. */
  checkedAt?: string;
  /** Injectable for the same reason; the backend owns real result IDs. */
  id?: string;
}

/** Run the check for one master. Pure: nothing here persists or notifies. */
export function runQualityCheck({
  songId,
  songTitle,
  analysis,
  checkedAt = new Date().toISOString(),
  id = `qc_${songId}`,
}: QualityCheckInput): QualityCheckResult {
  const issues = analyseMaster(analysis);
  const score = scoreOf(issues);
  return { id, songId, songTitle, issues, score, verdict: verdictFor(issues, score), checkedAt, seen: false };
}

const HEADLINE: Record<QualityCheckVerdict, string> = {
  passed: "Master passed the quality check",
  review: "Master needs a second look",
  failed: "Master failed the quality check",
};

/**
 * The one-line summary the artist sees in the bell. Lists the most severe
 * issue rather than the score, which they can't act on.
 */
export function summarizeResult(result: QualityCheckResult): string {
  const leading = [...result.issues].sort(
    (a, b) => SEVERITY_PENALTY[b.severity] - SEVERITY_PENALTY[a.severity]
  )[0];
  if (!leading) return `“${result.songTitle}” scored ${result.score}/100 with no issues flagged.`;
  return `“${result.songTitle}” scored ${result.score}/100. ${leading.message}`;
}

/** Bridges a result into the notification list; `seen` becomes `read`. */
export function toArtistNotification(result: QualityCheckResult): ArtistNotification {
  return {
    id: `quality_check_${result.id}`,
    kind: "qualityCheck",
    title: HEADLINE[result.verdict],
    message: summarizeResult(result),
    createdAt: result.checkedAt,
    read: result.seen,
    href: `/dashboard/my-music?song=${encodeURIComponent(result.songId)}`,
  };
}

const STORAGE_KEY = "audioblocks:quality-checks:v1";
/** Fired locally so same-tab writers wake the bell; `storage` covers other tabs. */
const CHANGED_EVENT = "audioblocks:quality-checks-changed";
/** Longest list kept locally; older results fall off the end. */
const MAX_STORED_RESULTS = 20;

/** Newest first, ignoring anything unreadable rather than throwing. */
export function loadQualityChecks(): QualityCheckResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QualityCheckResult[];
    if (!Array.isArray(parsed)) return [];
    return sortByNewest(parsed.filter((result) => result && typeof result.id === "string"));
  } catch {
    return [];
  }
}

function persist(results: QualityCheckResult[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    window.dispatchEvent(new Event(CHANGED_EVENT));
  } catch {
    // Storage full or unavailable: the check still ran, the artist just won't
    // see it after a reload. Not worth surfacing an error for.
  }
}

export function sortByNewest(results: QualityCheckResult[]): QualityCheckResult[] {
  return [...results].sort(
    (a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()
  );
}

/**
 * Store a result, superseding any earlier report for the same song (or the
 * same result id) so re-checking a track doesn't leave a stale report on top,
 * and report the outcome to analytics.
 */
export function saveQualityCheck(result: QualityCheckResult): QualityCheckResult[] {
  const next = sortByNewest([
    result,
    ...loadQualityChecks().filter((r) => r.id !== result.id && r.songId !== result.songId),
  ]).slice(0, MAX_STORED_RESULTS);
  persist(next);
  analytics.qualityCheckPublished({
    songId: result.songId,
    verdict: result.verdict,
    score: result.score,
    issueCount: result.issues.length,
  });
  return next;
}

/** Marks one result as opened. Returns the updated list. */
export function markQualityCheckSeen(id: string): QualityCheckResult[] {
  const next = loadQualityChecks().map((result) => (result.id === id ? { ...result, seen: true } : result));
  persist(next);
  return next;
}

export function latestQualityCheckForSong(
  songId: string,
  results: QualityCheckResult[] = loadQualityChecks()
): QualityCheckResult | undefined {
  return sortByNewest(results.filter((result) => result.songId === songId))[0];
}

/** Results whose verdict the artist hasn't opened yet. */
export function unreadQualityChecks(
  results: QualityCheckResult[] = loadQualityChecks()
): QualityCheckResult[] {
  return results.filter((result) => !result.seen);
}

/** Serialized so `useSyncExternalStore` can compare snapshots by value. */
const readNotificationsSnapshot = () =>
  JSON.stringify(loadQualityChecks().map(toArtistNotification));
const emptyNotificationsSnapshot = () => "[]";

function subscribeToQualityChecks(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED_EVENT, onChange);
  };
}

/**
 * Artist notifications for locally recorded quality-check results.
 *
 * Server-rendered as the empty list, so the bell doesn't change underneath
 * hydration, then re-read from storage whenever a check is saved here or in
 * another tab.
 */
export function useQualityCheckNotifications(): ArtistNotification[] {
  const snapshot = useSyncExternalStore(
    subscribeToQualityChecks,
    readNotificationsSnapshot,
    emptyNotificationsSnapshot
  );
  const notifications = useMemo(
    () => JSON.parse(snapshot) as ArtistNotification[],
    [snapshot]
  );
  return notifications;
}

const HOUR = 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/** A clean master, and an older failing report the artist already opened. */
export const MOCK_QUALITY_CHECKS: QualityCheckResult[] = [
  runQualityCheck({
    songId: "song_1",
    songTitle: "Midnight Drive",
    checkedAt: ago(40 * 60 * 1000),
    analysis: {
      metadata: { durationSec: 214, sampleRateHz: 44100, bitrateKbps: 320 },
      peakAmplitude: 0.94,
      integratedLufs: -13.4,
      channelCount: 2,
      silentRatio: 0.02,
    },
  }),
  {
    ...runQualityCheck({
      songId: "song_7",
      songTitle: "Static Bloom",
      checkedAt: ago(26 * HOUR),
      analysis: {
        metadata: { durationSec: 187, sampleRateHz: 44100, bitrateKbps: 320 },
        peakAmplitude: 1.002,
        integratedLufs: -7.8,
        channelCount: 2,
        silentRatio: 0.04,
      },
    }),
    seen: true,
  },
];
