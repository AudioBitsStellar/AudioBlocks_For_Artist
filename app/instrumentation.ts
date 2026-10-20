export async function register() {
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
