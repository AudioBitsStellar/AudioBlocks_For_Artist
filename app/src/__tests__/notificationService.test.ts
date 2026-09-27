import { describe, it, expect } from "vitest";
import {
  filterByPreferences,
  markAllNotificationsRead,
  markNotificationRead,
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
});
