"use client";

import { USER_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { isEmailUnverified } from "@/services/emailVerificationService";

/**
 * Shared by the dashboard gate, the check-inbox step and the link step, so all
 * three agree on one answer and a verified link updates the gate at once.
 */
export const EMAIL_VERIFICATION_QUERY_KEY = ["auth", "email-verification"] as const;

/** `GET /users/profile` wraps the profile in `data`. */
interface ProfileResponse {
  success?: boolean;
  data?: { emailVerified?: boolean | null };
}

/** The `emailVerified` flag from a profile response, or `undefined` when absent. */
export function readEmailVerified(response: ProfileResponse | undefined): boolean | undefined {
  const value = response?.data?.emailVerified;
  return typeof value === "boolean" ? value : undefined;
}

/**
 * Live view of the signed-in artist's email verification, read from the backend
 * profile. Nothing is cached in browser storage (#519).
 */
export function useEmailVerification() {
  const query = useGet<ProfileResponse>(EMAIL_VERIFICATION_QUERY_KEY, USER_ENDPOINTS.PROFILE, {
    staleTime: 0,
  });
  const emailVerified = readEmailVerified(query.data);

  return {
    emailVerified,
    requiresVerification: isEmailUnverified(emailVerified),
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
