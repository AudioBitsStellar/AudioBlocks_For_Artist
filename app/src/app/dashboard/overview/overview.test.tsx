import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OverviewCards from "@/components/OverviewCards";

// Stub lib modules that hit the network or use Next.js features
vi.mock("@/lib/featureFlags", () => ({
  featureFlags: { useMockOverviewCards: true },
}));

vi.mock("@/__mocks__/overview", () => ({
  MOCK_OVERVIEW_KPI: {
    songsPublished: 87,
    totalEarnings: 540,
    listenersCount: 12340,
    mostStreamedRegion: "Ghana",
  },
}));

vi.mock("@/components/MockDataBadge", () => ({
  default: ({ label }: { label: string }) => <span data-testid="mock-badge">{label}</span>,
}));

describe("OverviewCards", () => {
  it("renders the Overview heading", async () => {
    render(<OverviewCards />);
    await screen.findByText("Songs Published");
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("shows the loading skeleton while the mock fixtures load", () => {
    render(<OverviewCards />);
    expect(screen.getByRole("status", { name: "Loading overview" })).toBeInTheDocument();
  });

  it("renders all card titles", async () => {
    render(<OverviewCards />);
    expect(await screen.findByText("Songs Published")).toBeInTheDocument();
    expect(screen.getByText("Total Earnings")).toBeInTheDocument();
    expect(screen.getByText("Listeners Count")).toBeInTheDocument();
    expect(screen.getByText("Most Streamed Region")).toBeInTheDocument();
  });

  it("renders all card values through the same formatting as the live API", async () => {
    render(<OverviewCards />);
    expect(await screen.findByText("87")).toBeInTheDocument();
    expect(screen.getByText("$540.00")).toBeInTheDocument();
    expect(screen.getByText("12,340")).toBeInTheDocument();
    expect(screen.getByText("Ghana")).toBeInTheDocument();
  });

  it("renders the mock data badge when useMockOverviewCards is true", async () => {
    render(<OverviewCards />);
    expect(await screen.findByTestId("mock-badge")).toBeInTheDocument();
  });
});
