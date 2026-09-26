"use client";

import { useSyncExternalStore } from "react";
import {
  getEmailVerificationServerState,
  getEmailVerificationState,
  subscribeToEmailVerification,
  type EmailVerificationState,
  type EmailVerificationStatus,
} from "@/services/emailVerificationService";

export interface UseEmailVerificationReturn {
  /** Full record: address, attempt count, cooldown timestamp. */
  state: EmailVerificationState;
  status: EmailVerificationStatus;
  /**
   * True only while a code is outstanding. An account with no record is not
   * treated as blocked, so artists who registered before this step shipped are
   * never locked out.
   */
  requiresVerification: boolean;
}

/**
 * Live view of the artist's onboarding email verification (#459).
 *
 * Backed by `useSyncExternalStore` rather than a mount-time effect, so the
 * dashboard gate and the verification step agree with the moment a code is
 * issued or spent — not just with when they first rendered.
 */
export function useEmailVerification(): UseEmailVerificationReturn {
  const state = useSyncExternalStore(
    subscribeToEmailVerification,
    getEmailVerificationState,
    getEmailVerificationServerState
  );

  return {
    state,
    status: state.status,
    requiresVerification: state.status === "pending",
  };
}

function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * False during server rendering, true once hydrated.
 *
 * Storage-backed views like {@link useEmailVerification} resolve to their
 * default on the server and to the real record on the client. Surfaces that
 * would render something structurally different between the two wait on this
 * instead of guessing, and it avoids the mount-time `setState` effect that
 * would otherwise be needed to learn the same thing.
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}
