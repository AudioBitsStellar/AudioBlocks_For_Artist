import { z } from "zod";

/**
 * Centralized environment configuration.
 *
 * Import this module only from server-side startup code (see
 * `app/instrumentation.ts` and the root layout). Next.js inlines `NEXT_PUBLIC_*`
 * values into client bundles; server-only keys below are never part of that
 * inlining and must not be imported into client components.
 */

/** Accepts only the exact strings "true"/"false" — never a truthy typo. */
const booleanString = z
  .string({ required_error: "is required" })
  .refine((value) => value === "true" || value === "false", {
    message: 'must be exactly "true" or "false"',
  })
  .transform((value) => value === "true");

const urlString = (required = false) =>
  required
    ? z.string({ required_error: "is required" }).url("must be a valid URL")
    : z.string().url("must be a valid URL").optional();

const nonemptyString = (required = false) =>
  required
    ? z.string({ required_error: "is required" }).min(1, "must not be empty")
    : z.string().min(1, "must not be empty").optional();

/**
 * Variables exposed to the browser. Every required key here must keep the
 * NEXT_PUBLIC_* prefix so Next.js can inline it at build time.
 */
const clientSchema = z.object({
  // Backend API (must be an absolute URL — the proxy and services fetch it).
  NEXT_PUBLIC_API_BASE_URL: urlString(true),
  // Legacy alias still referenced by older tooling; validate when present.
  NEXT_PUBLIC_API_URL: urlString(),

  // Auth. The app id is public; the matching secret is server-only below.
  NEXT_PUBLIC_PRIVY_APP_ID: z
    .string({ required_error: "is required" })
    .min(1, "must not be empty")
    .regex(/^[A-Za-z0-9_-]+$/, 'must contain only letters, numbers, "-" or "_"'),

  // Analytics. An empty write key disables analytics downstream, so it is required here.
  NEXT_PUBLIC_ANALYTICS_WRITE_KEY: nonemptyString(true),

  // Feature flags and mock-data switches.
  NEXT_PUBLIC_USE_MOCK_DATA: booleanString,
  NEXT_PUBLIC_MAINTENANCE_MODE: booleanString.optional(),
  NEXT_PUBLIC_ENABLE_SONG_TRANSFER: booleanString.optional(),
  NEXT_PUBLIC_FEATURE_FLAGS: z.string().optional(),

  // URL configuration.
  NEXT_PUBLIC_BASE_URL: urlString(),
  NEXT_PUBLIC_LISTENER_APP_URL: urlString(),
  NEXT_PUBLIC_WEB_VITALS_ENDPOINT: urlString(),
  NEXT_PUBLIC_SENTRY_DSN: urlString(),

  // Wallet / Stellar configuration. Custom networks are allowed, so validate
  // the URL formats and require a non-blank passphrase when one is supplied.
  NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: nonemptyString(),
  NEXT_PUBLIC_HORIZON_URL: urlString(),
  NEXT_PUBLIC_STELLAR_RPC_URL: urlString(),
  REACT_APP_SOROBAN_RPC_URL: urlString(),

  // Release/version labels; a version must be numeric (e.g. 1.2.3).
  NEXT_PUBLIC_APP_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/, "must be a numeric version like 1.2.3")
    .optional(),
});

/**
 * Variables read only on the server. Secrets are checked for presence/format
 * but their values are never included in validation messages.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PRIVY_APP_SECRET: nonemptyString(),
  SENTRY_PROJECT: z
    .string()
    .regex(/^\d+$/, "must be a numeric Sentry project id")
    .optional(),
  CANONICAL_HOST: z
    .string()
    .regex(/^[A-Za-z0-9.-]+$/, "must be a hostname without a protocol")
    .optional(),
});

const envSchema = clientSchema.merge(serverSchema);

export type Env = z.infer<typeof envSchema>;

/**
 * Formats every issue as "NAME: problem" without echoing the value, so all
 * problems are visible at once and credentials never leak into logs or UI.
 */
function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const key = issue.path.join(".") || "(root)";
    return `  - ${key}: ${issue.message}`;
  });
}

export interface EnvCheck {
  env?: Env;
  issues: string[];
}

/** Parses the current environment, collecting every problem before returning. */
export function inspectEnv(source: NodeJS.ProcessEnv = process.env): EnvCheck {
  const result = envSchema.safeParse(source);
  if (result.success) return { env: result.data, issues: [] };
  return { issues: formatIssues(result.error) };
}

/**
 * Friendly variant for the root layout: names and reasons only, no values.
 * Useful in development where a configuration page is more helpful than a
 * stack trace.
 */
export function getEnvIssues(): string[] {
  return inspectEnv().issues;
}

/**
 * Validates process.env. Throws one error listing every invalid/missing
 * variable so misconfiguration fails early instead of surfacing as a cryptic
 * error deep in the app.
 */
export function validateEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const { env, issues } = inspectEnv(source);
  if (!env) {
    throw new Error(
      [
        "Invalid or missing environment variables:",
        ...issues,
        "",
        "Fix these in your .env.local (or .env.development / .env.production) file and restart the app.",
      ].join("\n")
    );
  }
  return env;
}
