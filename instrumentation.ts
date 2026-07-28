/// <reference types="node" />

/**
 * Next.js instrumentation hook. `register()` runs once, before the app
 * starts serving requests, in both `next dev` and `next start`.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This is the fail-fast entry point for env validation: if required
 * variables are missing or malformed, the process throws here and never
 * reaches a request handler.
 */
export async function register() {
  // Guard against edge/browser runtimes where this hook can also fire —
  // env validation only makes sense in the Node.js server runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Relative import: lib/ sits at the project root, as a sibling of src/,
    // so the @/* alias (which typically maps to ./src/*) would not resolve here.
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }
}