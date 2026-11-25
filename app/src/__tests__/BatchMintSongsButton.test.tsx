import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BatchMintSongsButton from "@/components/common/wallet/BatchMintSongsButton";

const mocks = vi.hoisted(() => ({
  useStellarWallet: vi.fn(),
  useOnchainServices: vi.fn(),
  isFreighterAvailable: vi.fn(),
  signTransactionXdr: vi.fn(),
  prepareSongMint: vi.fn(),
  submitSongMint: vi.fn(),
}));

vi.mock("@/components/common/wallet/useStellarWallet", () => ({
  useStellarWallet: mocks.useStellarWallet,
}));

vi.mock("@/services/onchainService", () => ({
  default: mocks.useOnchainServices,
}));

vi.mock("@/lib/freighter", () => ({
  isFreighterAvailable: mocks.isFreighterAvailable,
  signTransactionXdr: mocks.signTransactionXdr,
}));

vi.mock("@/hooks/useEstimatedFee", () => ({
  useEstimatedFee: () => ({ estimate: "~0.0000500 XLM", isLoading: false }),
}));

describe("BatchMintSongsButton transaction review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useStellarWallet.mockReturnValue({ address: "GARTISTADDRESS" });
    mocks.isFreighterAvailable.mockResolvedValue(true);
    mocks.signTransactionXdr.mockResolvedValue("SIGNED_XDR");
    mocks.prepareSongMint.mockResolvedValue({
      data: { xdr: "TRANSACTION_XDR", networkPassphrase: "Test SDF Network ; September 2015" },
    });
    mocks.submitSongMint.mockResolvedValue({ data: { txHash: "HASH" } });
    mocks.useOnchainServices.mockReturnValue({
      usePrepareSongMint: () => ({ mutateAsync: mocks.prepareSongMint }),
      useSubmitSongMint: () => ({ mutateAsync: mocks.submitSongMint }),
    });
  });

  it("reviews each mint before signing and submits after confirmation", async () => {
    render(<BatchMintSongsButton songIds={["song-1"]} />);

    fireEvent.click(screen.getByRole("button", { name: /batch mint 1 song/i }));

    const review = await screen.findByRole("dialog", { name: /review transaction/i });
    expect(review).toHaveTextContent("Mint song NFT");
    expect(review).toHaveTextContent("song NFT");
    expect(review).toHaveTextContent("GARTISTADDRESS");
    expect(review).toHaveTextContent("AudioBlocks Catalog contract");
    expect(mocks.signTransactionXdr).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /continue to freighter/i }));

    await waitFor(() =>
      expect(mocks.submitSongMint).toHaveBeenCalledWith({ signedXdr: "SIGNED_XDR" })
    );
  });

  it("does not sign or submit a mint cancelled in the review", async () => {
    render(<BatchMintSongsButton songIds={["song-1"]} />);

    fireEvent.click(screen.getByRole("button", { name: /batch mint 1 song/i }));
    await screen.findByRole("dialog", { name: /review transaction/i });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mocks.signTransactionXdr).not.toHaveBeenCalled();
    expect(mocks.submitSongMint).not.toHaveBeenCalled();
    expect(await screen.findByText(/cancelled:/i)).toBeInTheDocument();
  });
});
