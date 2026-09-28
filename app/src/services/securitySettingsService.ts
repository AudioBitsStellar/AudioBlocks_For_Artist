/**
 * Account security settings – two-factor authentication (issue #413).
 *
 * Privy is the designated 2FA provider for the Artist Portal, but the SDK is
 * not part of the client bundle yet, so the enrolment state machine is kept
 * here in localStorage – the same local-first pattern used by
 * notificationPreferences.ts and verificationService.ts. Every function in
 * this module is the single seam where the Privy enrolment/verification calls
 * will be dropped in; the UI only talks to this API.
 *
 * Pure functions – no React deps so it can be tested in isolation.
 */

export type TwoFactorStatus = "disabled" | "pending" | "enabled";

export type TwoFactorProvider = "privy";

export interface TwoFactorSetup {
  /** Base32-style shared secret handed to the authenticator app. */
  secret: string;
  /** `otpauth://` URI so a QR code can be rendered from it. */
  otpauthUri: string;
  /**
   * Six-digit enrolment challenge. Privy verifies the real TOTP server-side;
   * until the SDK is wired up the setup dialog validates against this value so
   * the whole flow can be exercised end-to-end.
   */
  challenge: string;
}

export interface SecuritySettings {
  provider: TwoFactorProvider;
  twoFactorStatus: TwoFactorStatus;
  /** Email the artist when a new device signs in. */
  loginAlerts: boolean;
  setup?: TwoFactorSetup;
  /** One-time recovery codes – only present once 2FA is enabled. */
  recoveryCodes?: string[];
  enabledAt?: string;
}

export type TwoFactorSetupResult =
  { ok: true; settings: SecuritySettings } | { ok: false; error: string };

const STORAGE_KEY = "audioblocks:security-settings:v1";

const ACCOUNT_LABEL = "artist@audioblocks";

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  provider: "privy",
  twoFactorStatus: "disabled",
  loginAlerts: true,
};

function randomHex(length: number): string {
  const alphabet = "0123456789ABCDEF";
  let out = "";
  const cryptoApi = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i += 1) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }

  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function randomDigits(length: number): string {
  const cryptoApi = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  let out = "";

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i += 1) {
      out += String(bytes[i] % 10);
    }
    return out;
  }

  for (let i = 0; i < length; i += 1) {
    out += String(Math.floor(Math.random() * 10));
  }
  return out;
}

function isTwoFactorStatus(value: unknown): value is TwoFactorStatus {
  return value === "disabled" || value === "pending" || value === "enabled";
}

function isSetup(value: unknown): value is TwoFactorSetup {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TwoFactorSetup>;
  return (
    typeof candidate.secret === "string" &&
    typeof candidate.otpauthUri === "string" &&
    typeof candidate.challenge === "string"
  );
}

export function buildOtpauthUri(secret: string): string {
  const label = encodeURIComponent(ACCOUNT_LABEL);
  return `otpauth://totp/AudioBlocks:${label}?secret=${secret}&issuer=AudioBlocks&digits=6&period=30`;
}

/** Reads the persisted security settings, falling back to safe defaults. */
export function getSecuritySettings(): SecuritySettings {
  if (typeof window === "undefined") return DEFAULT_SECURITY_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SECURITY_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SecuritySettings>;
    return {
      provider: "privy",
      twoFactorStatus: isTwoFactorStatus(parsed.twoFactorStatus)
        ? parsed.twoFactorStatus
        : DEFAULT_SECURITY_SETTINGS.twoFactorStatus,
      loginAlerts:
        typeof parsed.loginAlerts === "boolean"
          ? parsed.loginAlerts
          : DEFAULT_SECURITY_SETTINGS.loginAlerts,
      setup: isSetup(parsed.setup) ? parsed.setup : undefined,
      recoveryCodes: Array.isArray(parsed.recoveryCodes) ? parsed.recoveryCodes : undefined,
      enabledAt: typeof parsed.enabledAt === "string" ? parsed.enabledAt : undefined,
    };
  } catch {
    return { ...DEFAULT_SECURITY_SETTINGS };
  }
}

/** Merges a patch into the stored settings. Returns the persisted result. */
export function saveSecuritySettings(patch: Partial<SecuritySettings>): SecuritySettings {
  const next: SecuritySettings = { ...getSecuritySettings(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable (private mode) – keep the in-memory result
    }
  }
  return next;
}

/** Generates a fresh shared secret + enrolment challenge and marks 2FA pending. */
export function beginTwoFactorSetup(): TwoFactorSetup {
  const secret = randomHex(32);
  const setup: TwoFactorSetup = {
    secret,
    otpauthUri: buildOtpauthUri(secret),
    challenge: randomDigits(6),
  };
  saveSecuritySettings({ twoFactorStatus: "pending", setup, recoveryCodes: undefined });
  return setup;
}

export function generateRecoveryCodes(count = 6): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const block = randomHex(4);
    codes.push(`${block.slice(0, 4)}-${block.slice(4, 8)}`);
  }
  return codes;
}

/**
 * Confirms the enrolment challenge. On success 2FA flips to "enabled" and a
 * single-use recovery code set is issued.
 */
export function confirmTwoFactorSetup(code: string): TwoFactorSetupResult {
  const settings = getSecuritySettings();
  const entered = code.trim().replace(/\s/g, "");

  if (!/^\d{6}$/.test(entered)) {
    return { ok: false, error: "Enter the 6-digit code." };
  }

  if (settings.twoFactorStatus === "enabled") {
    return { ok: false, error: "Two-factor authentication is already enabled." };
  }

  if (!settings.setup) {
    return { ok: false, error: "Start the setup flow again and try once more." };
  }

  if (entered !== settings.setup.challenge) {
    return { ok: false, error: "That code is not correct. Check your authenticator app." };
  }

  const recoveryCodes = generateRecoveryCodes();
  const updated = saveSecuritySettings({
    twoFactorStatus: "enabled",
    recoveryCodes,
    enabledAt: new Date().toISOString(),
  });

  return { ok: true, settings: updated };
}

/** Turns 2FA off and clears the pending enrolment state. */
export function disableTwoFactor(): SecuritySettings {
  return saveSecuritySettings({
    twoFactorStatus: "disabled",
    setup: undefined,
    recoveryCodes: undefined,
    enabledAt: undefined,
  });
}

/** Issues a fresh recovery code set (the previous set stops working). */
export function regenerateRecoveryCodes(): string[] {
  const recoveryCodes = generateRecoveryCodes();
  saveSecuritySettings({ recoveryCodes });
  return recoveryCodes;
}

export function setLoginAlerts(enabled: boolean): SecuritySettings {
  return saveSecuritySettings({ loginAlerts: enabled });
}

export function isTwoFactorEnabled(): boolean {
  return getSecuritySettings().twoFactorStatus === "enabled";
}
