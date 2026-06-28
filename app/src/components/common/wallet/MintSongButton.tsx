"use client";

import { useStellarWallet } from "./useStellarWallet";
import useOnchainServices from "@/services/onchainService";
import ConnectStellarWalletButton from "./ConnectStellarWalletButton";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { isRetryableError } from "@/utils/errorRecovery";
import { isFreighterAvailable, signTransactionXdr } from "@/lib/freighter";
import { useState } from "react";

interface MintSongButtonProps {
  songId: string;
  albumId?: number;
}

type MintStatus = 'idle' | 'not_installed' | 'preparing' | 'awaiting_signature' | 'submitting' | 'success' | 'rejected' | 'timeout' | 'failed';

export default function MintSongButton({ songId, albumId = 0 }: MintSongButtonProps) {
  const { address } = useStellarWallet();
  const { usePrepareSongMint, useSubmitSongMint } = useOnchainServices();
  const prepareMutation = usePrepareSongMint(songId);
  const submitMutation = useSubmitSongMint(songId);

  const [status, setStatus] = useState<MintStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isBusy = prepareMutation.isPending || submitMutation.isPending || ['preparing', 'awaiting_signature', 'submitting'].includes(status);

  const handleMint = async () => {
    if (!address) return;
    
    const available = await isFreighterAvailable();
    if (!available) {
      setStatus('not_installed');
      return;
    }

    setStatus('preparing');
    setErrorMsg('');
    analytics.mintStarted({ songId, walletAddress: address });

    try {
      const prepared = await prepareMutation.mutateAsync({ albumId });
      
      setStatus('awaiting_signature');
      let signedXdr: string;
      try {
        signedXdr = await signTransactionXdr(prepared.data.xdr, prepared.data.networkPassphrase, address);
      } catch (signErr: any) {
        if (signErr?.message?.toLowerCase().includes("rejected") || signErr?.message?.toLowerCase().includes("user rejected")) {
          setStatus('rejected');
          analytics.mintFailed({ songId, reason: "user rejected signature" });
          return;
        }
        throw signErr;
      }

      setStatus('submitting');
      const result: any = await submitMutation.mutateAsync({ signedXdr });

      setStatus('success');
      analytics.mintSucceeded({
        songId,
        txHash: result?.data?.txHash ?? '',
        tokenId: result?.data?.tokenId ?? '',
      });
      toast.success("Minting succeeded!");
    } catch (err: any) {
      const reason = err?.message ?? "unknown";
      analytics.mintFailed({ songId, reason });
      
      if (reason.toLowerCase().includes("timeout") || reason.toLowerCase().includes("network")) {
        setStatus('timeout');
      } else {
        setStatus('failed');
      }
      setErrorMsg(reason);
    }
  };

  if (!address) {
    return <ConnectStellarWalletButton />;
  }

  if (status === 'not_installed') {
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

  if (status === 'rejected') {
    return (
      <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg">
        <p className="text-xs text-red-500 font-medium">Signature rejected by user.</p>
        <button
          onClick={handleMint}
          className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs"
        >
          Retry Signing
        </button>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg">
        <p className="text-xs text-red-500 font-medium">Request timed out or network error.</p>
        <button
          onClick={handleMint}
          className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs"
        >
          Retry Submission
        </button>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg">
        <p className="text-xs text-red-500 font-medium truncate">Mint failed: {errorMsg}</p>
        <button
          onClick={handleMint}
          className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs"
        >
          Retry Minting
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg bg-green-950/20 border border-green-600/30 text-green-400 font-medium px-4 py-2 text-xs">
        Minted successfully!
      </div>
    );
  }

  return (
    <button
      onClick={handleMint}
      disabled={isBusy}
      className={`${isBusy ? "opacity-70 cursor-not-allowed" : ""} rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-4 py-2 transition-colors text-sm`}
    >
      {status === 'preparing' && "Preparing Mint..."}
      {status === 'awaiting_signature' && "Awaiting Signature..."}
      {status === 'submitting' && "Submitting On-chain..."}
      {status === 'idle' && "Mint on-chain"}
    </button>
  );
}
