export const AUTH_ENDPOINTS = {
  REGISTER_EMAIL: "/auth/register-email",
  LOGIN_EMAIL: "/auth/login-email",
};

export const USER_ENDPOINTS = {
  PROFILE: "/artist/profile",
  UPDATE_PROFILE: "/artist/update-profile",
};

export const ARTIST_UPLOAD_ENDPOINTS = {
  UPLOAD_COVER: "/song/upload/cover",
  UPLOAD_CHUNK: "/song/upload/chunk",
  UPLOAD_SONG: "/song/upload/finalize",
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
};

export const ANALYTICS_ENDPOINTS = {
  SUMMARY: "/artist/analytics/summary",
  DATA: (period: "last30days" | "last90days") => `/artist/analytics?period=${period}`,
};

export const FANS_ENGAGEMENT_ENDPOINTS = {
  GET_FANS_ENGAGEMENT: "/artist/fans-engagement",
};

export const ALBUM_ENDPOINTS = {
  LIST: "/artist/albums",
  CREATE: "/artist/albums",
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
