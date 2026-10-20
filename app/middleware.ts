import { type NextRequest, NextResponse } from "next/server";

export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.sentry.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: ws: wss:",
  "media-src 'self' https: blob:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export interface MiddlewareCookieReader {
  get(name: string): { value: string } | undefined;
}

export interface MiddlewareRequestLike {
  nextUrl: {
    pathname: string;
    search: string;
  };
  cookies: MiddlewareCookieReader;
}

export type MiddlewareDecision =
  | { type: "next" }
  | { type: "redirect"; redirectPath: string };

function decodeBase64Url(segment: string): string {
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    if (typeof atob === "function") {
      return atob(padded);
    }
    return Buffer.from(padded, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const jsonStr = decodeBase64Url(parts[1]);
    if (!jsonStr) return true;
    const payload = JSON.parse(jsonStr) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function sanitizeReturnTo(path: string): string {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/\\")
  ) {
    return "/dashboard";
  }
  return path;
}

export function getMiddlewareDecision(req: MiddlewareRequestLike): MiddlewareDecision {
  const { pathname, search } = req.nextUrl;

  const isProtected =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (!isProtected) {
    return { type: "next" };
  }

  const privyToken =
    req.cookies.get("privy-token")?.value ||
    req.cookies.get("privy-session")?.value;
  const appJwt =
    req.cookies.get("audioblocks_jwt")?.value ||
    req.cookies.get("token")?.value;

  const activeToken = privyToken || appJwt;

  if (!activeToken || isTokenExpired(activeToken)) {
    const rawTarget = `${pathname}${search}`;
    const returnTo = sanitizeReturnTo(rawTarget);
    return {
      type: "redirect",
      redirectPath: `/login?returnTo=${encodeURIComponent(returnTo)}`,
    };
  }

  return { type: "next" };
}

export function middleware(request: NextRequest) {
  const decision = getMiddlewareDecision(request);

  if (decision.type === "redirect") {
    const redirectUrl = new URL(decision.redirectPath, request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set("Content-Security-Policy-Report-Only", CSP);
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy-Report-Only", CSP);
  return response;
}

export const config = {
  matcher: ["/(.*)"],
};
