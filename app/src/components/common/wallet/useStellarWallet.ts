import { useCallback, useState } from "react";
import { connectFreighter, getFreighterAddress, signTransactionXdr } from "@/lib/freighter";
import { classifyFreighterError, type FreighterRecoveryState } from "@/lib/freighter";
import useOnchainServices from "@/services/onchainService";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import {
  useTransactionSignReview,
  type TransactionSignSummary,
} from "./TransactionSignReview";
import { validateStellarPublicKey } from "@/utils/stellarAddress";

export function useStellarWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionFailure, setConnectionFailure] = useState<FreighterRecoveryState | null>(null);
  const [connectionFailureMessage, setConnectionFailureMessage] = useState("");
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();
  const { requestReview, reviewDialog } = useTransactionSignReview();

  const { useConnectWallet } = useOnchainServices();
  const connectWalletMutation = useConnectWallet();

  const restore = useCallback(async () => {
    const existing = await getFreighterAddress();
    if (!existing) return null;
    const check = validateStellarPublicKey(existing);
    if (!check.valid) return null;
    setAddress(check.normalized);
    return check.normalized;
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setConnectionFailure(null);
    setConnectionFailureMessage("");
    try {
      const rawKey = await connectFreighter();
      const check = validateStellarPublicKey(rawKey);
      if (!check.valid) {
        throw new Error(check.error);
      }
      const stellarPublicKey = check.normalized;
      await connectWalletMutation.mutateAsync({ stellarPublicKey });
      setAddress(stellarPublicKey);
      handleSuccess("Stellar wallet connected!");
      return stellarPublicKey;
    } catch (error: unknown) {
      const err = error as Error;
      const recoveryState = classifyFreighterError(error);
      if (recoveryState !== "other") {
        setConnectionFailure(recoveryState);
        setConnectionFailureMessage(err.message);
      }
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
      submit: (vars: { signedXdr: string }) => Promise<unknown>,
      summary: TransactionSignSummary
    ) => {
      if (!address) throw new Error("Connect a Stellar wallet first.");
      const approved = await requestReview(summary);
      if (!approved) throw new Error("Transaction review cancelled; no signature was requested.");
      const signedXdr = await signTransactionXdr(prepared.xdr, prepared.networkPassphrase, address);
      return submit({ signedXdr });
    },
    [address, requestReview]
  );

  return {
    address,
    isConnecting,
    connect,
    restore,
    disconnect,
    signAndSubmit,
    connectionFailure,
    connectionFailureMessage,
  };
}
