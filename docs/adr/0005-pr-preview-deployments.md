# ADR-0005: PR preview deployments run on `pull_request` and skip fork PRs

## Status

Accepted.

## Context

Every pull request to the artist portal changes UI that a reviewer has to look
at — dashboards, dialogs, wallet flows. Judging it from a diff is unreliable,
and asking each contributor to run the app locally against the staging backend
is a friction point for exactly the drive-by contributions this project needs
most. So each PR should get a preview URL automatically.

The constraint that shapes the design: this is a public repository, so most
pull requests arrive from forks. GitHub Actions gives a workflow triggered by a
fork's `pull_request` event **no access to repository secrets** (a fork's code
cannot read `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) and a
read-only `GITHUB_TOKEN`. Deploying to Vercel requires those secrets, so a
fork-triggered preview job cannot succeed — it fails with an opaque
authentication error, and a permanently-red check teaches reviewers to ignore
it.

The obvious workaround, `pull_request_target`, runs the workflow from the
_base_ branch with full secrets and write tokens while the PR author still
controls the code it checks out. That is a well-known credential-theft path
(any `npm install` / build step in the untrusted head becomes arbitrary code
with `VERCEL_TOKEN` in its environment), and it is not acceptable here because
deploying is precisely the step that runs the PR's build.

## Decision

`.github/workflows/preview.yml` triggers on `pull_request` (never
`pull_request_target`) and skips a job for PRs whose head repo is not this
repository, and for draft PRs:

```
if: github.event.pull_request.draft == false &&
    github.event.pull_request.head.repo.full_name == github.repository
```

A skipped job reports as skipped, not failed, so the required-check list stays
honest. Same-repo PRs (maintainer branches, which is how staged work lands
here) do get a preview.

The job mirrors the CI workflow rather than inventing its own environment:
Node 20.x from `actions/setup-node@v4` with the npm cache keyed on
`app/package-lock.json`, and `npm ci --legacy-peer-deps` — plain `npm ci` fails
on the `@sentry/nextjs` ↔ `next` peer conflict, which is what made the previous
version of this workflow never deploy.

The preview URL is delivered twice: by the Vercel action as a PR comment
(`permissions.pull-requests: write` makes that possible on same-repo PRs), and
by an appended `$GITHUB_STEP_SUMMARY` block so the link is on the run page even
when the comment is not wanted.

## Consequences

- Fork PRs get **no preview**. A contributor opening a PR from their own fork
  sees a skipped `Vercel preview` check, not a failing one, and must ask a
  maintainer to push the branch into this repository to get a URL. This is the
  deliberate cost of not running untrusted code against deployment credentials.
- The workflow needs three repository secrets — `VERCEL_TOKEN`,
  `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — plus the Vercel project's root
  directory set to `app/`. Without them the job fails at the deploy step; this
  is a one-time maintainer setup step, not something a PR can fix.
- Because the deployment is built by Vercel, a preview inherits whatever
  `NEXT_PUBLIC_*` values the project defines for the preview environment; a PR
  that changes an env var name must be paired with a project settings change
  (see `app/.env.example`, which is the list of what the app expects).
- `cancel-in-progress` on a per-PR concurrency group means a force-push or a
  quick follow-up commit cancels the superseded deploy instead of stacking two
  of them.
- Preview deployments are created as temporary Vercel URLs and are not
  reclaimed by this workflow when the PR closes; expiring them is left to the
  Vercel project's own retention settings.
