import { beforeEach, describe, expect, it } from "vitest";
import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  clearEmailVerification,
  getEmailVerificationState,
  getEmailVerificationStatus,
  msUntilResend,
  resendVerificationCode,
  requiresEmailVerification,
  sanitizeCodeInput,
  startVerification,
  verifyEmailCode,
} from "@/services/emailVerificationService";

const EMAIL = "Artist@Example.COM";
const T0 = 1_700_000_000_000;

/** Issues a code and returns it, failing loudly if issuance was refused. */
function issue(email: string = EMAIL, now: number = T0): string {
  const result = startVerification(email, now);
  if (!result.ok) throw new Error(`issuance failed: ${result.error}`);
  return result.code;
}

describe("emailVerificationService (#459)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("startVerification", () => {
    it("moves the account to pending and records the address", () => {
      const code = issue();

      expect(code).toMatch(/^\d{6}$/);
      expect(getEmailVerificationStatus()).toBe("pending");
      expect(getEmailVerificationState().email).toBe("artist@example.com");
    });

    it("refuses an empty address", () => {
      const result = startVerification("   ", T0);

      expect(result).toEqual({ ok: false, error: "no_active_code" });
      expect(getEmailVerificationStatus()).toBe("unverified");
    });

    it("ignores a stale resend cooldown left by an earlier address", () => {
      issue("first@example.com", T0);
      const second = startVerification("second@example.com", T0 + 1000);

      expect(second.ok).toBe(true);
    });
  });

  describe("verifyEmailCode", () => {
    it("accepts the issued code and marks the address verified", () => {
      const code = issue();

      expect(verifyEmailCode(code, T0 + 1000)).toEqual({ ok: true });
      expect(getEmailVerificationStatus()).toBe("verified");
      expect(requiresEmailVerification()).toBe(false);
    });

    it("accepts a code typed with separators or pasted spaces", () => {
      const code = issue();

      expect(verifyEmailCode(` ${code.slice(0, 3)}-${code.slice(3)} `, T0)).toEqual({ ok: true });
    });

    it("rejects a wrong code and counts the attempt", () => {
      const code = issue();
      const wrong = code === "000000" ? "000001" : "000000";

      expect(verifyEmailCode(wrong, T0)).toEqual({ ok: false, error: "invalid_code" });
      expect(getEmailVerificationState().attempts).toBe(1);
      expect(getEmailVerificationStatus()).toBe("pending");
    });

    it("burns the code once MAX_ATTEMPTS wrong tries are used up", () => {
      const code = issue();
      const wrong = code === "000000" ? "000001" : "000000";

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        expect(verifyEmailCode(wrong, T0)).toEqual({ ok: false, error: "invalid_code" });
      }
      expect(verifyEmailCode(code, T0)).toEqual({ ok: false, error: "too_many_attempts" });
    });

    it("rejects an expired code and clears it so a resend is required", () => {
      const code = issue();

      expect(verifyEmailCode(code, T0 + CODE_TTL_MS + 1)).toEqual({ ok: false, error: "expired" });
      expect(getEmailVerificationState().codeDigest).toBeUndefined();
      expect(verifyEmailCode(code, T0 + CODE_TTL_MS + 2)).toEqual({
        ok: false,
        error: "no_active_code",
      });
    });

    it("does nothing when there is no code on file", () => {
      expect(verifyEmailCode("123456", T0)).toEqual({ ok: false, error: "no_active_code" });
    });

    it("does nothing once the address is already verified", () => {
      const code = issue();
      verifyEmailCode(code, T0);

      expect(verifyEmailCode(code, T0 + 10)).toEqual({ ok: false, error: "no_active_code" });
    });
  });

  describe("resendVerificationCode", () => {
    it("issues a new code and invalidates the old one", () => {
      const first = issue();
      const second = resendVerificationCode(T0 + RESEND_COOLDOWN_MS);
      if (!second.ok) throw new Error(`resend failed: ${second.error}`);

      expect(verifyEmailCode(first, T0 + RESEND_COOLDOWN_MS + 1)).toEqual({
        ok: false,
        error: "invalid_code",
      });
      expect(verifyEmailCode(second.code, T0 + RESEND_COOLDOWN_MS + 1)).toEqual({ ok: true });
    });

    it("enforces the cooldown and reports how long to wait", () => {
      issue();

      const result = resendVerificationCode(T0 + RESEND_COOLDOWN_MS - 5000);
      expect(result).toEqual({ ok: false, error: "cooldown_active", retryAfterMs: 5000 });
    });

    it("resets the failed-attempt counter", () => {
      const code = issue();
      verifyEmailCode(code === "000000" ? "000001" : "000000", T0);
      const resent = resendVerificationCode(T0 + RESEND_COOLDOWN_MS);
      if (!resent.ok) throw new Error(`resend failed: ${resent.error}`);

      expect(getEmailVerificationState().attempts).toBe(0);
    });

    it("refuses when no address is on file", () => {
      expect(resendVerificationCode(T0)).toEqual({ ok: false, error: "no_active_code" });
    });
  });

  describe("requiresEmailVerification", () => {
    it("is false for an account with no record, so existing artists are not locked out", () => {
      expect(getEmailVerificationStatus()).toBe("unverified");
      expect(requiresEmailVerification()).toBe(false);
    });

    it("is true only while a code is outstanding", () => {
      const code = issue();
      expect(requiresEmailVerification()).toBe(true);

      verifyEmailCode(code, T0);
      expect(requiresEmailVerification()).toBe(false);
    });
  });

  describe("msUntilResend", () => {
    it("is zero before any code is issued", () => {
      expect(msUntilResend(T0)).toBe(0);
    });

    it("counts down from the cooldown and floors at zero", () => {
      issue();
      expect(msUntilResend(T0 + 40_000)).toBe(20_000);
      expect(msUntilResend(T0 + RESEND_COOLDOWN_MS + 10_000)).toBe(0);
    });
  });

  describe("sanitizeCodeInput", () => {
    it("keeps only full-length digit strings", () => {
      expect(sanitizeCodeInput("12 34-56")).toBe("123456");
      expect(sanitizeCodeInput("12345")).toBeNull();
      expect(sanitizeCodeInput("abcdef")).toBeNull();
    });
  });

  describe("persisted state", () => {
    it("never stores the literal code", () => {
      const code = issue();
      const raw = localStorage.getItem("audioblocks:email-verification:v1") ?? "";

      expect(raw).not.toContain(code);
      expect(getEmailVerificationState().codeDigest).toBeTypeOf("number");
    });

    it("falls back to a clean default when storage holds garbage", () => {
      localStorage.setItem("audioblocks:email-verification:v1", "{not json");

      expect(getEmailVerificationStatus()).toBe("unverified");
      expect(requiresEmailVerification()).toBe(false);
    });

    it("discards an unknown status value", () => {
      localStorage.setItem(
        "audioblocks:email-verification:v1",
        JSON.stringify({ status: "teleported", attempts: 2 })
      );

      expect(getEmailVerificationStatus()).toBe("unverified");
    });

    it("forgets everything on clearEmailVerification", () => {
      issue();
      clearEmailVerification();

      expect(getEmailVerificationStatus()).toBe("unverified");
      expect(getEmailVerificationState().email).toBeUndefined();
    });
  });
});
