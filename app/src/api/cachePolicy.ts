/**
 * Caching strategy for dashboard API calls.
 *
 * One place decides how long each kind of dashboard data is treated as fresh,
 * and which cached queries must be refreshed when the artist changes something.
 * Services import from here instead of hard-coding `staleTime` numbers.
 *
 * How it works (TanStack Query):
 *  - While data is *fresh* (`staleTime`), revisiting a page renders straight
 *    from the cache with no network request.
 *  - Once *stale*, the cached data is still shown instantly while a fresh copy
 *    is fetched in the background.
 *  - Data nobody is using is dropped after `gcTime` (see `queryClientInstance`).
 *  - Mutations invalidate the queries they affect so the next render refetches.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** Named freshness windows, in milliseconds. */
export const CACHE_TIME = {
  /** Always refetch on mount. For data that other devices/tabs may change under us. */
  NONE: 0,
  /** Changes often or is cheap to refetch (1 min). */
  SHORT: MINUTE,
  /** Changes occasionally (2 min). */
  MEDIUM: 2 * MINUTE,
  /** Slow-moving aggregates such as earnings and statistics (5 min). */
  LONG: 5 * MINUTE,
} as const;

/** Cache tier for each dashboard resource. */
export const DASHBOARD_CACHE = {
  /** Refetched on every mount — it can change from other tabs/devices. */
  profile: CACHE_TIME.NONE,
  overview: CACHE_TIME.SHORT,
  analytics: CACHE_TIME.SHORT,
  transactions: CACHE_TIME.SHORT,
  comments: CACHE_TIME.SHORT,
  /** New fans, payouts and event reminders arrive at any time. */
  notifications: CACHE_TIME.SHORT,
  /** Fans can place orders at any time, so order lists stay short-lived. */
  merchOrders: CACHE_TIME.SHORT,
  recentActivity: CACHE_TIME.MEDIUM,
  albums: CACHE_TIME.MEDIUM,
  fansEngagement: CACHE_TIME.MEDIUM,
  events: CACHE_TIME.MEDIUM,
  merch: CACHE_TIME.MEDIUM,
  statistics: CACHE_TIME.LONG,
  earnings: CACHE_TIME.LONG,
  platformRevenue: CACHE_TIME.LONG,
  /** An indexer trails the chain, so re-reading it more often than every few minutes is noise. */
  onchainStats: CACHE_TIME.LONG,
} as const;

/**
 * Query keys for the dashboard's cached reads. Defined once here so a mutation
 * can invalidate a query without importing the service that owns it.
 *
 * Keys are prefix-matched by `invalidateQueries`, so `analytics` also covers
 * every `[...analytics, period]` variant.
 */
export const DASHBOARD_QUERY_KEYS = {
  profile: ["get-artist-profile"],
  overview: ["get-artist-overview"],
  statistics: ["get-artist-statistics"],
  recentActivity: ["get-artist-recent-activity"],
  earnings: ["get-artist-earnings"],
  platformRevenue: ["get-platform-revenue"],
  analytics: ["get-artist-analytics"],
  analyticsSummary: ["get-artist-analytics-summary"],
  onchainStats: ["get-artist-onchain-stats"],
  transactions: ["get-dashboard-transactions"],
  comments: ["get-dashboard-comments"],
  albums: ["get-artist-albums"],
  fansEngagement: ["get-artist-fans-engagement"],
  notifications: ["get-artist-notifications"],
} as const;

/** Dashboard summaries that change whenever the artist publishes a song. */
export const SONG_PUBLISHED_INVALIDATIONS = [
  DASHBOARD_QUERY_KEYS.overview,
  DASHBOARD_QUERY_KEYS.statistics,
  DASHBOARD_QUERY_KEYS.recentActivity,
] as const;

/** Publishing an album also changes the albums list itself. */
export const ALBUM_PUBLISHED_INVALIDATIONS = [
  DASHBOARD_QUERY_KEYS.albums,
  ...SONG_PUBLISHED_INVALIDATIONS,
] as const;
