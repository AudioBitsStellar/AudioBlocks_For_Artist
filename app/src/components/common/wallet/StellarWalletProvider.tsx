"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clearQueryCache } from "@/api/queryClientInstance";
import {
  connectFreighter,
  getFreighterAddress,
  signTransactionXdr,
  watchFreighterWalletChanges,
} from "@/lib/freighter";
import useOnchainServices from "@/services/onchainService";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";

interface StellarWalletContextValue {
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<string>;
  restore: () => Promise<string | null>;
  disconnect: () => void;
  signAndSubmit: (
    prepared: { xdr: string; networkPassphrase: string },
    submit: (vars: { signedXdr: string }) => Promise<unknown>
  ) => Promise<unknown>;
}

const StellarWalletContext = createContext<StellarWalletContextValue | null>(null);

export function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const addressRef = useRef<string | null>(null);
  const addressRevisionRef = useRef(0);
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();
  const { useConnectWallet } = useOnchainServices();
  const { mutate: syncWallet, mutateAsync: persistWallet } = useConnectWallet();

  const updateAddress = useCallback(
    (nextAddress: string | null, syncChangedAccount = false) => {
      const previousAddress = addressRef.current;
      if (previousAddress === nextAddress) return;

      addressRef.current = nextAddress;
      addressRevisionRef.current += 1;
      clearQueryCache();
      setAddress(nextAddress);

      if (syncChangedAccount && previousAddress && nextAddress) {
        syncWallet({ stellarPublicKey: nextAddress });
      }
    },
    [syncWallet]
  );

  useEffect(
    () => watchFreighterWalletChanges((nextAddress) => updateAddress(nextAddress, true)),
    [updateAddress]
  );

  const restore = useCallback(async () => {
    const revision = addressRevisionRef.current;
    const existing = await getFreighterAddress();
    if (revision === addressRevisionRef.current) {
      updateAddress(existing);
    }
    return existing;
  }, [updateAddress]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const stellarPublicKey = await connectFreighter();
      await persistWallet({ stellarPublicKey });
      updateAddress(stellarPublicKey);
      handleSuccess("Stellar wallet connected!");
      return stellarPublicKey;
    } catch (error: unknown) {
      const err = error as Error;
      handleError(err.message || "Failed to connect Freighter wallet.");
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [persistWallet, handleSuccess, handleError, updateAddress]);

  const disconnect = useCallback(() => {
    updateAddress(null);
    handleSuccess("Stellar wallet disconnected.");
  }, [handleSuccess, updateAddress]);

  const signAndSubmit = useCallback(
    async (
      prepared: { xdr: string; networkPassphrase: string },
      submit: (vars: { signedXdr: string }) => Promise<unknown>
    ) => {
      if (!address) throw new Error("Connect a Stellar wallet first.");
      const signedXdr = await signTransactionXdr(prepared.xdr, prepared.networkPassphrase, address);
      if (addressRef.current !== address) {
        throw new Error("The connected wallet changed while signing. Reconnect and try again.");
      }
      return submit({ signedXdr });
    },
    [address]
  );

  return (
    <StellarWalletContext.Provider
      value={{ address, isConnecting, connect, restore, disconnect, signAndSubmit }}
    >
      {children}
    </StellarWalletContext.Provider>
  );
}

export function useStellarWalletContext(): StellarWalletContextValue {
  const context = useContext(StellarWalletContext);
  if (!context) {
    throw new Error("useStellarWallet must be used within StellarWalletProvider");
  }
  return context;
}
