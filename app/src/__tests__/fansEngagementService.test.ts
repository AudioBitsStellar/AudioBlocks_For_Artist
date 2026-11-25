
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFansEngagement,
  FANS_ENGAGEMENT_ENDPOINTS,
} from "../fansEngagementService";

const mockEngagementResponse = {
  followers: {
    status: "available",
    data: 1250,
  },
  followerGrowth: {
    status: "available",
    data: [
      { date: "2026-11-20", count: 10 },
      { date: "2026-11-21", count: 15 },
      { date: "2026-11-22", count: 20 },
    ],
  },
  songSaves: {
    status: "available",
    data: [
      { songId: "song-1", songTitle: "Test Song", count: 120 },
      { songId: "song-2", songTitle: "Another Song", count: 75 },
    ],
  },
  songComments: {
    status: "available",
    data: [
      { songId: "song-1", songTitle: "Test Song", count: 25 },
    ],
  },
  playlistAdds: {
    status: "available",
    data: [
      { songId: "song-1", songTitle: "Test Song", count: 40 },
    ],
  },
  topFans: {
    status: "available",
    data: [
      { userId: "fan-1", username: "FanOne", totalPlays: 250 },
      { userId: "fan-2", username: "FanTwo", totalPlays: 180 },
    ],
  },
};

describe("fansEngagementService", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();

    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("getFansEngagement", () => {
    it("fetches fan engagement data from the backend", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockEngagementResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await getFansEngagement();

      expect(fetch).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("uses the correct fan engagement endpoint", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockEngagementResponse), {
          status: 200,
        }),
      );

      await getFansEngagement();

      expect(FANS_ENGAGEMENT_ENDPOINTS.GET_FANS_ENGAGEMENT).toBe(
        "/artist/fans-engagement",
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/artist/fans-engagement"),
        expect.anything(),
      );
    });

    it("returns real follower count when available", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockEngagementResponse), {
          status: 200,
        }),
      );

      const result = await getFansEngagement();

      expect(result.followers.data).toBe(1250);
      expect(result.followers.status).toBe("available");
    });

    it("preserves a valid zero follower count", async () => {
      const response = {
        ...mockEngagementResponse,
        followers: {
          status: "available",
          data: 0,
        },
      };

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(response), {
          status: 200,
        }),
      );

      const result = await getFansEngagement();

      expect(result.followers.data).toBe(0);
      expect(result.followers.status).toBe("available");
    });

    it("returns song saves when the backend exposes them", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockEngagementResponse), {
          status: 200,
        }),
      );

      const result = await getFansEngagement();

      expect(result.songSaves.status).toBe("available");
      expect(result.songSaves.data).toHaveLength(2);
      expect(result.songSaves.data?.[0]).toEqual({
        songId: "song-1",
        songTitle: "Test Song",
        count: 120,
      });
    });

    it("returns comments per song when available", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockEngagementResponse), {
          status: 200,
        }),
      );

      const result = await getFansEngagement();

      expect(result.songComments.status).toBe("available");
      expect(result.songComments.data?.[0].count).toBe(25);
    });

    it("returns playlist additions when available", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockEngagementResponse), {
          status: 200,
        }),
      );

      const result = await getFansEngagement();

      expect(result.playlistAdds.status).toBe("available");
      expect(result.playlistAdds.data?.[0].count).toBe(40);
    });

    it("returns top fans when the backend exposes listening activity", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockEngagementResponse), {
          status: 200,
        }),
      );

      const result = await getFansEngagement();

      expect(result.topFans.status).toBe("available");
      expect(result.topFans.data).toHaveLength(2);
      expect(result.topFans.data?.[0].totalPlays).toBe(250);
    });

    it("marks unsupported metrics as unavailable instead of fabricating values", async () => {
      const response = {
        followers: {
          status: "available",
          data: 100,
        },
        followerGrowth: {
          status: "unavailable",
          data: null,
          message: "Not available yet",
        },
        songSaves: {
          status: "unavailable",
          data: null,
          message: "Not available yet",
        },
        songComments: {
          status: "unavailable",
          data: null,
          message: "Not available yet",
        },
        playlistAdds: {
          status: "unavailable",
          data: null,
          message: "Not available yet",
        },
        topFans: {
          status: "unavailable",
          data: null,
          message: "Not available yet",
        },
      };

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(response), {
          status: 200,
        }),
      );

      const result = await getFansEngagement();

      expect(result.songSaves.status).toBe("unavailable");
      expect(result.songSaves.data).toBeNull();

      expect(result.songComments.status).toBe("unavailable");
      expect(result.songComments.data).toBeNull();

      expect(result.topFans.status).toBe("unavailable");
      expect(result.topFans.data).toBeNull();
    });

    it("handles partial backend responses", async () => {
      const partialResponse = {
        followers: {
          status: "available",
          data: 500,
        },
        songSaves: {
          status: "unavailable",
          data: null,
          message: "Not available yet",
        },
      };

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(partialResponse), {
          status: 200,
        }),
      );

      const result = await getFansEngagement();

      expect(result.followers.data).toBe(500);
      expect(result.songSaves.status).toBe("unavailable");
    });

    it("handles an empty backend response safely", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
        }),
      );

      const result = await getFansEngagement();

      expect(result).toBeDefined();
    });

    it("handles backend errors gracefully", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response("Internal Server Error", {
          status: 500,
          statusText: "Internal Server Error",
        }),
      );

      await expect(getFansEngagement()).rejects.toThrow();
    });

    it("handles network failures", async () => {
      vi.mocked(fetch).mockRejectedValue(
        new Error("Network error"),
      );

      await expect(getFansEngagement()).rejects.toThrow(
        "Network error",
      );
    });

    it("handles malformed JSON responses", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response("invalid-json", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await expect(getFansEngagement()).rejects.toThrow();
    });
  });
});
