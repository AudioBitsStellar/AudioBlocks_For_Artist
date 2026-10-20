import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  bulkSetModerationStatus,
  clearModeration,
  deleteCommentOnBackend,
  getModerationMap,
  getModerationStatus,
  removeComment,
  reportCommentToBackend,
  restoreComment,
  setModerationStatus,
  type ModerationStatus,
} from "@/services/commentModerationService";
import * as axiosModule from "@/api/axios";
import { COMMENT_MODERATION_ENDPOINTS } from "@/api/api-endpoint";

vi.mock("@/api/axios");

const mockedAxios = vi.mocked(axiosModule);

describe("commentModerationService — moderation state management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearModeration();
  });

  afterEach(() => {
    clearModeration();
  });

  describe("setModerationStatus / getModerationStatus", () => {
    it("records a moderation status for a comment", () => {
      setModerationStatus("comment-1", "hidden", "Violates community standards");

      expect(getModerationStatus("comment-1")).toBe("hidden");
    });

    it("defaults to 'visible' for unknown comments", () => {
      expect(getModerationStatus("unknown-id")).toBe("visible");
    });

    it("allows numeric IDs and treats them as strings internally", () => {
      setModerationStatus(123, "flagged");

      expect(getModerationStatus("123")).toBe("flagged");
      expect(getModerationStatus(123)).toBe("flagged");
    });

    it("updates an existing status", () => {
      setModerationStatus("comment-1", "hidden");
      expect(getModerationStatus("comment-1")).toBe("hidden");

      setModerationStatus("comment-1", "removed");
      expect(getModerationStatus("comment-1")).toBe("removed");
    });

    it("records the moderation reason and timestamp", () => {
      const before = new Date();
      setModerationStatus("comment-1", "flagged", "Spam content");
      const after = new Date();

      const map = getModerationMap();
      const record = map["comment-1"];

      expect(record.status).toBe("flagged");
      expect(record.reason).toBe("Spam content");
      expect(record.moderatedAt).toBeDefined();

      const moderatedTime = new Date(record.moderatedAt);
      expect(moderatedTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(moderatedTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("allows setting status without a reason", () => {
      setModerationStatus("comment-1", "visible");

      const map = getModerationMap();
      expect(map["comment-1"].reason).toBeUndefined();
    });
  });

  describe("bulkSetModerationStatus", () => {
    it("applies the same status to multiple comment IDs", () => {
      bulkSetModerationStatus(["id-1", "id-2", "id-3"], "hidden");

      expect(getModerationStatus("id-1")).toBe("hidden");
      expect(getModerationStatus("id-2")).toBe("hidden");
      expect(getModerationStatus("id-3")).toBe("hidden");
    });

    it("handles numeric IDs in the bulk operation", () => {
      bulkSetModerationStatus([1, 2, 3], "flagged");

      expect(getModerationStatus(1)).toBe("flagged");
      expect(getModerationStatus("2")).toBe("flagged");
      expect(getModerationStatus(3)).toBe("flagged");
    });

    it("overwrites previous statuses for the same IDs", () => {
      bulkSetModerationStatus(["id-1", "id-2"], "visible");
      bulkSetModerationStatus(["id-1", "id-2"], "removed");

      expect(getModerationStatus("id-1")).toBe("removed");
      expect(getModerationStatus("id-2")).toBe("removed");
    });

    it("sets the same timestamp for all bulk-updated comments", () => {
      const before = new Date();
      bulkSetModerationStatus(["id-1", "id-2", "id-3"], "hidden");
      const after = new Date();

      const map = getModerationMap();
      const time1 = new Date(map["id-1"].moderatedAt).getTime();
      const time2 = new Date(map["id-2"].moderatedAt).getTime();
      const time3 = new Date(map["id-3"].moderatedAt).getTime();

      expect(time1).toBe(time2);
      expect(time2).toBe(time3);

      expect(time1).toBeGreaterThanOrEqual(before.getTime());
      expect(time1).toBeLessThanOrEqual(after.getTime());
    });

    it("records a reason for bulk updates", () => {
      bulkSetModerationStatus(["id-1", "id-2"], "flagged", "Bulk moderation from artist");

      const map = getModerationMap();
      expect(map["id-1"].reason).toBe("Bulk moderation from artist");
      expect(map["id-2"].reason).toBe("Bulk moderation from artist");
    });
  });

  describe("removeComment / restoreComment", () => {
    it("sets status to 'removed' with a standard reason", () => {
      removeComment("comment-1");

      const map = getModerationMap();
      expect(map["comment-1"].status).toBe("removed");
      expect(map["comment-1"].reason).toBe("Removed by the artist");
    });

    it("restoreComment deletes the moderation entry to return to 'visible'", () => {
      setModerationStatus("comment-1", "removed");
      expect(getModerationStatus("comment-1")).toBe("removed");

      restoreComment("comment-1");

      expect(getModerationStatus("comment-1")).toBe("visible");
    });

    it("can restore a comment that was flagged or hidden", () => {
      setModerationStatus("comment-1", "flagged");
      restoreComment("comment-1");

      expect(getModerationStatus("comment-1")).toBe("visible");
    });
  });

  describe("getModerationMap", () => {
    it("returns a copy of the moderation map", () => {
      setModerationStatus("comment-1", "hidden");

      const map1 = getModerationMap();
      const map2 = getModerationMap();

      expect(map1).toEqual(map2);
      expect(map1).not.toBe(map2); // Different objects
    });

    it("reflects updates after being retrieved", () => {
      const map1 = getModerationMap();
      expect(map1["comment-1"]).toBeUndefined();

      setModerationStatus("comment-1", "hidden");

      const map2 = getModerationMap();
      expect(map2["comment-1"]).toBeDefined();
      expect(map2["comment-1"].status).toBe("hidden");
    });
  });

  describe("clearModeration", () => {
    it("removes all moderation records", () => {
      bulkSetModerationStatus(["id-1", "id-2", "id-3"], "flagged");

      const mapBefore = getModerationMap();
      expect(Object.keys(mapBefore).length).toBe(3);

      clearModeration();

      const mapAfter = getModerationMap();
      expect(Object.keys(mapAfter).length).toBe(0);
    });

    it("causes all comments to default to 'visible'", () => {
      setModerationStatus("comment-1", "hidden");
      clearModeration();

      expect(getModerationStatus("comment-1")).toBe("visible");
    });
  });

  describe("reportCommentToBackend", () => {
    it("sends a POST request to the report endpoint with the reason", async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(axiosModule.createApiClient).mockResolvedValue(mockClient as any);

      await reportCommentToBackend("comment-1", "Spam content");

      expect(mockClient.post).toHaveBeenCalledWith(
        COMMENT_MODERATION_ENDPOINTS.REPORT("comment-1"),
        { reason: "Spam content" }
      );
    });

    it("uses default reason 'Reported by artist' when reason is omitted", async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(axiosModule.createApiClient).mockResolvedValue(mockClient as any);

      await reportCommentToBackend("comment-1");

      expect(mockClient.post).toHaveBeenCalledWith(
        COMMENT_MODERATION_ENDPOINTS.REPORT("comment-1"),
        { reason: "Reported by artist" }
      );
    });

    it("updates local moderation status to 'flagged' on success", async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(axiosModule.createApiClient).mockResolvedValue(mockClient as any);

      const result = await reportCommentToBackend("comment-1", "Spam");

      expect(result).toBe(true);
      expect(getModerationStatus("comment-1")).toBe("flagged");
    });

    it("updates local status even if the API call fails (optimistic update)", async () => {
      const mockClient = {
        post: vi.fn().mockRejectedValue(new Error("Network error")),
      };
      vi.mocked(axiosModule.createApiClient).mockResolvedValue(mockClient as any);

      const result = await reportCommentToBackend("comment-1", "Spam");

      expect(result).toBe(false);
      // Status is still set locally
      expect(getModerationStatus("comment-1")).toBe("flagged");
    });

    it("returns false on API error", async () => {
      const mockClient = {
        post: vi.fn().mockRejectedValue(new Error("API error")),
      };
      vi.mocked(axiosModule.createApiClient).mockResolvedValue(mockClient as any);

      const result = await reportCommentToBackend("comment-1", "Test");

      expect(result).toBe(false);
    });
  });

  describe("deleteCommentOnBackend", () => {
    it("sends a DELETE request to the delete endpoint", async () => {
      const mockClient = {
        delete: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(axiosModule.createApiClient).mockResolvedValue(mockClient as any);

      await deleteCommentOnBackend("comment-1");

      expect(mockClient.delete).toHaveBeenCalledWith(
        COMMENT_MODERATION_ENDPOINTS.DELETE("comment-1")
      );
    });

    it("updates local moderation status to 'removed' on success", async () => {
      const mockClient = {
        delete: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(axiosModule.createApiClient).mockResolvedValue(mockClient as any);

      const result = await deleteCommentOnBackend("comment-1");

      expect(result).toBe(true);
      expect(getModerationStatus("comment-1")).toBe("removed");
    });

    it("updates local status even if the API call fails (optimistic update)", async () => {
      const mockClient = {
        delete: vi.fn().mockRejectedValue(new Error("Network error")),
      };
      vi.mocked(axiosModule.createApiClient).mockResolvedValue(mockClient as any);

      const result = await deleteCommentOnBackend("comment-1");

      expect(result).toBe(false);
      // Status is still set to removed locally
      expect(getModerationStatus("comment-1")).toBe("removed");
    });

    it("returns false on API error", async () => {
      const mockClient = {
        delete: vi.fn().mockRejectedValue(new Error("API error")),
      };
      vi.mocked(axiosModule.createApiClient).mockResolvedValue(mockClient as any);

      const result = await deleteCommentOnBackend("comment-1");

      expect(result).toBe(false);
    });

    it("handles numeric comment IDs", async () => {
      const mockClient = {
        delete: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(axiosModule.createApiClient).mockResolvedValue(mockClient as any);

      await deleteCommentOnBackend(12345);

      expect(mockClient.delete).toHaveBeenCalledWith(
        COMMENT_MODERATION_ENDPOINTS.DELETE(12345)
      );
    });
  });
});
