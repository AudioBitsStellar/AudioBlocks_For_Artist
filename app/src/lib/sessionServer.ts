/**
 * Server-side session helpers for the Next.js route handlers (#521). Nothing in
 * this module may be imported by client components: it reads the backend URL
 * and writes httpOnly cookies.
 */
import type { NextRequest, NextResponse } from "next/server";
import {
  CLAIMS_COOKIE,
  LEGACY_JWT_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  TWO_FACTOR_COOKIE,
  getPayloadSegment,
  isWellFormedToken,
} from "@/lib/session";

export interface SessionTokens {
  token: string;
  refreshToken?: string;
}

const DEFAULT_BACKEND_BASE_URL = "http://localhost:3000/api";

/** Base URL of the AudioBlock backend, including its `/api` prefix. */
export function getBackendBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return (configured || DEFAULT_BACKEND_BASE_URL).replace(/\/+$/, "");
}

const isProduction = process.env.NODE_ENV === "production";

function cookieOptions(httpOnly: boolean) {
  return {
    httpOnly,
    path: "/",
    sameSite: "lax" as const,
    secure: isProduction,
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Writes the session cookies. The access token is kept httpOnly; its unsigned
 * payload goes into a readable claims cookie for display and expiry hints.
 * A missing refresh token clears any older one, so a stale refresh token can
 * never outlive the session it belonged to.
 */
export function applySessionCookies(
  response: NextResponse,
  tokens: SessionTokens,
  twoFactorEnabled?: boolean
): void {
  response.cookies.set(SESSION_COOKIE, tokens.token, cookieOptions(true));

  const payload = getPayloadSegment(tokens.token);
  if (payload) {
    response.cookies.set(CLAIMS_COOKIE, payload, cookieOptions(false));
  }

  if (tokens.refreshToken) {
    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(true));
  } else {
    response.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  }

  if (typeof twoFactorEnabled === "boolean") {
    response.cookies.set(TWO_FACTOR_COOKIE, twoFactorEnabled ? "1" : "0", cookieOptions(false));
  }

  // Pre-#521 sessions stored the raw JWT in a readable cookie. Drop it.
  response.cookies.set(LEGACY_JWT_COOKIE, "", { path: "/", maxAge: 0 });
}

/** Removes every session cookie from the browser. */
export function clearSessionCookies(response: NextResponse): void {
  const names = [
    SESSION_COOKIE,
    REFRESH_COOKIE,
    CLAIMS_COOKIE,
    TWO_FACTOR_COOKIE,
    LEGACY_JWT_COOKIE,
  ];
  for (const name of names) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

/**
 * Trades a refresh token for a new access token. The backend rotates refresh
 * tokens, so the returned refresh token replaces the old one.
 *
 * @returns The new tokens, or `null` when the backend refuses the refresh token.
 */
export async function rotateSession(refreshToken: string): Promise<SessionTokens | null> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { token?: unknown; refreshToken?: unknown };
    if (!isWellFormedToken(body.token)) return null;

    return {
      token: body.token,
      refreshToken: typeof body.refreshToken === "string" ? body.refreshToken : refreshToken,
    };
  } catch {
    return null;
  }
}

/** Best-effort server-side revocation on logout. Failures never block logout. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    await fetch(`${getBackendBaseUrl()}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
  } catch {
    // The cookies are cleared either way.
  }
}

/**
 * Same-origin guard for the session routes. A browser sends `Origin` on
 * cross-origin POSTs, so a foreign origin is refused. Requests with no `Origin`
 * are allowed unless the browser labels them cross-site.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin) return origin === request.nextUrl.origin;
  return request.headers.get("sec-fetch-site") !== "cross-site";
}
