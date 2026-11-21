import { describe, expect, it, vi, afterEach } from "vitest";
import { analytics } from "@/lib/analytics";

describe("analytics funnel helpers (#764)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as unknown as { analytics?: unknown }).analytics;
  });

  it("forwards onboarding events to window.analytics.track when enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", "key");
    const track = vi.fn();
    (window as unknown as { analytics: { track: typeof track } }).analytics = { track };
    analytics.onboardingStepCompleted({
      stepId: "email_verified",
      completedCount: 2,
      totalCount: 5,
    });
    analytics.onboardingCompleted({ totalCount: 5 });
    expect(track).toHaveBeenNthCalledWith(1, "onboarding_step_completed", {
      stepId: "email_verified",
      completedCount: 2,
      totalCount: 5,
    });
    expect(track).toHaveBeenNthCalledWith(2, "onboarding_completed", { totalCount: 5 });
  });

  it("is a no-op without a write key", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", "");
    const track = vi.fn();
    (window as unknown as { analytics: { track: typeof track } }).analytics = { track };
    analytics.onboardingCompleted({ totalCount: 5 });
    expect(track).not.toHaveBeenCalled();
  });
});
