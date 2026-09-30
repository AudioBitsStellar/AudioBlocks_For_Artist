import { useMemo, useState, useSyncExternalStore } from "react";
import { NOTIFICATION_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, useOptimisticMutation } from "@/api/queryClient";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";
import { featureFlags } from "@/lib/featureFlags";
import { useHandleError } from "@/hooks/useToastHandler";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  type NotificationEventKey,
  type NotificationPreferences,
} from "@/services/notificationPreferences";
import {
  MOCK_QUALITY_CHECKS,
  toArtistNotification,
  useQualityCheckNotifications,
} from "@/services/qualityCheckService";

/** An in-app notification about something that happened to the artist. */
export interface ArtistNotification {
  id: string;
  /** Same keys as the notification preferences, so each kind can be muted in settings. */
  kind: NotificationEventKey;
  title: string;
  message: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  read: boolean;
  /** Dashboard route to open when the notification is selected. */
  href?: string;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const BASE_MOCK_NOTIFICATIONS: ArtistNotification[] = [
  {
    id: "notif_1",
    kind: "newFan",
    title: "New fan",
    message: "Tomothy Nguyen started following you.",
    createdAt: ago(5 * MINUTE),
    read: false,
    href: "/dashboard/messages",
  },
  {
    id: "notif_2",
    kind: "earnings",
    title: "Royalty payout sent",
    message: "Your weekly royalty payout of 125.40 XLM was sent to your wallet.",
    createdAt: ago(2 * HOUR),
    read: false,
    href: "/dashboard/overview",
  },
  {
    id: "notif_3",
    kind: "eventReminder",
    title: "Show tomorrow",
    message: "Lagos Live Sessions starts tomorrow at 8:00 PM. 42 tickets remain.",
    createdAt: ago(5 * HOUR),
    read: false,
    href: "/dashboard/events",
  },
  {
    id: "notif_4",
    kind: "newFan",
    title: "New fan",
    message: "Victoria Robertson added “Midnight Drive” to a playlist.",
    createdAt: ago(26 * HOUR),
    read: true,
  },
  {
    id: "notif_5",
    kind: "earnings",
    title: "Sales milestone",
    message: "“Midnight Drive” passed 1,000 streams this month.",
    createdAt: ago(3 * 24 * HOUR),
    read: true,
    href: "/dashboard/analytics",
  },
];

/**
 * The demo feed: the hand-written events above plus one notification per mock
 * AI quality-check result, so the bell shows the #465 kinds in mock mode
 * without a backend.
 */
export const MOCK_NOTIFICATIONS: ArtistNotification[] = [
  ...BASE_MOCK_NOTIFICATIONS,
  ...MOCK_QUALITY_CHECKS.map(toArtistNotification),
];

/** Marks a single notification as read without mutating the input. */
export function markNotificationRead(
  notifications: ArtistNotification[],
  id: string
): ArtistNotification[] {
  return notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
}

/** Marks every notification as read without mutating the input. */
export function markAllNotificationsRead(
  notifications: ArtistNotification[]
): ArtistNotification[] {
  return notifications.map((n) => (n.read ? n : { ...n, read: true }));
}

/** Drops notifications whose kind the artist turned off for in-app delivery. */
export function filterByPreferences(
  notifications: ArtistNotification[],
  prefs: NotificationPreferences
): ArtistNotification[] {
  return notifications.filter((n) => prefs[n.kind]?.inApp ?? true);
}

/**
 * Combines two lists by notification id, with `overrides` winning a clash —
 * a quality check the artist just re-ran replaces the seeded entry for the
 * same song instead of appearing twice.
 */
export function mergeById(
  base: ArtistNotification[],
  overrides: ArtistNotification[]
): ArtistNotification[] {
  const merged = new Map(base.map((n) => [n.id, n]));
  for (const n of overrides) merged.set(n.id, n);
  return [...merged.values()];
}

/** Newest first. */
export function sortByNewest(notifications: ArtistNotification[]): ArtistNotification[] {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

const NOTIFICATIONS_QUERY_KEY = DASHBOARD_QUERY_KEYS.notifications;

// Snapshots are serialized so useSyncExternalStore can compare them by value.
const readPreferencesSnapshot = () => JSON.stringify(loadNotificationPreferences());
const serverPreferencesSnapshot = () => JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES);
const subscribeToStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/**
 * Notifications for the header bell: the visible list (filtered by the
 * artist's in-app preferences, newest first), the unread count, and
 * optimistic "mark as read" actions.
 *
 * With mock data enabled (`NEXT_PUBLIC_USE_MOCK_DATA=true`) the list comes from
 * `MOCK_NOTIFICATIONS` and read state is kept in local state instead of
 * calling the API.
 *
 * AI quality-check results (#465) are merged in from localStorage on top of
 * whichever source is active — the notifications endpoint doesn't serve them
 * until the checker backend exists.
 */
export function useNotifications() {
  const handleError = useHandleError();
  const useMock = featureFlags.useMockNotifications;

  const query = useGet<ArtistNotification[]>(NOTIFICATIONS_QUERY_KEY, NOTIFICATION_ENDPOINTS.LIST, {
    enabled: !useMock,
    staleTime: DASHBOARD_CACHE.notifications,
  });

  const [mockNotifications, setMockNotifications] = useState(MOCK_NOTIFICATIONS);

  // Preferences live in localStorage. Reading them as an external store keeps
  // the server render on the defaults and re-reads them on every render, so a
  // change saved on the settings page shows up the next time the bell renders.
  const preferencesSnapshot = useSyncExternalStore(
    subscribeToStorage,
    readPreferencesSnapshot,
    serverPreferencesSnapshot
  );
  const preferences = useMemo(
    () => JSON.parse(preferencesSnapshot) as NotificationPreferences,
    [preferencesSnapshot]
  );

  const source = useMock ? mockNotifications : query.data;
  // Quality checks the artist recorded in this browser (#465). They arrive
  // from localStorage rather than the notifications endpoint, which doesn't
  // serve them until the checker backend exists.
  const recordedChecks = useQualityCheckNotifications();

  const notifications = useMemo(
    () => sortByNewest(filterByPreferences(mergeById(source ?? [], recordedChecks), preferences)),
    [source, recordedChecks, preferences]
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

  // In mock mode there is no cached query to patch, so read state is
  // updated in local state instead (the simulated request never fails).
  const markRead = useOptimisticMutation<unknown, { id: string }, ArtistNotification[]>({
    method: "patch",
    endpoint: ({ id }) => NOTIFICATION_ENDPOINTS.MARK_READ(id),
    request: useMock ? () => Promise.resolve({}) : undefined,
    queryKey: useMock ? undefined : NOTIFICATIONS_QUERY_KEY,
    applyOptimistic: (cache, { id }) => markNotificationRead(cache, id),
    onOptimistic: useMock
      ? ({ id }) => setMockNotifications((list) => markNotificationRead(list, id))
      : undefined,
    onError: () => handleError("Couldn't mark the notification as read."),
  });

  const markAllRead = useOptimisticMutation<unknown, void, ArtistNotification[]>({
    method: "patch",
    endpoint: () => NOTIFICATION_ENDPOINTS.MARK_ALL_READ,
    request: useMock ? () => Promise.resolve({}) : undefined,
    queryKey: useMock ? undefined : NOTIFICATIONS_QUERY_KEY,
    applyOptimistic: (cache) => markAllNotificationsRead(cache),
    onOptimistic: useMock ? () => setMockNotifications(markAllNotificationsRead) : undefined,
    onError: () => handleError("Couldn't mark notifications as read."),
  });

  return {
    notifications,
    unreadCount,
    isLoading: !useMock && query.isLoading,
    isError: !useMock && query.isError,
    refetch: query.refetch,
    markAsRead: (id: string) => markRead.mutate({ id }),
    markAllAsRead: () => markAllRead.mutate(),
  };
}

export default useNotifications;
