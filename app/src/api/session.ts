/**
 * Browser side of the session (#521). The tokens themselves are httpOnly and
 * never reach this module. It reads the claims cookie for display and expiry,
 * and calls the same-origin session routes to start, renew and end a session.
 */
import Cookies from "js-cookie";
import {
  CLAIMS_COOKIE,
  LEGACY_JWT_COOKIE,
  TWO_FACTOR_COOKIE,
  decodeClaimsSegment,
  type SessionClaims,
} from "@/lib/session";

/** Same-origin path that the backend proxy serves. */
export const API_PROXY_BASE_URL = "/api/backend";

export const SESSION_ENDPOINTS = {
  SESSION: "/api/session",
  REFRESH: "/api/session/refresh",
} as const;

/** localStorage keys that held auth or security state before #521 and #518. */
const LEGACY_LOCAL_STORAGE_KEYS = [
  "token",
  "token_expiry",
  "auth_token",
  "audioblocks:security-settings:v1",
  "audioblocks:email-verification:v1",
];

/** Claims of the signed-in session, or `null` when there is no session. */
export function readSessionClaims(): SessionClaims | null {
  if (typeof window === "undefined") return null;
  const segment = Cookies.get(CLAIMS_COOKIE);
  return segment ? decodeClaimsSegment(segment) : null;
}

/** Whether a session cookie exists. The backend still decides whether it is valid. */
export function hasSession(): boolean {
  return readSessionClaims() !== null;
}

/** Epoch ms when the access token expires, or `null` when unknown. */
export function getSessionExpiresAt(): number | null {
  const exp = readSessionClaims()?.exp;
  return typeof exp === "number" ? exp * 1000 : null;
}

/**
 * Whether the access token has expired. The session may still be renewable
 * with the refresh cookie, so callers should try `refreshSession()` first.
 */
export function isSessionExpired(now: number = Date.now()): boolean {
  const expiresAt = getSessionExpiresAt();
  return expiresAt !== null && now >= expiresAt;
}

/** Removes auth and security state left in localStorage or cookies by older builds. */
export function purgeLegacyTokenStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked: nothing persisted to clear.
  }
  Cookies.remove(LEGACY_JWT_COOKIE);
}

export interface EstablishSessionInput {
  token: string;
  refreshToken?: string;
  /** From the login response. Omit when unknown. */
  twoFactorEnabled?: boolean;
}

/**
 * Moves a fresh login into httpOnly cookies.
 *
 * @returns `true` when the session was stored, `false` otherwise.
 */
export async function establishSession(input: EstablishSessionInput): Promise<boolean> {
  purgeLegacyTokenStorage();
  try {
    const res = await fetch(SESSION_ENDPOINTS.SESSION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Renews the access token from the refresh cookie.
 *
 * @returns `true` when a new access token was issued.
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(SESSION_ENDPOINTS.REFRESH, {
      method: "POST",
      credentials: "same-origin",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Ends the session on the server and clears the readable cookies at once, so
 * the UI updates before the request returns. Never throws.
 */
export async function endSession(): Promise<void> {
  purgeLegacyTokenStorage();
  if (typeof window === "undefined") return;

  Cookies.remove(CLAIMS_COOKIE);
  Cookies.remove(TWO_FACTOR_COOKIE);
  try {
    await fetch(SESSION_ENDPOINTS.SESSION, {
      method: "DELETE",
      credentials: "same-origin",
      // Survives the page navigation that follows a 401 redirect to /login.
      keepalive: true,
    });
  } catch {
    // The cookies that matter are httpOnly and expire server-side regardless.
  }
}

export type TwoFactorHint = "enabled" | "disabled" | "unknown";

/**
 * Whether the account has 2FA on, as last reported by the login response.
 * `"unknown"` covers sessions started before the hint existed.
 */
export function getTwoFactorHint(): TwoFactorHint {
  const value = Cookies.get(TWO_FACTOR_COOKIE);
  if (value === "1") return "enabled";
  if (value === "0") return "disabled";
  return "unknown";
}

export function setTwoFactorHint(enabled: boolean): void {
  Cookies.set(TWO_FACTOR_COOKIE, enabled ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: 7,
  });
}
