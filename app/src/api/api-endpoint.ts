export const AUTH_ENDPOINTS = {
  REGISTER_EMAIL: "/auth/register-email",
  LOGIN_EMAIL: "/auth/login-email",
};

export const USER_ENDPOINTS = {
  PROFILE: "/users/profile",
  UPDATE_PROFILE: "/artist/update-profile",
};

export const ARTIST_UPLOAD_ENDPOINTS = {
  UPLOAD_COVER: "/song/upload/cover",
  UPLOAD_CHUNK: "/song/upload/chunk",
  UPLOAD_SONG: "/song/upload/finalize",
  TRANSCRIBE_LYRICS: "/song/upload/transcribe-lyrics",
};

// Soroban on-chain endpoints: the backend only builds/relays transactions,
// Freighter signs them client-side (see src/lib/freighter.ts).
export const ARTIST_ONCHAIN_ENDPOINTS = {
  CONNECT_WALLET: "/artist/onchain/connect-wallet",
  PREPARE_SETUP: "/artist/onchain/prepare-setup",
  SUBMIT_SETUP: "/artist/onchain/submit-setup",
};

export const SONG_ONCHAIN_ENDPOINTS = {
  prepareMint: (songId: string) => `/song/${songId}/onchain/prepare-mint`,
  submitMint: (songId: string) => `/song/${songId}/onchain/submit-mint`,
  prepareTransfer: (songId: string) => `/song/${songId}/onchain/prepare-transfer`,
  submitTransfer: (songId: string) => `/song/${songId}/onchain/submit-transfer`,
};

export const MERCH_ENDPOINTS = {
  LIST: "/artist/merches",
  CREATE: "/artist/merches",
  UPDATE: (id: number) => `/artist/merches/${id}`,
  DELETE: (id: number) => `/artist/merches/${id}`,
  CREATE_ORDER: (id: number) => `/artist/merches/${id}/orders`,
  ORDERS: "/artist/merches/orders",
};

export const EARNINGS_ENDPOINTS = {
  GET_EARNINGS: "/artist/earnings",
  GET_PLATFORM_REVENUE: "/artist/earnings/platforms",
  GET_PAYOUTS: "/artist/earnings/payouts",
};

export const OVERVIEW_ENDPOINTS = {
  GET_OVERVIEW: "/artist/overview",
  GET_STATISTICS: "/artist/statistics",
  GET_RECENT_ACTIVITY: "/artist/recent-activity",
};

export const DASHBOARD_TRANSACTION_ENDPOINTS = {
  LIST: "/artist/transactions",
};

export const DASHBOARD_COMMENT_ENDPOINTS = {
  LIST: "/artist/comments",
  CREATE: "/artist/comments",
  SONG_COMMENTS: (songId: string | number) => `/songs/${songId}/comments`,
  CREATE_SONG_COMMENT: (songId: string | number) => `/songs/${songId}/comments`,
};

export const COMMENT_MODERATION_ENDPOINTS = {
  REPORT: (id: string | number) => `/comments/${id}/report`,
  DELETE: (id: string | number) => `/comments/${id}`,
  UPDATE: (id: string | number) => `/comments/${id}`,
  BULK: "/comments/moderation/bulk",
};

export const COLLABORATOR_ENDPOINTS = {
  LIST: "/artist/collaborators/invites",
  CREATE: "/artist/collaborators/invites",
  RESEND: (id: string) => `/artist/collaborators/invites/${id}/resend`,
  REVOKE: (id: string) => `/artist/collaborators/invites/${id}`,
  ACCEPT: "/artist/collaborators/invites/accept",
  SONG_COLLABORATORS: (songId: string) => `/song/${songId}/collaborators`,
  SONG_COLLABORATOR: (songId: string, userId: string) => `/song/${songId}/collaborators/${userId}`,
  DISPUTE_SPLIT: (songId: string) => `/song/${songId}/collaborators/dispute`,
};

export const TEAM_ENDPOINTS = {
  LIST: "/artist/team",
  INVITE: "/artist/team/invite",
  UPDATE: (id: string) => `/artist/team/${id}`,
  REMOVE: (id: string) => `/artist/team/${id}`,
  ACCEPT: "/artist/team/accept-invite",
};

