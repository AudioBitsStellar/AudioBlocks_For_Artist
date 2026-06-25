"use client";

import { useStellarWallet } from "./useStellarWallet";
import useOnchainServices from "@/services/onchainService";
import ConnectStellarWalletButton from "./ConnectStellarWalletButton";
import { analytics } from "@/lib/analytics";

interface MintSongButtonProps {
  songId: string;
  albumId?: number;
}

/**
 * Mints a song's NFT via the `catalog` Soroban contract. The song must
 * already have processed (transcoded + pinned to IPFS) on the backend —
 * if it hasn't, the prepare step will fail with a clear error from the
 * backend ("Song has no metadata CID yet").
 */
export default function MintSongButton({ songId, albumId = 0 }: MintSongButtonProps) {
  const { address, signAndSubmit } = useStellarWallet();
  const { usePrepareSongMint, useSubmitSongMint } = useOnchainServices();
  const prepareMutation = usePrepareSongMint(songId);
  const submitMutation = useSubmitSongMint(songId);

  const isBusy = prepareMutation.isPending || submitMutation.isPending;

  const handleMint = async () => {
    if (!address) return;
    analytics.mintStarted({ songId, walletAddress: address });
    try {
      const prepared = await prepareMutation.mutateAsync({ albumId });
      const result: any = await signAndSubmit(prepared.data, (vars) =>
        submitMutation.mutateAsync(vars)
      );
      analytics.mintSucceeded({
        songId,
        txHash: result?.data?.txHash ?? '',
        tokenId: result?.data?.tokenId ?? '',
      });
    } catch (err: any) {
      analytics.mintFailed({ songId, reason: err?.message ?? 'unknown' });
      throw err;
    }
  };

  if (!address) {
    return <ConnectStellarWalletButton />;
  }

  return (
    <button
      onClick={handleMint}
      disabled={isBusy}
      className={`${isBusy ? "opacity-70 cursor-not-allowed" : ""} rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-4 py-2 transition-colors text-sm`}
    >
      {isBusy ? "Minting..." : "Mint on-chain"}
    </button>
  );
}
