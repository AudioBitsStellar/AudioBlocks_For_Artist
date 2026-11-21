import * as Sentry from "@sentry/nextjs";

import { scrubBreadcrumb, scrubEvent } from "./src/lib/sentryPrivacy";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

// The same release derivation as the server and edge configs, so an error in
// the browser and an error in the render behind it point at one commit.
const RELEASE =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.NEXT_PUBLIC_APP_VERSION || undefined;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    release: RELEASE,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV || "development",
    // Replay already masks text and media; this stops the SDK adding IP
    // addresses and other default PII, and the hooks remove what app code
    // puts into events (OBS-01).
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubEvent(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubBreadcrumb(breadcrumb);
    },
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    enabled: !!SENTRY_DSN || process.env.NODE_ENV === "production",
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
