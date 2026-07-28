import { encodeHtmlEntities } from "./textEncoder";

/**
 * Sanitizes user-provided or API-sourced text before it is rendered or
 * submitted, neutralizing HTML/script injection by escaping markup
 * characters instead of interpreting them (issue #119).
 *
 * @param value - Raw text, e.g. from a form field or an API response.
 * @returns The escaped text, safe to render or send to the backend. Non-string input returns an empty string.
 * @example sanitize('<script>alert(1)</script>') // "&lt;script&gt;alert(1)&lt;/script&gt;"
 */
export function sanitize(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return encodeHtmlEntities(value);
}
