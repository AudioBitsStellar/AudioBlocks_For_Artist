import { describe, it, expect, beforeEach } from "vitest";
import {
  getVerificationStatus,
  getVerificationApplication,
  submitVerificationApplication,
  approveVerification,
  resetVerification,
} from "@/services/verificationService";

describe("verificationService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to unverified with no application", () => {
    expect(getVerificationStatus()).toBe("unverified");
    expect(getVerificationApplication()).toBeUndefined();
  });

  it("submitting an application moves status to pending and persists it", () => {
    const status = submitVerificationApplication({
      legalName: "Jane Doe",
      proofUrl: "https://example.com/jane",
    });

    expect(status).toBe("pending");
    expect(getVerificationStatus()).toBe("pending");
    expect(getVerificationApplication()).toEqual({
      legalName: "Jane Doe",
      proofUrl: "https://example.com/jane",
    });
  });

  it("approving a pending application moves status to verified", () => {
    submitVerificationApplication({
      legalName: "Jane Doe",
      proofUrl: "https://example.com/jane",
    });

    const status = approveVerification();

    expect(status).toBe("verified");
    expect(getVerificationStatus()).toBe("verified");
    expect(getVerificationApplication()).toEqual({
      legalName: "Jane Doe",
      proofUrl: "https://example.com/jane",
    });
  });

  it("persists status across reads from storage", () => {
    submitVerificationApplication({
      legalName: "Jane Doe",
      proofUrl: "https://example.com/jane",
    });
    approveVerification();

    expect(getVerificationStatus()).toBe("verified");
    expect(getVerificationStatus()).toBe("verified");
  });

  it("resets back to unverified", () => {
    submitVerificationApplication({
      legalName: "Jane Doe",
      proofUrl: "https://example.com/jane",
    });

    const status = resetVerification();

    expect(status).toBe("unverified");
    expect(getVerificationStatus()).toBe("unverified");
    expect(getVerificationApplication()).toBeUndefined();
  });

  it("ignores corrupted storage and falls back to unverified", () => {
    localStorage.setItem("audioblocks:verification:v1", "not-json");
    expect(getVerificationStatus()).toBe("unverified");
  });
});
