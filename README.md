# AudioBlocks_For_Artist

AudioBlocks is the artist dashboard for managing music, earnings, and fan engagement.

This repository contains a Next.js (app directory) frontend used by AudioBlocks artists.

## Quick Start

Prerequisites

- Node.js 18+ (tested)
- npm (bundled with Node.js)

Local setup

1. Clone the repository:

```bash
git clone <repo-url>
cd AudioBlocks_For_Artist
```

2. Install dependencies for the app:

```bash
cd app
npm install
```

3. Provide required environment variables (create `app/.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
```

4. Run the dev server:

```bash
npm run dev
```

Other useful commands (run from the `app` directory):

- `npm run build` — build production artifacts
- `npm start` — run production server
- `npm run lint` — run ESLint
- `npm run format` — run Prettier
- `npm run test` — run unit tests (Vitest)
- `npm run test:e2e` — run Playwright E2E tests
- `npm run storybook` — start Storybook

## Project Structure (high level)

- `app/` — Next.js application (app directory)
  - `src/app` — Next.js routes and layouts
  - `src/components` — reusable UI components
  - `src/context` — React context providers (playback, auth, etc.)
  - `src/hooks` — custom hooks (toasts, API handlers)
  - `src/services` — API wrappers and data services
  - `src/__tests__` — unit and integration tests

## Architecture Notes

- Uses Next.js 13+ with the `app` directory and client components (`'use client'`) where necessary.
- State management is primarily local + React Context; `PlaybackContext` uses `useReducer` for predictable updates.
- UI notifications use `sonner` and now include an ARIA live region for screen-reader announcements.
- Testing: unit tests with Vitest, E2E with Playwright, Storybook for component development.

## Contribution

1. Fork the repo and create a branch named `feat/<short-desc>` or `fix/<short-desc>`.
2. Ensure ESLint and Prettier pass locally:

```bash
cd app
npm run lint
npm run format
```

3. Run tests and add coverage for new code:

```bash
npm run test
npm run test:coverage
```

4. Push your branch and open a pull request targeting `main`.

5. The repository has a GitHub Actions CI that runs lint, typechecking, and tests on PRs and pushes to `main`.

## Accessibility

This project aims to meet WCAG 2.1 AA where practical. Toast notifications are announced to assistive technologies via an ARIA live region.

## License & Code of Conduct

This project is released under the [ISC License](LICENSE), matching the
license used across the AudioBits repositories. Contributor expectations are
in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

---

If you'd like, I can also:

- Run the test suite locally and report results
- Commit and push these changes to a branch
- Add a `CONTRIBUTING.md` or `CODE_OF_CONDUCT.md`
