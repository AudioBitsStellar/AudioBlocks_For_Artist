"use client";

import { useStellarWallet } from "./useStellarWallet";
import useOnchainServices from "@/services/onchainService";
import ConnectStellarWalletButton from "./ConnectStellarWalletButton";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { classifyError } from "@/utils/errorRecovery";
import { isFreighterAvailable, signTransactionXdr } from "@/lib/freighter";
import { classifyFreighterError, type FreighterRecoveryState } from "@/lib/freighter";
import { explorerTxUrl } from "@/lib/horizon";
import { useState, useEffect, useRef } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { ApiEnvelope, SubmitSongMintResponse } from "@/types/api";
import { useEstimatedFee } from "@/hooks/useEstimatedFee";
import EstimatedFeeNotice from "./EstimatedFeeNotice";
import { useFreighterNetworkCheck } from "@/hooks/useFreighterNetworkCheck";
import { useTransactionStatus } from "@/hooks/useTransactionStatus";
import { transactionStorageKey } from "@/lib/transactionStatus";
import { getActiveNetworkId } from "@/lib/stellarNetwork";
import FreighterRecoveryNotice from "./FreighterRecoveryNotice";

interface MintSongButtonProps {
  songId: string;
  albumId?: number;
  onMintingChange?: (minting: boolean) => void;
}

type MintStatus =
  | "idle"
  | "not_installed"
  | "preparing"
  | "awaiting_signature"
  | "submitting"
  | "pending"
  | "success"
  | "rejected"
  | "timeout"
  | "failed";

interface MintTransactionDetails {
  txHash?: string;
  tokenId?: string;
}

interface MintSubmission {
  signedXdr: string;
  idempotencyKey: string;
}

const COOLDOWN_DURATION = 5;

