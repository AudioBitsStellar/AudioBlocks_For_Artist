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
  const claims = readTokenClaims();
  if (!claims) return null;

  const nested =
    claims.user && typeof claims.user === "object"
      ? (claims.user as { role?: unknown }).role
      : undefined;
  const raw = claims.role ?? claims.user_role ?? nested;

  return isRole(raw) ? raw : null;
}
