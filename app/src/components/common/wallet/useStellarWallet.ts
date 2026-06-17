import { useCallback, useState } from "react";
import { connectFreighter, getFreighterAddress, signTransactionXdr } from "@/lib/freighter";
import useOnchainServices from "@/services/onchainService";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";

/**
 * Connects Freighter, persists the address on the backend, and exposes a
 * `signAndSubmit` helper that any mint/setup flow can reuse: it takes the
 * `{ xdr, networkPassphrase }` the backend's prepare-* endpoint returns,
 * gets it signed in the Freighter popup, and POSTs the signed XDR to the
 * given submit-* mutation.
 */
export function useStellarWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  const { useConnectWallet } = useOnchainServices();
  const connectWalletMutation = useConnectWallet();

  const restore = useCallback(async () => {
    const existing = await getFreighterAddress();
    if (existing) setAddress(existing);
    return existing;
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const stellarPublicKey = await connectFreighter();
      await connectWalletMutation.mutateAsync({ stellarPublicKey });
      setAddress(stellarPublicKey);
      handleSuccess("Stellar wallet connected!");
      return stellarPublicKey;
    } catch (error: any) {
      handleError(error.message || "Failed to connect Freighter wallet.");
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [connectWalletMutation, handleSuccess, handleError]);

  const signAndSubmit = useCallback(
    async (
      prepared: { xdr: string; networkPassphrase: string },
      submit: (vars: { signedXdr: string }) => Promise<unknown>
    ) => {
      if (!address) throw new Error("Connect a Stellar wallet first.");
      const signedXdr = await signTransactionXdr(prepared.xdr, prepared.networkPassphrase, address);
      return submit({ signedXdr });
    },
    [address]
  );

  return { address, isConnecting, connect, restore, signAndSubmit };
}
