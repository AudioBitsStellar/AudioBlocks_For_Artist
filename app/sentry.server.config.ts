import * as Sentry from "@sentry/nextjs";

import { scrubBreadcrumb, scrubEvent } from "./src/lib/sentryPrivacy";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

// The release tag is what turns a stack frame into a link to the source that
// produced it. It has to be the same value the source maps were uploaded under
// (`withSentryConfig` reads `SENTRY_RELEASE`), so it is derived from the
// deployment's commit and never from the package version alone.
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
  // OBS-01: the SDK must not attach IP addresses, cookies or request bodies on
  // its own. Application-level PII is removed by the hooks below.
  sendDefaultPii: false,
  enabled: !!SENTRY_DSN || process.env.NODE_ENV === "production",
  beforeSend(event) {
    return scrubEvent(event);
  },
  beforeBreadcrumb(breadcrumb) {
    return scrubBreadcrumb(breadcrumb);
  },
});
