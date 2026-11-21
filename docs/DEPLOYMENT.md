# Deployment

How the artist portal reaches staging and production. Decision record:
[ADR-0007](adr/0007-production-hosting-target.md). Workflow:
`.github/workflows/deploy.yml`.

## Flow

| Event                    | Result                                             |
| ------------------------ | -------------------------------------------------- |
| Pull request (same repo) | Preview URL (`preview.yml`)                        |
| Merge to `main`          | Verify (tag on `main`) → deploy **staging**   |
| Push tag `vX.Y.Z`        | Verify → wait for approval → deploy **production** |

Production only deploys tags whose commit is on `main`.

## Releasing

```bash
git checkout main && git pull
git tag v0.2.0
git push origin v0.2.0
```

Then approve the pending **production** deployment in the Actions run. Roll back
by re-running the workflow for the previous tag, or promoting the previous
deployment in Vercel.

## One-time setup (maintainers)

1. **Secrets** (repository): `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID`.
2. **Environments** (Settings → Environments):
   - `staging` — no protection rules.
   - `production` — add **required reviewers**; restrict deployment to tags
     matching `v*.*.*`.
3. **Variable** (optional): `STAGING_DOMAIN`, a stable staging hostname.
4. **Vercel project**: root directory `app/`; set environment variables per
   target (Preview = staging backend, Production = production backend).

## Environment checklist

Set for **both** staging and production unless noted; values differ per target.

- [ ] `NEXT_PUBLIC_API_BASE_URL` — backend for that environment
- [ ] `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`
- [ ] `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`, `NEXT_PUBLIC_HORIZON_URL`
      (testnet for staging, public network for production)
- [ ] `NEXT_PUBLIC_ANALYTICS_WRITE_KEY` — separate source per environment
- [ ] `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENV` (`staging`/`production`)
- [ ] `NEXT_PUBLIC_USE_MOCK_DATA=false` (production must never be `true`)
- [ ] Production domain, TLS and DNS ([DOMAIN_TLS_SETUP.md](DOMAIN_TLS_SETUP.md))
