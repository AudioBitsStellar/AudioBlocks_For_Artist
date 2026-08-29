# Color Token System

A single source of truth for all color values used in the AudioBlocks artist
dashboard. Hardcoded hex values in component files are replaced by semantic
tokens that switch automatically when the user toggles light/dark mode.

> **Comprehensive Reference**: For detailed token specifications, architecture, 
> and maintenance guidelines, see [`docs/theme-tokens.md`](../../../docs/theme-tokens.md).

## How it works

The tokens are defined in two places that must stay in sync:

1. **CSS custom properties** under `@theme inline` in
   `app/src/app/globals.css`. Tailwind v4 reads these and exposes them as
   utility classes (e.g. `--color-primary` → `bg-primary`, `text-primary`,
   `border-primary`, `ring-primary`).
2. **TypeScript constants** in `app/src/theme/colors.ts` for use in
   `style={{ … }}` blocks, canvas / chart fills, and any JS-side color
   references.

`TopHeader.tsx` toggles a `dark` class on `<html>`, which the CSS variables
respond to, repainting every component that uses token-named utilities at once.

## Token catalog

| Token                | Light                  | Dark      | Purpose                                 |
| -------------------- | ---------------------- | --------- | --------------------------------------- |
| `primary`            | `#D2045B` (brand pink) | `#E83A87` | Primary actions, links, brand accent    |
| `primary-hover`      | `#B8043F`              | `#FF5BA0` | Hover state for primary                 |
| `primary-contrast`   | `#FFFFFF`              | `#FFFFFF` | Text/icons sitting on a primary surface |
| `secondary`          | `#885FA8` (purple)     | `#A87BC2` | Secondary actions, decorative accents   |
| `secondary-contrast` | `#FFFFFF`              | `#FFFFFF` | Text/icons on a secondary surface       |
| `background`         | `#FFFFFF`              | `#000000` | Page-level background                   |
| `surface`            | `#FFFFFF`              | `#161616` | Cards, panels, dialogs                  |
| `surface-raised`     | `#F7F7F7`              | `#1E1E1E` | Hovered / elevated surface              |
| `surface-sunken`     | `#F0F0F0`              | `#0F0F0F` | Input fields, code blocks               |
| `text`               | `#111111`              | `#FFFFFF` | Default body copy                       |
| `text-muted`         | `#6F6F6F`              | `#A3A3A3` | Captions, helpers, secondary text       |
| `text-subtle`        | `#9CA3AF`              | `#6F6F6F` | Disabled / placeholders                 |
| `text-inverted`      | `#FFFFFF`              | `#000000` | Text on inverse background              |
| `border`             | `#E5E5E5`              | `#2A2A2A` | Default borders                         |
| `border-subtle`      | `#F0F0F0`              | `#1F1F1F` | Very faint dividers                     |
| `success`            | `#3DDC84`              | `#3DDC84` | Success state                           |
| `warning`            | `#FFB020`              | `#FFB020` | Warning state                           |
| `error`              | `#FF5252`              | `#FF7B7B` | Validation errors, destructive actions  |
| `info`               | `#4F8DFF`              | `#4F8DFF` | Informational messages                  |

## Usage in components

### Tailwind utilities (preferred)

```tsx
// Before
<button className="bg-[#D2045B] hover:bg-[#B8043F] text-white">Save</button>

// After
<button className="bg-primary hover:bg-primary-hover text-primary-contrast">Save</button>
```

### Inline / style props

```tsx
import { colorTokens } from "@/theme/colors";

<div style={{ borderColor: colorTokens.border.default }} />;
```

### Charts / canvas

```tsx
<Line stroke={colorTokens.primary.default} />
```

## Adding a new token

1. Add the `:root` and `.dark` values in `globals.css` under `@theme inline`.
2. Add the matching entry in `app/src/theme/colors.ts`.
3. Update this table.

## Adoption status

The token system is in place and adopted in the major shared components
(`TopHeader`, `Sidebar`, `Transactions`, `EventsContent`,
`EarningsRoyalties`, `OverviewCards`, `MyAlbums`, sign-up / login, the
authentication modals, and the settings pages).

Components that still ship raw hex values (`#XXX`) are tracked in
`docs/theme-adoption-status.md` for a follow-up sweep — they are not
broken, only inconsistent.
