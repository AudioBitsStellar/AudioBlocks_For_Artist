import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AnalyticsPlayTrends from "@/components/AnalyticsPlayTrends";
import type { AnalyticsData } from "@/services/analyticsService";

// next/dynamic can't resolve lazy imports synchronously in tests: render each
// dynamic component as a stub that exposes the props the dashboard passes.
vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicStub(props: { period?: string; onPeriodChange?: (p: string) => void }) {
      if (props.onPeriodChange) {
        return (
          <div data-testid="play-trends-stub" data-period={props.period}>
            <button type="button" onClick={() => props.onPeriodChange?.("last90days")}>
              stub 90 Days
            </button>
          </div>
        );
      }
      return <div data-testid="dynamic-stub" />;
    },
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

const useGetAnalyticsData = vi.fn();
vi.mock("@/services/analyticsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/analyticsService")>();
  return { ...actual, default: () => ({ useGetAnalyticsData }) };
});

function analytics(overrides: Partial<AnalyticsData> = {}): AnalyticsData {
  return {
    summary: {
      totalPlays: 1000,
      uniqueListeners: 620,
      engagementRate: 8.7,
      growthPercentage: 18.4,
    },
    playTrends: [{ date: "2026-09-01", plays: 10 }],
    geographicDistribution: [],
    period: "last30days",
    ...overrides,
  };
}

function mockQuery(
  data: AnalyticsData | undefined,
  state: { isLoading?: boolean; isError?: boolean } = {}
) {
  useGetAnalyticsData.mockReturnValue({
    data: data ? { success: true, data } : undefined,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
    refetch: vi.fn(),
  });
}

beforeEach(() => useGetAnalyticsData.mockReset());

describe("AnalyticsDashboard (#401)", () => {
  it("fetches the last 30 days by default", () => {
    mockQuery(analytics());
    render(<AnalyticsDashboard />);
    expect(useGetAnalyticsData).toHaveBeenCalledWith("last30days");
    expect(screen.getByTestId("play-trends-stub")).toHaveAttribute("data-period", "last30days");
  });

  it("refetches the 90-day window when the period toggle changes", () => {
    mockQuery(analytics());
    render(<AnalyticsDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "stub 90 Days" }));

    expect(useGetAnalyticsData).toHaveBeenLastCalledWith("last90days");
    expect(screen.getByTestId("play-trends-stub")).toHaveAttribute("data-period", "last90days");
  });

  it("shows API-provided insights", () => {
    mockQuery(
      analytics({
        insights: {
          peakListeningHours: "9 PM and midnight",
          topPerformingTrackPlays: 4321,
          topPerformingTrackGrowthPercentage: 12.5,
          listenerRetentionPercentage: 64.2,
        },
      })
    );
    render(<AnalyticsDashboard />);

    expect(screen.getByText(/9 PM and midnight/)).toBeInTheDocument();
    expect(screen.getByText(/4,321 plays/)).toBeInTheDocument();
    expect(screen.getByText(/64\.2% of listeners/)).toBeInTheDocument();
    expect(screen.queryByTestId("insights-pending")).not.toBeInTheDocument();
  });

  it("does not fabricate insights when the API provides none", () => {
    mockQuery(analytics({ insights: undefined }));
    render(<AnalyticsDashboard />);

    expect(screen.getByTestId("insights-pending")).toBeInTheDocument();
    // The old fallback invented these figures and presented them as real.
    expect(screen.queryByText(/7 PM and 11 PM/)).not.toBeInTheDocument();
    expect(screen.queryByText(/of listeners return/)).not.toBeInTheDocument();
  });

  it("labels the top-tracks leaderboard as sample data", () => {
    mockQuery(analytics());
    render(<AnalyticsDashboard />);
    expect(screen.getByTestId("top-tracks-sample-notice")).toHaveTextContent(/sample data/i);
  });

  it("renders loading, error and empty states", () => {
    mockQuery(undefined, { isLoading: true });
    const { unmount } = render(<AnalyticsDashboard />);
    expect(screen.getByRole("status", { name: "Loading analytics" })).toBeInTheDocument();
    unmount();

    mockQuery(undefined, { isError: true });
    const errorView = render(<AnalyticsDashboard />);
    expect(screen.getByText("Unable to load analytics")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    errorView.unmount();

    mockQuery(undefined);
    render(<AnalyticsDashboard />);
    expect(screen.getByText("No analytics data available yet.")).toBeInTheDocument();
  });
});

describe("AnalyticsPlayTrends period toggle (#401)", () => {
  const data = Array.from({ length: 90 }, (_, i) => ({ date: `d${i}`, plays: i }));
  const PlayTrends = AnalyticsPlayTrends as ComponentType<
    Parameters<typeof AnalyticsPlayTrends>[0]
  >;

  it("is controlled by the parent when onPeriodChange is given", () => {
    const onPeriodChange = vi.fn();
    render(<PlayTrends data={data} period="last30days" onPeriodChange={onPeriodChange} />);

    fireEvent.click(screen.getByRole("button", { name: "View last 90 days" }));

    expect(onPeriodChange).toHaveBeenCalledWith("last90days");
    // Still reflects the parent's period until the parent updates it.
    expect(screen.getByRole("button", { name: "View last 30 days" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("keeps its local toggle behaviour when uncontrolled", () => {
    render(<PlayTrends data={data} period="last30days" />);

    fireEvent.click(screen.getByRole("button", { name: "View last 90 days" }));

    expect(screen.getByRole("button", { name: "View last 90 days" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
