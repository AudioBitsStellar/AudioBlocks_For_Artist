/**
 * Unit tests for notification preferences service (#624).
 * Tests default loading, corrupt JSON handling, unknown keys, and validation.
 */

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/services/notificationPreferences";

const STORAGE_KEY = "audioblocks:notification-preferences:v1";

describe("notificationPreferences service", () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    global.localStorage = {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        localStorageMock = {};
      },
      length: 0,
      key: () => null,
    };
  });

  describe("loadNotificationPreferences", () => {
    it("returns defaults when storage is empty", () => {
      const prefs = loadNotificationPreferences();
      expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it("returns defaults when storage contains corrupt JSON", () => {
      localStorageMock[STORAGE_KEY] = "{corrupt-json";
      const prefs = loadNotificationPreferences();
      expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it("merges known keys and ignores unknown keys", () => {
      const stored = {
        newFan: { email: true, inApp: false },
        unknownEvent: { email: true, inApp: true },
      };
      localStorageMock[STORAGE_KEY] = JSON.stringify(stored);
      const prefs = loadNotificationPreferences();

      // newFan should be merged
      expect(prefs.newFan).toEqual({ email: true, inApp: false });

      // earnings should still have defaults
      expect(prefs.earnings).toEqual(DEFAULT_NOTIFICATION_PREFERENCES.earnings);

      // unknownEvent should be ignored (not in the result)
      expect(Object.keys(prefs)).not.toContain("unknownEvent");
    });

    it("preserves partial channel settings per event", () => {
      const stored = {
        earnings: { email: false },
        eventReminder: { inApp: false },
      };
      localStorageMock[STORAGE_KEY] = JSON.stringify(stored);
      const prefs = loadNotificationPreferences();

      // earnings.email overridden, earnings.inApp from defaults
      expect(prefs.earnings).toEqual({
        email: false,
        inApp: DEFAULT_NOTIFICATION_PREFERENCES.earnings.inApp,
      });

      // eventReminder.inApp overridden, eventReminder.email from defaults
      expect(prefs.eventReminder).toEqual({
        email: DEFAULT_NOTIFICATION_PREFERENCES.eventReminder.email,
        inApp: false,
      });
    });

    it("ignores non-boolean channel values", () => {
      const stored = {
        qualityCheck: { email: "yes", inApp: null },
      };
      localStorageMock[STORAGE_KEY] = JSON.stringify(stored);
      const prefs = loadNotificationPreferences();

      // Non-boolean values are rejected, defaults should be used
      expect(prefs.qualityCheck).toEqual(DEFAULT_NOTIFICATION_PREFERENCES.qualityCheck);
    });
  });

  describe("saveNotificationPreferences", () => {
    it("persists preferences to localStorage", () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        newFan: { email: true, inApp: false },
      };

      const result = saveNotificationPreferences(prefs);
      expect(result).toBe(true);

      const stored = localStorageMock[STORAGE_KEY];
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored);
      expect(parsed.newFan).toEqual({ email: true, inApp: false });
    });

    it("returns false if localStorage is unavailable", () => {
      // Simulate localStorage failure
      global.localStorage.setItem = () => {
        throw new Error("QuotaExceededError");
      };

      const result = saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      expect(result).toBe(false);
    });
  });

  describe("at least one channel per event rule", () => {
    it("allows all channels disabled (validation is in the UI)", () => {
      // The service itself doesn't enforce this rule; the page does.
      // This test documents that the service will save whatever is given.
      const allDisabled: NotificationPreferences = {
        newFan: { email: false, inApp: false },
        earnings: { email: false, inApp: false },
        eventReminder: { email: false, inApp: false },
        qualityCheck: { email: false, inApp: false },
      };

      const result = saveNotificationPreferences(allDisabled);
      expect(result).toBe(true);

      const loaded = loadNotificationPreferences();
      expect(loaded.newFan).toEqual({ email: false, inApp: false });
    });
  });

  describe("round-trip save and load", () => {
    it("preserves preferences across save and load", () => {
      const prefs: NotificationPreferences = {
        newFan: { email: true, inApp: false },
        earnings: { email: false, inApp: true },
        eventReminder: { email: true, inApp: true },
        qualityCheck: { email: false, inApp: false },
      };

      saveNotificationPreferences(prefs);
      const loaded = loadNotificationPreferences();

      expect(loaded).toEqual(prefs);
    });
  });
});
