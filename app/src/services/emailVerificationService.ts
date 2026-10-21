/**
 * Artist email verification (#459, #519).
 *
 * The backend emails a link containing a one-time token. Opening
 * `/verify-email/<token>` on the web app calls `GET /auth/verify-email/:token`.
 * Verification state lives on the server, as `emailVerified` on the profile.
 * Nothing in this module generates, stores or compares a code.
 */

import { createApiClient, type ApiError } from "@/api/axios";
import { AUTH_ENDPOINTS } from "@/api/api-endpoint";

export type VerifyEmailResult =
  | { ok: true }
  | { ok: false; reason: "invalid_or_expired" | "unavailable" };

/**
 * Consumes the token from the verification email.
 *
 * A 4xx means the link itself is bad (used, expired or made up). Anything else
 * may succeed on a later attempt, so it is reported as `unavailable`.
 */
export async function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, reason: "invalid_or_expired" };

  try {
    const client = await createApiClient();
    await client.get(AUTH_ENDPOINTS.VERIFY_EMAIL(encodeURIComponent(trimmed)));
    return { ok: true };
  } catch (error) {
    const status = (error as Partial<ApiError>).status ?? 0;
    if (status >= 400 && status < 500) return { ok: false, reason: "invalid_or_expired" };
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Whether the backend says the account still owes email verification. An unknown
 * value counts as not owed, so accounts that predate the check are never locked out.
 */
export function isEmailUnverified(emailVerified: boolean | null | undefined): boolean {
  return emailVerified === false;
}
