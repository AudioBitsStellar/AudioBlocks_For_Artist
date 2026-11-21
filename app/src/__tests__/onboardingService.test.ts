import { describe, expect, it, beforeEach, vi } from "vitest";
import { analytics } from "@/lib/analytics";
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

  describe("funnel events (#764)", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("emits onboarding_step_completed on an incomplete → complete transition", () => {
      const spy = vi.spyOn(analytics, "onboardingStepCompleted");
      completeStep("email_verified");
      expect(spy).toHaveBeenCalledWith({
        stepId: "email_verified",
        completedCount: 2,
        totalCount: 5,
      });
    });

    it("does not re-emit for an already completed step or an unknown step", () => {
      completeStep("email_verified");
      const spy = vi.spyOn(analytics, "onboardingStepCompleted");
      completeStep("email_verified");
      completeStep("account_created");
      completeStep("nope");
      expect(spy).not.toHaveBeenCalled();
    });

    it("emits onboarding_completed only when the last step completes", () => {
      const done = vi.spyOn(analytics, "onboardingCompleted");
      ["email_verified", "profile_setup", "wallet_connected"].forEach(completeStep);
      expect(done).not.toHaveBeenCalled();
      completeStep("first_track");
      expect(done).toHaveBeenCalledTimes(1);
      expect(done).toHaveBeenCalledWith({ totalCount: 5 });
    });
  });
});
