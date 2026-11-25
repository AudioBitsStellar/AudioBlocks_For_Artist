# Sentry configuration

Launch-readiness item `OBS-01`. This documents what the code already does, so a
deployment can be checked against it rather than guessed at.

## Environments

`environment` is resolved in this order, in all three runtimes (client, Node
server, edge):

1. `NEXT_PUBLIC_SENTRY_ENV`
2. `SENTRY_ENVIRONMENT` (server and edge only)
3. `NODE_ENV`
4. `development`

Production, staging and preview deployments must set `NEXT_PUBLIC_SENTRY_ENV`
to distinct values (`production`, `staging`, `preview`). Without it, a preview
deployment reports into `production` and pollutes every alert threshold.

## Release tagging

`release` is resolved from `SENTRY_RELEASE`, then `NEXT_PUBLIC_APP_VERSION`,
then `VERCEL_GIT_COMMIT_SHA` (server and edge). Set `SENTRY_RELEASE` to the
commit SHA in any build that also uploads source maps — the two have to match
or a stack frame will not resolve to source.

## Source maps

`withSentryConfig` in `next.config.ts` uploads source maps during `next build`
when these are present:

- `SENTRY_AUTH_TOKEN` — a token with `project:releases` scope
- `SENTRY_ORG` and `SENTRY_PROJECT`

`widenClientFileUpload` is on, so the client chunks' maps are uploaded too. The
upload runs in CI only (`silent: !process.env.CI`): without the token a local
build skips it, which is expected and not an error.

Check it worked by opening any error in Sentry and confirming the frame shows
the original TypeScript line rather than a minified chunk offset.

## PII scrubbing

`sentryPrivacy.ts` is wired into `beforeSend` and `beforeBreadcrumb` in all
three configs, with `sendDefaultPii: false`:

- a value under a key matching `token|secret|password|authorization|cookie|api_key|privy|session|signature`
  becomes `[Filtered]`, at any depth;
- an email address anywhere in free text keeps its domain and loses the local
  part (`a***@example.com`);
- the event is copied, never mutated;
- replay masks all text and blocks all media.

`src/__tests__/sentryPrivacy.test.ts` pins each of those rules. Add a case
there before adding any new field to an event, and never add a DSN-new
`extra` that carries user data without one.

## What this does not cover

Alert rules and routing are in [ALERTS.md](ALERTS.md). Uptime monitoring is a
separate synthetic check, not a Sentry feature.
