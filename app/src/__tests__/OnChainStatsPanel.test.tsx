import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { OnChainActivitySummary } from "@/services/onchainStatsService";

const ADDRESS = "GCONNECTEDACCOUNT1234567890ABCDEFGHIJKLMNOPQRSTUVWXY";

const statsState = vi.hoisted(() => ({
  current: {
    summary: null as unknown as OnChainActivitySummary | null,
    address: null as string | null,
    isLoading: false,
    error: null as string | null,
    isMock: false,
    refresh: vi.fn(),
  },
}));

// Keeps the panel's own import graph (Freighter, react-query) out of the test.
vi.mock("@/components/common/wallet/useStellarWallet", () => ({
  useStellarWallet: () => ({ address: null }),
}));

vi.mock("@/services/onchainStatsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/onchainStatsService")>();
  return { ...actual, useOnChainStats: () => statsState.current };
});

import { OnChainStatsPanel } from "@/components/OnChainStatsPanel";

function summaryFixture(overrides: Partial<OnChainActivitySummary> = {}): OnChainActivitySummary {
  return {
    address: ADDRESS,
    network: "testnet",
    xlmBalance: "11984.5000000",
    transactionCount: 5,
    failedTransactionCount: 1,
    operationCount: 4,
    operationsByType: { payment: 2, invoke_host_function: 1, create_claimable_balance: 1 },
    assets: [
      { code: "sUSDC", balance: "1842.2500000" },
      { code: "ABX", balance: "37.0000000" },
    ],
    firstActivityAt: "2026-09-20T11:00:00Z",
    lastActivityAt: "2026-09-26T18:04:00Z",
    activeDays: ["2026-09-20", "2026-09-21", "2026-09-26"],
    ...overrides,
  };
}

describe("OnChainStatsPanel", () => {
  beforeEach(() => {
    statsState.current = {
      summary: summaryFixture(),
      address: ADDRESS,
      isLoading: false,
      error: null,
      isMock: false,
      refresh: vi.fn(),
    };
  });

  it("shows the connected account's headline numbers", () => {
    render(<OnChainStatsPanel />);

    expect(screen.getByText("Connected account")).toBeInTheDocument();
    // Once on the KPI card, once as the native line of the assets table.
    expect(screen.getAllByText("11,984.5")).toHaveLength(2);
    expect(screen.getByText("1 failed")).toBeInTheDocument();
    expect(screen.getByText("2 other assets")).toBeInTheDocument();
  });

  it("breaks operations down by type with their share of history", () => {
    render(<OnChainStatsPanel />);

    expect(screen.getByText("Payment")).toBeInTheDocument();
    expect(screen.getByText("Invoke host function")).toBeInTheDocument();
    expect(screen.getByText("Create claimable balance")).toBeInTheDocument();
    expect(screen.getByText("2 · 50%")).toBeInTheDocument();
    expect(screen.getAllByText("1 · 25%")).toHaveLength(2);
  });

  it("lists the native balance alongside every trustline held", () => {
    render(<OnChainStatsPanel />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("XLM (native)")).toBeInTheDocument();
    expect(screen.getByText("sUSDC")).toBeInTheDocument();
    expect(screen.getByText("1,842.25")).toBeInTheDocument();
    expect(screen.getByText("37")).toBeInTheDocument();
  });

  it("links the artist out to their account on the explorer", () => {
    render(<OnChainStatsPanel />);

    const link = screen.getByRole("link", { name: /stellar\.expert/i });
    expect(link.getAttribute("href")).toContain(ADDRESS);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("explains itself to a signed-out artist instead of implying it is their account", () => {
    statsState.current.address = null;
    statsState.current.isMock = true;

    render(<OnChainStatsPanel />);

    expect(screen.getByText("Sample account")).toBeInTheDocument();
    expect(screen.getByText(/Connect a wallet to see your own activity/i)).toBeInTheDocument();
    expect(screen.queryByText("Connected account")).not.toBeInTheDocument();
  });

  it("renders a loading state rather than an empty dashboard", () => {
    statsState.current.summary = null;
    statsState.current.isLoading = true;

    render(<OnChainStatsPanel />);

    expect(screen.getByRole("status")).toHaveTextContent(/Horizon/i);
    expect(screen.queryByText("XLM balance")).not.toBeInTheDocument();
  });

  it("surfaces a Horizon failure with a working retry", () => {
    statsState.current.summary = null;
    statsState.current.error = "Horizon returned 503 fetching account";

    render(<OnChainStatsPanel />);

    expect(screen.getByRole("alert")).toHaveTextContent(/503/);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(statsState.current.refresh).toHaveBeenCalled();
  });

  it("says so when a freshly funded account has no operations yet", () => {
    statsState.current.summary = summaryFixture({
      operationsByType: {},
      operationCount: 0,
      transactionCount: 0,
      failedTransactionCount: 0,
      assets: [],
      xlmBalance: "0",
      firstActivityAt: null,
      lastActivityAt: null,
      activeDays: [],
    });

    render(<OnChainStatsPanel />);

    expect(screen.getByText("No operations on this account yet.")).toBeInTheDocument();
    expect(screen.getByText(/Last activity —/i)).toBeInTheDocument();
    expect(screen.getByText("None failed")).toBeInTheDocument();
  });

  it("keeps the refresh button disabled while a re-read is in flight", () => {
    statsState.current.isLoading = true;

    render(<OnChainStatsPanel />);

    expect(screen.getByRole("button", { name: /refresh on-chain stats/i })).toBeDisabled();
  });
});
