/**
 * Account security for email/password artists: two-factor authentication
 * (#413, #518) and login alerts.
 *
 * Two-factor authentication is owned by the backend (`/auth/2fa/*`). The
 * browser never generates a secret or a recovery code. The enrolment response
 * supplies the secret, QR code and recovery codes, and the recovery codes are
 * held in component state only long enough to show them once.
 *
 * The backend has no endpoint that reports 2FA status for email accounts, and
 * `enable` replaces the existing secret. So the UI relies on a hint from the
 * login response (see `getTwoFactorHint`) and never calls `enable` unless the
 * hint says 2FA is off.
 *
 * Login alerts have no backend endpoint yet. They stay a local preference.
 */

import { createApiClient } from "@/api/axios";
import { SECURITY_ENDPOINTS } from "@/api/api-endpoint";
import { setTwoFactorHint } from "@/api/session";

/** What `POST /auth/2fa/enable` returns. Two-factor is on server-side from this point. */
export interface TwoFactorEnrollment {
  /** Shared secret for manual entry into an authenticator app. */
  secret: string;
  otpauthUrl: string;
  /** PNG data URL of the QR code for `otpauthUrl`, from the backend. */
  qrCodeDataUrl: string;
  /** Single-use recovery codes. Shown once, then only their hashes are kept. */
  backupCodes: string[];
}

export interface TwoFactorSession {
  token: string;
  refreshToken?: string;
}

/**
 * Starts enrolment. The account has 2FA on as soon as this succeeds, so the
 * caller must finish with `confirmTwoFactorCode` before the secret is lost.
 */
export async function beginTwoFactorEnrollment(): Promise<TwoFactorEnrollment> {
  const client = await createApiClient();
  const res = await client.post<TwoFactorEnrollment>(SECURITY_ENDPOINTS.TWO_FACTOR_ENABLE);
  return res.data;
}

/** Proves the authenticator app has the secret. Rejects a wrong code with an `ApiError`. */
export async function confirmTwoFactorCode(code: string): Promise<void> {
  const client = await createApiClient();
  await client.post(SECURITY_ENDPOINTS.TWO_FACTOR_VERIFY, { code });
  setTwoFactorHint(true);
}

/** Turns 2FA off. Requires a current code from the authenticator app. */
export async function disableTwoFactorWithCode(code: string): Promise<void> {
  const client = await createApiClient();
  await client.post(SECURITY_ENDPOINTS.TWO_FACTOR_DISABLE, { code });
  setTwoFactorHint(false);
}

/**
 * Completes a login that the backend answered with a challenge. The partial
 * token expires after five minutes.
 *
 * @returns The full session on success. Rejects with an `ApiError` otherwise.
 */
export async function completeTwoFactorLogin(
  partialToken: string,
  code: string
): Promise<TwoFactorSession> {
  const client = await createApiClient();
  const res = await client.post<TwoFactorSession>(SECURITY_ENDPOINTS.TWO_FACTOR_VALIDATE, {
    partialToken,
    code,
  });
  return res.data;
}

// ─── Login alerts (local preference) ────────────────────────────────────────

const LOGIN_ALERTS_KEY = "audioblocks:login-alerts:v1";

/** Whether login alerts are on. Defaults to on. */
export function getLoginAlerts(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(LOGIN_ALERTS_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setLoginAlerts(enabled: boolean): boolean {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOGIN_ALERTS_KEY, enabled ? "1" : "0");
    } catch {
      // Storage unavailable: the choice holds for this visit only.
    }
  }
  return enabled;
}
