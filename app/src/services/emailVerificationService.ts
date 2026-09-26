/**
 * Artist onboarding email verification (#459).
 *
 * There's no verification backend yet, so this mirrors the localStorage-backed
 * pattern used by verificationService.ts (#313) and
 * notificationPreferences.ts (#161) until one ships. Because delivery can't be
 * simulated over the network, `startVerification()` and `resendVerificationCode()`
 * hand the code back to the caller so the UI can surface it in mock mode —
 * see {@link IssuedCode}.
 *
 * Pure functions – no React deps so it can be tested in isolation.
 */

export type EmailVerificationStatus = "unverified" | "pending" | "verified";

export interface EmailVerificationState {
  status: EmailVerificationStatus;
  /** Address the code was issued to, lower-cased for comparison/display. */
  email?: string;
  /** Digest of the active code. Cleared once it is spent or invalidated. */
  codeDigest?: number;
  /** Epoch ms after which the active code no longer accepts attempts. */
  expiresAt?: number;
  /** Wrong submissions made against the active code. */
  attempts: number;
  /** Epoch ms of the last issuance, used for the resend cooldown. */
  lastSentAt?: number;
}

export type VerificationError =
  "no_active_code" | "expired" | "invalid_code" | "too_many_attempts" | "cooldown_active";

/**
 * Result of issuing a code. `code` is returned only because delivery is
 * mocked — a real backend emails it and never shows it to the client.
 */
export type IssuedCode =
  { ok: true; code: string } | { ok: false; error: VerificationError; retryAfterMs?: number };

/** Result of `verifyEmailCode()`. */
export type VerifyResult = { ok: true } | { ok: false; error: VerificationError };

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;

const STORAGE_KEY = "audioblocks:email-verification:v1";

/** Dispatched after a write so same-tab readers re-read; `storage` covers other tabs. */
const CHANGE_EVENT = "audioblocks:email-verification:changed";

const DEFAULT_STATE: EmailVerificationState = { status: "unverified", attempts: 0 };

function isStatus(value: unknown): value is EmailVerificationStatus {
  return value === "unverified" || value === "pending" || value === "verified";
}

function parseState(raw: string | null): EmailVerificationState {
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<EmailVerificationState>;
    if (!isStatus(parsed.status)) return DEFAULT_STATE;
    return {
      status: parsed.status,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      codeDigest: typeof parsed.codeDigest === "number" ? parsed.codeDigest : undefined,
      expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : undefined,
      attempts: typeof parsed.attempts === "number" && parsed.attempts > 0 ? parsed.attempts : 0,
      lastSentAt: typeof parsed.lastSentAt === "number" ? parsed.lastSentAt : undefined,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

// Cached against the raw string so repeated reads hand back the same object —
// `useSyncExternalStore` re-renders forever if a snapshot is not stable.
let cachedRaw: string | null = null;
let cachedState: EmailVerificationState = DEFAULT_STATE;

/** Reads and repairs persisted state; anything malformed falls back to defaults. */
export function getEmailVerificationState(): EmailVerificationState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parseState(raw);
  }
  return cachedState;
}

/** Snapshot to use during server rendering, where storage doesn't exist. */
export function getEmailVerificationServerState(): EmailVerificationState {
  return DEFAULT_STATE;
}

/**
 * Subscribes to verification changes. Pair with
 * {@link getEmailVerificationState} for `useSyncExternalStore`.
 */
export function subscribeToEmailVerification(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    cachedRaw = null; // force the next read to re-parse
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function notifyEmailVerificationChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function saveState(state: EmailVerificationState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return false;
  }
  notifyEmailVerificationChanged();
  return true;
}

/** Status of the signed-in artist's address, read from persisted storage. */
export function getEmailVerificationStatus(): EmailVerificationStatus {
  return getEmailVerificationState().status;
}

/**
 * Whether onboarding is blocked on a pending code. Deliberately false for the
 * `"unverified"` default: artists who registered before this step shipped have
 * no code on record and must not be locked out of their dashboard.
 */
