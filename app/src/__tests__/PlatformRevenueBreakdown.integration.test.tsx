import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn().mockResolvedValue({ get: mockGet }),
}));

import PlatformRevenueBreakdown from "@/components/PlatformRevenueBreakdown";

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeClient()}>{children}</QueryClientProvider>;
}

const MOCK_PLATFORM_RESPONSE = {
  data: {
    success: true,
    data: {
      totalRevenue: 11000,
      platforms: [
        { platform: "AudioBlocks", revenue: 5000, percentage: 45.5, streams: 120000 },
        { platform: "Spotify", revenue: 3000, percentage: 27.3, streams: 85000 },
        { platform: "Apple Music", revenue: 2000, percentage: 18.2, streams: 50000 },
        { platform: "YouTube Music", revenue: 1000, percentage: 9.0, streams: 30000 },
      ],
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlatformRevenueBreakdown integration", () => {
  it("renders the loading skeleton while fetching", () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    render(<PlatformRevenueBreakdown />, { wrapper: Wrapper });

    expect(document.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders platform revenue data after a successful fetch", async () => {
    mockGet.mockResolvedValue(MOCK_PLATFORM_RESPONSE);

    render(<PlatformRevenueBreakdown />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/11,000/)).toBeInTheDocument();
    });

    expect(screen.getByText("Revenue by Platform")).toBeInTheDocument();
    expect(screen.getByText(/across 4 platforms/i)).toBeInTheDocument();
    expect(screen.getByText("AudioBlocks")).toBeInTheDocument();
    expect(screen.getByText("Spotify")).toBeInTheDocument();
    expect(screen.getByText("Apple Music")).toBeInTheDocument();
    expect(screen.getByText("YouTube Music")).toBeInTheDocument();
  });

  it("renders the data table with revenue, share, and streams columns", async () => {
    mockGet.mockResolvedValue(MOCK_PLATFORM_RESPONSE);

    render(<PlatformRevenueBreakdown />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/11,000/)).toBeInTheDocument();
    });

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Streams")).toBeInTheDocument();
    expect(screen.getByText("45.5%")).toBeInTheDocument();
    expect(screen.getByText("120,000")).toBeInTheDocument();
  });

  it("renders an error message when the fetch fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    render(<PlatformRevenueBreakdown />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/failed to load platform revenue/i)).toBeInTheDocument();
    });
  });

  it("renders empty state when the API returns no platforms", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: { totalRevenue: 0, platforms: [] },
      },
    });

    render(<PlatformRevenueBreakdown />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/no platform revenue data yet/i)).toBeInTheDocument();
    });
  });

  it("shows singular 'platform' text for a single platform", async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          totalRevenue: 5000,
          platforms: [
            { platform: "AudioBlocks", revenue: 5000, percentage: 100, streams: 120000 },
          ],
        },
      },
    });

    render(<PlatformRevenueBreakdown />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/across 1 platform$/i)).toBeInTheDocument();
    });
  });
});
