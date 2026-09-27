/**
 * Artist verification workflow storage (#313).
 *
 * There's no backend endpoint for verification yet, so this mirrors the
 * localStorage-backed pattern used by notificationPreferences.ts until one
 * ships.
 *
 * Pure functions – no React deps so it can be tested in isolation.
 */

export type VerificationStatus = "unverified" | "pending" | "verified";

export interface VerificationApplication {
  legalName: string;
  proofUrl: string;
  note?: string;
}

interface VerificationState {
  status: VerificationStatus;
  application?: VerificationApplication;
  /** ISO timestamp of the last submission, shown in the request flow. */
  submittedAt?: string;
}

const STORAGE_KEY = "audioblocks:verification:v1";

const DEFAULT_STATE: VerificationState = { status: "unverified" };

function isVerificationStatus(value: unknown): value is VerificationStatus {
  return value === "unverified" || value === "pending" || value === "verified";
}

function loadState(): VerificationState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<VerificationState>;
    if (!isVerificationStatus(parsed.status)) return DEFAULT_STATE;
    return {
      status: parsed.status,
      application: parsed.application,
      submittedAt: typeof parsed.submittedAt === "string" ? parsed.submittedAt : undefined,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: VerificationState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Current verification status, read from persisted storage. */
export function getVerificationStatus(): VerificationStatus {
  return loadState().status;
}

/** The most recently submitted application, if any. */
export function getVerificationApplication(): VerificationApplication | undefined {
  return loadState().application;
}

/** Submits a verification application, moving status to "pending". */
export function submitVerificationApplication(
  application: VerificationApplication
): VerificationStatus {
  saveState({ status: "pending", application, submittedAt: new Date().toISOString() });
  return "pending";
}

/** ISO timestamp of the most recent submission, if there is one. */
export function getVerificationSubmittedAt(): string | undefined {
  return loadState().submittedAt;
}

/** Pulls a pending application back so the artist can edit and re-submit. */
export function withdrawVerification(): VerificationStatus {
  saveState(DEFAULT_STATE);
  return "unverified";
}

/**
 * Simulates an application being approved, moving status to "verified".
 * There's no review backend yet — this stands in for that outcome so the
 * badge display can be exercised end-to-end.
 */
export function approveVerification(): VerificationStatus {
  const state = loadState();
  saveState({ ...state, status: "verified" });
  return "verified";
}

/** Resets verification back to the initial "unverified" state. */
export function resetVerification(): VerificationStatus {
  saveState(DEFAULT_STATE);
  return "unverified";
}