export function requiresEmailVerification(): boolean {
  return getEmailVerificationStatus() === "pending";
}

/** Address the pending/verified code was issued to, if any. */
export function getVerifiedEmail(): string | undefined {
  return getEmailVerificationState().email;
}

/**
 * FNV-1a over the code, so the literal digits never sit in storage. The digest
 * is a tidiness measure for a mocked flow, not a security boundary: a real
 * backend compares codes server-side.
 */
function digestCode(code: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < code.length; i += 1) {
    hash ^= code.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function randomCode(): string {
  const cryptoObj = typeof globalThis.crypto === "undefined" ? undefined : globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint32Array(CODE_LENGTH);
    cryptoObj.getRandomValues(bytes);
    return Array.from(bytes, (byte) => String(byte % 10)).join("");
  }
  return Array.from({ length: CODE_LENGTH }, () => Math.floor(Math.random() * 10))
    .join("")
    .padStart(CODE_LENGTH, "0");
}

/** Normalises free-typed input to digits, or `null` when it can't be a code. */
export function sanitizeCodeInput(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return digits.length === CODE_LENGTH ? digits : null;
}

/** Milliseconds left before the user may request another code (0 when ready). */
export function msUntilResend(now: number = Date.now()): number {
  const { lastSentAt } = getEmailVerificationState();
  if (typeof lastSentAt !== "number") return 0;
  return Math.max(0, lastSentAt + RESEND_COOLDOWN_MS - now);
}

function issueCode(email: string, now: number, enforceCooldown: boolean): IssuedCode {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "no_active_code" };

  if (enforceCooldown) {
    const wait = msUntilResend(now);
    if (wait > 0) return { ok: false, error: "cooldown_active", retryAfterMs: wait };
  }

  const code = randomCode();
  saveState({
    status: "pending",
    email: trimmed,
    codeDigest: digestCode(code),
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    lastSentAt: now,
  });
  return { ok: true, code };
}

/**
 * Starts verification for a freshly registered artist: issues the first code.
 * Skips the resend cooldown — the signup endpoint in front of it is the thing
 * that throttles registration, and a leftover record from an earlier address
 * must not block a new artist from ever receiving a code.
 */
export function startVerification(email: string, now: number = Date.now()): IssuedCode {
  return issueCode(email, now, false);
}

/** Issues a replacement code for the stored address, subject to the cooldown. */
export function resendVerificationCode(now: number = Date.now()): IssuedCode {
  const { email } = getEmailVerificationState();
  if (!email) return { ok: false, error: "no_active_code" };
  return issueCode(email, now, true);
}

/**
 * Checks a submitted code. Wrong attempts are counted; once
 * {@link MAX_ATTEMPTS} is reached the active code is burnt and a resend is the
 * only way forward.
 */
export function verifyEmailCode(input: string, now: number = Date.now()): VerifyResult {
  const state = getEmailVerificationState();
  if (state.status !== "pending" || typeof state.codeDigest !== "number") {
    return { ok: false, error: "no_active_code" };
  }
  if (state.attempts >= MAX_ATTEMPTS) return { ok: false, error: "too_many_attempts" };
  if (typeof state.expiresAt === "number" && now > state.expiresAt) {
    saveState({ ...state, codeDigest: undefined, attempts: 0 });
    return { ok: false, error: "expired" };
  }

  const code = sanitizeCodeInput(input);
  if (!code) return { ok: false, error: "invalid_code" };

  if (digestCode(code) !== state.codeDigest) {
    saveState({ ...state, attempts: state.attempts + 1 });
    return { ok: false, error: "invalid_code" };
  }

  saveState({ ...state, status: "verified", codeDigest: undefined, attempts: 0 });
  return { ok: true };
}

/** Drops the record entirely — used on logout and by tests. */
export function clearEmailVerification(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing to clear.
    return;
  }
  notifyEmailVerificationChanged();
}
