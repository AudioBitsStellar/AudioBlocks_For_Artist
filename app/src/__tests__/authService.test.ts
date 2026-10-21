// @vitest-environment node
//
// Server-side session handling (#521): the same-origin backend proxy and the
// session routes. The access token must never reach the browser, and an expired
// access token must be renewed once without signing the artist out.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/backend/[...path]/route";
import { POST as startSession } from "@/app/api/session/route";
import { POST as refreshRoute } from "@/app/api/session/refresh/route";

const BACKEND = "http://backend.test/api";

function makeToken(claims: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}.signature`;
}

const OLD_TOKEN = makeToken({ id: "user-1", exp: 1 });
const NEW_TOKEN = makeToken({ id: "user-1", exp: 9999999999 });
const REFRESH_TOKEN = "refresh-old";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function proxyRequest(cookies: Record<string, string>): NextRequest {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest("http://localhost:3000/api/backend/users/profile", {
    headers: cookie ? { cookie } : {},
  });
}

const profileParams = { params: Promise.resolve({ path: ["users", "profile"] }) };

describe("backend proxy (#521)", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = BACKEND;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("forwards the request with the httpOnly access token as a Bearer header", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: { id: "user-1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(proxyRequest({ audioblocks_session: OLD_TOKEN }), profileParams);

    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BACKEND}/users/profile`);
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${OLD_TOKEN}`);
    expect(headers.get("cookie")).toBeNull();
  });

  it("renews an expired access token once and retries the request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ success: true, token: NEW_TOKEN, refreshToken: "refresh-new" })
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: "user-1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      proxyRequest({ audioblocks_session: OLD_TOKEN, audioblocks_refresh: REFRESH_TOKEN }),
      profileParams
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${BACKEND}/auth/refresh`,
      expect.objectContaining({ method: "POST" })
    );
    const [, retryInit] = fetchMock.mock.calls[2] as unknown as [string, RequestInit];
    expect(new Headers(retryInit.headers).get("authorization")).toBe(`Bearer ${NEW_TOKEN}`);
    expect(response.cookies.get("audioblocks_session")?.value).toBe(NEW_TOKEN);
    expect(response.cookies.get("audioblocks_refresh")?.value).toBe("refresh-new");
  });

  it("clears the session when the refresh token is refused", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "revoked" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      proxyRequest({ audioblocks_session: OLD_TOKEN, audioblocks_refresh: REFRESH_TOKEN }),
      profileParams
    );

    expect(response.status).toBe(401);
    expect(response.cookies.get("audioblocks_session")?.value).toBe("");
    expect(response.cookies.get("audioblocks_refresh")?.value).toBe("");
  });

  it("answers 502 when the backend cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      })
    );

    const response = await GET(proxyRequest({}), profileParams);

    expect(response.status).toBe(502);
  });
});

describe("session routes (#521)", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = BACKEND;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("stores the access token in an httpOnly cookie and exposes only the claims", async () => {
    const request = new NextRequest("http://localhost:3000/api/session", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ token: OLD_TOKEN, refreshToken: REFRESH_TOKEN }),
    });

    const response = await startSession(request);

    expect(response.status).toBe(200);
    expect(response.cookies.get("audioblocks_session")?.httpOnly).toBe(true);
    expect(response.cookies.get("audioblocks_refresh")?.httpOnly).toBe(true);
    const claims = response.cookies.get("audioblocks_session_claims");
    expect(claims?.httpOnly).toBeFalsy();
    expect(claims?.value).toBe(OLD_TOKEN.split(".")[1]);
  });

  it("refuses a session start from a foreign origin", async () => {
    const request = new NextRequest("http://localhost:3000/api/session", {
      method: "POST",
      headers: { origin: "https://attacker.test", "content-type": "application/json" },
      body: JSON.stringify({ token: OLD_TOKEN }),
    });

    const response = await startSession(request);

    expect(response.status).toBe(403);
    expect(response.cookies.get("audioblocks_session")).toBeUndefined();
  });

  it("renews the session from the refresh cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ success: true, token: NEW_TOKEN, refreshToken: "next" }))
    );
    const request = new NextRequest("http://localhost:3000/api/session/refresh", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        cookie: `audioblocks_refresh=${REFRESH_TOKEN}`,
      },
    });

    const response = await refreshRoute(request);

    expect(response.status).toBe(200);
    expect(response.cookies.get("audioblocks_session")?.value).toBe(NEW_TOKEN);
  });
});
