/**
 * Tests for the Freighter transfer-song flow (#291), mirroring the
 * prepare → sign → submit coverage in mintSongFlow.test.tsx but using
 * static top-level mocks (vi.mock + vi.mocked().mockReturnValue) instead of
 * per-test vi.doMock + dynamic import, since the dynamic-import approach
 * shares one cached module instance across tests in the same file.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TransferSongButton from "@/components/common/wallet/TransferSongButton";
import { useStellarWallet } from "@/components/common/wallet/useStellarWallet";
import useOnchainServices from "@/services/onchainService";
import { isFreighterAvailable, signTransactionXdr } from "@/lib/freighter";

vi.mock("@/components/common/wallet/useStellarWallet", () => ({
  useStellarWallet: vi.fn(),
}));

vi.mock("@/services/onchainService", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/freighter", () => ({
  isFreighterAvailable: vi.fn(),
  signTransactionXdr: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  analytics: {
    mintStarted: vi.fn(),
    mintSucceeded: vi.fn(),
    mintFailed: vi.fn(),
  },
}));

vi.mock("@/hooks/useEstimatedFee", () => ({
  useEstimatedFee: () => ({ estimate: "~0.0000500 XLM", isLoading: false }),
}));

const mockUseStellarWallet = vi.mocked(useStellarWallet);
const mockUseOnchainServices = vi.mocked(useOnchainServices);
const mockIsFreighterAvailable = vi.mocked(isFreighterAvailable);
const mockSignTransactionXdr = vi.mocked(signTransactionXdr);

const MOCK_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const RECIPIENT = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const MOCK_XDR = "AAAAAQAAA...";
const MOCK_NETWORK = "Test SDF Network ; September 2015";
const MOCK_TX_HASH = "abc123";

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>;
}

describe("TransferSongButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFreighterAvailable.mockResolvedValue(true);
    mockSignTransactionXdr.mockResolvedValue("SIGNED_XDR_MOCK");
  });

  function setupServices(overrides?: {
    prepareMutateAsync?: ReturnType<typeof vi.fn>;
    submitMutateAsync?: ReturnType<typeof vi.fn>;
  }) {
    const prepareMutateAsync = overrides?.prepareMutateAsync ?? vi.fn();
    const submitMutateAsync = overrides?.submitMutateAsync ?? vi.fn();

    mockUseOnchainServices.mockReturnValue({
      useConnectWallet: () => ({ mutateAsync: vi.fn(), isPending: false }) as never,
      usePrepareArtistSetup: () => ({ mutateAsync: vi.fn(), isPending: false }) as never,
      useSubmitArtistSetup: () => ({ mutateAsync: vi.fn(), isPending: false }) as never,
      usePrepareSongMint: () => ({ mutateAsync: vi.fn(), isPending: false }) as never,
      useSubmitSongMint: () => ({ mutateAsync: vi.fn(), isPending: false }) as never,
      usePrepareSongTransfer: () => ({ mutateAsync: prepareMutateAsync, isPending: false }) as never,
      useSubmitSongTransfer: () => ({ mutateAsync: submitMutateAsync, isPending: false }) as never,
    });

    return { prepareMutateAsync, submitMutateAsync };
  }

  it("shows ConnectStellarWalletButton when no wallet is connected", () => {
    mockUseStellarWallet.mockReturnValue({
      address: null,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });
    setupServices();

    render(<TransferSongButton songId="song-1" />, { wrapper: Wrapper });

    expect(screen.queryByRole("button", { name: /transfer song/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: /connect stellar wallet/i })
    ).toBeInTheDocument();
  });

  it("disables the transfer button until a valid recipient address is entered", () => {
    mockUseStellarWallet.mockReturnValue({
      address: MOCK_ADDRESS,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });
    setupServices();

    render(<TransferSongButton songId="song-1" />, { wrapper: Wrapper });

    const button = screen.getByRole("button", { name: /transfer song/i });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/recipient/i), {
      target: { value: "not-a-valid-address" },
    });
    expect(button).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/valid stellar address/i);

    fireEvent.change(screen.getByPlaceholderText(/recipient/i), {
      target: { value: RECIPIENT },
    });
    expect(button).not.toBeDisabled();
  });

  it("blocks transferring a song to your own connected wallet", () => {
    mockUseStellarWallet.mockReturnValue({
      address: MOCK_ADDRESS,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });
    setupServices();

    render(<TransferSongButton songId="song-1" />, { wrapper: Wrapper });

    fireEvent.change(screen.getByPlaceholderText(/recipient/i), {
      target: { value: MOCK_ADDRESS },
    });

    expect(screen.getByRole("button", { name: /transfer song/i })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/own wallet/i);
  });

  it("runs the prepare → sign → submit sequence and shows the tx hash on success", async () => {
    mockUseStellarWallet.mockReturnValue({
      address: MOCK_ADDRESS,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });
    const prepareMutateAsync = vi.fn().mockResolvedValue({
      success: true,
      data: { xdr: MOCK_XDR, networkPassphrase: MOCK_NETWORK },
    });
    const submitMutateAsync = vi.fn().mockResolvedValue({
      success: true,
      data: { txHash: MOCK_TX_HASH, songId: "song-1", toAddress: RECIPIENT },
    });
    setupServices({ prepareMutateAsync, submitMutateAsync });

    render(<TransferSongButton songId="song-1" />, { wrapper: Wrapper });

    fireEvent.change(screen.getByPlaceholderText(/recipient/i), {
      target: { value: RECIPIENT },
    });
    fireEvent.click(screen.getByRole("button", { name: /transfer song/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText(/transferred successfully/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(MOCK_TX_HASH))).toBeInTheDocument();
    });

    expect(prepareMutateAsync).toHaveBeenCalledWith({ toAddress: RECIPIENT });
    expect(mockSignTransactionXdr).toHaveBeenCalledWith(MOCK_XDR, MOCK_NETWORK, MOCK_ADDRESS);
    expect(submitMutateAsync).toHaveBeenCalledWith({ signedXdr: "SIGNED_XDR_MOCK" });
  });

  it("shows a rejected state when Freighter rejects signing", async () => {
    mockUseStellarWallet.mockReturnValue({
      address: MOCK_ADDRESS,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });
    mockSignTransactionXdr.mockRejectedValueOnce(new Error("User rejected the signing request."));
    const prepareMutateAsync = vi.fn().mockResolvedValue({
      success: true,
      data: { xdr: MOCK_XDR, networkPassphrase: MOCK_NETWORK },
    });
    setupServices({ prepareMutateAsync });

    render(<TransferSongButton songId="song-1" />, { wrapper: Wrapper });

    fireEvent.change(screen.getByPlaceholderText(/recipient/i), {
      target: { value: RECIPIENT },
    });
    fireEvent.click(screen.getByRole("button", { name: /transfer song/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/signature rejected/i)).toBeInTheDocument();
    });
  });

  it("shows an error state with the reason when the prepare step fails", async () => {
    mockUseStellarWallet.mockReturnValue({
      address: MOCK_ADDRESS,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });
    const prepareMutateAsync = vi.fn().mockRejectedValue(new Error("Song is not minted yet"));
    setupServices({ prepareMutateAsync });

    render(<TransferSongButton songId="song-1" />, { wrapper: Wrapper });

    fireEvent.change(screen.getByPlaceholderText(/recipient/i), {
      target: { value: RECIPIENT },
    });
    fireEvent.click(screen.getByRole("button", { name: /transfer song/i }));

    await waitFor(() => {
      expect(screen.getByText(/transfer failed/i)).toBeInTheDocument();
      expect(screen.getByText(/song is not minted yet/i)).toBeInTheDocument();
    });
  });
});
