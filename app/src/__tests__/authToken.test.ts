import Cookies from "js-cookie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  endSession,
  establishSession,
  getSessionExpiresAt,
  hasSession,
  isSessionExpired,
  purgeLegacyTokenStorage,
  readSessionClaims,
  refreshSession,
} from "@/api/session";
import { CLAIMS_COOKIE, LEGACY_JWT_COOKIE, TWO_FACTOR_COOKIE } from "@/lib/session";

/** Builds an unsigned JWT with the given claims. The client never checks signatures. */
function makeToken(claims: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}.signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Mirrors what the server sets after a session starts: only the payload is readable. */
function setClaimsCookie(token: string): void {
  Cookies.set(CLAIMS_COOKIE, token.split(".")[1]);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("browser session (#521)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    for (const name of [CLAIMS_COOKIE, TWO_FACTOR_COOKIE, LEGACY_JWT_COOKIE]) {
      Cookies.remove(name);
    }
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  describe("establishSession", () => {
    it("hands the tokens to the server and leaves nothing in localStorage", async () => {
      localStorage.setItem("token", "legacy-token");
      localStorage.setItem("token_expiry", "123");
      const fetchMock = vi.fn(async () => jsonResponse({ success: true }));
      vi.stubGlobal("fetch", fetchMock);

      const token = makeToken({ role: "artist", exp: nowSeconds() + 900 });
      const stored = await establishSession({ token, refreshToken: "refresh-1" });

      expect(stored).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/session",
        expect.objectContaining({ method: "POST", credentials: "same-origin" })
      );
      const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toMatchObject({
        token,
        refreshToken: "refresh-1",
      });
      expect(localStorage.length).toBe(0);
    });

    it("reports failure when the server refuses the session", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: false }, 400)));

      const stored = await establishSession({ token: makeToken({ exp: nowSeconds() + 60 }) });

      expect(stored).toBe(false);
    });
  });

  describe("readable claims", () => {
    it("reads role and expiry from the claims cookie", () => {
      const exp = nowSeconds() + 900;
      setClaimsCookie(makeToken({ role: "artist", exp }));

      expect(hasSession()).toBe(true);
      expect(readSessionClaims()).toMatchObject({ role: "artist", exp });
      expect(getSessionExpiresAt()).toBe(exp * 1000);
    });

    it("reports no session when the claims cookie is absent", () => {
      expect(hasSession()).toBe(false);
      expect(readSessionClaims()).toBeNull();
      expect(getSessionExpiresAt()).toBeNull();
    });

    it("treats an access token whose exp has passed as expired", () => {
      setClaimsCookie(makeToken({ exp: nowSeconds() - 1 }));

      expect(isSessionExpired()).toBe(true);
    });

    it("treats a session with no exp claim as not expired", () => {
      setClaimsCookie(makeToken({ role: "artist" }));

      expect(isSessionExpired()).toBe(false);
    });
  });

  describe("refreshSession", () => {
    it("returns true when the server renews the access token", async () => {
      const fetchMock = vi.fn(async () => jsonResponse({ success: true }));
      vi.stubGlobal("fetch", fetchMock);

      await expect(refreshSession()).resolves.toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/session/refresh",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("returns false when the refresh token is no longer accepted", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: false }, 401)));

      await expect(refreshSession()).resolves.toBe(false);
    });
  });

  describe("endSession", () => {
    it("clears the readable cookies and asks the server to end the session", async () => {
      setClaimsCookie(makeToken({ exp: nowSeconds() + 900 }));
      Cookies.set(TWO_FACTOR_COOKIE, "1");
      const fetchMock = vi.fn(async () => jsonResponse({ success: true }));
      vi.stubGlobal("fetch", fetchMock);

      await endSession();

      expect(Cookies.get(CLAIMS_COOKIE)).toBeUndefined();
      expect(Cookies.get(TWO_FACTOR_COOKIE)).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/session",
        expect.objectContaining({ method: "DELETE", keepalive: true })
      );
    });

    it("never throws when the server cannot be reached", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new TypeError("network down");
        })
      );

      await expect(endSession()).resolves.toBeUndefined();
    });
  });

  describe("purgeLegacyTokenStorage", () => {
    it("removes the raw JWT that pre-#521 builds kept in cookies and localStorage", () => {
      Cookies.set(LEGACY_JWT_COOKIE, makeToken({ exp: nowSeconds() + 900 }));
      localStorage.setItem("token", "legacy-token");
      localStorage.setItem("audioblocks:security-settings:v1", '{"setup":{}}');

      purgeLegacyTokenStorage();

      expect(Cookies.get(LEGACY_JWT_COOKIE)).toBeUndefined();
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("audioblocks:security-settings:v1")).toBeNull();
    });
  });
});
