"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useSongProcessing } from "@/context/SongProcessingContext";
import { describeProcessingError, type TrackedSong } from "@/services/songProcessingService";

const UPLOAD_ROUTE = "/dashboard/upload-music";

function SongRow({ song }: { song: TrackedSong }) {
  const { dismiss, recheck } = useSongProcessing();

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface-sunken p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text">{song.title}</p>
        {song.status === "processing" && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            Processing… We&apos;re converting it for streaming. Minting and sharing unlock when
            it&apos;s ready.
          </p>
        )}
        {song.status === "ready" && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
            <CheckCircle2 size={14} className="text-success" aria-hidden="true" />
            Ready — you can now mint and share it.
          </p>
        )}
        {song.status === "stalled" && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
            <Clock size={14} aria-hidden="true" />
            This is taking longer than usual. It may still finish on its own.
          </p>
        )}
        {song.status === "failed" && (
          <div className="mt-1 text-sm">
            <p className="flex items-start gap-1.5 text-text">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-error" aria-hidden="true" />
              {describeProcessingError(song.errorReason)}
            </p>
            {song.errorReason && (
              <p className="mt-1 text-xs text-text-muted">
                Details for support: {song.errorReason}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {song.status === "stalled" && (
          <button
            type="button"
            onClick={() => recheck(song.songId)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-text hover:border-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Check again
          </button>
        )}
        {song.status === "failed" && (
          <Link
            href={UPLOAD_ROUTE}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Re-upload
          </Link>
        )}
        {song.status !== "processing" && (
          <button
            type="button"
            onClick={() => dismiss(song.songId)}
            aria-label={`Dismiss ${song.title}`}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:border-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Dismiss
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Recently uploaded tracks that are still processing, or just finished (#543).
 * Renders nothing once the artist has dismissed them all.
 */
export default function ProcessingTracksPanel() {
  const { songs } = useSongProcessing();
  if (songs.length === 0) return null;

  return (
    <section
      aria-labelledby="processing-tracks-heading"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <h2 id="processing-tracks-heading" className="text-lg font-semibold text-text">
        Recent uploads
      </h2>
      {/* Status changes are announced without the artist refreshing or moving focus. */}
      <ul className="mt-3 space-y-2" aria-live="polite">
        {songs.map((song) => (
          <SongRow key={song.songId} song={song} />
        ))}
      </ul>
    </section>
  );
}

export { ProcessingTracksPanel };
