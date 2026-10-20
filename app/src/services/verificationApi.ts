/**
 * Backend-backed artist verification (#524).
 *
 * Replaces the localStorage stand-in in `verificationService.ts`: applications
 * are sent to the backend (ApplyVerificationDTO) so they reach admin review at
 * `/admin/verifications`, and the status shown in the dashboard is the
 * backend's, including rejection reasons.
 */

import { VERIFICATION_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";

export const VERIFICATION_QUERY_KEY = ["artist-verification"] as const;

/** Mirrors the backend ApplyVerificationDTO. */
export interface ApplyVerificationPayload {
  displayNameProof: string;
  socialLinks: string[];
  musicLinks: string[];
  notes?: string;
}

export type BackendVerificationStatus = "none" | "pending" | "approved" | "rejected";

export interface VerificationStatusView {
  status: BackendVerificationStatus;
  rejectionReason?: string;
  /** Rejected (or never applied) artists may submit a new application. */
  canApply: boolean;
}

const MAX_LINKS = 10;

function cleanLinks(links: string[]): string[] {
  return links
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINKS);
}

/** Builds the DTO from the dashboard form, trimming empties. */
export function toApplyVerificationPayload(form: {
  legalName: string;
  socialLinks: string[];
  musicLinks: string[];
  note?: string;
}): ApplyVerificationPayload {
  const payload: ApplyVerificationPayload = {
    displayNameProof: form.legalName.trim(),
    socialLinks: cleanLinks(form.socialLinks),
    musicLinks: cleanLinks(form.musicLinks),
  };
  const notes = form.note?.trim();
  if (notes) payload.notes = notes;
  return payload;
}

/** Client-side check matching the DTO's required fields; returns error messages. */
export function validateApplyVerificationPayload(payload: ApplyVerificationPayload): string[] {
  const errors: string[] = [];
  if (!payload.displayNameProof) errors.push("Name is required.");
  if (payload.socialLinks.length === 0) errors.push("Add at least one social link.");
  if (payload.musicLinks.length === 0) errors.push("Add at least one music link.");
  const isHttp = (u: string) => /^https?:\/\/\S+$/i.test(u);
  if (![...payload.socialLinks, ...payload.musicLinks].every(isHttp)) {
    errors.push("Links must be valid http(s) URLs.");
  }
  return errors;
}

/** Normalises the backend record (or its absence) into what the UI renders. */
export function toVerificationStatusView(
  record: { status?: string; rejectionReason?: string | null } | null | undefined
): VerificationStatusView {
  const status = record?.status;
  if (status === "pending") return { status, canApply: false };
  if (status === "approved") return { status, canApply: false };
  if (status === "rejected") {
    return { status, rejectionReason: record?.rejectionReason ?? undefined, canApply: true };
  }
  return { status: "none", canApply: true };
}

const useVerificationApi = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  const useVerificationStatus = (enabled: boolean = true) =>
    useGet<{ data?: { status?: string; rejectionReason?: string | null } | null }>(
      VERIFICATION_QUERY_KEY,
      VERIFICATION_ENDPOINTS.STATUS,
      { enabled }
    );

  const useApplyVerification = () =>
    usePost<unknown, ApplyVerificationPayload>(VERIFICATION_ENDPOINTS.APPLY, {
      onSuccess() {
        handleSuccess("Verification request submitted for review.");
      },
      onError(error: Error) {
        handleError(error.message || "Failed to submit verification request.");
      },
      invalidateQueries: [VERIFICATION_QUERY_KEY],
    });

  return { useVerificationStatus, useApplyVerification };
};

export default useVerificationApi;
