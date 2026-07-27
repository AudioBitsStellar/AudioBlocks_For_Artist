/**
 * Color token system for AudioBlocks (issue #180).
 *
 * Single source of truth for color values used across the application.
 * Each constant maps to a CSS custom property declared in
 * `app/src/app/globals.css` under `@theme inline` so the corresponding
 * Tailwind utilities (`bg-primary`, `text-muted`, etc.) work as well.
 *
 * Naming convention:
 *   - Semantic names (primary, secondary, surface, …) instead of
 *     literal "pink-500" — easier to rebrand and to theme.
 *   - `default` / `contrast` siblings describe the readable pair.
 *   - State colors (success, warning, error, info) follow the same shape.
 *
 * Switching themes:
 *   - The `.dark` class on `<html>` (toggled by TopHeader) swaps the
 *     values of these custom properties at runtime — components do NOT
 *     need to know which theme is active.
 *
 * Reference: docs/theme-tokens.md
 */

export const colorTokens = {
  primary: {
    default: 'var(--color-primary)',
    hover: 'var(--color-primary-hover)',
    contrast: 'var(--color-primary-contrast)',
  },
  secondary: {
    default: 'var(--color-secondary)',
    contrast: 'var(--color-secondary-contrast)',
  },
  background: 'var(--color-background)',
  surface: {
    default: 'var(--color-surface)',
    raised: 'var(--color-surface-raised)',
    sunken: 'var(--color-surface-sunken)',
  },
  text: {
    default: 'var(--color-text)',
    muted: 'var(--color-text-muted)',
    subtle: 'var(--color-text-subtle)',
    inverted: 'var(--color-text-inverted)',
  },
  border: {
    default: 'var(--color-border)',
    subtle: 'var(--color-border-subtle)',
  },
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
} as const;

export type ColorTokenKey = keyof typeof colorTokens;
