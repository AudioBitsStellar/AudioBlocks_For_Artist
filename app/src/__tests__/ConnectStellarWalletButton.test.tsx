import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConnectStellarWalletButton from "@/components/common/wallet/ConnectStellarWalletButton";
import { useStellarWallet } from "@/components/common/wallet/useStellarWallet";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/components/common/wallet/useStellarWallet", () => ({
  useStellarWallet: vi.fn(),
}));

const mockUseStellarWallet = vi.mocked(useStellarWallet);

describe("ConnectStellarWalletButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the connect button when no wallet is connected", () => {
    mockUseStellarWallet.mockReturnValue({
      address: null,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });

    render(<ConnectStellarWalletButton />);

    expect(
      screen.getByRole("button", { name: /connect stellar wallet/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /disconnect/i })).not.toBeInTheDocument();
  });

  it("shows the truncated address and a disconnect button once connected (#296)", () => {
    mockUseStellarWallet.mockReturnValue({
      address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR",
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });

    render(<ConnectStellarWalletButton />);

    expect(screen.getByText(/GABC\.\.\.OPQR/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disconnect stellar wallet/i })).toBeInTheDocument();
  });

  it("calls disconnect() when the disconnect button is clicked", () => {
    const disconnect = vi.fn();
    mockUseStellarWallet.mockReturnValue({
      address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR",
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect,
      signAndSubmit: vi.fn(),
    });

    render(<ConnectStellarWalletButton />);
    fireEvent.click(screen.getByRole("button", { name: /disconnect stellar wallet/i }));

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("calls restore() on mount", () => {
    const restore = vi.fn();
    mockUseStellarWallet.mockReturnValue({
      address: null,
      isConnecting: false,
      connect: vi.fn(),
      restore,
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });

    render(<ConnectStellarWalletButton />);

    expect(restore).toHaveBeenCalledTimes(1);
  });
});
