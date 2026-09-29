import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PayoutWalletStep from "@/components/onboarding/PayoutWalletStep";
import { useStellarWallet } from "@/components/common/wallet/useStellarWallet";

vi.mock("@/components/common/wallet/useStellarWallet", () => ({
  useStellarWallet: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseStellarWallet = vi.mocked(useStellarWallet);

describe("PayoutWalletStep", () => {
  const mockOnComplete = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the payout wallet setup form", () => {
    mockUseStellarWallet.mockReturnValue({
      address: null,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });

    render(<PayoutWalletStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    expect(screen.getByRole("heading", { name: /payout wallet setup/i })).toBeInTheDocument();
    expect(screen.getByText(/why stellar\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect freighter wallet/i })).toBeInTheDocument();
  });

  it("shows connected wallet address when wallet is connected", () => {
    const testAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";
    mockUseStellarWallet.mockReturnValue({
      address: testAddress,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });

    render(<PayoutWalletStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    expect(screen.getByText(testAddress)).toBeInTheDocument();
    expect(screen.getByText(/connected wallet/i)).toBeInTheDocument();
  });

  it("calls connect when connect button is clicked", async () => {
    const mockConnect = vi.fn();
    mockUseStellarWallet.mockReturnValue({
      address: null,
      isConnecting: false,
      connect: mockConnect,
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });

    render(<PayoutWalletStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    const connectButton = screen.getByRole("button", { name: /connect freighter wallet/i });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  it("requires terms agreement checkbox to be checked", async () => {
    const testAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";
    mockUseStellarWallet.mockReturnValue({
      address: testAddress,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });

    render(<PayoutWalletStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    const submitButton = screen.getByRole("button", { name: /complete setup/i });
    expect(submitButton).toBeDisabled();

    const termsCheckbox = screen.getByRole("checkbox");
    fireEvent.click(termsCheckbox);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("calls onBack when back button is clicked", () => {
    mockUseStellarWallet.mockReturnValue({
      address: null,
      isConnecting: false,
      connect: vi.fn(),
      restore: vi.fn(),
      disconnect: vi.fn(),
      signAndSubmit: vi.fn(),
    });

    render(<PayoutWalletStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
});
