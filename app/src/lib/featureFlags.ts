import { getRuntimeConfig } from "@/lib/runtimeConfig";

/**
 * Feature flags — driven by env vars so they're removable without touching
 * component logic. Flip NEXT_PUBLIC_USE_MOCK_DATA=false (or unset it) once a
 * surface's real API is wired up and verified.
 *
 * Per-surface overrides let you migrate one surface at a time while others
 * still show mock data during the transition period.
 */

/**
 * Read on every access rather than once at import, so a surface always agrees
 * with the environment it renders in (and tests can flip it with `vi.stubEnv`).
 * Next.js still inlines the value at build time.
 */
const globalMock = (): boolean => process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export const featureFlags = {
  /** Overview KPI cards — wired to real API when false */
  get useMockOverviewCards(): boolean {
    return globalMock();
  },
  /** Events list and metrics */
  get useMockEvents(): boolean {
    return globalMock();
  },
  /** Merch list and metrics */
  get useMockMerches(): boolean {
    return globalMock();
  },
  /** Albums carousel on dashboard/overview — wired to real API when false */
  get useMockAlbums(): boolean {
    return globalMock();
  },
  /** My Music track list — track edits are simulated locally instead of hitting the API when true */
  get useMockTracks(): boolean {
    return globalMock();
  },
  /** Fans Engagement widget (top songs, streaming regions, top streamers) — wired to real API when false */
  get useMockFansEngagement(): boolean {
    return globalMock();
  },
  /** Artists-tab conversations in Messages — there is no artist-to-artist API yet, so the tab is empty when false */
  get useMockMessages(): boolean {
    return globalMock();
  },
  /** Notification bell dropdown in the top header — read state is kept locally when true */
  get useMockNotifications(): boolean {
    return globalMock();
  },
  /** On-chain activity stats (#466) — read from the backend Soroban indexer when false */
  get useMockOnChainStats(): boolean {
    return globalMock();
  },
  /**
   * Listener geography, map and demographics on the analytics page. The
   * backend has no listener-analytics endpoint yet, so these surfaces show an
   * "unavailable" panel when false.
   */
  get useMockListenerAnalytics(): boolean {
    return globalMock();
  },
  /**
   * EarningsRoyalties is already wired to a real endpoint (#47),
   * so its flag is always false regardless of the global toggle.
   */
  useMockEarnings: false,
  /**
   * Onboarding email verification (#459). There is no code-delivery endpoint
   * yet, so codes are issued and revealed locally — the only alternative is a
   * step nobody can complete. Intentionally NOT tied to `globalMock`, which
   * defaults to false; flip this to false and wire an email send once
   * `POST /auth/verify-email/request` exists.
   */
  useMockEmailVerification: true,
  /**
   * Song token transfer flow (#529). Gated behind a flag until backend
   * relay endpoints (POST /song/:id/onchain/prepare-transfer) are supported.
   */
  enableSongTransfer: process.env.NEXT_PUBLIC_ENABLE_SONG_TRANSFER === "true",
} as const;

/* -------------------------------------------------------------------------- */
/* Which surfaces are showing sample data (#52)                                */
/* -------------------------------------------------------------------------- */

/**
 * Flags that swap a surface's *data* for fixtures. Email verification is left
 * out: it simulates a flow (codes shown locally) rather than showing data, and
 * it is on in every environment until the backend can send codes.
 */
type MockDataFlag = Exclude<
  {
    [K in keyof typeof featureFlags]: K extends `useMock${string}` ? K : never;
  }[keyof typeof featureFlags],
  "useMockEmailVerification"
>;

/**
 * Every data-source flag, with the name an artist would recognise. This is
 * the one list `MockDataNotice` and the dev console read, so a surface that
 * still shows sample data is always named somewhere visible. Remove an entry
 * together with its flag once the surface is fully on real data.
 */
export const MOCK_DATA_SURFACES: Record<MockDataFlag, string> = {
  useMockOverviewCards: "Overview statistics",
  useMockEvents: "Events",
  useMockMerches: "Merch",
  useMockAlbums: "Albums",
  useMockTracks: "My Music",
  useMockFansEngagement: "Fans engagement",
  useMockMessages: "Artist messages",
  useMockNotifications: "Notifications",
  useMockOnChainStats: "On-chain stats",
  useMockListenerAnalytics: "Listener analytics",
  useMockEarnings: "Earnings & royalties",
};

/** Names of the surfaces currently on sample data, in display order. */
export function activeMockSurfaces(
  flags: Partial<Record<MockDataFlag, boolean>> = featureFlags
): string[] {
  return (Object.keys(MOCK_DATA_SURFACES) as MockDataFlag[])
    .filter((flag) => flags[flag] === true)
    .map((flag) => MOCK_DATA_SURFACES[flag]);
}

/* -------------------------------------------------------------------------- */
/* Rollout flags (#469)                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Everything above gates a *data source* (mock vs. real API) for everyone at
 * once. Rollout flags below gate whole *features* per artist, so an artist
 * feature can be enabled for a few percent of users and widened without a
 * deploy — the mechanism the Artist Portal initiative needs now that several
 * surfaces ship incrementally.
 *
 * A runtime `false` is an operational kill switch and cannot be overridden in
 * the browser. Otherwise, `isFeatureEnabled` resolves in this order:
 *  1. a per-browser override (for reviewing a feature in a preview);
 *  2. runtime `NEXT_PUBLIC_FEATURE_FLAGS`, e.g. `"artistOnchainAnalytics=true"`;
 *  3. the flag's allowlist (beta artists, matched case-insensitively);
 *  4. a stable percentage bucket of the subject.
 */
