# Architecture Decision Records (#265)

This directory records the significant architectural decisions behind the
artist dashboard — the ones that are expensive to reverse or that a new
contributor would otherwise have to reconstruct by reading commit history.

## Format

Each ADR is a single Markdown file named `NNNN-short-title.md` and follows
the same shape:

- **Status** — `Accepted`, `Superseded by ADR-XXXX`, or `Proposed`.
- **Context** — the problem being solved and the constraints in play.
- **Decision** — what was actually decided.
- **Consequences** — what this makes easy, what it makes harder, and any
  follow-up it implies.

## When to add one

Add an ADR when a change picks between real alternatives and the choice
will be non-obvious to someone reading the code later — a new dependency,
a data-flow boundary (e.g. what talks to the backend vs. what talks to
Stellar directly), or a decision that trades off correctness/security
against convenience. Routine feature work, bug fixes, and refactors that
don't change those boundaries don't need one.

## Index

| ADR | Title |
| --- | --- |
| [0001](0001-react-query-for-server-state.md) | Use TanStack React Query for server state |
| [0002](0002-soroban-prepare-sign-submit-split.md) | Split Soroban transactions into backend-prepare / Freighter-sign / backend-submit |
| [0003](0003-freighter-as-sole-wallet-provider.md) | Freighter as the sole supported wallet provider |
| [0004](0004-direct-horizon-reads-from-the-browser.md) | Read-only Stellar queries go directly from the browser to Horizon |
