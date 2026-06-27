import { ApiError } from "@/api/axios";

// Network / server errors that are safe to retry
const RETRYABLE_STATUS_CODES = new Set([408, 429, 499, 502, 503, 504]);
const RETRYABLE_MESSAGES = ["network error", "timeout", "econnreset", "econnrefused", "socket hang up"];

export function isRetryableError(error: unknown): boolean {
  if (isApiError(error)) {
    if (error.status === 0) return true; // no network response
    return RETRYABLE_STATUS_CODES.has(error.status);
  }
  const msg = getErrorMessage(error).toLowerCase();
  return RETRYABLE_MESSAGES.some((m) => msg.includes(m));
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "message" in error
  );
}
