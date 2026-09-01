import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import OverviewPage from "@/app/dashboard/overview/page";

// Mock the components used in the overview page
vi.mock("@/components/GreetingHeader", () => ({
  default: () => <div data-testid="greeting-header">Greeting Header</div>,
}));

vi.mock("@/components/OverviewMetrics", () => ({
  default: () => <div data-testid="overview-metrics">Overview Metrics</div>,
}));

vi.mock("@/components/EarningsRoyalties", () => ({
  default: () => <div data-testid="earnings-royalties">Earnings Royalties</div>,
}));

vi.mock("@/components/PlatformRevenueBreakdown", () => ({
  default: () => <div data-testid="platform-revenue">Platform Revenue</div>,
}));

vi.mock("@/components/TopMusic", () => ({
  default: () => <div data-testid="top-music">Top Music</div>,
}));

vi.mock("@/components/RecentPayouts", () => ({
  default: () => <div data-testid="recent-payouts">Recent Payouts</div>,
}));

describe("Overview Page Integration", () => {
  it("renders the critical components in the overview dashboard page", async () => {
    render(<OverviewPage />);
    
    // Verify that all critical components are in the document
    await waitFor(() => {
      expect(screen.getByTestId("greeting-header")).toBeInTheDocument();
      expect(screen.getByTestId("overview-metrics")).toBeInTheDocument();
      expect(screen.getByTestId("earnings-royalties")).toBeInTheDocument();
      expect(screen.getByTestId("platform-revenue")).toBeInTheDocument();
      expect(screen.getByTestId("top-music")).toBeInTheDocument();
      expect(screen.getByTestId("recent-payouts")).toBeInTheDocument();
    });
  });
});
