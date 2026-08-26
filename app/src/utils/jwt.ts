import Cookies from "js-cookie";

interface DecodedTokenClaims {
  name?: string;
  username?: string;
  email?: string;
  [key: string]: unknown;
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

/**
 * Best-effort, unverified read of display-name-ish claims out of the stored
 * JWT, purely for UI text (e.g. the print report header). Never use this for
 * authorization decisions — the signature is not checked.
 */
export function getDisplayNameFromToken(fallback = "Artist"): string {
  if (typeof window === "undefined") return fallback;

  try {
    const token = Cookies.get("audioblocks_jwt") || localStorage.getItem("token");
    if (!token) return fallback;

    const payload = token.split(".")[1];
    if (!payload) return fallback;

    const claims: DecodedTokenClaims = JSON.parse(decodeBase64Url(payload));
    return claims.name || claims.username || claims.email || fallback;
  } catch {
    return fallback;
  }
}
