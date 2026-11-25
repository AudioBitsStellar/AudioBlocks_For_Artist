# Frontend uptime synthetic check

Launch-readiness item `OBS-05`.

## What runs

`.github/workflows/uptime-check.yml`, every fifteen minutes and on demand. It
requests two public routes against the deployment named by the repository
variable `APP_URL` (default `https://artists.audioblocks.io`):

| Route        | What a pass means                                                           |
| :----------- | :-------------------------------------------------------------------------- |
| `/login`     | the app is served and the auth entry point is reachable                     |
| `/dashboard` | the signed-out redirect chain resolves — the dashboard is not answering 5xx |

A response of `200`, `301`, `302`, `303`, `307` or `308` passes; anything else,
including a timeout or a connection failure (`000`), fails the run with an
`::error` annotation naming the URL and the status. The check follows redirects
because `/dashboard` legitimately sends a signed-out visitor to `/login`.

## Why these two

They are the pages a user must pass through to do anything. A static asset
check would pass while the app is broken; a deep authenticated page cannot be
probed without managing a session secret in CI, which is a larger risk than the
coverage is worth. Authenticated journeys are covered by the Playwright suite
(`app/e2e`) on the deployment's preview, not by a cron.

## Alerting

A failed scheduled run is reported through GitHub's Actions notifications to
the workflow's watchers. The on-call owner and the routing table are in
[ALERTS.md](ALERTS.md); this check is the external half of A1, which watches
errors once a page is reached.

## What it does not cover

- **Content correctness.** A 200 with an empty shell passes.
- **Authenticated flows.** Sign-in, uploads and wallet connections are the
  e2e suite's job.
- **Regions.** The probe runs from GitHub's runner, not from a user's network,
  so a regional outage may be invisible.
