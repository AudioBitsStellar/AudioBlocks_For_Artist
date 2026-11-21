/**
 * Request correlation (OBS-04).
 *
 * Every API call carries an `x-request-id` header. The proxy and the backend
 * are expected to echo it back — many log pipelines already do — and the id is
 * surfaced in the error toast so a user can quote it to support. Without one,
 * "the upload failed at 14:32" is the only thing a report can be matched
 * against.
 *
 * The id is generated once per logical request: a retry reuses it, because the
 * retries describe one attempt from the user's point of view and a support
 * engineer wants one id, not four.
 */

export const REQUEST_ID_HEADER = "x-request-id";

/** A UUID where the platform has one, a timestamped fallback where it does not. */
export function newRequestId(): string {
  const cryptoObject = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The id a response names, if the backend echoed one. */
export function requestIdFromHeaders(headers: unknown): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  // Header names are case-insensitive on the wire, and axios preserves the
  // casing a server used, so compare lower-cased keys rather than guessing
  // one canonical form.
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (key.toLowerCase() !== REQUEST_ID_HEADER) continue;
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
  return undefined;
}
