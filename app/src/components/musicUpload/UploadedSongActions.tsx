"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import MintSongButton from "@/components/common/wallet/MintSongButton";
import TransferSongButton from "@/components/common/wallet/TransferSongButton";
import { useSongProcessing } from "@/context/SongProcessingContext";
import { describeProcessingError } from "@/services/songProcessingService";

interface UploadedSongActionsProps {
  songId: string;
  onMintingChange?: (minting: boolean) => void;
}

/**
 * What the artist can do with a song they just uploaded (#543). Minting and
 * transferring only unlock once processing has finished: until then the song
 * isn't playable, and a mint would fail on the backend.
 */
export default function UploadedSongActions({ songId, onMintingChange }: UploadedSongActionsProps) {
  const { statusOf, recheck } = useSongProcessing();
  // A song nobody is watching (e.g. tracking was dismissed elsewhere) is
  // treated as processing: the backend is the one to say it is ready.
  const tracked = statusOf(songId);
  const status = tracked?.status ?? "processing";

  if (status === "failed") {
    return (
      <div className="mt-3 rounded-lg bg-[#1a1a1a] p-3 text-xs" role="alert">
        <p className="text-white">{describeProcessingError(tracked?.errorReason)}</p>
        <Link
          href="/dashboard/upload-music"
          className="mt-2 inline-block rounded-lg bg-[#D2045B] px-3 py-1.5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Re-upload
        </Link>
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-[#1a1a1a] p-3">
        <p className="flex items-center gap-1.5 text-xs text-[#A3A3A3]" role="status">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          {status === "stalled"
            ? "Still processing — this is taking longer than usual."
            : "Processing your track… Minting unlocks when it's ready."}
        </p>
        {status === "stalled" ? (
          <button
            type="button"
            onClick={() => recheck(songId)}
            className="rounded-lg border border-[#2E2E2E] px-3 py-1.5 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Check again
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="cursor-not-allowed rounded-lg bg-[#2E2E2E] px-3 py-1.5 text-xs text-[#A3A3A3]"
          >
            Mint on-chain
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-[#1a1a1a] p-3">
        <p className="text-xs text-[#A3A3A3]">Your track is ready. Mint it on-chain:</p>
        <MintSongButton songId={songId} onMintingChange={onMintingChange} />
      </div>
      <div className="space-y-2 rounded-lg bg-[#1a1a1a] p-3">
        <p className="text-xs text-[#A3A3A3]">
          Already minted? Transfer this song&apos;s token to another wallet:
        </p>
        <TransferSongButton songId={songId} />
      </div>
    </div>
  );
}

export { UploadedSongActions };
