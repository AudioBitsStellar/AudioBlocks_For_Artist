import { z } from "zod";

/**
 * Coerces the common "true"/"false" string env var pattern into a boolean.
 * Rejects anything else so typos (e.g. "flase") are caught instead of
 * silently evaluating as truthy/falsy.
 */
const booleanString = z
  .enum(["true", "false"], {
    errorMap: () => ({ message: 'must be exactly "true" or "false"' }),
  })
  .transform((val) => val === "true");

/**
 * Vars exposed to the browser. Next.js only inlines NEXT_PUBLIC_* vars into
 * client bundles, so every key here must use that prefix.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string({ required_error: "is required" })
    .url("must be a valid URL"),
  NEXT_PUBLIC_ANALYTICS_WRITE_KEY: z
    .string({ required_error: "is required" })
    .min(1, "must not be empty"),
  NEXT_PUBLIC_USE_MOCK_DATA: booleanString,
});

/**
 * Vars only ever read on the server (currently just NODE_ENV, which Next.js
 * sets itself — validated here for safety, not required from the user).
 */
const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const envSchema = clientSchema.merge(serverSchema);

export type Env = z.infer<typeof envSchema>;

/**
 * Formats every zod issue into a single multi-line, human-readable message
 * so all problems are visible at once instead of failing on the first one.
 */
function formatIssues(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const key = issue.path.join(".") || "(root)";
    return `  - ${key}: ${issue.message}`;
  });

  return [
    "Invalid or missing environment variables:",
    ...lines,
    "",
    "Fix these in your .env.local (or .env.development / .env.production) file and restart the app.",
  ].join("\n");
}

/**
 * Validates process.env against the schema. Throws a single Error listing
 * every invalid/missing variable if validation fails.
 *
 * Call this once, as early as possible in the app lifecycle (see
 * src/instrumentation.ts), so misconfiguration fails fast at startup
 * instead of surfacing as a cryptic error deep in the app later.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // Throwing (rather than logging + continuing) is what makes this
    // "fail fast": the process exits instead of limping along with bad config.
    throw new Error(formatIssues(result.error));
  }

  return result.data;
}

/**
 * Validated, typed env object. Import this instead of reading
 * `process.env` directly anywhere in the app.
 *
 * NOTE: only import this module from server-side code paths (or code that
 * runs during the instrumentation hook). Importing it directly into client
 * components will attempt to validate server-only vars in the browser.
 */
export const env: Env = validateEnv();
