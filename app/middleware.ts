import { type NextRequest, NextResponse } from "next/server";

export interface CspOptions {
  /** Development relaxes scripts for HMR and dev tools. */
  isDev: boolean;
  /** Per-request nonce allowing Next.js's inline bootstrap scripts in production. */
  nonce?: string;
}

const DEV_CONNECT_SOURCES = "http://localhost:*";

// Default known external service sources.
// Add additional hosts via the environment variables below after auditing.
const DEFAULT_CONNECT_SOURCES = [
  "https://*.sentry.io",
  "https://sentry.io",
  "https://*.privy.io",
  "https://auth.privy.io",
  "https://*.walletconnect.com",
  "https://*.walletconnect.org",
  "https://horizon.stellar.org",
  "https://horizon-testnet.stellar.org",
  "https://rpc.stellar.org",
  "https://soroban-testnet.stellar.org",
];

const DEFAULT_IMAGE_SOURCES: string[] = [];

const DEFAULT_FONT_SOURCES: string[] = [];

/**
 * Read a comma-separated list of CSP sources from an environment variable.
 * Values must be explicit origins/host sources, not broad schemes such as https:.
 */
function getCspSources(
  envValue: string | undefined,
  defaults: string[] = []
): string[] {
  const configured = (envValue ?? "")
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean);

  return [...new Set([...defaults, ...configured])];
}

function formatSources(sources: string[]): string {
  return sources.length > 0 ? ` ${sources.join(" ")}` : "";
}

/**
 * Builds the Content-Security-Policy for an environment.
 *
 * Production:
 * - No unsafe-eval
 * - No unsafe-inline scripts
 * - Uses per-request nonce and strict-dynamic
 * - Explicit external host allowlists
 *
 * Development:
 * - Allows unsafe-eval and inline scripts for HMR/dev tooling
 * - Allows localhost connections
 */
export function buildCsp({ isDev, nonce }: CspOptions): string {
  const thirdPartyScripts = [
    "https://js.stripe.com",
    "https://*.sentry.io",
  ];

  const scriptSources = isDev
    ? `'self' 'unsafe-inline' 'unsafe-eval' ${thirdPartyScripts.join(" ")}`
    : `'self' 'nonce-${nonce ?? ""}' 'strict-dynamic' ${thirdPartyScripts.join(" ")}`;

  const connectSources = getCspSources(
    process.env.CSP_CONNECT_SRC,
    DEFAULT_CONNECT_SOURCES
  );

  const imageSources = getCspSources(
    process.env.CSP_IMG_SRC,
    DEFAULT_IMAGE_SOURCES
  );

  const fontSources = getCspSources(
    process.env.CSP_FONT_SRC,
    DEFAULT_FONT_SOURCES
  );

  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${formatSources(imageSources)}`,
    `font-src 'self' data:${formatSources(fontSources)}`,
    `connect-src 'self' ${connectSources.join(" ")} ws: wss:${isDev ? ` ${DEV_CONNECT_SOURCES}` : ""}`,
    "media-src 'self' blob:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** A base64 nonce from 16 random bytes, generated fresh for each request. */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

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
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

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

export function getMiddlewareDecision(
  req: MiddlewareRequestLike
): MiddlewareDecision {
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

export function getCanonicalRedirect(
  request: NextRequest
): NextResponse | null {
  const canonicalHost = process.env.CANONICAL_HOST;

  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;

  const currentHost = rawHost.split(":")[0];

  const proto =
    request.headers.get("x-forwarded-proto") ||
    (request.url.startsWith("https") ? "https" : "http");

  const isProd = process.env.NODE_ENV === "production";

  // Enforce canonical host redirection (301 permanent) if configured.
  if (canonicalHost && currentHost && currentHost !== canonicalHost) {
    const redirectUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      `https://${canonicalHost}`
    );

    return NextResponse.redirect(redirectUrl, 301);
  }

  // Enforce HTTPS redirection in production behind a proxy/load-balancer.
  if (
    isProd &&
    proto === "http" &&
    !currentHost.includes("localhost") &&
    !currentHost.includes("127.0.0.1")
  ) {
    const targetHost = canonicalHost || currentHost;

    const redirectUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      `https://${targetHost}`
    );

    return NextResponse.redirect(redirectUrl, 301);
  }

  return null;
}

export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";

  // Production nonces let Next.js mark its own inline scripts.
  const nonce = isDev ? undefined : generateNonce();
  const csp = buildCsp({ isDev, nonce });

  const applySecurityHeaders = (response: NextResponse) => {
    // Enforce CSP instead of report-only mode.
    response.headers.set("Content-Security-Policy", csp);
    response.headers.delete("Content-Security-Policy-Report-Only");

    // HSTS: 2 years, include subdomains, preload eligible.
    if (!isDev) {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload"
      );
    }

    return response;
  };

  // 1. Canonical host and HTTPS redirects.
  const canonicalRedirect = getCanonicalRedirect(request);

  if (canonicalRedirect) {
    return applySecurityHeaders(canonicalRedirect);
  }

  // 2. Authentication decision.
  const decision = getMiddlewareDecision(request);

  if (decision.type === "redirect") {
    const redirectUrl = new URL(decision.redirectPath, request.url);
    const response = NextResponse.redirect(redirectUrl);

    return applySecurityHeaders(response);
  }

  // 3. Forward nonce/CSP to Next.js so it can nonce framework inline scripts.
  const requestHeaders = new Headers(request.headers);

  if (nonce) {
    requestHeaders.set("Content-Security-Policy", csp);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/(.*)"],
};