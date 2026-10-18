import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OverviewCards from "@/components/OverviewCards";
const mocks = vi.hoisted(() => ({ kpi: vi.fn(), activity: vi.fn() }));
vi.mock("@/lib/featureFlags", () => ({ featureFlags: { useMockOverviewCards: false } }));
vi.mock("@/services/overviewService", () => ({
  default: () => ({ useGetOverviewKpi: mocks.kpi, useGetRecentActivity: mocks.activity }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.kpi.mockReturnValue({
    data: {
      data: {
        songsPublished: 3,
        totalPlays: 100,
        listenersCount: 70,
        saves: 8,
        followersCount: null,
        earningsXlm: "12.345",
      },
    },
    isLoading: false,
    isError: false,
  });
  mocks.activity.mockReturnValue({
    data: { data: [{ id: "1", actionType: "song_upload", createdAt: "2026-10-18T00:00:00Z" }] },
    isLoading: false,
    isError: false,
  });
});
describe("overview live statistics", () => {
  it("shows real stats, XLM royalty revenue and artist activity", () => {
    render(<OverviewCards />);
    expect(screen.getByText("12.345 XLM")).toBeInTheDocument();
    expect(screen.getByText("Unique Listeners")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("song upload")).toBeInTheDocument();
    expect(screen.queryByText("Most Streamed Region")).not.toBeInTheDocument();
  });
  it("passes the date window to stats and activity", () => {
    render(<OverviewCards />);
    fireEvent.change(screen.getByLabelText("Statistics period"), { target: { value: "90d" } });
    expect(mocks.kpi).toHaveBeenLastCalledWith("90d");
    expect(mocks.activity).toHaveBeenLastCalledWith("90d");
  });
  it("keeps the activity panel available when the stats route fails", () => {
    mocks.kpi.mockReturnValue({ isError: true });
    render(<OverviewCards />);
    expect(screen.getByText(/Artist statistics are unavailable/)).toBeInTheDocument();
    expect(screen.getByText("song upload")).toBeInTheDocument();
    expect(screen.queryByText("12.345 XLM")).not.toBeInTheDocument();
  });
});
