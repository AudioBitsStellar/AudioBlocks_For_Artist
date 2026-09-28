import Cookies from "js-cookie";

import { isRole, type Role } from "@/types/role";

interface DecodedTokenClaims {
  name?: string;
  username?: string;
  email?: string;
  role?: unknown;
  user_role?: unknown;
  user?: unknown;
  [key: string]: unknown;
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

/**
 * Best-effort, unverified decode of the stored session JWT's payload segment.
 * Returns `null` on the server, when there is no token, or when the payload
 * is missing / not valid JSON. The signature is never checked here.
 */
function readTokenClaims(): DecodedTokenClaims | null {
  if (typeof window === "undefined") return null;
  try {
    const token = Cookies.get("audioblocks_jwt") || localStorage.getItem("token");
    if (!token) return null;
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload)) as DecodedTokenClaims;
  } catch {
    return null;
  }
}

/**
 * Best-effort, unverified read of display-name-ish claims out of the stored
 * JWT, purely for UI text (e.g. the print report header). Never use this for
 * authorization decisions — the signature is not checked.
 */
export function getDisplayNameFromToken(fallback = "Artist"): string {
  if (typeof window === "undefined") return fallback;

  const claims = readTokenClaims();
  if (!claims) return fallback;
  return claims.name || claims.username || claims.email || fallback;
}

/**
 * Best-effort, unverified read of the session account's email address from the
 * stored JWT, used to prefill the onboarding verification step. Returns `null`
 * when the claim is absent.
 *
 * Same caveat as {@link getDisplayNameFromToken}: the signature is not checked,
 * so this is display/prefill material only, never an authorization input.
 */
export function getEmailFromToken(): string | null {
  const claims = readTokenClaims();
  return typeof claims?.email === "string" && claims.email ? claims.email : null;
}

/**
 * Best-effort, unverified read of the `role` claim from the stored session
 * JWT (checking `role`, `user_role`, then a nested `user.role`). Returns
 * `null` when there is no token, the claim is absent, or its value is not one
 * of the known {@link Role}s.
 *
 * Like {@link getDisplayNameFromToken} this does NOT verify the signature, so
 * it must not be treated as a security boundary — it only decides what the UI
 * offers. Backend endpoints remain the real authorization check.
 */
export function getRoleFromToken(): Role | null {
  const raw = readRawRoleClaim();
  return isRole(raw) ? raw : null;
}

/**
 * Platform-wide account role carried by the session JWT, as opposed to the
 * workspace {@link Role} (owner/manager/viewer) read by `getRoleFromToken`.
 * Mirrors the `role` values the API accepts at registration
 * (`RegisterEmailPayload.role`).
 */
export type AccountRole = "artist" | "listener" | "admin";

const ACCOUNT_ROLES: ReadonlyArray<AccountRole> = ["artist", "listener", "admin"];

function readRawRoleClaim(): unknown {
  const claims = readTokenClaims();
  if (!claims) return undefined;

  const nested =
    claims.user && typeof claims.user === "object"
      ? (claims.user as { role?: unknown }).role
      : undefined;
  return claims.role ?? claims.user_role ?? nested;
}

/**
 * Best-effort, unverified read of the platform account role (`admin` unlocks
 * the admin-only surfaces, e.g. the artist directory from issue #420). Returns
 * `null` when there is no token, or when the claim is missing/recognised.
 *
 * Same caveat as `getRoleFromToken`: this is UX guidance for hiding surfaces,
 * never an authorization check. The backend still rejects non-admin tokens.
 */
export function getAccountRoleFromToken(): AccountRole | null {
  const raw = readRawRoleClaim();
  return typeof raw === "string" && (ACCOUNT_ROLES as ReadonlyArray<string>).includes(raw)
    ? (raw as AccountRole)
    : null;
}

/** Whether the signed-in session carries the platform `admin` role. */
export function isAdminSession(): boolean {
  return getAccountRoleFromToken() === "admin";
}
