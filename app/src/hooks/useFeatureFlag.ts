"use client";

/**
 * React access to a rollout flag (#469).
 *
 * `subject` is the identity the feature is rolled out to — pass the value your
 * feature is actually keyed on (an on-chain address, a user id). Leave it
 * undefined while that identity is still loading: an unresolved subject reads
 * as "off", so the feature appears once the subject arrives and never flashes
 * on then off.
 *
 * The per-browser override from `setFeatureFlagOverride` is applied after
 * mount rather than during render, because it lives in localStorage: reading
 * it during the first render would make the client's markup disagree with the
 * server's.
 */

import { useEffect, useState } from "react";
import {
  FeatureFlagName,
  FeatureFlagOverrides,
  isFeatureEnabled,
  readFeatureFlagOverrides,
  subscribeToFeatureFlagChanges,
} from "@/lib/featureFlags";

export function useFeatureFlag(name: FeatureFlagName, subject?: string | null): boolean {
  const [overrides, setOverrides] = useState<FeatureFlagOverrides>({});

  useEffect(() => {
    const sync = () => setOverrides(readFeatureFlagOverrides());
    sync();
    return subscribeToFeatureFlagChanges(sync);
  }, [name]);

  return isFeatureEnabled(name, subject, overrides);
}
