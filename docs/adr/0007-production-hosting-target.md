# ADR-0007: Production hosting target

## Status

Proposed — needs a maintainer to confirm the target and fill in the owner
before the status moves to Accepted. (#766)

## Context

Two deployment paths exist and neither is documented as _the_ production one:

- **Vercel**: `preview.yml` ships every same-repo PR to Vercel (ADR-0005).
- **Docker**: the `Dockerfile` builds a Next.js `standalone` image and
  `docker-compose.yml` runs it, with `DOMAIN_TLS_SETUP.md` covering TLS.

Leaving both implied means an incident responder cannot tell where production
runs, which secrets matter, or who owns it.

## Decision

**Vercel is the production target.** It is already the platform for previews, so
staging and production run the same build pipeline and the same
`NEXT_PUBLIC_*` handling, and it needs no server to patch. The Docker image
remains supported as a **self-hosting / disaster-recovery fallback**, built in
CI-adjacent workflows on demand, but it is not deployed to by default.

Environments (see `docs/DEPLOYMENT.md` for setup):

| Environment | Trigger         | Approval          | Backend                          |
| ----------- | --------------- | ----------------- | -------------------------------- |
| Preview     | Pull request    | none              | `https://api-dev.audioblocks.io` |
| Staging     | Merge to `main` | none              | staging backend                  |
| Production  | Tag `vX.Y.Z`    | required reviewer | production backend               |

Deploys are implemented in `.github/workflows/deploy.yml` (#767).

**Owner:** _to be assigned by the maintainers_ (needs a named person or team
for the Vercel project, the DNS/domain, and on-call for a failed deploy).

## Consequences

- One platform to secure and monitor; Vercel account access becomes a
  production-critical permission and should be limited and 2FA-protected.
- Vendor lock-in is bounded: the standalone Docker image keeps an exit path,
  which means the Dockerfile must keep building (CI should build it).
- `NEXT_PUBLIC_*` values are inlined at build time, so changing one requires a
  redeploy, not just a settings edit.
- If the maintainers choose Docker instead, this ADR is superseded and
  `deploy.yml` needs a registry/host step in place of the Vercel steps.
