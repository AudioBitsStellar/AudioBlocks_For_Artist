"use client";

/**
 * Watches uploaded songs until processing settles (#543). Mounted once in the
 * app provider, so polling continues while the artist moves between pages, and
 * restarted from `localStorage` after a reload.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  fetchSongStatus,
  nextPollDelay,
  POLL_WINDOW_MS,
  readTrackedSongs,
  writeTrackedSongs,
  type TrackedSong,
} from "@/services/songProcessingService";

export interface SongProcessingContextValue {
  /** Every watched song, newest first. */
  songs: TrackedSong[];
  /** Start watching a song that was just finalized. */
  track: (songId: string, title: string) => void;
  /** Stop showing a song (after it failed, stalled or became ready). */
  dismiss: (songId: string) => void;
  /** Poll a stalled song again for another window. */
  recheck: (songId: string) => void;
  statusOf: (songId: string) => TrackedSong | undefined;
}

const SongProcessingContext = createContext<SongProcessingContextValue | null>(null);

export function SongProcessingProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<TrackedSong[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const attempts = useRef(new Map<string, number>());
  const loaded = useRef(false);

  // Save before load in effect order: the first run (with the empty initial
  // state) is skipped, so it never overwrites what is in storage.
  useEffect(() => {
    if (loaded.current) writeTrackedSongs(songs);
  }, [songs]);

  useEffect(() => {
    setSongs(readTrackedSongs());
    loaded.current = true;
  }, []);

  const update = useCallback((songId: string, patch: Partial<TrackedSong>) => {
    setSongs((current) =>
      current.map((song) => (song.songId === songId ? { ...song, ...patch } : song))
    );
  }, []);

  const stopPolling = useCallback((songId: string) => {
    const timer = timers.current.get(songId);
    if (timer) clearTimeout(timer);
    timers.current.delete(songId);
    attempts.current.delete(songId);
  }, []);

  // Each poll arms the next one itself, so a long-running song keeps being
  // checked without waiting on a re-render between polls.
  const scheduleRef = useRef<(song: TrackedSong) => void>(() => {});
  const schedule = useCallback(
    (song: TrackedSong) => {
      if (timers.current.has(song.songId)) return;
      const attempt = attempts.current.get(song.songId) ?? 0;
      const timer = setTimeout(async () => {
        attempts.current.set(song.songId, attempt + 1);
        try {
          const result = await fetchSongStatus(song.songId);
          if (result.status === "ready") {
            stopPolling(song.songId);
            update(song.songId, { status: "ready", errorReason: null });
            toast.success(`Your track "${song.title}" is ready`);
            return;
          }
          if (result.status === "failed") {
            stopPolling(song.songId);
            update(song.songId, { status: "failed", errorReason: result.errorReason });
            toast.error(`"${song.title}" couldn't be processed`);
            return;
          }
        } catch {
          // A failed status check is not a processing failure: try again later.
        }
        // Dismissed or re-checked while this poll was in flight.
        if (timers.current.get(song.songId) !== timer) return;
        timers.current.delete(song.songId);
        if (Date.now() - song.startedAt >= POLL_WINDOW_MS) {
          stopPolling(song.songId);
          update(song.songId, { status: "stalled" });
          return;
        }
        scheduleRef.current(song);
      }, nextPollDelay(attempt));
      timers.current.set(song.songId, timer);
    },
    [stopPolling, update]
  );
  scheduleRef.current = schedule;

  // Every song still processing has exactly one timer armed.
  useEffect(() => {
    for (const song of songs) {
      if (song.status === "processing") schedule(song);
      else stopPolling(song.songId);
    }
  }, [songs, schedule, stopPolling]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const track = useCallback((songId: string, title: string) => {
    if (!songId) return;
    setSongs((current) => [
      { songId, title, startedAt: Date.now(), status: "processing" },
      ...current.filter((song) => song.songId !== songId),
    ]);
  }, []);

  const dismiss = useCallback(
    (songId: string) => {
      stopPolling(songId);
      setSongs((current) => current.filter((song) => song.songId !== songId));
    },
    [stopPolling]
  );

  const recheck = useCallback(
    (songId: string) => {
      stopPolling(songId);
      update(songId, { status: "processing", startedAt: Date.now() });
    },
    [stopPolling, update]
  );

  const statusOf = useCallback(
    (songId: string) => songs.find((song) => song.songId === songId),
    [songs]
  );

  const value = useMemo(
    () => ({ songs, track, dismiss, recheck, statusOf }),
    [songs, track, dismiss, recheck, statusOf]
  );

  return <SongProcessingContext.Provider value={value}>{children}</SongProcessingContext.Provider>;
}

const NOOP_VALUE: SongProcessingContextValue = {
  songs: [],
  track: () => {},
  dismiss: () => {},
  recheck: () => {},
  statusOf: () => undefined,
};

/** Works outside the provider too (isolated tests and stories), as a no-op. */
export function useSongProcessing(): SongProcessingContextValue {
  return useContext(SongProcessingContext) ?? NOOP_VALUE;
}
