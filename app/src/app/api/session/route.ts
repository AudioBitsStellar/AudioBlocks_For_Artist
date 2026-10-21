import { NextRequest, NextResponse } from "next/server";
import { REFRESH_COOKIE, isWellFormedToken } from "@/lib/session";
import {
  applySessionCookies,
  clearSessionCookies,
  isSameOriginRequest,
  revokeRefreshToken,
} from "@/lib/sessionServer";

/**
 * Starts a browser session: the tokens from a successful login move into
 * httpOnly cookies, so the page's JavaScript never holds them (#521).
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  let body: { token?: unknown; refreshToken?: unknown; twoFactorEnabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid body" }, { status: 400 });
  }

  if (!isWellFormedToken(body.token)) {
    return NextResponse.json({ success: false, message: "Invalid token" }, { status: 400 });
  }

  const refreshToken =
    typeof body.refreshToken === "string" && body.refreshToken ? body.refreshToken : undefined;
  const twoFactorEnabled =
    typeof body.twoFactorEnabled === "boolean" ? body.twoFactorEnabled : undefined;

  const response = NextResponse.json({ success: true });
  applySessionCookies(response, { token: body.token, refreshToken }, twoFactorEnabled);
  return response;
}

/** Ends the session: revokes the refresh token on the backend and clears cookies. */
export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
