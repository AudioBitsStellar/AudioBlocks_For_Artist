import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/axios", () => ({ createApiClient: vi.fn() }));
vi.mock("@/hooks/useToastHandler", () => ({
  useHandleSuccess: () => vi.fn(),
  useHandleError: () => vi.fn(),
}));

import {
  toApplyVerificationPayload,
  toVerificationStatusView,
  validateApplyVerificationPayload,
} from "@/services/verificationApi";

describe("backend artist verification (#524)", () => {
  it("builds the ApplyVerificationDTO payload", () => {
    expect(
      toApplyVerificationPayload({
        legalName: "  Ada  ",
        socialLinks: ["https://x.com/ada", " "],
        musicLinks: ["https://open.spotify.com/artist/1"],
        note: " ",
      })
    ).toEqual({
      displayNameProof: "Ada",
      socialLinks: ["https://x.com/ada"],
      musicLinks: ["https://open.spotify.com/artist/1"],
    });
  });

  it("validates required fields and URLs", () => {
    expect(
      validateApplyVerificationPayload({ displayNameProof: "", socialLinks: [], musicLinks: ["nope"] })
    ).toEqual([
      "Name is required.",
      "Add at least one social link.",
      "Links must be valid http(s) URLs.",
    ]);
  });

  it("maps backend status including rejection reason", () => {
    expect(toVerificationStatusView(null)).toEqual({ status: "none", canApply: true });
    expect(toVerificationStatusView({ status: "pending" })).toEqual({ status: "pending", canApply: false });
    expect(toVerificationStatusView({ status: "rejected", rejectionReason: "Links broken" })).toEqual({
      status: "rejected",
      rejectionReason: "Links broken",
      canApply: true,
    });
  });
});
