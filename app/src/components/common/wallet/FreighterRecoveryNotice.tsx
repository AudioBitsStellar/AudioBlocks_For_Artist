"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import type { FreighterRecoveryState } from "@/lib/freighter";

type RecoverableFreighterState = Exclude<FreighterRecoveryState, "other">;

interface FreighterRecoveryNoticeProps {
  state: RecoverableFreighterState;
  onRetry: () => void;
  message?: string;
}

const RECOVERY_COPY: Record<RecoverableFreighterState, { title: string; message: string }> = {
  missing: {
    title: "Freighter isn't available",
    message: "Install or enable the Freighter extension, then retry your action.",
  },
  locked: {
    title: "Freighter is locked",
    message: "Unlock your wallet in the Freighter extension, then retry your action.",
  },
  "wrong-network": {
    title: "Freighter is on the wrong network",
    message: "Switch Freighter to the expected Stellar network, then retry your action.",
  },
  rejected: {
    title: "Signature wasn't approved",
    message: "No transaction was signed or submitted. Review it again when you're ready.",
  },
};

export default function FreighterRecoveryNotice({
  state,
  onRetry,
  message,
}: FreighterRecoveryNoticeProps) {
  const copy = RECOVERY_COPY[state];

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-amber-700/50 bg-amber-950/30 p-4"
      role="alert"
      aria-live="assertive"
    >
      <div>
        <p className="text-sm font-semibold text-amber-200">{copy.title}</p>
        <p className="mt-1 text-sm text-amber-100/80">{copy.message}</p>
        {message && message !== copy.message && (
          <p className="mt-1 text-xs text-amber-100/60">Wallet message: {message}</p>
        )}
        {state === "missing" && (
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-200 underline hover:text-white"
          >
            Get Freighter <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex w-fit items-center gap-2 rounded-md bg-amber-300 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-200"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}
