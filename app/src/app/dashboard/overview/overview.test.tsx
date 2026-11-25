import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OverviewCards from "@/components/OverviewCards";

// Stub lib modules that hit the network or use Next.js features
vi.mock("@/lib/featureFlags", () => ({
  featureFlags: { useMockOverviewCards: true },
}));

vi.mock("@/__mocks__/overview", () => ({
  MOCK_OVERVIEW_DATA: {
    songsPublished: 87,
    totalPlays: 25400,
    listenersCount: 12340,
    saves: 3200,
    followersCount: 890,
    earningsXlm: "540",
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
    expect(screen.getByText("Total Plays")).toBeInTheDocument();
    expect(screen.getByText("Unique Listeners")).toBeInTheDocument();
    expect(screen.getByText("Saves")).toBeInTheDocument();
    expect(screen.getByText("Followers")).toBeInTheDocument();
    expect(screen.getByText("Royalty Revenue")).toBeInTheDocument();
  });

  it("renders all card values through the same formatting as the live API", async () => {
    render(<OverviewCards />);
    expect(await screen.findByText("87")).toBeInTheDocument();
    expect(screen.getByText("25,400")).toBeInTheDocument();
    expect(screen.getByText("12,340")).toBeInTheDocument();
    expect(screen.getByText("3,200")).toBeInTheDocument();
    expect(screen.getByText("890")).toBeInTheDocument();
    expect(screen.getByText("540 XLM")).toBeInTheDocument();
  });

  it("renders the mock data badge when useMockOverviewCards is true", async () => {
    render(<OverviewCards />);
    expect(await screen.findByTestId("mock-badge")).toBeInTheDocument();
  });
});
