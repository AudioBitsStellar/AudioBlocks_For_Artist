/**
 * Song processing after upload (#543).
 *
 * `finalize` only queues a song: the backend's SongProcessorWorker then
 * transcodes it to HLS and pins its metadata to IPFS, moving `Song.status`
 * from `processing` to `ready`, or to `failed` with an `errorReason`. The
 * backend sends no event when that happens, so the dashboard polls
 * `GET /api/song/:id` with a backoff until the song settles or ten minutes
 * pass. The songs being watched are kept in `localStorage`, so a reload keeps
 * watching them.
 */

import { createApiClient } from "@/api/axios";
import { SONG_ENDPOINTS } from "@/api/api-endpoint";

export type SongProcessingStatus = "processing" | "ready" | "failed";

/** `stalled`: still processing after the polling window, so polling stopped. */
export type TrackedProcessingStatus = SongProcessingStatus | "stalled";

export interface TrackedSong {
  songId: string;
  title: string;
  /** When the upload was finalized (ms since epoch). */
  startedAt: number;
  status: TrackedProcessingStatus;
  errorReason?: string | null;
}

export interface SongStatusResult {
  status: SongProcessingStatus;
  errorReason: string | null;
}

export const PROCESSING_STORAGE_KEY = "audioblocks:song-processing:v1";
export const FIRST_POLL_DELAY_MS = 5_000;
export const MAX_POLL_DELAY_MS = 30_000;
export const POLL_WINDOW_MS = 10 * 60_000;

/** 5 s, then ×1.5 per attempt, capped at 30 s. */
export function nextPollDelay(attempt: number): number {
  return Math.min(MAX_POLL_DELAY_MS, Math.round(FIRST_POLL_DELAY_MS * 1.5 ** Math.max(0, attempt)));
}

/** Reads one song's processing status. Anything unexpected counts as still processing. */
export async function fetchSongStatus(songId: string): Promise<SongStatusResult> {
  const client = await createApiClient();
  const response = await client.get<{ data?: { status?: string; errorReason?: string | null } }>(
    SONG_ENDPOINTS.UPDATE(songId)
  );
  const song = response.data?.data;
  const status: SongProcessingStatus =
    song?.status === "ready" || song?.status === "failed" ? song.status : "processing";
  return { status, errorReason: song?.errorReason ?? null };
}

function isTrackedSong(value: unknown): value is TrackedSong {
  if (!value || typeof value !== "object") return false;
  const song = value as Record<string, unknown>;
  return (
    typeof song.songId === "string" &&
    typeof song.title === "string" &&
    typeof song.startedAt === "number" &&
    ["processing", "ready", "failed", "stalled"].includes(song.status as string)
  );
}

/** The watched songs saved in this browser; anything malformed is dropped. */
export function readTrackedSongs(): TrackedSong[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(PROCESSING_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isTrackedSong) : [];
  } catch {
    return [];
  }
}

export function writeTrackedSongs(songs: TrackedSong[]): void {
  if (typeof window === "undefined") return;
  try {
    if (songs.length === 0) window.localStorage.removeItem(PROCESSING_STORAGE_KEY);
    else window.localStorage.setItem(PROCESSING_STORAGE_KEY, JSON.stringify(songs));
  } catch {
    // Storage full or blocked: watching still works for this session.
  }
}

/**
 * The backend's `errorReason` is written for engineers ("ffmpeg exited with
 * code 1", "IPFS pin failed: timeout"). Artists get what happened and what to
 * do about it; the original is kept as a detail for support.
 */
export function describeProcessingError(errorReason: string | null | undefined): string {
  const reason = (errorReason ?? "").toLowerCase();
  if (/ffmpeg|transcod|codec|decode|corrupt|invalid (audio|data)|hls/.test(reason)) {
    return "We couldn't convert your audio for streaming. The file may be damaged or in an unusual format — try exporting it again as MP3, WAV or FLAC and re-uploading.";
  }
  if (/ipfs|pin|metadata/.test(reason)) {
    return "Your audio was converted, but we couldn't store the track's details. This is usually temporary — re-upload the track to try again.";
  }
  if (/malware|virus|threat/.test(reason)) {
    return "This file was flagged by our security scan, so it wasn't published. Upload a fresh export of the track.";
  }
  if (/timeout|timed out|network|econn/.test(reason)) {
    return "Processing took too long and was stopped. Re-upload the track to try again.";
  }
  return "Something went wrong while preparing your track for streaming. Re-upload it to try again.";
}
