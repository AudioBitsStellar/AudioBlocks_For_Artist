import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import OnboardingProgressCard from "@/components/OnboardingProgressCard";
import { resetOnboardingProgress } from "@/services/onboardingService";

describe("OnboardingProgressCard Component (#383)", () => {
  beforeEach(() => {
    resetOnboardingProgress();
  });

  it("renders onboarding title, progress bar, and steps checklist", () => {
    render(<OnboardingProgressCard />);

    expect(screen.getByText("Complete your Artist Onboarding")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("Verify Email")).toBeInTheDocument();
    expect(screen.getByText("Connect Stellar Wallet")).toBeInTheDocument();
  });

  it("allows completing steps interactively", () => {
    render(<OnboardingProgressCard />);

    const verifyEmailBtn = screen.getByLabelText("Mark Verify Email as completed");
    fireEvent.click(verifyEmailBtn);

    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});
