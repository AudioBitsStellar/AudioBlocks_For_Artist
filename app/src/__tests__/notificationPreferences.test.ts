import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/services/notificationPreferences";

describe("notificationPreferences service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loadNotificationPreferences", () => {
    it("should return defaults when storage is empty", () => {
      const prefs = loadNotificationPreferences();
      expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it("should merge saved preferences with defaults", () => {
      const partial: Partial<NotificationPreferences> = {
        newFan: { email: true, inApp: false },
      };
      localStorage.setItem("audioblocks:notification-preferences:v1", JSON.stringify(partial));

      const prefs = loadNotificationPreferences();
      expect(prefs.newFan).toEqual({ email: true, inApp: false });
      expect(prefs.earnings).toEqual(DEFAULT_NOTIFICATION_PREFERENCES.earnings);
    });

    it("should handle corrupt JSON gracefully", () => {
      localStorage.setItem("audioblocks:notification-preferences:v1", "not valid json{");

      const prefs = loadNotificationPreferences();
      expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it("should ignore unknown event keys", () => {
      const withUnknown = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        unknownEvent: { email: true, inApp: true },
      };
      localStorage.setItem(
        "audioblocks:notification-preferences:v1",
        JSON.stringify(withUnknown)
      );

      const prefs = loadNotificationPreferences();
      expect(prefs).not.toHaveProperty("unknownEvent");
      expect(Object.keys(prefs)).toEqual(Object.keys(DEFAULT_NOTIFICATION_PREFERENCES));
    });

    it("should validate channel values", () => {
      const invalid = {
        newFan: { email: "not a boolean", inApp: null },
      };
      localStorage.setItem("audioblocks:notification-preferences:v1", JSON.stringify(invalid));

      const prefs = loadNotificationPreferences();
      // Should fall back to defaults for invalid types
      expect(prefs.newFan).toEqual(DEFAULT_NOTIFICATION_PREFERENCES.newFan);
    });

    it("should enforce at least one channel per event rule", () => {
      // This is enforced at the UI level, not in the service itself,
      // but the service should still load preferences with all channels disabled
      const allDisabled: Partial<NotificationPreferences> = {
        newFan: { email: false, inApp: false },
        earnings: { email: false, inApp: false },
        eventReminder: { email: false, inApp: false },
        qualityCheck: { email: false, inApp: false },
      };
      localStorage.setItem(
        "audioblocks:notification-preferences:v1",
        JSON.stringify(allDisabled)
      );

      const prefs = loadNotificationPreferences();
      expect(prefs.newFan).toEqual({ email: false, inApp: false });
    });
  });

  describe("saveNotificationPreferences", () => {
    it("should persist preferences to localStorage", () => {
      const customPrefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        newFan: { email: true, inApp: false },
      };

      const success = saveNotificationPreferences(customPrefs);
      expect(success).toBe(true);

      const stored = localStorage.getItem("audioblocks:notification-preferences:v1");
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(customPrefs);
    });

    it("should return true on successful save", () => {
      const result = saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      expect(result).toBe(true);
    });

    it("should handle storage quota errors gracefully", () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const result = saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      expect(result).toBe(false);

      // Restore
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe("round-trip persistence", () => {
    it("should preserve all preferences through save and load", () => {
      const customPrefs: NotificationPreferences = {
        newFan: { email: true, inApp: false },
        earnings: { email: false, inApp: true },
        eventReminder: { email: true, inApp: true },
        qualityCheck: { email: false, inApp: false },
      };

      saveNotificationPreferences(customPrefs);
      const loaded = loadNotificationPreferences();

      expect(loaded).toEqual(customPrefs);
    });
  });
});
