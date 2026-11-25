import type { ErrorEvent, Event } from "@sentry/nextjs";

/**
 * PII scrubbing for everything that leaves the app through Sentry (OBS-01).
 *
 * Sentry is configured with `sendDefaultPii: false`, which stops the SDK from
 * attaching IP addresses and request bodies it considers personal. That is not
 * enough on its own: application code puts emails, bearer tokens and API keys
 * into `extra`, `tags`, breadcrumbs and exception messages, and the SDK sends
 * whatever it is handed. These helpers are the last gate before the event is
 * transmitted, so a change anywhere else cannot leak by omission.
 *
 * The rules are deliberately conservative:
 *
 *  - a value under a key that looks like a credential becomes `[Filtered]`,
 *    whatever its type;
 *  - an email address in free text keeps its domain (useful for debugging a
 *    provider) and loses the local part;
 *  - objects are walked, depth-limited, and the input is never mutated — a
 *    scrubbed copy is returned, so the caller's error object is unchanged.
 */

/** Key fragments that mark a credential. Matched case-insensitively. */
const SECRET_KEY =
  /(token|secret|password|passwd|authorization|cookie|api[-_]?key|privy|session|signature)/i;

/** Matches an email address in free text. */
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/** How deep the scrubber walks before leaving a value as it found it. */
const MAX_DEPTH = 8;

const FILTERED = "[Filtered]";

/**
 * Redacts the local part of every email address in a string, keeping the
 * domain: `ada@example.com` becomes `a***@example.com`.
 *
 * Keeping the shape rather than deleting the address means a support engineer
 * can still tell which provider or tenant was involved.
 */
export function redactEmails(value: string): string {
  return value.replace(EMAIL, (_match, domain: string) => `a***@${domain}`);
}

/** True when a key names something that must never leave the process. */
export function isSecretKey(key: string): boolean {
  return SECRET_KEY.test(key);
}

function scrub(value: unknown, key: string | undefined, depth: number): unknown {
  if (key !== undefined && isSecretKey(key) && value !== null && value !== undefined) {
    return FILTERED;
  }

  if (typeof value === "string") return redactEmails(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[Truncated]";
  if (Array.isArray(value)) return value.map((item) => scrub(item, undefined, depth + 1));

  // Errors and Dates are not plain records; sending their own enumerable keys
  // is the only thing the SDK would do anyway.
  const out: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
    out[childKey] = scrub(childValue, childKey, depth + 1);
  }
  return out;
}

/**
 * Returns a scrubbed copy of an event for `beforeSend`.
 *
 * The generic signature keeps Sentry's own `Event`/`ErrorEvent` types intact:
 * whatever is passed in comes back with the same type, so the configs do not
 * need a cast.
 */
export function scrubEvent<E extends Event | ErrorEvent>(event: E): E {
  return scrub(event, undefined, 0) as E;
}

/** Drops a breadcrumb whose message or data would carry a credential. */
export function scrubBreadcrumb<E extends { message?: string; data?: Record<string, unknown> }>(
  breadcrumb: E
): E {
  const next = { ...breadcrumb };
  if (typeof next.message === "string") next.message = redactEmails(next.message);
  if (next.data) next.data = scrub(next.data, undefined, 0) as Record<string, unknown>;
  return next;
}
