"use client";

/**
 * BatchMintSongsButton — mints multiple songs in one flow (#285).
 *
 * NOTE — scope of this first pass: the backend currently only exposes
 * per-song `prepare-mint` / `submit-mint` endpoints (see
 * `services/onchainService.ts`), each producing a single-operation XDR that
 * Freighter signs individually. This component sequentially drives that
 * existing per-song flow across a list of song ids, with progress tracking,
 * so artists don't have to click "Mint" once per song.
 *
 * A true batch (one Freighter signature covering N `mint_song` operations in
 * a single transaction) requires a backend `prepare-batch-mint` endpoint
 * that assembles a multi-operation XDR server-side — tracked as a follow-up
 * once that endpoint exists; swapping it in only touches this component's
 * `runBatch` function, not its UI contract.
 */

import { useRef, useState } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
import useOnchainServices from "@/services/onchainService";
import { useStellarWallet } from "./useStellarWallet";
import { isFreighterAvailable, signTransactionXdr } from "@/lib/freighter";
import { useEstimatedFee } from "@/hooks/useEstimatedFee";
import EstimatedFeeNotice from "./EstimatedFeeNotice";

interface BatchMintSongsButtonProps {
  songIds: string[];
}

type SongMintState = "pending" | "minting" | "success" | "failed";

export default function BatchMintSongsButton({ songIds }: BatchMintSongsButtonProps) {
  const { address } = useStellarWallet();
  const services = useOnchainServices();
  const fee = useEstimatedFee();
  const canSubmit = !fee.isLoading && !fee.error && fee.estimate !== null;
  const [isRunning, setIsRunning] = useState(false);
  const [states, setStates] = useState<Record<string, SongMintState>>({});
  const runLock = useRef(false);

  const runBatch = async () => {
    if (!address || !canSubmit || runLock.current) return;
    runLock.current = true;
    try {
      if (!(await isFreighterAvailable())) return;
      setIsRunning(true);
      const nextStates: Record<string, SongMintState> = {};
      songIds.forEach((id) => (nextStates[id] = "pending"));
      setStates({ ...nextStates });

      for (const songId of songIds) {
        setStates((prev) => ({ ...prev, [songId]: "minting" }));
        try {
          // Each mint requires its own Freighter signature prompt until a true
          // batch-transaction endpoint is available.
          const prepared = await services.usePrepareSongMint(songId).mutateAsync({});
          const signedXdr = await signTransactionXdr(
            prepared.data.xdr,
            prepared.data.networkPassphrase,
            address
          );
          await services.useSubmitSongMint(songId).mutateAsync({ signedXdr });
          setStates((prev) => ({ ...prev, [songId]: "success" }));
        } catch {
          setStates((prev) => ({ ...prev, [songId]: "failed" }));
        }
      }
    } finally {
      setIsRunning(false);
      runLock.current = false;
    }
  };

  const doneCount = Object.values(states).filter((s) => s === "success").length;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={runBatch}
        disabled={isRunning || !canSubmit || !address || songIds.length === 0}
        className={`${
          isRunning ? "opacity-70 cursor-not-allowed" : ""
        } rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-2 transition-colors text-sm`}
      >
        {isRunning
          ? `Minting ${doneCount}/${songIds.length}...`
          : `Batch mint ${songIds.length} song${songIds.length === 1 ? "" : "s"}`}
      </button>
      <EstimatedFeeNotice {...fee} />

      {Object.keys(states).length > 0 && (
        <ul className="text-xs text-[#9A9A9A] space-y-1">
          {songIds.map((id) => (
            <li key={id} className="flex items-center gap-2">
              {states[id] === "success" && <Check className="h-3 w-3 text-green-500" />}
              {states[id] === "failed" && <AlertCircle className="h-3 w-3 text-red-500" />}
              {states[id] === "minting" && <Loader2 className="h-3 w-3 animate-spin" />}
              {id}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { BatchMintSongsButton };
