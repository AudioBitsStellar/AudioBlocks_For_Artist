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
import { useQualityCheckNotifications } from "@/services/qualityCheckService";
import { useMock } from "@/__mocks__/loadMock";
import type { ArtistNotification } from "@/types/api";

// Response types live in the central `@/types/api` module (#140); re-exported
// here so existing imports from this service keep working.
export type { ArtistNotification } from "@/types/api";

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
 * `src/__mocks__/notifications` and read state is kept in local state instead of
 * calling the API.
 *
 * AI quality-check results (#465) are merged in from localStorage on top of
 * whichever source is active — the notifications endpoint doesn't serve them
 * until the checker backend exists.
 */
/**
 * Maps backend notification types (sales, mint results, processing results, comment replies, follows)
 * into frontend ArtistNotification shapes with deep links and category mapping.
 */
export function mapBackendNotification(raw: Record<string, any>): ArtistNotification {
  const type = String(raw.kind || raw.type || "newFan");
  let kind: NotificationEventKey = "newFan";
  let defaultHref: string | undefined = undefined;

  switch (type) {
    case "sales":
    case "sale":
    case "earnings":
      kind = "earnings";
      defaultHref = "/dashboard/overview";
      break;
    case "mint":
    case "mint_result":
    case "mintResult":
      kind = "earnings";
      defaultHref = "/dashboard/my-music";
      break;
    case "processing":
    case "processing_result":
    case "processingResult":
    case "qualityCheck":
      kind = "qualityCheck";
      defaultHref = "/dashboard/my-music";
      break;
    case "comment":
    case "comment_reply":
    case "commentReply":
      kind = "newFan";
      defaultHref = "/dashboard/messages";
      break;
    case "follow":
    case "follows":
    case "newFan":
      kind = "newFan";
      defaultHref = "/dashboard/messages";
      break;
    case "eventReminder":
      kind = "eventReminder";
      defaultHref = "/dashboard/events";
      break;
    default:
      kind = "newFan";
      break;
  }

  return {
    id: String(raw.id ?? raw._id ?? Math.random().toString(36).substring(2)),
    kind,
    title: String(raw.title || "Notification"),
    message: String(raw.message || raw.content || ""),
    createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
    read: Boolean(raw.read ?? raw.isRead ?? false),
    href: typeof raw.href === "string" ? raw.href : defaultHref,
  };
}

export function normalizeNotifications(
  rawList: unknown
): ArtistNotification[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item) =>
    typeof item === "object" && item !== null ? mapBackendNotification(item) : (item as ArtistNotification)
  );
}

export function useNotifications() {
  const handleError = useHandleError();
  const isMock = featureFlags.useMockNotifications;

  const query = useGet<ArtistNotification[]>(NOTIFICATIONS_QUERY_KEY, NOTIFICATION_ENDPOINTS.LIST, {
    enabled: !isMock,
    staleTime: DASHBOARD_CACHE.notifications,
  });

  const notificationMocks = useMock("notifications", isMock);
  // Null until the artist marks something read; the loaded fixture is the
  // starting point until then.
  const [readMockNotifications, setMockNotifications] = useState<ArtistNotification[] | null>(
    null
  );
  const mockNotifications = readMockNotifications ?? notificationMocks?.MOCK_NOTIFICATIONS ?? [];

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

  const mappedData = useMemo(() => {
    if (!query.data) return undefined;
    return normalizeNotifications(query.data);
  }, [query.data]);

  const source = isMock ? mockNotifications : mappedData;
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
    method: "put",
    endpoint: ({ id }) => NOTIFICATION_ENDPOINTS.MARK_READ(id),
    request: isMock ? () => Promise.resolve({}) : undefined,
    queryKey: isMock ? undefined : NOTIFICATIONS_QUERY_KEY,
    applyOptimistic: (cache, { id }) => markNotificationRead(cache, id),
    onOptimistic: isMock
      ? ({ id }) => setMockNotifications(markNotificationRead(mockNotifications, id))
      : undefined,
    onError: () => handleError("Couldn't mark the notification as read."),
  });

  const markAllRead = useOptimisticMutation<unknown, void, ArtistNotification[]>({
    method: "post",
    endpoint: () => NOTIFICATION_ENDPOINTS.MARK_ALL_READ,
    request: isMock ? () => Promise.resolve({}) : undefined,
    queryKey: isMock ? undefined : NOTIFICATIONS_QUERY_KEY,
    applyOptimistic: (cache) => markAllNotificationsRead(cache),
    onOptimistic: isMock
      ? () => setMockNotifications(markAllNotificationsRead(mockNotifications))
      : undefined,
    onError: () => handleError("Couldn't mark notifications as read."),
  });

  return {
    notifications,
    unreadCount,
    isLoading: isMock ? !notificationMocks : query.isLoading,
    isError: !isMock && query.isError,
    refetch: query.refetch,
    markAsRead: (id: string) => markRead.mutate({ id }),
    markAllAsRead: () => markAllRead.mutate(),
  };
}

export default useNotifications;
