import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import useOverviewServices, {
  fetchOverview,
  fetchRecentActivity,
  overviewFromStats,
} from "@/services/overviewService";
const mocks = vi.hoisted(() => ({ get: vi.fn(), query: vi.fn(), profile: vi.fn() }));
vi.mock("@/api/axios", () => ({ createApiClient: async () => ({ get: mocks.get }) }));
vi.mock("@/api/queryClient", () => ({ useGet: mocks.profile }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query }));
const stats = {
  artistId: "artist",
  songCount: 3,
  totals: { plays: 100, uniqueListeners: 70, saves: 8, revenueStroops: "9007199254740993123" },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.mockReturnValue({
    data: { data: { id: "artist" } },
    isLoading: false,
    isError: false,
  });
  mocks.query.mockImplementation((options) => options);
});
describe("overview backend mapping", () => {
  it("maps real counters and preserves royalty precision without inventing followers", () => {
    expect(overviewFromStats(stats)).toEqual({
      songsPublished: 3,
      totalPlays: 100,
      listenersCount: 70,
      saves: 8,
      followersCount: null,
      earningsXlm: "900719925474.0993123",
    });
    expect(
      overviewFromStats({ ...stats, totals: { ...stats.totals, revenueStroops: "0" } }).earningsXlm
    ).toBe("0");
  });
  it("requests artist stats with the selected time window", async () => {
    mocks.get.mockResolvedValue({ data: { success: true, data: stats } });
    await fetchOverview("artist", "90d");
    expect(mocks.get).toHaveBeenCalledWith("/artists/artist/stats", { params: { window: "90d" } });
  });
  it("surfaces a missing backend route without sample fallback", async () => {
    mocks.get.mockRejectedValue(new Error("404"));
    await expect(fetchOverview("artist", "30d")).rejects.toThrow("404");
  });
  it("uses the authenticated artist feed and filters the selected window", async () => {
    const recent = new Date().toISOString();
    mocks.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: "other", userId: "other", createdAt: recent },
          { id: "mine", userId: "artist", createdAt: recent },
          { id: "old", userId: "artist", createdAt: "2000-01-01" },
        ],
      },
    });
    expect((await fetchRecentActivity("artist", "7d")).data.map((item) => item.id)).toEqual([
      "mine",
    ]);
    expect(mocks.get).toHaveBeenCalledWith("/activity/feed/me", { params: { limit: 100 } });
  });
  it("scopes cache keys to the artist and selected window", () => {
    renderHook(() => useOverviewServices().useGetOverviewKpi("7d"));
    expect(mocks.query.mock.calls[0][0]).toMatchObject({
      queryKey: ["get-artist-overview", "artist", "7d"],
      enabled: true,
    });
  });
  it("waits for a real artist ID", () => {
    mocks.profile.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderHook(() => useOverviewServices().useGetOverviewKpi());
    expect(mocks.query.mock.calls[0][0].enabled).toBe(false);
  });
});
