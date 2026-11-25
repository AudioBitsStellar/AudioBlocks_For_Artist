import { validateEnv } from "./src/lib/env";

export async function register() {
  // Fail fast in both development and production, before any request is served.
  // This runs on the server only, so server secrets are validated where they
  // belong and never reach a client bundle.
  validateEnv();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }

  if (process.env.NEXT_RUNTIME === "client") {
    await import("./instrumentation-client");
  }
}

export const onRequestError = async (error: unknown) => {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error);
};
