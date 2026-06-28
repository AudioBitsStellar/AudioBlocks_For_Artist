"use client";

import { useState } from "react";
import { useStellarWallet } from "./useStellarWallet";
import useOnchainServices from "@/services/onchainService";
import ConnectStellarWalletButton from "./ConnectStellarWalletButton";
import { analytics } from "@/lib/analytics";
import { isFreighterAvailable, signTransactionXdr } from "@/lib/freighter";
import { toast } from "sonner";

type SetupStatus = 'idle' | 'not_installed' | 'preparing' | 'awaiting_signature' | 'submitting' | 'success' | 'rejected' | 'timeout' | 'failed';

export default function SetupArtistOnChainProfile() {
  const [cid, setCid] = useState("");
  const { address } = useStellarWallet();
  const { usePrepareArtistSetup, useSubmitArtistSetup } = useOnchainServices();
  const prepareMutation = usePrepareArtistSetup();
  const submitMutation = useSubmitArtistSetup();

  const [status, setStatus] = useState<SetupStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isBusy = prepareMutation.isPending || submitMutation.isPending || ['preparing', 'awaiting_signature', 'submitting'].includes(status);

  const handleSetup = async () => {
    if (!cid.trim() || !address) return;
    
    const available = await isFreighterAvailable();
    if (!available) {
      setStatus('not_installed');
      return;
    }

    setStatus('preparing');
    setErrorMsg('');
    analytics.mintStarted({ songId: 'artist-profile', walletAddress: address });

    try {
      const prepared = await prepareMutation.mutateAsync({ cid: cid.trim() });
      
      setStatus('awaiting_signature');
      let signedXdr: string;
      try {
        signedXdr = await signTransactionXdr(prepared.data.xdr, prepared.data.networkPassphrase, address);
      } catch (signErr: any) {
        if (signErr?.message?.toLowerCase().includes("rejected") || signErr?.message?.toLowerCase().includes("user rejected")) {
          setStatus('rejected');
          analytics.mintFailed({ songId: 'artist-profile', reason: "user rejected signature" });
          return;
        }
        throw signErr;
      }

      setStatus('submitting');
      const result: any = await submitMutation.mutateAsync({ signedXdr });

      setStatus('success');
      analytics.mintSucceeded({
        songId: 'artist-profile',
        txHash: result?.data?.txHash ?? '',
        tokenId: result?.data?.tokenId ?? '',
      });
      toast.success("Profile setup succeeded on-chain!");
    } catch (err: any) {
      const reason = err?.message ?? "unknown";
      analytics.mintFailed({ songId: 'artist-profile', reason });
      
      if (reason.toLowerCase().includes("timeout") || reason.toLowerCase().includes("network")) {
        setStatus('timeout');
      } else {
        setStatus('failed');
      }
      setErrorMsg(reason);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-[#2A2A2A] bg-[#161616] p-6">
      <div>
        <h3 className="text-white font-semibold mb-1">On-chain artist profile</h3>
        <p className="text-sm text-[#A3A3A3]">
          Connect your Stellar wallet and mint your artist profile on-chain. You&apos;ll be asked
          to sign the transaction in Freighter — the platform never holds your wallet key.
        </p>
      </div>

      <ConnectStellarWalletButton />

      {status === 'not_installed' && (
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

      {status === 'rejected' && (
        <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg">
          <p className="text-xs text-red-500 font-medium">Signature rejected by user.</p>
          <button
            onClick={handleSetup}
            className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs w-fit"
          >
            Retry Signing
          </button>
        </div>
      )}

      {status === 'timeout' && (
        <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg">
          <p className="text-xs text-red-500 font-medium">Request timed out or network error.</p>
          <button
            onClick={handleSetup}
            className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs w-fit"
          >
            Retry Submission
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-red-600/30 rounded-lg">
          <p className="text-xs text-red-500 font-medium">Setup failed: {errorMsg}</p>
          <button
            onClick={handleSetup}
            className="rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold px-4 py-1.5 transition-colors text-xs w-fit"
          >
            Retry Setup
          </button>
        </div>
      )}

      {status === 'success' && (
        <div className="rounded-lg bg-green-950/20 border border-green-600/30 text-green-400 font-medium px-4 py-2 text-xs w-fit">
          Profile setup completed on-chain successfully!
        </div>
      )}

      {address && status !== 'success' && (
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
            disabled={isBusy || !cid.trim()}
            className={`${isBusy || !cid.trim() ? "opacity-70 cursor-not-allowed" : ""} w-fit rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-2 transition-colors text-sm`}
          >
            {status === 'preparing' && "Preparing..."}
            {status === 'awaiting_signature' && "Awaiting Signature..."}
            {status === 'submitting' && "Setting up Profile..."}
            {status === 'idle' && "Set up on-chain profile"}
          </button>
        </div>
      )}
    </div>
  );
}
