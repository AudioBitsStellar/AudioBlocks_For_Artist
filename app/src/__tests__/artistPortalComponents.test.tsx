import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ListenerMap from "@/components/ListenerMap";
import PayoutHistory from "@/components/PayoutHistory";
import TopTracksLeaderboard from "@/components/TopTracksLeaderboard";
import WithdrawFunds from "@/components/WithdrawFunds";

const ADDRESS = "G" + "B".repeat(55);

describe("TopTracksLeaderboard", () => {
  it("renders tracks in rank order", () => {
    render(
      <TopTracksLeaderboard
        tracks={[
          { id: "1", title: "Second", plays: 10 },
          { id: "2", title: "First", plays: 20, previousPlays: 10 },
        ]}
      />,
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
          { id: "1", date: "2026-05-01", amount: "10.5", source: "royalties", status: "completed", txHash: "abc" },
          { id: "2", date: "2026-05-02", amount: "3", source: "merch", status: "pending" },
        ]}
      />,
    );
    expect(screen.getByText("10.5 XLM", { selector: "span" })).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(3);

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "pending" } });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("3 XLM")).toBeTruthy();
  });
});

describe("WithdrawFunds", () => {
  it("validates, confirms, and submits a withdrawal", async () => {
    const onWithdraw = vi.fn().mockResolvedValue("tx-123");
    render(<WithdrawFunds availableBalance="100" onWithdraw={onWithdraw} />);

    fireEvent.click(screen.getByRole("button", { name: "Review withdrawal" }));
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(onWithdraw).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Amount (XLM)"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Destination Stellar address"), { target: { value: ADDRESS } });
    fireEvent.click(screen.getByRole("button", { name: "Review withdrawal" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm withdrawal" }));

    await waitFor(() => expect(screen.getByText("Withdrawal submitted.")).toBeTruthy());
    expect(onWithdraw).toHaveBeenCalledWith({ amount: "25", destination: ADDRESS });
    expect(screen.getByText(/tx-123/)).toBeTruthy();
  });

  it("shows a retryable error when the withdrawal fails", async () => {
    const onWithdraw = vi.fn().mockRejectedValue(new Error("Network down"));
    render(<WithdrawFunds availableBalance="100" onWithdraw={onWithdraw} />);

    fireEvent.change(screen.getByLabelText("Amount (XLM)"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Destination Stellar address"), { target: { value: ADDRESS } });
    fireEvent.click(screen.getByRole("button", { name: "Review withdrawal" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm withdrawal" }));

    expect(await screen.findByText("Network down")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("button", { name: "Confirm withdrawal" })).toBeTruthy();
  });
});
