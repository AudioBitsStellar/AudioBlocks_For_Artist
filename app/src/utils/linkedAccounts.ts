/**
 * Helpers for the linked-accounts settings screen (#414).
 *
 * Social handles are validated per platform so the artist gets a useful error
 * before we try to open an OAuth window, and wallet addresses reuse the same
 * Stellar rules as the royalty splits (#417).
 */

export const SOCIAL_PLATFORMS = [
  { id: "x", label: "X", placeholder: "@yourhandle" },
  { id: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { id: "tiktok", label: "TikTok", placeholder: "@yourhandle" },
  { id: "youtube", label: "YouTube", placeholder: "@yourchannel" },
  { id: "spotify", label: "Spotify", placeholder: "Artist ID or profile URL" },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]["id"];

const HANDLE_RULES: Record<SocialPlatformId, { pattern: RegExp; hint: string }> = {
  x: { pattern: /^[A-Za-z0-9_]{1,15}$/, hint: "1-15 letters, numbers or underscores." },
  instagram: {
    pattern: /^[A-Za-z0-9._]{1,30}$/,
    hint: "1-30 letters, numbers, dots or underscores.",
  },
  tiktok: { pattern: /^[A-Za-z0-9._]{1,24}$/, hint: "1-24 letters, numbers, dots or underscores." },
  youtube: {
    pattern: /^[A-Za-z0-9._-]{3,30}$/,
    hint: "3-30 characters, letters, numbers, dashes, dots or underscores.",
  },
  spotify: {
    pattern: /^(https:\/\/open\.spotify\.com\/artist\/)?[A-Za-z0-9]{22}$/,
    hint: "Paste your Spotify artist ID or the full artist URL.",
  },
};

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;

export const MAX_LINKED_ACCOUNTS = 12;

export function isStellarAddress(value: string): boolean {
  return STELLAR_ADDRESS.test(value.trim());
}

/**
 * Reduces whatever the artist pasted down to the bare handle: strips a URL
 * scheme and host, keeps the last non-empty path segment and drops a leading
 * `@`, so `@sandy`, `https://x.com/sandy` and `x.com/sandy/` all become `sandy`.
 */
export function normaliseHandle(value: string): string {
  let handle = value.trim();
  handle = handle.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  if (handle.includes(".") && handle.includes("/")) {
    handle = handle.slice(handle.indexOf("/") + 1);
  }
  const segment = handle.split("/").filter(Boolean).pop() ?? "";
  return segment.replace(/^@+/, "").trim();
}

export type HandleValidation = { ok: true; handle: string } | { ok: false; message: string };

export function validateHandle(platform: SocialPlatformId, value: string): HandleValidation {
  const handle = normaliseHandle(value);
  if (!handle) {
    return { ok: false, message: "Enter a handle to link this account." };
  }
  if (!HANDLE_RULES[platform].pattern.test(handle)) {
    return { ok: false, message: `That does not look right. ${HANDLE_RULES[platform].hint}` };
  }
  return { ok: true, handle };
}

export function socialProfileUrl(platform: SocialPlatformId, handle: string): string {
  const clean = normaliseHandle(handle);
  const hosts: Record<SocialPlatformId, string> = {
    x: "https://x.com/",
    instagram: "https://instagram.com/",
    tiktok: "https://tiktok.com/@",
    youtube: "https://youtube.com/@",
    spotify: "https://open.spotify.com/artist/",
  };
  return `${hosts[platform]}${clean}`;
}

export function isHandleTaken(
  platform: SocialPlatformId,
  handle: string,
  existing: { platform: SocialPlatformId; handle: string }[],
  ignoreId?: string
): boolean {
  const normalised = handle.trim().toLowerCase();
  return existing.some(
    (entry) =>
      entry.id !== ignoreId &&
      entry.platform === platform &&
      entry.handle.trim().toLowerCase() === normalised
  );
}
