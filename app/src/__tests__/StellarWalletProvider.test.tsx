import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient, clearQueryCache } from "@/api/queryClientInstance";
import {
  StellarWalletProvider,
  useStellarWalletContext,
} from "@/components/common/wallet/StellarWalletProvider";

const mocks = vi.hoisted(() => ({
  onAddressChange: null as null | ((address: string | null) => void),
  syncWallet: vi.fn(),
  persistWallet: vi.fn().mockResolvedValue(undefined),
  signTransactionXdr: vi.fn().mockResolvedValue("signed-xdr"),
  submit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/freighter", () => ({
  connectFreighter: vi.fn(),
  getFreighterAddress: vi.fn(),
  signTransactionXdr: mocks.signTransactionXdr,
  watchFreighterWalletChanges: (onAddressChange: (address: string | null) => void) => {
    mocks.onAddressChange = onAddressChange;
    return vi.fn();
  },
}));

vi.mock("@/services/onchainService", () => ({
  default: () => ({
    useConnectWallet: () => ({
      mutate: mocks.syncWallet,
      mutateAsync: mocks.persistWallet,
    }),
  }),
}));

vi.mock("@/hooks/useToastHandler", () => ({
  useHandleError: () => vi.fn(),
  useHandleSuccess: () => vi.fn(),
}));

function WalletState() {
  const { address, disconnect, signAndSubmit } = useStellarWalletContext();
  const [signError, setSignError] = useState("");

  return (
    <>
      <output data-testid="wallet-one">{address ?? "disconnected"}</output>
      <WalletStateObserver />
      <button onClick={disconnect}>Disconnect</button>
      <button
        onClick={() =>
          void signAndSubmit(
            { xdr: "prepared-xdr", networkPassphrase: "test-network" },
            mocks.submit
          ).catch((error: Error) => setSignError(error.message))
        }
      >
        Sign transaction
      </button>
      <output data-testid="sign-error">{signError}</output>
    </>
  );
}

function WalletStateObserver() {
  const { address } = useStellarWalletContext();
  return <output data-testid="wallet-two">{address ?? "disconnected"}</output>;
}

function renderWalletProvider() {
  return render(
    <QueryClientProvider client={queryClient}>
      <StellarWalletProvider>
        <WalletState />
      </StellarWalletProvider>
    </QueryClientProvider>
  );
}

describe("StellarWalletProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onAddressChange = null;
    clearQueryCache();
  });

  it("shares the active account and clears cached data when the wallet switches accounts", () => {
    renderWalletProvider();

    act(() => mocks.onAddressChange?.("GAccountOne"));
    expect(screen.getByTestId("wallet-one")).toHaveTextContent("GAccountOne");
    expect(screen.getByTestId("wallet-two")).toHaveTextContent("GAccountOne");

    queryClient.setQueryData(["private-dashboard"], { balance: 42 });
    act(() => mocks.onAddressChange?.("GAccountOne"));
    expect(queryClient.getQueryData(["private-dashboard"])).toEqual({ balance: 42 });
    act(() => mocks.onAddressChange?.("GAccountTwo"));

    expect(screen.getByTestId("wallet-one")).toHaveTextContent("GAccountTwo");
    expect(screen.getByTestId("wallet-two")).toHaveTextContent("GAccountTwo");
    expect(queryClient.getQueryData(["private-dashboard"])).toBeUndefined();
    expect(mocks.syncWallet).toHaveBeenCalledWith({ stellarPublicKey: "GAccountTwo" });
  });

  it("ends the wallet session and clears cached data when disconnected", () => {
    renderWalletProvider();
    act(() => mocks.onAddressChange?.("GAccountOne"));
    queryClient.setQueryData(["private-dashboard"], { balance: 42 });

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(screen.getByTestId("wallet-one")).toHaveTextContent("disconnected");
    expect(screen.getByTestId("wallet-two")).toHaveTextContent("disconnected");
    expect(queryClient.getQueryData(["private-dashboard"])).toBeUndefined();
  });

  it("clears the wallet session and cached data when Freighter disconnects", () => {
    renderWalletProvider();
    act(() => mocks.onAddressChange?.("GAccountOne"));
    queryClient.setQueryData(["private-dashboard"], { balance: 42 });

    act(() => mocks.onAddressChange?.(null));

    expect(screen.getByTestId("wallet-one")).toHaveTextContent("disconnected");
    expect(queryClient.getQueryData(["private-dashboard"])).toBeUndefined();
  });

  it("does not submit a signature after the active account changes mid-signing", async () => {
    renderWalletProvider();
    act(() => mocks.onAddressChange?.("GAccountOne"));
    mocks.signTransactionXdr.mockImplementationOnce(async () => {
      mocks.onAddressChange?.("GAccountTwo");
      return "signed-xdr";
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign transaction" }));

    await waitFor(() =>
      expect(screen.getByTestId("sign-error")).toHaveTextContent(
        "The connected wallet changed while signing."
      )
    );
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
