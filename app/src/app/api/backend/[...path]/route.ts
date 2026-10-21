import { NextRequest, NextResponse } from "next/server";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/session";
import {
  applySessionCookies,
  clearSessionCookies,
  getBackendBaseUrl,
  rotateSession,
  type SessionTokens,
} from "@/lib/sessionServer";

/**
 * Same-origin proxy to the AudioBlock backend (#521). The browser never sees
 * the access token: it is read from the httpOnly cookie and sent as a Bearer
 * header. An expired access token is refreshed once with the refresh cookie.
 *
 * `/api/backend/<path>` maps to `<NEXT_PUBLIC_API_BASE_URL>/<path>`.
 */

/** Request headers never forwarded upstream. Auth and cookies are set here. */
const REQUEST_HEADERS_TO_DROP = new Set([
  "authorization",
  "cookie",
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "accept-encoding",
]);

/** Response headers never passed back to the browser. */
const RESPONSE_HEADERS_TO_DROP = new Set([
  "set-cookie",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
]);

/**
 * Bodies that can be large (uploads) are streamed, not buffered. A streamed
 * body cannot be replayed, so it is not retried after a refresh.
 */
const STREAMED_CONTENT_TYPES = /^(multipart\/form-data|application\/octet-stream)/i;

type ProxyContext = { params: Promise<{ path: string[] }> };

function forwardHeaders(incoming: Headers, accessToken?: string): Headers {
  const headers = new Headers();
  incoming.forEach((value, key) => {
    if (!REQUEST_HEADERS_TO_DROP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }
  return headers;
}

function responseHeaders(upstream: Headers): Headers {
  const headers = new Headers();
  upstream.forEach((value, key) => {
    if (!RESPONSE_HEADERS_TO_DROP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "private, no-store");
  }
  return headers;
}

async function proxy(request: NextRequest, context: ProxyContext): Promise<NextResponse> {
  const { path } = await context.params;
  const target = `${getBackendBaseUrl()}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const streamed = STREAMED_CONTENT_TYPES.test(request.headers.get("content-type") ?? "");
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? (streamed ? request.body : await request.arrayBuffer()) : undefined;

  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  const send = (token?: string) => {
    const init: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers: forwardHeaders(request.headers, token),
      body,
      signal: request.signal,
      cache: "no-store",
      // Required by the runtime when the request body is a stream.
      ...(streamed ? { duplex: "half" as const } : {}),
    };
    return fetch(target, init);
  };

  let upstream: Response;
  try {
    upstream = await send(accessToken);
  } catch {
    return NextResponse.json({ success: false, message: "Backend unavailable" }, { status: 502 });
  }

  let rotated: SessionTokens | null = null;
  if (upstream.status === 401 && refreshToken) {
    rotated = await rotateSession(refreshToken);
    if (rotated && !streamed) {
      await upstream.body?.cancel();
      try {
        upstream = await send(rotated.token);
      } catch {
        return NextResponse.json({ success: false, message: "Backend unavailable" }, { status: 502 });
      }
    }
  }

  const noBody = upstream.status === 204 || upstream.status === 304;
  const response = new NextResponse(noBody ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders(upstream.headers),
  });

  if (rotated) {
    applySessionCookies(response, rotated);
    if (streamed) {
      // The upload could not be replayed. Tell the client to retry it once with
      // the refreshed session instead of signing the artist out.
      response.headers.set("x-session-refreshed", "1");
    }
  } else if (upstream.status === 401 && refreshToken) {
    clearSessionCookies(response);
  }

  return response;
}

export async function GET(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}
