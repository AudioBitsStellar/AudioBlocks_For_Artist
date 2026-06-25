"use client";

import { useState } from "react";
import { useStellarWallet } from "./useStellarWallet";
import useOnchainServices from "@/services/onchainService";
import ConnectStellarWalletButton from "./ConnectStellarWalletButton";
import { analytics } from "@/lib/analytics";

/**
 * One-time action: mints the artist's on-chain profile NFT via the
 * `artist` Soroban contract. Requires a connected Stellar wallet and an
 * IPFS CID for the artist's profile metadata.
 */
export default function SetupArtistOnChainProfile() {
  const [cid, setCid] = useState("");
  const { address, signAndSubmit } = useStellarWallet();
  const { usePrepareArtistSetup, useSubmitArtistSetup } = useOnchainServices();
  const prepareMutation = usePrepareArtistSetup();
  const submitMutation = useSubmitArtistSetup();

  const isBusy = prepareMutation.isPending || submitMutation.isPending;

  const handleSetup = async () => {
    if (!cid.trim() || !address) return;
    analytics.mintStarted({ songId: 'artist-profile', walletAddress: address });
    try {
      const prepared = await prepareMutation.mutateAsync({ cid: cid.trim() });
      const result: any = await signAndSubmit(prepared.data, (vars) =>
        submitMutation.mutateAsync(vars)
      );
      analytics.mintSucceeded({
        songId: 'artist-profile',
        txHash: result?.data?.txHash ?? '',
        tokenId: result?.data?.tokenId ?? '',
      });
    } catch (err: any) {
      analytics.mintFailed({ songId: 'artist-profile', reason: err?.message ?? 'unknown' });
      throw err;
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

      {address && (
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
            {isBusy ? "Setting up..." : "Set up on-chain profile"}
          </button>
        </div>
      )}
    </div>
  );
}
