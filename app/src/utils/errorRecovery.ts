import { ApiError } from "@/api/axios";

/**
 * Shared async error-recovery primitives (#43).
 *
 * The full strategy — how upload, mint, and profile-save flows classify and
 * recover from failures — is documented in `app/src/utils/ERROR_RECOVERY.md`.
 * The short version:
 *
 *   - **retryable**  transient transport failures (no response, 408/429/5xx,
 *                    network/timeout messages). Surface a non-destructive
 *                    "try again" affordance; keep the user's input.
 *   - **user-rejected**  the wallet owner declined to sign. Not an error —
 *                    reset to a state that lets them retry the signature.
 *   - **terminal**  everything else (4xx validation, unexpected exceptions).
 *                    Surface the message; do not offer a bare retry.
 *
 * Every flow should route its catch blocks through `classifyError()` (or the
 * individual predicates) so the three surfaces behave the same way.
 */

// Network / server errors that are safe to retry
const RETRYABLE_STATUS_CODES = new Set([408, 429, 499, 502, 503, 504]);
const RETRYABLE_MESSAGES = [
  "network error",
  "timeout",
  "econnreset",
  "econnrefused",
  "socket hang up",
];

// Phrases Freighter / wallet extensions use when the user declines to sign.
const USER_REJECTION_MESSAGES = [
  "rejected",
  "user rejected",
  "user declined",
  "denied",
  "cancelled",
  "canceled",
];

export type ErrorKind = "retryable" | "user-rejected" | "terminal";

export interface RecoveryPlan {
  /** How the caller should treat this failure. */
  kind: ErrorKind;
  /** Human-readable message safe to show in a toast / inline. */
  message: string;
  /** Convenience flag: `kind === "retryable"`. */
  retryable: boolean;
  /** Convenience flag: `kind === "user-rejected"`. */
  userRejected: boolean;
}

export function isRetryableError(error: unknown): boolean {
  if (isApiError(error)) {
    if (error.status === 0) return true; // no network response
    return RETRYABLE_STATUS_CODES.has(error.status);
  }
  const httpStatus = getHttpStatus(error);
  if (httpStatus !== undefined) {
    if (httpStatus === 0) return true;
    return RETRYABLE_STATUS_CODES.has(httpStatus);
  }
  const msg = getErrorMessage(error).toLowerCase();
  return RETRYABLE_MESSAGES.some((m) => msg.includes(m));
}

/**
 * True when the failure is the wallet owner declining to sign — a normal
 * outcome the mint / profile-setup flows recover from without treating it as
 * an error.
 */
export function isUserRejection(error: unknown): boolean {
  const msg = getErrorMessage(error).toLowerCase();
  return USER_REJECTION_MESSAGES.some((m) => msg.includes(m));
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

/**
 * Single entry point for a catch block: classify the failure and get a
 * message + the flags each flow needs to pick its recovery UI.
 */
export function classifyError(error: unknown): RecoveryPlan {
  const message = getErrorMessage(error);

  if (isUserRejection(error)) {
    return { kind: "user-rejected", message, retryable: false, userRejected: true };
  }
  if (isRetryableError(error)) {
    return { kind: "retryable", message, retryable: true, userRejected: false };
  }
  return { kind: "terminal", message, retryable: false, userRejected: false };
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const withResponse = error as { response?: { status?: number }; status?: number };
  if (typeof withResponse.response?.status === "number") return withResponse.response.status;
  if (typeof withResponse.status === "number") return withResponse.status;
  return undefined;
}

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "status" in error && "message" in error;
}