export default function MintSongButton({
  songId,
  albumId = 0,
  onMintingChange,
}: MintSongButtonProps) {
  const { address } = useStellarWallet();
  const { usePrepareSongMint, useSubmitSongMint } = useOnchainServices();
  const prepareMutation = usePrepareSongMint(songId);
  const submitMutation = useSubmitSongMint(songId);
  const fee = useEstimatedFee();
  const canSubmit = !fee.isLoading && !fee.error && fee.estimate !== null;
  const freighterCheck = useFreighterNetworkCheck();
  const transaction = useTransactionStatus(
    transactionStorageKey("mint", `${getActiveNetworkId()}:${songId}`)
  );
  const { requestReview, reviewDialog } = useTransactionSignReview();

  const [status, setStatus] = useState<MintStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [freighterFailure, setFreighterFailure] = useState<FreighterRecoveryState | null>(null);
  const [freighterFailureMessage, setFreighterFailureMessage] = useState("");
  const [txDetails, setTxDetails] = useState<MintTransactionDetails>({});
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(COOLDOWN_DURATION);
  const submitLock = useRef(false);
  const pendingSubmission = useRef<MintSubmission | null>(null);

  const isMinting = ["preparing", "awaiting_signature", "submitting"].includes(status);
  const isBusy =
    prepareMutation.isPending ||
    submitMutation.isPending ||
    isMinting ||
    status === "pending" ||
    !transaction.isReady ||
    cooldownActive;
  const isNetworkMismatch = freighterCheck.status === "mismatch";

  useEffect(() => {
    const tracked = transaction.record;
    if (!transaction.isReady || !tracked) return;
    setTxDetails({ txHash: tracked.txHash, tokenId: tracked.tokenId });
    if (tracked.status === "pending") setStatus("pending");
    if (tracked.status === "confirmed") {
      if (status === "pending") {
        analytics.mintSucceeded({ songId, txHash: tracked.txHash, tokenId: tracked.tokenId ?? "" });
        toast.success("Minting succeeded!");
        setCooldownActive(true);
        setCooldownRemaining(COOLDOWN_DURATION);
      }
      setStatus("success");
    }
    if (tracked.status === "failed") {
      setErrorMsg("The transaction failed on Stellar.");
      setStatus("failed");
    }
  }, [songId, status, transaction.isReady, transaction.record]);

  useEffect(() => {
    onMintingChange?.(isMinting);
  }, [isMinting, onMintingChange]);

  useEffect(() => {
    if (!cooldownActive) return;
    if (cooldownRemaining <= 0) {
      setCooldownActive(false);
      setStatus("idle");
      setTxDetails({});
      setErrorMsg("");
      return;
    }
    const timer = setTimeout(() => {
      setCooldownRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownActive, cooldownRemaining]);

  const submitSignedXdr = async (submission: MintSubmission) => {
    setStatus("submitting");
    const result: ApiEnvelope<SubmitSongMintResponse> =
      await submitMutation.mutateAsync(submission);
    const txHash = result?.data?.txHash;
    if (!txHash) throw new Error("The submit response did not include a transaction hash.");
    pendingSubmission.current = null;
    setTxDetails({ txHash, tokenId: result.data.tokenId });
    transaction.track(txHash, { tokenId: result.data.tokenId });
    setStatus("pending");
  };

  const handleMint = async () => {
    if (
      !address ||
      !canSubmit ||
      !transaction.isReady ||
      transaction.record?.status === "pending" ||
      submitLock.current
    )
      return;
    const available = await isFreighterAvailable();
    if (!available) {
      setFreighterFailure("missing");
      return;
    }

    setStatus("preparing");
    setErrorMsg("");
    setFreighterFailure(null);
    setFreighterFailureMessage("");
    setTxDetails({});
    analytics.mintStarted({ songId, walletAddress: address });

    submitLock.current = true;
    transaction.clear();
    try {
      const available = await isFreighterAvailable();
      if (!available) {
        setStatus("not_installed");
        return;
      }

      setStatus("preparing");
      setErrorMsg("");
      setTxDetails({});
      analytics.mintStarted({ songId, walletAddress: address });

      if (pendingSubmission.current) {
        await submitSignedXdr(pendingSubmission.current);
        return;
      }

      const prepared = await prepareMutation.mutateAsync({ albumId });

      if (
        freighterCheck.status === "mismatch" ||
        freighterCheck.actual !== prepared.data.networkPassphrase
      ) {
        setStatus("failed");
        setErrorMsg(
          `Freighter network mismatch. Expected ${prepared.data.networkPassphrase === "Test SDF Network ; September 2015" ? "Testnet" : "Mainnet"}.`
        );
      if (freighterCheck.status === "mismatch" ||
        (freighterCheck.actual !== null && freighterCheck.actual !== prepared.data.networkPassphrase)) {
        setStatus("failed");
        setFreighterFailure("wrong-network");
        setFreighterFailureMessage(
          `Freighter is on ${freighterCheck.actual || "a different network"}; switch it to ${prepared.data.networkPassphrase === "Test SDF Network ; September 2015" ? "Testnet" : "Mainnet"} to continue.`
        );
        return;
      }
      if (freighterCheck.status === "locked" || freighterCheck.status === "missing") {
        setStatus("failed");
        setFreighterFailure(freighterCheck.status);
        return;
      }

      setStatus("idle");
      const approved = await requestReview({
        action: "Mint song NFT",
        amount: "1 song NFT (no XLM transfer)",
        recipient: address,
        contract: "AudioBlocks Catalog contract",
        fee: `${gasEstimate} (estimated)`,
      });
      if (!approved) return;

      setStatus("awaiting_signature");
      let signedXdr: string;
      try {
        signedXdr = await signTransactionXdr(
          prepared.data.xdr,
          prepared.data.networkPassphrase,
          address
        );
      } catch (signErr: unknown) {
        // A declined signature is a normal outcome, not a failure — see
        // app/src/utils/ERROR_RECOVERY.md.
        const recoveryState = classifyFreighterError(signErr);
        if (recoveryState !== "other") {
          setStatus(recoveryState === "rejected" ? "rejected" : "failed");
          setFreighterFailure(recoveryState);
          setFreighterFailureMessage((signErr as Error).message);
          analytics.mintFailed({ songId, reason: (signErr as Error).message });
          return;
        }
        throw signErr;
      }

      const submission: MintSubmission = {
        signedXdr,
        idempotencyKey: crypto.randomUUID(),
      };
      pendingSubmission.current = submission;
      await submitSignedXdr(submission);
    } catch (err: unknown) {
      const recoveryState = classifyFreighterError(err);
      if (recoveryState !== "other") {
        setFreighterFailure(recoveryState);
        setFreighterFailureMessage((err as Error).message);
        setStatus(recoveryState === "rejected" ? "rejected" : "failed");
        analytics.mintFailed({ songId, reason: (err as Error).message });
        return;
      }
      const plan = classifyError(err);
      analytics.mintFailed({ songId, reason: plan.message });

      if (plan.userRejected) {
        setStatus("rejected");
        return;
      }
      setStatus(plan.retryable ? "timeout" : "failed");
      setErrorMsg(plan.message);
      if (!plan.retryable) pendingSubmission.current = null;
    } finally {
      submitLock.current = false;
    }
  };

  if (!address) {
    return <ConnectStellarWalletButton />;
  }

  if (freighterFailure && freighterFailure !== "other") {
    return (
      <FreighterRecoveryNotice
        state={freighterFailure}
        message={freighterFailureMessage || undefined}
        onRetry={handleMint}
      />
    );
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
          <span className="text-xs text-blue-400 font-medium">Preparing transaction...</span>
        </div>
        <EstimatedFeeNotice {...fee} />
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
        <EstimatedFeeNotice {...fee} />
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
        <EstimatedFeeNotice {...fee} />
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-blue-600/30 rounded-lg">
        <p role="status" aria-live="polite" className="text-xs text-blue-400 font-medium">
          Confirming on Stellar...
        </p>
        {txDetails.txHash && (
          <a
            href={explorerTxUrl(txDetails.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-400 font-mono truncate underline w-fit"
          >
            View transaction
          </a>
        )}
        {transaction.error && (
          <p role="alert" className="text-[10px] text-yellow-400">
            Status check will retry automatically: {transaction.error}
          </p>
        )}
        <EstimatedFeeNotice {...fee} />
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
          className="text-center rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs"
        >
          Install Freighter
        </a>
      </div>
    );
  }

  if (isNetworkMismatch) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-yellow-600/30 rounded-lg">
        <p className="text-xs text-yellow-500 font-medium">
          Freighter is on{" "}
          {freighterCheck.actual === "Test SDF Network ; September 2015" ? "Testnet" : "Mainnet"};
          switch it to{" "}
          {freighterCheck.expected === "Test SDF Network ; September 2015" ? "Testnet" : "Mainnet"}{" "}
          to continue.
        </p>
      </div>
      <FreighterRecoveryNotice
        state="wrong-network"
        message={`Freighter is on ${freighterCheck.actual === "Test SDF Network ; September 2015" ? "Testnet" : "Mainnet"}; switch it to ${freighterCheck.expected === "Test SDF Network ; September 2015" ? "Testnet" : "Mainnet"}, then retry.`}
        onRetry={handleMint}
      />
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
          onClick={handleMint}
          disabled={!canSubmit}
          className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs"
        >
          Retry Signing
        </button>
        <EstimatedFeeNotice {...fee} />
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
          onClick={handleMint}
          disabled={!canSubmit}
          className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs"
        >
          Retry Submission
        </button>
        <EstimatedFeeNotice {...fee} />
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
          <p className="text-xs text-red-500 font-medium">Mint failed: {errorMsg}</p>
        </div>
        <button
          onClick={handleMint}
          disabled={!canSubmit}
          className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs"
        >
          Retry Minting
        </button>
        <EstimatedFeeNotice {...fee} />
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
          <p className="text-xs text-green-400 font-medium">Minted successfully!</p>
        </div>
        {txDetails.txHash && (
          <a
            href={explorerTxUrl(txDetails.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-400 font-mono truncate underline hover:text-gray-300 w-fit"
          >
            Tx: {txDetails.txHash}
          </a>
        )}
        {txDetails.tokenId && (
          <p className="text-[10px] text-gray-400">Token ID: {txDetails.tokenId}</p>
        )}
        {cooldownActive && (
          <p className="text-[10px] text-gray-400">
            Cooldown: {cooldownRemaining}s — new mint available shortly
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleMint}
        disabled={isBusy || !canSubmit}
        className={`${isBusy || !canSubmit ? "opacity-70 cursor-not-allowed" : ""} rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-4 py-2 transition-colors text-sm`}
      >
        Mint on-chain
      </button>
      <EstimatedFeeNotice {...fee} />
      <p className="text-[10px] text-gray-500">Est. gas: {gasEstimate}</p>
      {reviewDialog}
    </div>
  );
}
