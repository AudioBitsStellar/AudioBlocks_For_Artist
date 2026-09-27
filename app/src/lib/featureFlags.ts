/**
 * Feature flags — driven by env vars so they're removable without touching
 * component logic. Flip NEXT_PUBLIC_USE_MOCK_DATA=false (or unset it) once a
 * surface's real API is wired up and verified.
 *
 * Per-surface overrides let you migrate one surface at a time while others
 * still show mock data during the transition period.
 */

const globalMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export const featureFlags = {
  /** Overview KPI cards — wired to real API when false */
  useMockOverviewCards: globalMock,
  /** Events list and metrics */
  useMockEvents: globalMock,
  /** Merch list and metrics */
  useMockMerches: globalMock,
  /** Albums carousel on dashboard/overview — wired to real API when false */
  useMockAlbums: globalMock,
  /** My Music track list — track edits are simulated locally instead of hitting the API when true */
  useMockTracks: globalMock,
  /** Fans Engagement widget (top songs, streaming regions, top streamers) — wired to real API when false */
  useMockFansEngagement: globalMock,
  /** Notification bell dropdown in the top header — read state is kept locally when true */
  useMockNotifications: globalMock,
  /**
   * EarningsRoyalties is already wired to a real endpoint (#47),
   * so its flag is always false regardless of the global toggle.
   */
  useMockEarnings: false,
} as const;

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
 * `isFeatureEnabled` resolves a flag in this order, first match wins:
 *  1. a per-browser override (see `useFeatureFlag`/`setFeatureFlagOverride`),
 *     for reviewing one feature on a preview deployment without touching it;
 *  2. `NEXT_PUBLIC_FEATURE_FLAGS`, per deployment, e.g. `"artistOnchainAnalytics=true"`;
 *  3. the flag's allowlist (beta artists, matched case-insensitively);
 *  4. a percentage bucket of the subject — stable, so an artist never sees a
 *     feature flicker between visits as the bucket is hash-based, not random.
 */
export type FeatureFlagName = "artistOnchainAnalytics";

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
      "On-chain plays and sales from the subgraph, shown as a section of the analytics dashboard.",
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
  const raw = process.env.NEXT_PUBLIC_FEATURE_FLAGS;
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
  const storedOverride = overrides[name];
  if (storedOverride !== undefined) return storedOverride;

  const envOverride = parseEnvOverrides()[name];
  if (envOverride !== undefined) return envOverride;

  const trimmed = subject?.trim();
  if (!trimmed) return false;

  const flag = FEATURE_FLAGS[name];
  if (flag.allowlist?.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) return true;
  if (flag.rolloutPercentage <= 0) return false;
  if (flag.rolloutPercentage >= 100) return true;

  return bucketOf(name, trimmed) < flag.rolloutPercentage;
}
