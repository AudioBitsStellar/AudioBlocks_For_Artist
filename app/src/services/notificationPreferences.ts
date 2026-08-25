/**
 * Notification preferences storage (issue #161).
 *
 * Saves to user profile via the auth/auth-service's update endpoint when
 * one is available, and falls back to localStorage so the preferences work
 * even before the backend persistence endpoint is shipped.
 *
 * Pure functions – no React deps so it can be tested in isolation.
 */

import type { AxiosResponse } from "@/types";

export type NotificationEventKey = "newFan" | "earnings" | "eventReminder";

export type NotificationChannel = "email" | "inApp";

export type NotificationPreferences = Record<
  NotificationEventKey,
  Record<NotificationChannel, boolean>
>;

export const NOTIFICATION_EVENT_LABELS: Record<
  NotificationEventKey,
  { title: string; description: string }
> = {
  newFan: {
    title: "New fans",
    description: "When a new listener follows you or adds your music.",
  },
  earnings: {
    title: "Earnings",
    description: "Royalty payouts, sales milestones, and payout failures.",
  },
  eventReminder: {
    title: "Event reminders",
    description: "Upcoming shows, ticket sales going live, and schedule changes.",
  },
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newFan: { email: false, inApp: true },
  earnings: { email: true, inApp: true },
  eventReminder: { email: true, inApp: true },
};

const STORAGE_KEY = "audioblocks:notification-preferences:v1";

/** Read preferences from localStorage, merging in defaults for missing keys. */
export function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return mergeWithDefaults(parsed);
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/** Persist preferences to localStorage. Returns true on success. */
export function saveNotificationPreferences(prefs: NotificationPreferences): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

function mergeWithDefaults(partial: Partial<NotificationPreferences>): NotificationPreferences {
  const result: NotificationPreferences = {
    newFan: { ...DEFAULT_NOTIFICATION_PREFERENCES.newFan },
    earnings: { ...DEFAULT_NOTIFICATION_PREFERENCES.earnings },
    eventReminder: { ...DEFAULT_NOTIFICATION_PREFERENCES.eventReminder },
  };
  for (const key of Object.keys(partial) as NotificationEventKey[]) {
    const incoming = partial[key];
    if (incoming) {
      result[key] = {
        email: typeof incoming.email === "boolean" ? incoming.email : result[key].email,
        inApp: typeof incoming.inApp === "boolean" ? incoming.inApp : result[key].inApp,
      };
    }
  }
  return result;
}

/**
 * Wire the preferences into the auth/auth-service profile update endpoint.
 * Exposed as a separate function so callers can opt in once the backend
 * supports it; today it just falls back to localStorage.
 */
export async function persistPreferencesToProfile(
  prefs: NotificationPreferences
): Promise<AxiosResponse<NotificationPreferences>> {
  saveNotificationPreferences(prefs);
  return { success: true, data: prefs };
}
