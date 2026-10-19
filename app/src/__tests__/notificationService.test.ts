import { describe, it, expect } from "vitest";
import {
  filterByPreferences,
  mapBackendNotification,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotifications,
  sortByNewest,
  type ArtistNotification,
} from "@/services/notificationService";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/services/notificationPreferences";

const notification = (overrides: Partial<ArtistNotification>): ArtistNotification => ({
  id: "n",
  kind: "newFan",
  title: "Title",
  message: "Message",
  createdAt: "2026-01-01T00:00:00.000Z",
  read: false,
  ...overrides,
});

describe("notificationService helpers", () => {
  const list = [
    notification({ id: "a", kind: "newFan", createdAt: "2026-01-01T00:00:00.000Z" }),
    notification({ id: "b", kind: "earnings", createdAt: "2026-01-03T00:00:00.000Z" }),
    notification({ id: "c", kind: "eventReminder", createdAt: "2026-01-02T00:00:00.000Z" }),
  ];

  it("marks one notification as read without mutating the input", () => {
    const result = markNotificationRead(list, "b");

    expect(result.map((n) => n.read)).toEqual([false, true, false]);
    expect(list[1].read).toBe(false);
  });

  it("marks every notification as read", () => {
    expect(markAllNotificationsRead(list).every((n) => n.read)).toBe(true);
  });

  it("filters out kinds muted for in-app delivery", () => {
    const prefs = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      earnings: { email: true, inApp: false },
    };

    expect(filterByPreferences(list, prefs).map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("sorts newest first without mutating the input", () => {
    expect(sortByNewest(list).map((n) => n.id)).toEqual(["b", "c", "a"]);
    expect(list.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  describe("mapBackendNotification", () => {
    it("maps sales and royalty earnings to earnings kind and overview href", () => {
      const mapped = mapBackendNotification({
        id: "1",
        type: "sales",
        title: "Song Sold",
        message: "You made 10 XLM",
      });
      expect(mapped.kind).toBe("earnings");
      expect(mapped.href).toBe("/dashboard/overview");
    });

    it("maps mint results to earnings kind and my-music href", () => {
      const mapped = mapBackendNotification({
        id: "2",
        type: "mint_result",
        title: "Mint successful",
      });
      expect(mapped.kind).toBe("earnings");
      expect(mapped.href).toBe("/dashboard/my-music");
    });

    it("maps processing results to qualityCheck kind and my-music href", () => {
      const mapped = mapBackendNotification({
        id: "3",
        type: "processing_result",
        title: "Processing complete",
      });
      expect(mapped.kind).toBe("qualityCheck");
      expect(mapped.href).toBe("/dashboard/my-music");
    });

    it("maps comment replies to newFan kind and messages href", () => {
      const mapped = mapBackendNotification({
        id: "4",
        type: "comment_reply",
        title: "New reply",
      });
      expect(mapped.kind).toBe("newFan");
      expect(mapped.href).toBe("/dashboard/messages");
    });

    it("maps follows to newFan kind and messages href", () => {
      const mapped = mapBackendNotification({
        id: "5",
        type: "follow",
        title: "New follower",
      });
      expect(mapped.kind).toBe("newFan");
      expect(mapped.href).toBe("/dashboard/messages");
    });
  });

  describe("normalizeNotifications", () => {
    it("normalizes an array of backend notification objects", () => {
      const normalized = normalizeNotifications([
        { id: "10", type: "sales", title: "Sale" },
        { id: "11", type: "follow", title: "Follow" },
      ]);
      expect(normalized).toHaveLength(2);
      expect(normalized[0].kind).toBe("earnings");
      expect(normalized[1].kind).toBe("newFan");
    });

    it("returns empty array for non-array input", () => {
      expect(normalizeNotifications(null)).toEqual([]);
      expect(normalizeNotifications(undefined)).toEqual([]);
    });
  });
});