export type FeatureFlagName = "artistOnchainAnalytics" | "teamManagement" | "maintenanceMode";

export interface FeatureFlagDefinition {
  /** What the feature is, for whoever has to debug it later. */
  description: string;
  /** Percentage (0-100) of artists the feature is live for. */
  rolloutPercentage: number;
  /** Subjects that always get the feature, regardless of the percentage. */
  allowlist?: readonly string[];
}

export const FEATURE_FLAGS: Record<FeatureFlagName, FeatureFlagDefinition> = {
  artistOnchainAnalytics: {
    description:
      "On-chain plays and sales from the backend Soroban indexer, shown as a section of the analytics dashboard.",
    rolloutPercentage: 0,
    allowlist: [],
  },
  teamManagement: {
    description:
      "Backend-enforced multi-user artist team workspace and staff access management (#525).",
    rolloutPercentage: 0,
    allowlist: [],
  },
  maintenanceMode: {
    description: "Planned maintenance banner and read-only mode notification (#781).",
    rolloutPercentage: 0,
    allowlist: [],
  },
};

export type FeatureFlagOverrides = Partial<Record<FeatureFlagName, boolean>>;

/** Namespace follows the `audioblocks:<domain>:v1` convention used across services. */
const OVERRIDE_STORAGE_KEY = "audioblocks:feature-flags:v1";

const subscribers = new Set<() => void>();

/** Notifies mounted `useFeatureFlag` consumers that the stored overrides changed. */
function notify(): void {
  subscribers.forEach((listener) => listener());
}

/** Registers a listener for override changes; returns its unsubscribe function. */
export function subscribeToFeatureFlagChanges(listener: () => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function parseEnvOverrides(): FeatureFlagOverrides {
  const raw = getRuntimeConfig().featureFlags;
  if (!raw) return {};

  const parsed: FeatureFlagOverrides = {};
  for (const pair of raw.split(",")) {
    const [name, value] = pair.split("=").map((part) => part.trim());
    if (!name || !(name in FEATURE_FLAGS)) continue;
    // Anything that isn't exactly "true" turns the flag off, so a typo can't
    // silently enable a feature for everyone.
    parsed[name as FeatureFlagName] = value === "true";
  }
  return parsed;
}

/** The overrides saved in this browser, ignoring anything malformed. */
export function readFeatureFlagOverrides(): FeatureFlagOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OVERRIDE_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const overrides: FeatureFlagOverrides = {};
    for (const [name, value] of Object.entries(parsed)) {
      if (name in FEATURE_FLAGS && typeof value === "boolean") {
        overrides[name as FeatureFlagName] = value;
      }
    }
    return overrides;
  } catch {
    // Corrupt or blocked storage must never take the dashboard down.
    return {};
  }
}

/**
 * Turns a flag on or off in this browser only. Pass `undefined` to drop the
 * override and go back to the rollout percentage.
 */
export function setFeatureFlagOverride(name: FeatureFlagName, enabled: boolean | undefined): void {
  if (typeof window === "undefined") return;
  const current = readFeatureFlagOverrides();
  if (enabled === undefined) delete current[name];
  else current[name] = enabled;

  try {
    if (Object.keys(current).length === 0) window.localStorage.removeItem(OVERRIDE_STORAGE_KEY);
    else window.localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Quota or private mode: the in-memory subscription below still updates
    // this session, the choice just doesn't survive a reload.
  }
  notify();
}

/**
 * 100 equal buckets from an FNV-1a hash of `flag:subject`. Hashing (instead of
 * `Math.random()`) is what makes the assignment stick to the artist, and it
 * keeps the decision identical on the server and the client.
 */
function bucketOf(name: FeatureFlagName, subject: string): number {
  const key = `${name}:${subject.toLowerCase()}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 100;
}

/**
 * Pure resolution of a flag — no storage, no React. `subject` is whatever the
 * feature is rolled out *to* (an artist's on-chain address here, a user id
 * elsewhere); without one there is nobody to enable the feature for, so an
 * absent subject always means "off".
 */
export function isFeatureEnabled(
  name: FeatureFlagName,
  subject?: string | null,
  overrides: FeatureFlagOverrides = {}
): boolean {
  const envOverride = parseEnvOverrides()[name];
  if (envOverride === false) return false;

  const storedOverride = overrides[name];
  if (storedOverride !== undefined) return storedOverride;

  if (envOverride !== undefined) return envOverride;

  const trimmed = subject?.trim();
  if (!trimmed) return false;

  const flag = FEATURE_FLAGS[name];
  if (flag.allowlist?.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) return true;
  if (flag.rolloutPercentage <= 0) return false;
  if (flag.rolloutPercentage >= 100) return true;

  return bucketOf(name, trimmed) < flag.rolloutPercentage;
}


export const FEATURE_FLAGS = {
  merch: "FEATURE_MERCH",
  events: "FEATURE_EVENTS",
  fanMessaging: "FEATURE_FAN_MESSAGING",
  referrals: "FEATURE_REFERRALS",
  loyalty: "FEATURE_LOYALTY",
  support: "FEATURE_SUPPORT",
} as const;


if (!isFeatureEnabled("events")) {
  return <ComingSoonPage featureName="Events" />;
}