/**
 * The on-chain analytics section (#467) and the rollout gate in front of it
 * (#469): what an artist sees for each failure mode, and the guarantee that an
 * artist outside the rollout never causes a subgraph request.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import AnalyticsOnchainStats from "@/components/AnalyticsOnchainStats";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { getFreighterAddress } from "@/lib/freighter";
import { isSubgraphConfigured, type ArtistOnchainStats } from "@/lib/subgraph";
import useOnchainAnalyticsService, { indexerLagMinutes } from "@/services/onchainAnalyticsService";

vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: vi.fn() }));
vi.mock("@/lib/freighter", () => ({ getFreighterAddress: vi.fn() }));
vi.mock("@/lib/subgraph", () => ({ isSubgraphConfigured: vi.fn() }));
vi.mock("@/services/onchainAnalyticsService", () => ({
  default: vi.fn(),
  indexerLagMinutes: vi.fn(() => 45),
}));

const ARTIST = "GAZR3A7XTESTARTISTADDRESSABCDEFGHIJKLMNOPQRSTUVWXY";

const mockUseFeatureFlag = useFeatureFlag as Mock;
const mockGetFreighterAddress = getFreighterAddress as Mock;
const mockIsSubgraphConfigured = isSubgraphConfigured as Mock;
const mockService = useOnchainAnalyticsService as Mock;
const mockIndexerLagMinutes = indexerLagMinutes as Mock;

const mockUseGetOnchainStats = vi.fn();

function statsOver(overrides: Partial<ArtistOnchainStats>): ArtistOnchainStats {
  return {
    daily: [{ day: "2026-09-01", plays: 12, sales: 2, amount: 40.5 }],
    totalPlays: 12,
    totalSales: 2,
    totalAmount: 40.5,
    indexedBlock: 4_812_345,
    indexedAt: Date.now(),
    ...overrides,
  } as ArtistOnchainStats;
}

function renderPanel() {
  return render(<AnalyticsOnchainStats />);
}

describe("AnalyticsOnchainStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSubgraphConfigured.mockReturnValue(true);
    mockGetFreighterAddress.mockResolvedValue(ARTIST);
    mockService.mockReturnValue({ useGetOnchainStats: mockUseGetOnchainStats });
    mockUseGetOnchainStats.mockReturnValue({
      data: statsOver({}),
      isLoading: false,
      isError: false,
      isStaleData: false,
      isConfigured: true,
      refetch: vi.fn(),
    });
  });

  describe("rollout gate", () => {
    it("gates on the artist's own address and asks no questions outside the rollout", async () => {
      mockUseFeatureFlag.mockReturnValue(false);

      const { container } = renderPanel();

      // Let the wallet lookup settle before asserting: it resolves out of band.
      await waitFor(() => {
        expect(mockUseFeatureFlag).toHaveBeenCalledWith("artistOnchainAnalytics", ARTIST);
      });
      expect(container).toBeEmptyDOMElement();
      expect(mockService).not.toHaveBeenCalled();
      expect(mockUseGetOnchainStats).not.toHaveBeenCalled();
    });
  });

  describe("when enabled", () => {
    beforeEach(() => {
      mockUseFeatureFlag.mockReturnValue(true);
    });

    it("explains that the deployment has no indexer instead of erroring", async () => {
      mockIsSubgraphConfigured.mockReturnValue(false);

      renderPanel();

      expect(await screen.findByText("On-chain activity not set up")).toBeInTheDocument();
      expect(mockService).not.toHaveBeenCalled();
    });

    it("asks for a wallet when none is connected", async () => {
      mockGetFreighterAddress.mockResolvedValue(null);

      renderPanel();

      expect(await screen.findByText(/Connect a wallet/)).toBeInTheDocument();
      expect(mockService).not.toHaveBeenCalled();
    });

    it("waits for the wallet lookup rather than claiming no wallet exists", () => {
      mockGetFreighterAddress.mockReturnValue(new Promise(() => {}));

      renderPanel();

      expect(screen.getByText(/Checking for a connected Stellar wallet/)).toBeInTheDocument();
    });

    it("shows the indexed plays and sales", async () => {
      mockUseGetOnchainStats.mockReturnValue({
        data: statsOver({
          daily: [
            { day: "2026-09-01", plays: 12, sales: 2, amount: 40.5 },
            { day: "2026-09-02", plays: 30, sales: 1, amount: 9.5 },
          ],
          totalPlays: 42,
          totalSales: 3,
          totalAmount: 50,
        }),
        isLoading: false,
        isError: false,
        isStaleData: false,
        isConfigured: true,
        refetch: vi.fn(),
      });

      renderPanel();

      await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument());
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("50 XLM")).toBeInTheDocument();
      expect(screen.getByText(/From 2 indexed days at ledger 4,812,345/)).toBeInTheDocument();
    });

    it("asks the service for this artist and the requested window", async () => {
      renderPanel();

      await waitFor(() => {
        expect(mockUseGetOnchainStats).toHaveBeenCalledWith(ARTIST, 30);
      });
    });

    it("shows a skeleton while the indexer answers", async () => {
      mockUseGetOnchainStats.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        isStaleData: false,
        isConfigured: true,
        refetch: vi.fn(),
      });

      renderPanel();

      await waitFor(() => expect(mockUseGetOnchainStats).toHaveBeenCalledWith(ARTIST, 30));
      expect(screen.queryByText(/On-chain activity unavailable/)).not.toBeInTheDocument();
    });

    it("offers a retry when the subgraph fails, and refetches on click", async () => {
      const refetch = vi.fn();
      mockUseGetOnchainStats.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        isStaleData: false,
        isConfigured: true,
        refetch,
      });

      renderPanel();

      const notice = await screen.findByText("On-chain activity unavailable");
      expect(notice).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("labels lagging indexer data instead of presenting it as current", async () => {
      mockUseGetOnchainStats.mockReturnValue({
        data: statsOver({ indexedAt: Date.now() - 45 * 60_000 }),
        isLoading: false,
        isError: false,
        isStaleData: true,
        isConfigured: true,
        refetch: vi.fn(),
      });

      renderPanel();

      await screen.findByText("45 min behind chain");
      expect(mockIndexerLagMinutes).toHaveBeenCalled();
    });

    it("stays quiet about staleness when the totals are fresh", async () => {
      renderPanel();

      await waitFor(() => expect(screen.getByText("12")).toBeInTheDocument());
      expect(screen.queryByText(/behind chain/)).not.toBeInTheDocument();
    });

    it("notes an empty window rather than showing a misleading zero dashboard", async () => {
      mockUseGetOnchainStats.mockReturnValue({
        data: statsOver({
          daily: [],
          totalPlays: 0,
          totalSales: 0,
          totalAmount: 0,
          indexedBlock: null,
          indexedAt: null,
        }),
        isLoading: false,
        isError: false,
        isStaleData: false,
        isConfigured: true,
        refetch: vi.fn(),
      });

      renderPanel();

      expect(
        await screen.findByText(/No on-chain activity indexed for this artist/)
      ).toBeInTheDocument();
    });
  });
});
