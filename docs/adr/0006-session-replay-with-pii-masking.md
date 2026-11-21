# ADR-0006: Keep Sentry session replay, with everything masked

## Status

Accepted. (#765)

## Context

`instrumentation-client.ts` already records Sentry Replay (10% of sessions, 100%
of sessions that error). Nothing recorded why, or what stops it capturing
personal data. The dashboard shows earnings, wallet addresses, email addresses,
fan messages and payout details, so an unmasked recording is a privacy incident
waiting to happen. The alternatives:

- **No replay.** Zero exposure, but reproducing UI bugs in wallet/signing flows
  from a stack trace alone is slow, and Sentry is already deployed.
- **A dedicated replay tool (LogRocket, FullStory, PostHog).** Better product
  analytics, but a new third-party processor of artist data, a new DPA and
  another script on a page that handles signing.
- **Sentry Replay, masked by default (chosen).** No new vendor; errors link to
  the session that caused them.

## Decision

Keep Sentry Replay, **mask-by-default**, with the policy in
`src/lib/sentryReplay.ts`:

- `maskAllText: true` — all text is replaced with `*`.
- `maskAllInputs: true` — no form value is recorded.
- `blockAllMedia: true` — no images, video or canvas (covers cover art and
  profile photos).
- Sampling stays at 10% of sessions and 100% of errored sessions.
- Replay only runs when a Sentry DSN is configured.

Replay is for reproducing _interaction flow_ (what was clicked, which screen),
not for reading content. Unmasking a specific non-sensitive element requires
Sentry's explicit `unmask` option, and must be justified in the PR.

`src/__tests__/sentryReplay.test.ts` pins these flags and asserts that
`instrumentation-client.ts` passes them to Sentry, so weakening the policy
fails CI.

## Consequences

- Recordings show layout and clicks but no content; some bugs will still need a
  user to describe what the screen said.
- Loosening any flag means editing a pinned constant and its test, which a
  reviewer will see.
- Network request/response bodies are not captured (Sentry default; do not
  enable `networkDetailAllowUrls` for backend routes without revisiting this).
- Artists should be told replay exists: the privacy policy needs to mention
  masked session recording. Tracked outside this repo.
