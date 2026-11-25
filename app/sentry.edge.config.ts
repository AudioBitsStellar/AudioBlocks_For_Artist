import * as Sentry from "@sentry/nextjs";

import { scrubBreadcrumb, scrubEvent } from "./src/lib/sentryPrivacy";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

// Same derivation as sentry.server.config.ts: the commit the deployment was
// built from is the release the source maps were uploaded under.
const RELEASE =
  process.env.SENTRY_RELEASE ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  undefined;

Sentry.init({
  dsn: SENTRY_DSN,
  release: RELEASE,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENV ||
    process.env.SENTRY_ENVIRONMENT ||
    process.env.NODE_ENV ||
    "development",
  tracesSampleRate: 1.0,
  sendDefaultPii: false,
  enabled: !!SENTRY_DSN || process.env.NODE_ENV === "production",
  beforeSend(event) {
    return scrubEvent(event);
  },
  beforeBreadcrumb(breadcrumb) {
    return scrubBreadcrumb(breadcrumb);
  },
});
