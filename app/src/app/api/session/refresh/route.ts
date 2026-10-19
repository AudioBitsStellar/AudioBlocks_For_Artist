import { NextRequest, NextResponse } from "next/server";
import { REFRESH_COOKIE } from "@/lib/session";
import {
  applySessionCookies,
  clearSessionCookies,
  isSameOriginRequest,
  rotateSession,
} from "@/lib/sessionServer";

/**
 * Renews the access token from the httpOnly refresh cookie. The client calls
 * this before the session expires. The backend proxy also calls it on a 401.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const tokens = refreshToken ? await rotateSession(refreshToken) : null;

  if (!tokens) {
    const response = NextResponse.json(
      { success: false, message: "Session expired" },
      { status: 401 }
    );
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ success: true });
  applySessionCookies(response, tokens);
  return response;
}
