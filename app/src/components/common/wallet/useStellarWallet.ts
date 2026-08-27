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
    } catch (error: unknown) {
      const err = error as Error;
      handleError(err.message || "Failed to connect Freighter wallet.");
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [connectWalletMutation, handleSuccess, handleError]);

  /**
   * Clears this app's active wallet session.
   *
   * Freighter's extension API has no page-level "revoke" call — the
   * browser extension itself is what remembers this origin is authorized,
   * and only the user can revoke that from within the extension. This
   * matches the disconnect UX of other browser-wallet dApps (e.g.
   * MetaMask): "disconnect" ends the app's session so the UI reverts to
   * "Connect" and `signAndSubmit` requires reconnecting, without pretending
   * to revoke the extension-side grant it has no API to touch (#296).
   */
  const disconnect = useCallback(() => {
    setAddress(null);
    handleSuccess("Stellar wallet disconnected.");
  }, [handleSuccess]);

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

  return { address, isConnecting, connect, restore, disconnect, signAndSubmit };
}