export const SECURITY_ENDPOINTS = {
  TWO_FACTOR_STATUS: "/artist/security/2fa",
  TWO_FACTOR_SETUP: "/artist/security/2fa/setup",
  TWO_FACTOR_VERIFY: "/artist/security/2fa/verify",
  TWO_FACTOR_DISABLE: "/artist/security/2fa/disable",
};

export const ANALYTICS_ENDPOINTS = {
  SUMMARY: "/artist/analytics/summary",
  DATA: (period: "last30days" | "last90days") => `/artist/analytics?period=${period}`,
};

export const FANS_ENGAGEMENT_ENDPOINTS = {
  GET_FANS_ENGAGEMENT: "/artist/fans-engagement",
};

export const SONG_ENDPOINTS = {
  UPDATE: (id: string | number) => `/song/${id}`,
  TAGS: (id: string | number) => `/song/${id}/tags`,
  TRANSCRIBE_LYRICS: (id: string | number) => `/song/${id}/lyrics/transcribe`,
  DRAFT_DESCRIPTION: (id: string | number) => `/ai/studio/songs/${id}/description`,
  VERSIONS: (id: string | number) => `/song/${id}/versions`,
  REUPLOAD: (id: string | number) => `/song/${id}/versions`,
};

// Backend album resource is `/albums` (AlbumRoutes.ts), not `/artist/albums` (#528).
export const ALBUM_ENDPOINTS = {
  LIST: "/albums",
  LIST_FOR_ARTIST: (artistId: string) => `/albums?artistId=${encodeURIComponent(artistId)}`,
  CREATE: "/albums",
  GET: (albumId: string) => `/albums/${albumId}`,
  /** Metadata and ordered track list (`trackIds`). */
  UPDATE: (albumId: string) => `/albums/${albumId}`,
  DELETE: (albumId: string) => `/albums/${albumId}`,
};

/**
 * Artist verification (#524). Payload matches the backend ApplyVerificationDTO;
 * admin review lives under `/admin/verifications`.
 */
export const VERIFICATION_ENDPOINTS = {
  APPLY: "/artist/verification",
  STATUS: "/artist/verification",
};

/** Server-recorded audit events for the artist workspace (#526). */
export const AUDIT_LOG_ENDPOINTS = {
  LIST: "/artist/audit-logs",
};

export const EVENTS_ENDPOINTS = {
  LIST: "/artist/events",
  CREATE: "/artist/events",
  UPDATE: (id: string | number) => `/artist/events/${id}`,
  DELETE: (id: string | number) => `/artist/events/${id}`,
  CHECK_IN: (id: string | number) => `/artist/events/${id}/check-in`,
  TICKETS: (id: string | number) => `/artist/events/${id}/tickets`,
  VALIDATE_TICKET: (id: string | number) => `/artist/events/${id}/validate`,
};

export const MERCH_INVENTORY_ENDPOINTS = {
  LIST: "/artist/merches/inventory",
  UPDATE_STOCK: (id: number) => `/artist/merches/${id}/stock`,
  ORDERS: "/artist/merches/orders",
  ORDER_STATUS: (orderId: number) => `/artist/merches/orders/${orderId}`,
};

export const NOTIFICATION_ENDPOINTS = {
  LIST: "/notifications",
  MARK_READ: (id: string) => `/notifications/${id}/read`,
  MARK_ALL_READ: "/notifications/read-all",
};

// Public (unauthenticated) artist profile, read by the server-rendered
// /artist/[handle] route so its SEO metadata is real rather than a placeholder.
export const PUBLIC_ARTIST_ENDPOINTS = {
  PROFILE: (handle: string) => `/artist/public/${encodeURIComponent(handle)}`,
};

// Admin-only artist discovery. `search` is the free-text query typed by the
// admin; an empty query lists the directory so the page is useful before any
// search has been made.

/** Verification state of an artist in the admin directory. */
export type ArtistDirectoryStatus = "all" | "verified" | "pending" | "unverified";

export const ADMIN_ARTIST_ENDPOINTS = {
  SEARCH: (search: string, page = 1, limit = 20, status?: ArtistDirectoryStatus) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const term = search.trim();
    if (term) params.set("q", term);
    if (status && status !== "all") params.set("status", status);
    return `/admin/artists?${params.toString()}`;
  },
};
