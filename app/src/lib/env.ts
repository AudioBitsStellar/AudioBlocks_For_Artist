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
 *
 * Only the API base URL is required (#578): it is the one value the app cannot
 * run without. The rest have working defaults, so a fresh checkout boots with
 * `NEXT_PUBLIC_API_BASE_URL` alone.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string({ required_error: "is required" })
    .url("must be a valid URL")
    .refine((value) => /^https?:\/\//.test(value), "must start with http:// or https://"),
  /** Analytics are a no-op when this is empty or unset. */
  NEXT_PUBLIC_ANALYTICS_WRITE_KEY: z.string().optional(),
  /** Defaults to false: real API data. */
  NEXT_PUBLIC_USE_MOCK_DATA: booleanString.optional().default("false"),
  /** Comma-separated rollout overrides, e.g. "artistOnchainAnalytics=true" (#469). */
  NEXT_PUBLIC_FEATURE_FLAGS: z.string().optional(),
});

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const envSchema = clientSchema.merge(serverSchema);

export type Env = z.infer<typeof envSchema>;

/** Where variables are read from: `process.env` by default, any record in tests. */
export type EnvSource = Record<string, string | undefined>;

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
 * Every problem with `source`, one readable line per variable, or `[]` when
 * the environment is valid. The root layout renders these on its
 * configuration-error page instead of throwing.
 */
export function getEnvProblems(source: EnvSource = process.env): string[] {
  const result = envSchema.safeParse(source);
  if (result.success) return [];
  return result.error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`
  );
}

/**
 * Validates `source` (default `process.env`) against the schema. Throws a
 * single Error listing every invalid or missing variable.
 */
export function validateEnv(source: EnvSource = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    // Throwing (rather than logging + continuing) is what makes this
    // "fail fast": the caller gets every problem at once.
    throw new Error(formatIssues(result.error));
  }

  return result.data;
}
