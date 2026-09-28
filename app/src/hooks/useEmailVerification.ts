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
