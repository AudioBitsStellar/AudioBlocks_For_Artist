import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OverviewCards from "@/components/OverviewCards";

// Stub lib modules that hit the network or use Next.js features
vi.mock("@/lib/featureFlags", () => ({
  featureFlags: { useMockOverviewCards: true },
}));

vi.mock("@/lib/mockData", () => ({
  MOCK_OVERVIEW_CARDS: [
    { title: "Total Streams", value: "12,340", isFirst: true },
    { title: "Monthly Listeners", value: "3,210", isFirst: false },
    { title: "Revenue", value: "$540", isFirst: false },
    { title: "New Fans", value: "87", isFirst: false },
  ],
}));

vi.mock("@/components/MockDataBadge", () => ({
  default: ({ label }: { label: string }) => (
    <span data-testid="mock-badge">{label}</span>
  ),
}));

describe("OverviewCards", () => {
  it("renders the Overview heading", () => {
    render(<OverviewCards />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("renders all card titles", () => {
    render(<OverviewCards />);
    expect(screen.getByText("Total Streams")).toBeInTheDocument();
    expect(screen.getByText("Monthly Listeners")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("New Fans")).toBeInTheDocument();
  });

  it("renders all card values", () => {
    render(<OverviewCards />);
    expect(screen.getByText("12,340")).toBeInTheDocument();
    expect(screen.getByText("3,210")).toBeInTheDocument();
    expect(screen.getByText("$540")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("renders the mock data badge when useMockOverviewCards is true", () => {
    render(<OverviewCards />);
    expect(screen.getByTestId("mock-badge")).toBeInTheDocument();
  });
});
