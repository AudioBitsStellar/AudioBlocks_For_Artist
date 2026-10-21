import { beforeEach, describe, expect, it, vi } from "vitest";

const { clientGet } = vi.hoisted(() => ({ clientGet: vi.fn() }));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn(async () => ({ get: clientGet })),
}));

import { isEmailUnverified, verifyEmailToken } from "@/services/emailVerificationService";

describe("verifyEmailToken (#519)", () => {
  beforeEach(() => {
    clientGet.mockReset();
  });

  it("consumes the emailed token through the backend", async () => {
    clientGet.mockResolvedValueOnce({ data: { success: true } });

    await expect(verifyEmailToken("abc123")).resolves.toEqual({ ok: true });
    expect(clientGet).toHaveBeenCalledWith("/auth/verify-email/abc123");
  });

  it("encodes the token before it goes into the path", async () => {
    clientGet.mockResolvedValueOnce({ data: { success: true } });

    await verifyEmailToken("a/b c");
    expect(clientGet).toHaveBeenCalledWith("/auth/verify-email/a%2Fb%20c");
  });

  it("reports an invalid or expired link for a 4xx response", async () => {
    clientGet.mockRejectedValueOnce(Object.assign(new Error("expired"), { status: 400 }));

    await expect(verifyEmailToken("old")).resolves.toEqual({
      ok: false,
      reason: "invalid_or_expired",
    });
  });

  it("reports the service as unavailable for a 5xx response", async () => {
    clientGet.mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 500 }));

    await expect(verifyEmailToken("abc")).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("rejects an empty token without calling the backend", async () => {
    await expect(verifyEmailToken("   ")).resolves.toEqual({
      ok: false,
      reason: "invalid_or_expired",
    });
    expect(clientGet).not.toHaveBeenCalled();
  });
});

describe("isEmailUnverified (#519)", () => {
  it("is true only when the backend says the email is not verified", () => {
    expect(isEmailUnverified(false)).toBe(true);
  });

  it("does not lock out accounts whose flag is missing or verified", () => {
    expect(isEmailUnverified(true)).toBe(false);
    expect(isEmailUnverified(undefined)).toBe(false);
    expect(isEmailUnverified(null)).toBe(false);
  });
});
