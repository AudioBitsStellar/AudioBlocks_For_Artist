"use client";

/**
 * TransferSongButton — transfers a minted song's on-chain token to another
 * Stellar address (#291). Mints already exist (`MintSongButton.tsx`); this
 * drives the equivalent prepare → sign → submit flow for `transfer_song`
 * (see `services/onchainService.ts` and
 * docs/adr/0002-soroban-prepare-sign-submit-split.md), gated on the song
 * already having a `tokenId` — i.e. already minted.
 */

import { useStellarWallet } from "./useStellarWallet";
import useOnchainServices from "@/services/onchainService";
import ConnectStellarWalletButton from "./ConnectStellarWalletButton";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { isFreighterAvailable, signTransactionXdr } from "@/lib/freighter";
import { useEstimatedFee } from "@/hooks/useEstimatedFee";
import { useState, useEffect } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { ApiEnvelope, SubmitSongTransferResponse } from "@/types/api";

interface TransferSongButtonProps {
  songId: string;
}

type TransferStatus =
  | "idle"
  | "not_installed"
  | "preparing"
  | "awaiting_signature"
  | "submitting"
  | "success"
  | "rejected"
  | "timeout"
  | "failed";

const COOLDOWN_DURATION = 5;
const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

export default function TransferSongButton({ songId }: TransferSongButtonProps) {
  const { address } = useStellarWallet();
  const { usePrepareSongTransfer, useSubmitSongTransfer } = useOnchainServices();
  const prepareMutation = usePrepareSongTransfer(songId);
  const submitMutation = useSubmitSongTransfer(songId);
  const { estimate: gasEstimate } = useEstimatedFee();

  const [toAddress, setToAddress] = useState("");
  const [status, setStatus] = useState<TransferStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(COOLDOWN_DURATION);

  const trimmedAddress = toAddress.trim();
  const isValidAddress = STELLAR_ADDRESS_RE.test(trimmedAddress);
  const isSelfTransfer = isValidAddress && trimmedAddress === address;

  const isBusy =
    prepareMutation.isPending ||
    submitMutation.isPending ||
    ["preparing", "awaiting_signature", "submitting"].includes(status) ||
    cooldownActive;

  useEffect(() => {
    if (!cooldownActive) return;

    // Ticks itself via a self-rescheduling timeout (rather than depending on
    // `cooldownRemaining` and resetting state synchronously in the effect
    // body) so every state update here happens inside a callback, not
    // directly in the effect's synchronous execution.
    const timer = setTimeout(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          setCooldownActive(false);
          setStatus("idle");
          setTxHash("");
          setErrorMsg("");
          setToAddress("");
          return COOLDOWN_DURATION;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownActive, cooldownRemaining]);

  const handleTransfer = async () => {
    if (!address || !isValidAddress || isSelfTransfer) return;

    const available = await isFreighterAvailable();
    if (!available) {
      setStatus("not_installed");
      return;
    }

    setStatus("preparing");
    setErrorMsg("");
    analytics.mintStarted({ songId, walletAddress: address });

    try {
      const prepared = await prepareMutation.mutateAsync({ toAddress: trimmedAddress });

      setStatus("awaiting_signature");
      let signedXdr: string;
      try {
        signedXdr = await signTransactionXdr(
          prepared.data.xdr,
          prepared.data.networkPassphrase,
          address
        );
      } catch (signErr: unknown) {
        const error = signErr as Error;
        if (
          error?.message?.toLowerCase().includes("rejected") ||
          error?.message?.toLowerCase().includes("user rejected")
        ) {
          setStatus("rejected");
          analytics.mintFailed({ songId, reason: "user rejected signature" });
          return;
        }
        throw error;
      }

      setStatus("submitting");
      const result: ApiEnvelope<SubmitSongTransferResponse> = await submitMutation.mutateAsync({
        signedXdr,
      });

      const hash = result?.data?.txHash ?? "";
      setTxHash(hash);
      setStatus("success");
      setCooldownActive(true);
      setCooldownRemaining(COOLDOWN_DURATION);
      analytics.mintSucceeded({
        songId,
        txHash: hash,
        tokenId: result?.data?.toAddress ?? "",
      });
      toast.success("Song transferred!");
    } catch (err: unknown) {
      const error = err as Error;
      const reason = error?.message ?? "unknown";
      analytics.mintFailed({ songId, reason });

      if (reason.toLowerCase().includes("timeout") || reason.toLowerCase().includes("network")) {
        setStatus("timeout");
      } else {
        setStatus("failed");
      }
      setErrorMsg(reason);
    }
  };

  if (!address) {
    return <ConnectStellarWalletButton />;
  }

  if (status === "preparing") {
    return (
      <div className="flex flex-col gap-1">
        <div
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-blue-600/30 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-xs text-blue-400 font-medium">Preparing transfer...</span>
        </div>
        <p className="text-[10px] text-gray-500">Est. gas: {gasEstimate}</p>
      </div>
    );
  }

  if (status === "awaiting_signature") {
    return (
      <div className="flex flex-col gap-1">
        <div
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-yellow-600/30 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
          <span className="text-xs text-yellow-400 font-medium">Awaiting wallet signature...</span>
        </div>
        <p className="text-[10px] text-gray-500">Est. gas: {gasEstimate}</p>
      </div>
    );
  }

  if (status === "submitting") {
    return (
      <div className="flex flex-col gap-1">
        <div
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-purple-600/30 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
          <span className="text-xs text-purple-400 font-medium">Broadcasting to network...</span>
        </div>
        <p className="text-[10px] text-gray-500">Est. gas: {gasEstimate}</p>
      </div>
    );
  }

  if (status === "not_installed") {
    return (
      <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-yellow-600/30 rounded-lg">
        <p className="text-xs text-yellow-500 font-medium">Freighter wallet not detected.</p>
        <a
          href="https://www.freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs w-fit"
        >
          Install Freighter
        </a>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div
        className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-xs text-red-500 font-medium">Signature rejected by user.</p>
        </div>
        <button
          onClick={handleTransfer}
          className="w-fit rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs"
        >
          Retry Signing
        </button>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div
        className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-xs text-red-500 font-medium">Request timed out or network error.</p>
        </div>
        <button
          onClick={handleTransfer}
          className="w-fit rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs"
        >
          Retry Submission
        </button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div
        className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-xs text-red-500 font-medium">Transfer failed: {errorMsg}</p>
        </div>
        <button
          onClick={handleTransfer}
          className="w-fit rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs"
        >
          Retry Transfer
        </button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div
        className="flex flex-col gap-2 p-3 bg-zinc-900 border border-green-600/30 rounded-lg"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <p className="text-xs text-green-400 font-medium">Transferred successfully!</p>
        </div>
        {txHash && (
          <p className="text-[10px] text-gray-400 font-mono truncate">Tx: {txHash}</p>
        )}
        {cooldownActive && (
          <p className="text-[10px] text-gray-400">
            Cooldown: {cooldownRemaining}s — new transfer available shortly
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`transfer-to-${songId}`} className="sr-only">
        Recipient Stellar address
      </label>
      <input
        id={`transfer-to-${songId}`}
        value={toAddress}
        onChange={(e) => setToAddress(e.target.value)}
        placeholder="Recipient G... address"
        aria-invalid={toAddress.length > 0 && !isValidAddress ? "true" : "false"}
        aria-describedby={`transfer-to-${songId}-error`}
        className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-10 rounded-lg text-sm"
        style={{ background: "#FFFFFF0A", border: "1px solid #2A2A2A" }}
      />
      {toAddress.length > 0 && !isValidAddress && (
        <p id={`transfer-to-${songId}-error`} className="text-[10px] text-red-500" role="alert">
          Enter a valid Stellar address (starts with G, 56 characters).
        </p>
      )}
      {isSelfTransfer && (
        <p id={`transfer-to-${songId}-error`} className="text-[10px] text-red-500" role="alert">
          You can&apos;t transfer a song to your own wallet.
        </p>
      )}
      <button
        onClick={handleTransfer}
        disabled={isBusy || !isValidAddress || isSelfTransfer}
        className={`${isBusy || !isValidAddress || isSelfTransfer ? "opacity-70 cursor-not-allowed" : ""} w-fit rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-4 py-2 transition-colors text-sm`}
      >
        Transfer song
      </button>
      <p className="text-[10px] text-gray-500">Est. gas: {gasEstimate}</p>
    </div>
  );
}

export { TransferSongButton };
