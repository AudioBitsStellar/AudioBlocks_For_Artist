/**
 * Feature flags — driven by env vars so they're removable without touching
 * component logic. Flip NEXT_PUBLIC_USE_MOCK_DATA=false (or unset it) once a
 * surface's real API is wired up and verified.
 *
 * Per-surface overrides let you migrate one surface at a time while others
 * still show mock data during the transition period.
 */

const globalMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

export const featureFlags = {
  /** Overview KPI cards — wired to real API when false */
  useMockOverviewCards: globalMock,
  /** Events list and metrics */
  useMockEvents: globalMock,
  /** Merch list and metrics */
  useMockMerches: globalMock,
  /** Albums carousel on dashboard/overview — wired to real API when false */
  useMockAlbums: globalMock,
  /**
   * EarningsRoyalties is already wired to a real endpoint (#47),
   * so its flag is always false regardless of the global toggle.
   */
  useMockEarnings: false,
} as const;
