import { describe, expect, it, beforeEach } from "vitest";
import {
  getOnboardingProgress,
  completeStep,
  resetOnboardingProgress,
  DEFAULT_ONBOARDING_STEPS,
} from "@/services/onboardingService";

describe("onboardingService (#383)", () => {
  beforeEach(() => {
    resetOnboardingProgress();
  });

  it("initializes with default onboarding steps", () => {
    const progress = getOnboardingProgress();
    expect(progress.steps.length).toBe(DEFAULT_ONBOARDING_STEPS.length);
    expect(progress.completedCount).toBe(1); // account_created completed by default
    expect(progress.percentage).toBe(20);
    expect(progress.isFullyCompleted).toBe(false);
  });

  it("marks a step as completed and updates progress calculation", () => {
    const updated = completeStep("email_verified");
    expect(updated.completedCount).toBe(2);
    expect(updated.percentage).toBe(40);
    expect(updated.steps.find((s) => s.id === "email_verified")?.completed).toBe(true);
  });

  it("resets progress state to initial defaults", () => {
    completeStep("email_verified");
    completeStep("profile_setup");
    const reset = resetOnboardingProgress();
    expect(reset.completedCount).toBe(1);
    expect(reset.percentage).toBe(20);
  });
});
