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
  UPLOAD_CHUNK:  "/song/upload/chunk",
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
};

export const MERCH_ENDPOINTS = {
  LIST: "/artist/merches",
  CREATE: "/artist/merches",
  UPDATE: (id: number) => `/artist/merches/${id}`,
  DELETE: (id: number) => `/artist/merches/${id}`,
};

export const EARNINGS_ENDPOINTS = {
  GET_EARNINGS: "/artist/earnings",
};
