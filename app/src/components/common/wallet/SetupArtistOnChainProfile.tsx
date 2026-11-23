"use client";

import { useState, useEffect, useRef } from "react";
import { useStellarWallet } from "./useStellarWallet";
import useOnchainServices from "@/services/onchainService";
import ConnectStellarWalletButton from "./ConnectStellarWalletButton";
import { analytics } from "@/lib/analytics";
import { isFreighterAvailable, signTransactionXdr } from "@/lib/freighter";
import { explorerTxUrl } from "@/lib/horizon";
import { classifyError, isUserRejection } from "@/utils/errorRecovery";
import { toast } from "sonner";
import { ApiEnvelope, SubmitArtistSetupResponse } from "@/types/api";
import { useEstimatedFee } from "@/hooks/useEstimatedFee";
import EstimatedFeeNotice from "./EstimatedFeeNotice";
import { useTransactionStatus } from "@/hooks/useTransactionStatus";
import { transactionStorageKey } from "@/lib/transactionStatus";
import { getActiveNetworkId } from "@/lib/stellarNetwork";

type SetupStatus =
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

const COOLDOWN_DURATION = 5;

interface SetupSubmission {
  signedXdr: string;
  idempotencyKey: string;
}

export default function SetupArtistOnChainProfile() {
  const [cid, setCid] = useState("");
  const { address } = useStellarWallet();
  const { usePrepareArtistSetup, useSubmitArtistSetup } = useOnchainServices();
  const prepareMutation = usePrepareArtistSetup();
  const submitMutation = useSubmitArtistSetup();
  const fee = useEstimatedFee();
  const canSubmit = !fee.isLoading && !fee.error && fee.estimate !== null;
  const transaction = useTransactionStatus(
    transactionStorageKey("artist-setup", `${getActiveNetworkId()}:${address ?? "unknown"}`)
  );

  const [status, setStatus] = useState<SetupStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(COOLDOWN_DURATION);
  const submitLock = useRef(false);
  const pendingSubmission = useRef<SetupSubmission | null>(null);

  const isBusy =
    prepareMutation.isPending ||
    submitMutation.isPending ||
    ["preparing", "awaiting_signature", "submitting"].includes(status) ||
    status === "pending" ||
    !transaction.isReady ||
    cooldownActive;

  useEffect(() => {
    const tracked = transaction.record;
    if (!transaction.isReady || !tracked) return;
    setTxHash(tracked.txHash);
    if (tracked.status === "pending") setStatus("pending");
    if (tracked.status === "confirmed") {
      if (status === "pending") {
        analytics.mintSucceeded({
          songId: "artist-profile",
          txHash: tracked.txHash,
          tokenId: tracked.tokenId ?? "",
        });
        toast.success("Profile setup succeeded on-chain!");
        setCooldownActive(true);
        setCooldownRemaining(COOLDOWN_DURATION);
      }
      setStatus("success");
    }
    if (tracked.status === "failed") {
      setErrorMsg("The transaction failed on Stellar.");
      setStatus("failed");
    }
  }, [status, transaction.isReady, transaction.record]);

  useEffect(() => {
    if (!cooldownActive) return;
    if (cooldownRemaining <= 0) {
      setCooldownActive(false);
      setStatus("idle");
      setTxHash("");
      setErrorMsg("");
      return;
    }
    const timer = setTimeout(() => {
      setCooldownRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownActive, cooldownRemaining]);

  const submitSignedXdr = async (submission: SetupSubmission) => {
    setStatus("submitting");
    const result: ApiEnvelope<SubmitArtistSetupResponse> =
      await submitMutation.mutateAsync(submission);
    const hash = result?.data?.txHash;
    if (!hash) throw new Error("The submit response did not include a transaction hash.");
    pendingSubmission.current = null;
    transaction.track(hash, { tokenId: result.data.tokenId });
    setStatus("pending");
  };

  const handleSetup = async () => {
    if (
      !cid.trim() ||
      !address ||
      !canSubmit ||
      !transaction.isReady ||
      transaction.record?.status === "pending" ||
      submitLock.current
    )
      return;

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
      analytics.mintStarted({ songId: "artist-profile", walletAddress: address });

      if (pendingSubmission.current) {
        await submitSignedXdr(pendingSubmission.current);
        return;
      }

      const prepared = await prepareMutation.mutateAsync({ cid: cid.trim() });

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
        if (isUserRejection(signErr)) {
          setStatus("rejected");
          analytics.mintFailed({ songId: "artist-profile", reason: "user rejected signature" });
          return;
        }
        throw signErr;
      }

      const submission: SetupSubmission = {
        signedXdr,
        idempotencyKey: crypto.randomUUID(),
      };
      pendingSubmission.current = submission;
      await submitSignedXdr(submission);
    } catch (err: unknown) {
      const plan = classifyError(err);
      analytics.mintFailed({ songId: "artist-profile", reason: plan.message });

      if (plan.userRejected) {
        setStatus("rejected");
        return;
      }
      // Retryable transport failures get the "timeout" surface (a plain retry
      // button); anything terminal gets "failed" with the message.
      setStatus(plan.retryable ? "timeout" : "failed");
      setErrorMsg(plan.message);
      if (!plan.retryable) pendingSubmission.current = null;
    } finally {
      submitLock.current = false;
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-[#2A2A2A] bg-[#161616] p-6">
      <div>
        <h3 className="text-white font-semibold mb-1">On-chain artist profile</h3>
        <p className="text-sm text-[#A3A3A3]">
          Connect your Stellar wallet and mint your artist profile on-chain. You&apos;ll be asked to
          sign the transaction in Freighter — the platform never holds your wallet key.
        </p>
      </div>

      <ConnectStellarWalletButton />

      {["preparing", "awaiting_signature", "submitting"].includes(status) && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-1 p-3 bg-zinc-900 border border-[#2A2A2A] rounded-lg"
        >
          <p className="text-xs text-[#A3A3A3] font-medium">
            {status === "preparing" && "Preparing the profile transaction..."}
            {status === "awaiting_signature" &&
              "Waiting for you to sign the transaction in Freighter..."}
            {status === "submitting" && "Submitting the transaction to Stellar..."}
          </p>
        </div>
      )}

      {status === "pending" && (
        <div className="flex flex-col gap-2 rounded-lg border border-blue-600/30 bg-zinc-900 p-3">
          <p role="status" aria-live="polite" className="text-xs font-medium text-blue-400">
            Confirming on Stellar...
          </p>
          {txHash && (
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit text-xs text-blue-400 underline"
            >
              View transaction
            </a>
          )}
          {transaction.error && (
            <p role="alert" className="text-xs text-yellow-400">
              Status check will retry automatically: {transaction.error}
            </p>
          )}
          <EstimatedFeeNotice {...fee} />
        </div>
      )}

      {status === "not_installed" && (
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
      )}

      {status === "rejected" && (
        <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg">
          <p className="text-xs text-red-500 font-medium">Signature rejected by user.</p>
          <button
            onClick={handleSetup}
            disabled={!canSubmit}
            className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs w-fit disabled:cursor-not-allowed disabled:opacity-60"
          >
            Retry Signing
          </button>
          <EstimatedFeeNotice {...fee} />
        </div>
      )}

      {status === "timeout" && (
        <div
          role="alert"
          className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg"
        >
          <p className="text-xs text-red-500 font-medium">Request timed out or network error.</p>
          {errorMsg && <p className="text-xs text-red-400 wrap-break-word">{errorMsg}</p>}
          <button
            onClick={handleSetup}
            disabled={!canSubmit}
            className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs w-fit disabled:cursor-not-allowed disabled:opacity-60"
          >
            Retry Submission
          </button>
          <EstimatedFeeNotice {...fee} />
        </div>
      )}

      {status === "failed" && (
        <div
          role="alert"
          className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg"
        >
          <p className="text-xs text-red-500 font-medium">Setup failed: {errorMsg}</p>
          <button
            onClick={handleSetup}
            disabled={!canSubmit}
            className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs w-fit disabled:cursor-not-allowed disabled:opacity-60"
          >
            Retry Setup
          </button>
          <EstimatedFeeNotice {...fee} />
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col gap-2 p-3 bg-green-950/20 border border-green-600/30 rounded-lg">
          <p className="text-xs text-green-400 font-medium">
            Profile setup completed on-chain successfully!
          </p>
          {txHash && (
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-400 underline hover:text-green-300 w-fit"
            >
              View transaction
            </a>
          )}
          {cooldownActive && (
            <p className="text-[10px] text-gray-400">
              Cooldown: {cooldownRemaining}s — new setup available shortly
            </p>
          )}
        </div>
      )}

      {address && status !== "success" && status !== "pending" && (
        <div className="flex flex-col gap-3">
          <input
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            placeholder="Profile metadata IPFS CID"
            className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
            style={{ background: "#FFFFFF0A", border: "none" }}
          />
          <button
            onClick={handleSetup}
            disabled={isBusy || !cid.trim() || !canSubmit}
            className={`${isBusy || !cid.trim() || !canSubmit ? "opacity-70 cursor-not-allowed" : ""} w-fit rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-2 transition-colors text-sm`}
          >
            {status === "preparing" && "Preparing..."}
            {status === "awaiting_signature" && "Awaiting Signature..."}
            {status === "submitting" && "Setting up Profile..."}
            {status === "idle" && "Set up on-chain profile"}
          </button>
          <EstimatedFeeNotice {...fee} />
        </div>
      )}
    </div>
  );
}

export { SetupArtistOnChainProfile };
