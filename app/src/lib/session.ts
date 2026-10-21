/**
 * Session cookie contract shared by the browser and the Next.js route handlers
 * (#521).
 *
 * The access and refresh tokens live only in httpOnly cookies, so no script on
 * the page can read them. The claims cookie holds the JWT payload without its
 * signature. The browser reads it for display and expiry hints only (name, role,
 * `exp`). The backend still verifies every request.
 */

export const SESSION_COOKIE = "audioblocks_session";
export const REFRESH_COOKIE = "audioblocks_refresh";
export const CLAIMS_COOKIE = "audioblocks_session_claims";
/** "1" or "0" from the login response. A UI hint, not a security decision. */
export const TWO_FACTOR_COOKIE = "audioblocks_2fa_enabled";
/** Pre-#521 cookie that held the raw JWT. Cleared on sight. */
export const LEGACY_JWT_COOKIE = "audioblocks_jwt";

/** Matches the backend's 7-day refresh token lifetime. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface SessionClaims {
  /** Expiry of the access token, in seconds since the epoch. */
  exp?: number;
  [claim: string]: unknown;
}

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isWellFormedToken(token: unknown): token is string {
  if (typeof token !== "string") return false;
  const segments = token.trim().split(".");
  return segments.length === 3 && segments.every((segment) => segment.trim().length > 0);
}

/** The base64url payload segment of a JWT, or `null` when it is not usable. */
export function getPayloadSegment(token: string): string | null {
  const segment = token.split(".")[1];
  return segment && BASE64URL_PATTERN.test(segment) ? segment : null;
}

/**
 * Decodes a base64url JSON segment. Uses `atob`, which exists in browsers and in
 * the Node runtime that serves route handlers.
 */
export function decodeClaimsSegment(segment: string): SessionClaims | null {
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const parsed: unknown = JSON.parse(atob(padded));
    return parsed && typeof parsed === "object" ? (parsed as SessionClaims) : null;
  } catch {
    return null;
  }
}

/**
 * Unverified claims of a JWT. Never an authorization input: the signature is not
 * checked here.
 */
export function decodeTokenClaims(token: string): SessionClaims | null {
  const segment = getPayloadSegment(token);
  return segment ? decodeClaimsSegment(segment) : null;
}
