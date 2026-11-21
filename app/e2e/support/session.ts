import type { Page } from "@playwright/test";

/** Matches the JWT payload the dashboard reads for display/expiry only. */
export const E2E_CLAIMS =
  "eyJzdWIiOiJhcnRpc3QtZTJlIiwicm9sZSI6ImFydGlzdCIsImV4cCI6NDEwMjQ0NDgwMH0";
export const E2E_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${E2E_CLAIMS}.e2e-signature`;

/**
 * Seeds the cookies a signed-in artist has after #521:
 * - `audioblocks_session_claims` is what the app reads via `hasSession()`.
 * - `audioblocks_jwt` is what `middleware.ts` still checks for protected routes.
 *
 * Cookies are set by URL rather than domain so the same helper works for
 * localhost, previews and staging across Chromium, Firefox and WebKit.
 */
export async function signInAsArtist(page: Page): Promise<void> {
  const origin = new URL(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000").origin;
  await page.context().addCookies([
    { name: "audioblocks_jwt", value: E2E_TOKEN, url: origin },
    { name: "audioblocks_session", value: E2E_TOKEN, url: origin },
    { name: "audioblocks_session_claims", value: E2E_CLAIMS, url: origin },
    { name: "audioblocks_2fa_enabled", value: "0", url: origin },
  ]);
}

/** A tiny valid-enough file for client-side type/size validation. */
export function testFile(name: string, type: string, bytes = 256): Buffer {
  return Buffer.alloc(bytes, 1);
}
