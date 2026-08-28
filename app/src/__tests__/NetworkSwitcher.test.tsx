import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NetworkSwitcher from "@/components/common/wallet/NetworkSwitcher";
import { useStellarNetwork } from "@/context/StellarNetworkContext";
import { getFreighterNetworkDetails } from "@/lib/freighter";

vi.mock("@/context/StellarNetworkContext", () => ({
  useStellarNetwork: vi.fn(),
}));

vi.mock("@/lib/freighter", () => ({
  getFreighterNetworkDetails: vi.fn(),
}));

const mockUseStellarNetwork = vi.mocked(useStellarNetwork);
const mockGetFreighterNetworkDetails = vi.mocked(getFreighterNetworkDetails);

const TESTNET = {
  id: "testnet" as const,
  label: "Testnet",
  horizonUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
};

const MAINNET = {
  id: "mainnet" as const,
  label: "Mainnet",
  horizonUrl: "https://horizon.stellar.org",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
};

describe("NetworkSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFreighterNetworkDetails.mockResolvedValue(null);
  });

  it("renders both network options with the active one checked", () => {
    mockUseStellarNetwork.mockReturnValue({
      networkId: "testnet",
      network: TESTNET,
      setNetworkId: vi.fn(),
    });

    render(<NetworkSwitcher />);

    expect(screen.getByRole("radio", { name: "Testnet" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("radio", { name: "Mainnet" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("calls setNetworkId when a different network is selected", () => {
    const setNetworkId = vi.fn();
    mockUseStellarNetwork.mockReturnValue({
      networkId: "testnet",
      network: TESTNET,
      setNetworkId,
    });

    render(<NetworkSwitcher />);
    fireEvent.click(screen.getByRole("radio", { name: "Mainnet" }));

    expect(setNetworkId).toHaveBeenCalledWith("mainnet");
  });

  it("shows no mismatch warning when Freighter isn't connected", async () => {
    mockUseStellarNetwork.mockReturnValue({
      networkId: "testnet",
      network: TESTNET,
      setNetworkId: vi.fn(),
    });
    mockGetFreighterNetworkDetails.mockResolvedValue(null);

    render(<NetworkSwitcher />);

    await waitFor(() => expect(mockGetFreighterNetworkDetails).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a mismatch warning when Freighter is on a different network", async () => {
    mockUseStellarNetwork.mockReturnValue({
      networkId: "testnet",
      network: TESTNET,
      setNetworkId: vi.fn(),
    });
    mockGetFreighterNetworkDetails.mockResolvedValue({
      network: "PUBLIC",
      networkPassphrase: MAINNET.networkPassphrase,
    });

    render(<NetworkSwitcher />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/different network/i)).toBeInTheDocument();
    });
  });

  it("shows no mismatch warning when Freighter matches the selected network", async () => {
    mockUseStellarNetwork.mockReturnValue({
      networkId: "testnet",
      network: TESTNET,
      setNetworkId: vi.fn(),
    });
    mockGetFreighterNetworkDetails.mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: TESTNET.networkPassphrase,
    });

    render(<NetworkSwitcher />);

    await waitFor(() => expect(mockGetFreighterNetworkDetails).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
