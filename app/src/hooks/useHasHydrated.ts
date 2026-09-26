"use client";

import { useSyncExternalStore } from "react";

function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * False during server rendering, true once hydrated.
 *
 * Storage-backed views (see `useEmailVerification`, `useTeam`) resolve to their
 * default on the server and to the real record on the client. Surfaces that
 * would render something structurally different between the two wait on this
 * instead of guessing, and it avoids the mount-time `setState` effect that would
 * otherwise be needed to learn the same thing.
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}
