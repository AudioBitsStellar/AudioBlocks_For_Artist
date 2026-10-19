import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ListenerMap from "@/components/ListenerMap";
import PayoutHistory from "@/components/PayoutHistory";
import TopTracksLeaderboard from "@/components/TopTracksLeaderboard";
import WithdrawFunds from "@/components/WithdrawFunds";

vi.mock("@/components/common/wallet/useStellarWallet", () => ({
  useStellarWallet: () => ({
    address: null,
    isConnecting: false,
    connect: vi.fn(),
    restore: vi.fn(),
    disconnect: vi.fn(),
    signAndSubmit: vi.fn(),
  }),
}));

const ADDRESS = "G" + "B".repeat(55);

describe("TopTracksLeaderboard", () => {
  it("renders tracks in rank order", () => {
    render(
      <TopTracksLeaderboard
        tracks={[
          { id: "1", title: "Second", plays: 10 },
          { id: "2", title: "First", plays: 20, previousPlays: 10 },
        ]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0].textContent).toContain("First");
    expect(items[1].textContent).toContain("Second");
    expect(screen.getByLabelText("Up 100.0%")).toBeTruthy();
  });

  it("shows an empty state", () => {
    render(<TopTracksLeaderboard tracks={[]} />);
    expect(screen.getByText("No plays recorded yet.")).toBeTruthy();
  });
});

describe("ListenerMap", () => {
  it("renders a tile per region and an accessible table", () => {
    render(<ListenerMap data={[{ country: "Nigeria", region: "Africa", plays: 50 }]} />);
    expect(screen.getByRole("img", { name: "Listeners by world region" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "Africa" })).toBeTruthy();
    expect(screen.getByTitle("Nigeria").getAttribute("data-intensity")).toBe("4");
  });
});

describe("PayoutHistory", () => {
  it("filters by status and shows the exact total", () => {
    render(
      <PayoutHistory
        payouts={[
          {
            id: "1",
            date: "2026-05-01",
            amount: "10.5",
            source: "royalties",
            status: "completed",
            txHash: "abc",
          },
          { id: "2", date: "2026-05-02", amount: "3", source: "merch", status: "pending" },
        ]}
      />
    );
    expect(screen.getByText("10.5 XLM", { selector: "span" })).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(3);

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "pending" } });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("3 XLM")).toBeTruthy();
  });
});

describe("WithdrawFunds", () => {
  it("renders on-chain payout wallet view with non-custodial explanation", () => {
    render(<WithdrawFunds walletAddress={ADDRESS} availableBalance="100" />);

    expect(screen.getByText("Your payout wallet")).toBeTruthy();
    expect(screen.getByText("Payout Address")).toBeTruthy();
    expect(screen.getByText(/AudioBlocks is strictly/i)).toBeTruthy();
    expect(screen.getByText(/non-custodial/i)).toBeTruthy();
    expect(screen.getByText("Live On-Chain Balances")).toBeTruthy();
    expect(screen.getByText("Move funds using your Stellar wallet")).toBeTruthy();
    expect(screen.getByText("Recent Incoming Royalties")).toBeTruthy();
  });

  it("copies wallet address to clipboard when copy button is clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<WithdrawFunds walletAddress={ADDRESS} />);
    const copyBtn = screen.getByRole("button", { name: /copy wallet address/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(ADDRESS);
    await waitFor(() => expect(screen.getByText("Copied")).toBeTruthy());
  });
});
