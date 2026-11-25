# WCAG 2.1 AA Audit — November 2026

**Run:** 25 November 2026, against `main` plus the fixes in this PR (#152)
**Scope:** 44 routes: every public page and every dashboard page, with one sample id for each dynamic route
**Standard:** WCAG 2.1 Level AA (axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)
**Supersedes:** [`WCAG_2.1_AA_AUDIT_REPORT.md`](WCAG_2.1_AA_AUDIT_REPORT.md) (July 2026). That report was a code review with recommendations; this one is measured against the running app.

## Summary

| Severity | Findings | What they are |
| --- | --- | --- |
| Critical | 2 | Unlabelled `<select>`s (C1); the wallet settings page does not build (C2) |
| Major | 6 | Text contrast in both themes (M1–M3); skip link with no target on public pages (M4); form fields with no focus indicator (M5); links told apart by colour only (M6) |
| Minor | 4 | Unnamed progress bar (m1); missing or duplicate `h1` (m2); no `main` landmark on public pages (m3); undocumented required env var (m4) |

Passed or not found on any route:

- `html lang`, page titles, landmark structure on the dashboard, and `aria-*` validity;
- image alt text, button and link names, and form labels other than C1;
- keyboard traps: every route Tabs from top to bottom without getting stuck (the only cycle seen was the Next.js dev-tools portal, which production builds don't have);
- the dashboard skip link: focus moves to `main#main-content`.

Raw axe output for every route and theme is in [`audit-results/`](audit-results/): `2026-11-25-light.json` and `2026-11-25-dark.json`. That is 168 violation nodes in light and 156 in dark, capped at 8 nodes per rule per route.

## How it was run

`app/e2e/a11y-audit.spec.ts` (added in this PR) visits each route in Chromium and does three things:

- **Automated check:** injects axe-core 4.x (already a dev dependency) and runs the WCAG 2.0/2.1 A and AA rules.
- **Keyboard pass:** presses Tab from the top of the page, up to 80 times. It records each focus stop, whether the stop has a visible outline or ring, and whether focus ever cycles. It then activates the skip link and checks where focus lands.
- **Structure:** records the title, `lang`, the number of `h1`s, and the landmarks.

```bash
cd app
NEXT_PUBLIC_USE_MOCK_DATA=true NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:9/api \
  NEXT_PUBLIC_API_URL=http://127.0.0.1:9/api NEXT_PUBLIC_ANALYTICS_WRITE_KEY=audit \
  NEXT_PUBLIC_PRIVY_APP_ID=<your app id> npm run dev
A11Y_AUDIT=1 A11Y_COLOR_SCHEME=dark PLAYWRIGHT_BASE_URL=http://localhost:3000 \
  npx playwright test e2e/a11y-audit.spec.ts --project=chromium
```

The spec is skipped unless `A11Y_AUDIT=1` is set, so the regular e2e journeys are unchanged.

### Conditions, and what they mean for the results

- **Mock mode on, backend stubbed.** Every request outside localhost was answered locally, so surfaces show fixture data or their empty or error states. This audit does not cover data-dependent states such as long tables or real error messages. Some pages render an error state (`/dashboard/payouts`, `/dashboard/onchain-stats`); there, only that state was audited.
- **Signed-in pages** used the e2e session cookies from `e2e/support/session.ts`.
- **Privy was stubbed** with a pass-through provider, because it needs a real app ID. As a result, the Privy login modal is not covered.
- **Both themes** were audited (`colorScheme` light and dark), since the app follows the OS setting.
- **Run in `next dev`** with the dev indicator off. Three build errors on `main` stopped every page from rendering. This PR fixes two of them (see "Build fixes needed to audit at all" below). The third is C2: that page was moved aside while the run happened, so it was only audited as the wrong-module error it currently shows.
- **Chromium only.** Firefox and WebKit were not run.

### Not done in this audit

- **Screen reader testing (VoiceOver, NVDA): not done.** The audit environment has no screen reader, so it cannot be claimed. Testing scripts for the critical flows are below, for someone with VoiceOver or NVDA to run. Record the results in this file.
- **GitHub issues for the critical and major findings: not opened yet.** Each finding below is written so it can be pasted into an issue as-is.

## Critical

### C1. Two `<select>`s have no accessible name (WCAG 4.1.2, 1.3.1)

| Route | Element | Source |
| --- | --- | --- |
| `/dashboard/overview` | Fans Engagement period select | `app/src/components/FansEngagement.tsx:34` |
| `/dashboard/events` | Event filter (All / Upcoming / Past) | `app/src/components/EventsContent.tsx:~390` |

A screen reader announces each of these only as "combo box", with no hint of what it controls.

**Fix:** add `aria-label="Fans engagement period"` and `aria-label="Filter events"`, or a visible `<label>`.

### C2. `/dashboard/settings/wallet` does not build

`app/src/app/dashboard/settings/wallet/page.tsx` has two broken imports:

- `useStellarNetwork` from `@/components/contexts/StellarNetworkContext`, which doesn't exist (the module is `@/context/StellarNetworkContext`);
- `useFreighter` from `@/lib/freighter`, which no longer exports it.

In dev mode the page shows the compile error, and in a production build it fails the build. Nobody can use the page, so it is listed here even though it isn't an accessibility rule.

**Fix:** move the page to `connectFreighter` / `getFreighterAddress` from `@/lib/freighter`.

## Major

### M1. Dark theme: subtle text fails contrast on dark surfaces (1.4.3)

This affects 34 routes. `--color-text-subtle` in `.dark` (`app/src/app/globals.css`) is `#6f6f6f`, and the same value is hardcoded as `text-[#6F6F6F]` across the dashboard.

| Text on background | Contrast | Required | Routes |
| --- | --- | --- | --- |
| `#6f6f6f` on `#161616` (surface) | 3.60:1 | 4.5:1 | 34 |
| `#6f6f6f` on `#1e1e1e` (surface raised) | 3.31:1 | 4.5:1 | 30 |
| `#6a7282` (`text-gray-500`) on black, search hint | 4.34:1 | 4.5:1 | 30 |
| `#6f6f6f` on `#111111` / `#151818` (tickets) | 3.55–3.75:1 | 4.5:1 | 2 |

**Fix:**

- Set the dark `--color-text-subtle` to `#8a8a8a`. That gives 6.08, 5.24 and 4.83 against black, surface and surface raised.
- Replace hardcoded `text-[#6F6F6F]` with `text-text-subtle`, so the token change reaches those elements.
- Replace `text-gray-500` with `#7c8494` or the token. `#7c8494` gives 5.59 on black.

### M2. Primary buttons: white on pink fails in dark (1.4.3)

This affects 12 routes. Buttons use `bg-primary` with white text, and the dark `--color-primary` is `#e83a87`, which gives 3.89:1. Examples are "Create your first event" and other primary CTAs.

**Fix:** use `#d6246f` as the button background (4.84:1). Pink text on black could keep `#e83a87` (5.39:1) as a separate token. The brand link colour `#D2045B` on `#161616` (3.37:1, `/login` and `/signup`) needs a lighter text variant, such as `#f0398a` (4.88:1).

### M3. Light theme: dark-only colours carried into light (1.4.3)

This affects 38 routes. The light palette is only partly adopted (see `docs/theme-adoption-status.md`). Components with hardcoded dark-theme greys render them on white or `#f7f7f7`:

| Text on background | Contrast | Routes | Example |
| --- | --- | --- | --- |
| `#9ca3af` (`gray-400`) on `#f7f7f7` / white | 2.36–2.53:1 | 30 | search shortcut hint, sidebar and header text |
| `#99a1af` on white | 2.60:1 | 15 | `text-gray-400` descriptions |
| `#a3a3a3` on white | 2.52:1 | 4 | landing page hero copy (`/`, `/artist-portal`) |
| White / `#d1d5dc` on `#f7f7f7` | 1.07–1.37:1 | 2 | `/accessibility` statement headings and body |
| Status colours (`success`, `warning`, `error`) as text on white | 1.78–3.19:1 | 4 | inventory "In Stock", royalty "Total: 0%", Delete buttons |

**Fix:**

- Move each surface's hardcoded `text-gray-*` / `text-white` / hex text classes to the `text-text`, `text-text-muted` and `text-text-subtle` tokens. This is the ongoing #423 migration.
- Add darker `-text` variants of the status colours for use as text on light backgrounds.

### M4. Skip link has no target on public pages (2.4.1)

The root layout always renders "Skip to main content" (`href="#main-content"`), but only the dashboard, admin, artist profile and artist-portal pages have that id. On the pages below, activating the link moves nothing:

`/`, `/login`, `/signup`, `/artist-portal/signup`, `/privacy`, `/terms`, `/verify-email`, `/onboarding`

This was checked by hand on `/login`: after Enter, focus stays on the link.

On `/artist-portal` the target exists but has no `tabIndex={-1}`. Focus falls back to `<body>`, though the next Tab does go to the first CTA.

**Fix:** wrap each of these pages' content in `<main id="main-content" tabIndex={-1}>`. This also fixes m3.

### M5. Form fields with no visible focus indicator (2.4.7)

These fields render no outline or ring when focused. Verified in source on `/login`: the inputs use `focus:outline-none` with nothing in its place (`app/src/app/login/page.tsx:254`).

| Route | Fields |
| --- | --- |
| `/login` | email, password |
| `/signup` | display name, username, email, password |
| `/onboarding` | stage name, bio, and four social links |
| `/dashboard/upload-music` | song title, description, composer, lyrics, three selects, and the "Add Song" drop zone (`div`) |
| `/dashboard/profile` | display name, bio, website, X username |
| `/dashboard/my-music` (and `/albums`, `/tracks`) | search, album filter, visibility filter |
| `/dashboard/events`, `/merches`, `/merches/inventory`, `/events/1/check-in` | search / ticket id inputs |
| `/dashboard/overview` | comment box ("Type here") |

The search and filter fields on My Music, Events and Merch use `focus:border-pink-500`. That is a 1px colour change of the border, so check it by hand against 1.4.11: it needs 3:1 against the unfocused border.

**Fix:** use the dashboard's existing pattern, `focus-visible:ring-2 focus-visible:ring-primary`, wherever `focus:outline-none` appears alone. A lint rule or a shared `Input` component would stop this from coming back.

### M6. Links told apart by colour only (1.4.1)

| Route | Link | Contrast with surrounding text |
| --- | --- | --- |
| `/login` | "Sign up" | 2.12:1 |
| `/signup` | "Log in" | 2.12:1 |
| `/signup` | "Try our Artist Portal" | 1.01:1 |
| `/privacy` | privacy email | 1.31:1 |

These links are underlined only on hover. **Fix:** underline them always, or give them 3:1 against the text around them.

## Minor

### m1. Onboarding progress bar has no name (4.1.2)

`app/src/components/OnboardingProgressCard.tsx:53` sets `role="progressbar"` with values but no label. **Fix:** add `aria-label="Onboarding progress"`, or `aria-labelledby` pointing at the card heading.

### m2. Heading structure

- `/` has two `h1`s.
- `/dashboard/my-music`, `/albums`, `/tracks` and `/dashboard/profile` have none.

A screen reader user jumping by heading gets no page title there. **Fix:** make one `h1` per page.

### m3. No `main` landmark on public pages

The pages listed in M4 also have no `main`, so landmark navigation cannot reach their content. This is fixed together with M4.

### m4. `NEXT_PUBLIC_API_URL` is required but undocumented

`app/src/app/layout.tsx` refuses to render without `NEXT_PUBLIC_API_URL`, but `.env.example` and `docs/GUIDE.md` list only `NEXT_PUBLIC_API_BASE_URL`. A fresh setup gets the configuration error page and nothing else. This isn't an accessibility rule, but it blocks anyone auditing locally.

## Build fixes needed to audit at all

This PR fixes these two build errors, so the app renders on `main`:

- **Every page crashed.** `app/src/app/layout.tsx`, a server component, passed a render function as `fallback` to the client `ErrorBoundary`. It is now `RootErrorBoundary`, a small client wrapper.
- **The upload page did not compile.** `app/src/components/musicUpload/Song.tsx` declared `uploadError` and `retryInProgressRef` twice (merge leftovers).

Not fixed here:

- C2, the wallet page.
- In a `--legacy-peer-deps` install, `@privy-io/react-auth` pulls in `@stripe/crypto`, whose peer `@stripe/stripe-js` is never installed, and Turbopack dev fails to resolve it. The audit installed it locally with `--no-save`. Adding `@stripe/stripe-js` as a dependency would fix it.

## Screen reader test scripts (to be run)

Run each flow with VoiceOver and Safari (macOS) and with NVDA and Firefox (Windows). Record pass or fail, with notes, under each flow.

1. **Log in** (`/login`):
   - reach the email field via the skip link;
   - submit an empty form; each field's error must be read and linked to its field (`aria-describedby`);
   - log in.
2. **Upload a song** (`/dashboard/upload-music`):
   - add an audio file via the keyboard-only drop zone;
   - fill the form;
   - upload progress and the result must be announced (`role="status"` / live region).
3. **Earnings** (`/dashboard/overview`):
   - the Earnings & Royalties total and its month-over-month change are read;
   - the chart's screen-reader table (#47) gives every month's values;
   - Export CSV is reachable and named.
4. **Event check-in** (`/dashboard/events/:id/check-in`):
   - enter a ticket id manually;
   - valid and invalid results must be announced.
5. **Theme and settings** (`/dashboard/settings/appearance`, header toggle):
   - the header toggle announces its pressed state;
   - the settings radio group has a group label.

## Priority order

1. **C2.** The wallet page doesn't build.
2. **M1, M2.** Two token changes fix most failures in dark mode, the default for most artists.
3. **M5, C1.** Focus indicators and select names: keyboard and screen reader basics.
4. **M4, m3.** One `main` wrapper per public page.
5. **M3.** Part of the ongoing light-theme token migration.
6. **M6, m1, m2, m4.**
