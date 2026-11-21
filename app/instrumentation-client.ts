import * as Sentry from "@sentry/nextjs";
import {
  REPLAY_ON_ERROR_SAMPLE_RATE,
  REPLAY_PRIVACY_OPTIONS,
  REPLAY_SESSION_SAMPLE_RATE,
} from "@/lib/sentryReplay";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: REPLAY_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate: REPLAY_ON_ERROR_SAMPLE_RATE,
    integrations: [Sentry.replayIntegration({ ...REPLAY_PRIVACY_OPTIONS })],
    enabled: !!SENTRY_DSN || process.env.NODE_ENV === "production",
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
