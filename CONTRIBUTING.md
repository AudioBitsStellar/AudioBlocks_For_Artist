# Contributing to AudioBlocks — Artist Dashboard

This repo hosts the artist-facing Next.js app for AudioBlocks, a music NFT
platform on Stellar/Soroban. The actual project lives in the `app/`
subdirectory — see [`app/README.md`](app/README.md) for architecture, tech
stack, and environment variable details.

## Development setup

```bash
cd app                # the Next.js project root, not the repo root
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api" > .env.local
npm run dev
```

Most of the app (auth, profile, uploads, on-chain actions) needs a running
[`AudioBlock_Backend`](https://github.com/AudioBitsStellar/AudioBlock_Backend)
instance alongside it — without one, only static pages render.

## Branch naming

Use `<type>/<short-description>`, matching the type prefixes used in this
repo's commit history and PR template:

- `feat/...` — new functionality
- `fix/...` — bug fixes
- `docs/...` — documentation only
- `refactor/...` — code change with no behavior change
- `chore/...` — tooling, deps, maintenance

Example: `fix/merch-delete-confirmation`.

## Commit messages

Prefix commits with the same type used in the branch name, followed by a
concise, imperative summary:

```
fix: gate merch item delete behind ConfirmationDialog
```

Keep each commit focused on one logical change — prefer several small,
reviewable commits over one large one when a PR touches more than one thing.

## Pull requests

- Fill out [`.github/pull_request_template.md`](.github/pull_request_template.md)
  in full — it's applied automatically when you open a PR.
- Reference the issue(s) the PR resolves (`Closes #123`).
- Keep PRs scoped to one issue or one closely-related group of issues where
  practical — easier to review, easier to revert if something's wrong.
- The template's checklist (tests pass, lint clean, accessibility checked, no
  console errors, performance considered) is the actual bar for review, not
  a formality — see Testing below for what "tests pass" means concretely.

## Coding standards

- **TypeScript**: this is a strict, typed codebase — avoid `any`; prefer a
  real interface/type or a narrow, justified cast over a blanket escape
  hatch.
- **Components**: functional components with hooks, matching the existing
  style throughout `app/src/components/`. Shared, reusable pieces (dialogs,
  badges, etc.) live in `app/src/components/shared/` — check there before
  building a one-off version of something that might already exist (e.g.
  `ConfirmationDialog` for any destructive action).
- **Styling**: Tailwind CSS 4 utility classes, matching the dark theme
  already used throughout (`bg-[#161616]`-style custom hex values are common
  where the design doesn't map to a default Tailwind token).
- **Accessibility**: this project tracks accessibility issues explicitly
  (see `app/ACCESSIBILITY_ISSUES.md` and `app/WCAG_2.1_AA_AUDIT_REPORT.md`).
  New interactive elements need a real accessible name (`aria-label` or
  visible text), keyboard operability, and focus management if they open an
  overlay/dialog — see `app/src/components/shared/ConfirmationDialog.tsx`
  for the pattern this repo already uses (focus-trap, Escape to close,
  `role="dialog"`, `aria-modal`).

## Testing

- Tests use [Vitest](https://vitest.dev/) + React Testing Library. Test
  files live in `app/src/__tests__/` (co-located tests also exist, e.g.
  `app/src/app/dashboard/overview/overview.test.tsx` — either location is
  fine, match whatever's already next to the code you're touching).
- Run the suite from `app/`:
  ```bash
  npm test              # watch mode
  npm run test:coverage # one-shot run with coverage
  ```
- New behavior needs a test. Bug fixes should include a test that would have
  caught the bug.
- Component tests that need `RoleContext` or React Query should wrap the
  component the same way `app/src/__tests__/TopHeader.test.tsx` does —
  reuse that pattern rather than inventing a new provider-wrapping helper.
- Run `npm run lint` before opening a PR — it's part of the review checklist
  above, not optional.
- This repo also uses Storybook (`npm run storybook`) for visual/interaction
  review of components — add a `.stories.tsx` file alongside a new component
  if it has meaningful visual states, matching the existing
  `*.stories.tsx` files next to `MyMusicContent`, `MyAlbums`, `TopHeader`,
  etc.

## Reporting bugs / requesting features

Open a GitHub issue. Include:

- What you expected vs. what actually happened (for bugs).
- Steps to reproduce, if applicable.
- Which part of the app is affected (page/route or component name) so it's
  easy to locate in `app/src/`.

There's no formal issue template in this repo yet — a clear description is
enough.
