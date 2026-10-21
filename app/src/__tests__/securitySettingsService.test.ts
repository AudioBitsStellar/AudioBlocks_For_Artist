import Cookies from "js-cookie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { clientPost } = vi.hoisted(() => ({ clientPost: vi.fn() }));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn(async () => ({ post: clientPost })),
}));

import {
  beginTwoFactorEnrollment,
  completeTwoFactorLogin,
  confirmTwoFactorCode,
  disableTwoFactorWithCode,
  getLoginAlerts,
  setLoginAlerts,
} from "@/services/securitySettingsService";
import { TWO_FACTOR_COOKIE } from "@/lib/session";

describe("securitySettingsService (#518)", () => {
  beforeEach(() => {
    clientPost.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    Cookies.remove(TWO_FACTOR_COOKIE);
    localStorage.clear();
  });

  it("gets the enrolment secret, QR code and recovery codes from the backend", async () => {
    const enrollment = {
      secret: "JBSWY3DPEHPK3PXP",
      otpauthUrl: "otpauth://totp/AudioBlocks:artist?secret=JBSWY3DPEHPK3PXP",
      qrCodeDataUrl: "data:image/png;base64,AAAA",
      backupCodes: ["ABCDE-12345"],
    };
    clientPost.mockResolvedValueOnce({ data: enrollment });

    await expect(beginTwoFactorEnrollment()).resolves.toEqual(enrollment);
    expect(clientPost).toHaveBeenCalledWith("/auth/2fa/enable");
  });

  it("marks 2FA as on in the hint once the first code is accepted", async () => {
    clientPost.mockResolvedValueOnce({ data: { success: true } });

    await confirmTwoFactorCode("123456");

    expect(clientPost).toHaveBeenCalledWith("/auth/2fa/verify", { code: "123456" });
    expect(Cookies.get(TWO_FACTOR_COOKIE)).toBe("1");
  });

  it("does not change the hint when the code is rejected", async () => {
    clientPost.mockRejectedValueOnce(new Error("Invalid two-factor code"));

    await expect(confirmTwoFactorCode("000000")).rejects.toThrow("Invalid two-factor code");
    expect(Cookies.get(TWO_FACTOR_COOKIE)).toBeUndefined();
  });

  it("disables 2FA with a current code and updates the hint", async () => {
    clientPost.mockResolvedValueOnce({ data: { success: true } });

    await disableTwoFactorWithCode("654321");

    expect(clientPost).toHaveBeenCalledWith("/auth/2fa/disable", { code: "654321" });
    expect(Cookies.get(TWO_FACTOR_COOKIE)).toBe("0");
  });

  it("completes a challenged login with the partial token and returns the session", async () => {
    clientPost.mockResolvedValueOnce({
      data: { success: true, token: "a.b.c", refreshToken: "refresh-1" },
    });

    await expect(completeTwoFactorLogin("partial", "111111")).resolves.toEqual({
      token: "a.b.c",
      refreshToken: "refresh-1",
    });
    expect(clientPost).toHaveBeenCalledWith("/auth/2fa/validate", {
      partialToken: "partial",
      code: "111111",
    });
  });

  it("keeps login alerts on by default and remembers a change", () => {
    expect(getLoginAlerts()).toBe(true);

    setLoginAlerts(false);
    expect(getLoginAlerts()).toBe(false);
  });
});
