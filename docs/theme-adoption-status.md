# Theme Token Adoption Status

Tracks how much of the artist portal still ships literal colour values instead
of the semantic tokens defined in `app/src/app/globals.css`,
`app/src/theme/colors.ts` and `app/src/theme/README.md`.

Referenced from `app/src/theme/README.md` ("Adoption status") and
`docs/theme-tokens.md` ("Adding New Tokens" → step 3). It was listed as a
related document in both for a while without existing; #463 created it.

## How this is measured

A colour is **hardcoded** when a `.ts`/`.tsx` file under `app/src/` contains:

1. a literal hex value (`#RGB`, `#RRGGBB`, `#RRGGBBAA`),
2. a Tailwind palette utility (`text-gray-400`, `bg-pink-500`, `border-white`, …), or
3. a `var(--…)` reference to a custom property that is never declared.

Category 3 is the dangerous one: an undeclared `var()` doesn't fail, it just
resolves to nothing, so the element silently loses its colour **and** stops
responding to the light/dark toggle. That is a correctness bug, not a style
nit, and it is now caught automatically by
`app/src/__tests__/themeTokens.test.ts`, which fails the build if any
`var(--…)` in `app/src` has no matching declaration or if the CSS tokens drift
from the catalog table in `app/src/theme/README.md`.

Run the sweep with:

```bash
cd app && node -e '
const fs=require("fs"),path=require("path");
const walk=(d,out=[])=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){
  const p=path.join(d,e.name);
  if(e.isDirectory())walk(p,out); else if(/\.tsx?$/.test(e.name))out.push(p)}return out};
for(const f of walk("src")){const s=fs.readFileSync(f,"utf8");
  const n=[...s.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].length
    +[...s.matchAll(/\b(?:bg|text|border|fill|stroke|ring|from|via|to)-(?:gray|slate|zinc|neutral|pink|purple|blue|green|red|yellow|orange|indigo|teal|cyan|emerald|rose|amber|violet|fuchsia|white|black)\b/g)].length;
  if(n)console.log(String(n).padStart(4),f)}' | sort -rn
```

## State after #463

133 files still contain at least one hardcoded colour value — 1,979
occurrences in total. The table lists the fifteen largest, measured as
category 1 + category 2 occurrences per file.

| File                                                             | Hardcoded |
| ---------------------------------------------------------------- | --------: |
| `src/components/musicUpload/Song.tsx`                            |       110 |
| `src/components/common/modals/AddMusicModal.tsx`                 |       104 |
| `src/app/dashboard/profile/page.tsx`                             |       101 |
| `src/components/musicUpload/Album.tsx`                           |        87 |
| `src/components/common/modals/ClaimArtistNameModal.tsx`          |        78 |
| `src/components/MerchesContent.tsx`                              |        64 |
| `src/components/common/wallet/TransferSongButton.tsx`            |        59 |
| `src/components/common/wallet/MintSongButton.tsx`                |        54 |
| `src/components/MyMusicContent.tsx`                              |        49 |
| `src/components/common/modals/NewEventModal.tsx`                 |        47 |
| `src/app/dashboard/messages/page.tsx`                            |        45 |
| `src/components/AnalyticsDashboard.tsx`                          |        45 |
| `src/components/events/CheckInScanner.tsx`                       |        44 |
| `src/components/common/wallet/SetupArtistOnChainProfile.tsx`     |        41 |
| `src/app/dashboard/merches/preview/page.tsx`                     |        40 |

The long tail (118 more files, 1,011 occurrences) is mostly one-off status
colours and `text-white`/`bg-black` on image or modal overlays, where the
literal is often the right call — an overlay scrim sits on top of arbitrary
artwork, so it is deliberately outside the surface tokens.

## Migrated in #463

- `src/app/globals.css` — the token values now match the catalog documented in
  `app/src/theme/README.md` and `docs/theme-tokens.md` (they had drifted:
  `text-muted`, `text-subtle`, `border`, `border-subtle` and all four status
  colours disagreed with the brand palette), the short-name aliases
  (`--primary`, `--text-muted`, …) used by `NotificationBell`, `SearchModal`
  and `TopHeader` are now declared, and `--color-border` is registered so the
  22 existing `border-border` utilities actually generate a class.
- `src/components/AnalyticsPlayTrends.tsx` — dark-green card chrome and
  `pink-500` series line replaced by surface/border/text tokens plus
  `colorTokens` for the recharts SVG props.
- `src/components/AnalyticsGeographic.tsx` — same card chrome, plus the
  country progress bar now runs on the `primary → secondary` brand gradient.
- `src/components/DashboardCustomizationPanel.tsx` — 33 raw hex utilities.
- `src/components/MerchInventory.tsx` — 69 raw hex utilities and Tailwind
  status colours (`text-red-400` → `text-error`, etc.).

## Deliberately left alone

- `src/components/DashboardCustomizationPanel.tsx` accent swatch values
  (`#D2045B`, `#885FA8`, `#3B82F6`, …) — these are user-selectable accent
  **data**, offered to the artist as choices, not component styling.
- `src/components/MerchInventory.tsx` stat-card glow gradients
  (`from-[#F59E0B]/60 via-[#FBBF24]/40 …`) — decorative alpha composites with
  no token equivalent; a token-based rewrite is a design call, not a sweep.
- The print stylesheet in `globals.css` — printing must look the same whatever
  theme the artist last used, so the `@media print` block stays on literals on
  purpose, and `themeTokens.test.ts` asserts it keeps no `var()` references.

## Adding a component without regressing

1. Use Tailwind token utilities (`bg-surface`, `text-text-muted`,
   `border-border-subtle`, `bg-primary`, `text-primary-contrast`) — never
   `text-white` on a `bg-surface` card, which is invisible in the light theme.
2. For SVG/canvas props, use `colorTokens` from `@/theme/colors`.
3. Need a colour that has no token? Add it to `globals.css` (`:root` **and**
   `.dark`), to `theme/colors.ts`, and to the catalog table in
   `app/src/theme/README.md` — the sync test reads that table.
