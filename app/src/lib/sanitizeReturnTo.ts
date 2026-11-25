/**
 * Validate that `path` is a safe, same-origin relative URL before using it
 * in a redirect.  Accepts any path that starts with "/" but rejects:
 *   - non-string values
 *   - empty strings
 *   - protocol-relative or backslash URLs (`//evil.com`, `/\evil.com`, anywhere)
 *   - everything that does not start with "/"
 *   - `/login` and `/signup` (#575), so a chain of post-login redirects can't loop
 *
 * Returns `/dashboard` for any rejected value so callers always have a safe
 * fallback without branching.
 *
 * @example
 *   sanitizeReturnTo("/dashboard/overview")  // "/dashboard/overview"
 *   sanitizeReturnTo("//evil.com")            // "/dashboard"
 *   sanitizeReturnTo("https://evil.com")      // "/dashboard"
 */
export function sanitizeReturnTo(path: string): string {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path === "/login" ||
    path === "/signup"
  ) {
    return "/dashboard";
  }
  return path;
}
