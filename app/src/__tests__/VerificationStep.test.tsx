import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VerificationStep from "@/components/onboarding/VerificationStep";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("VerificationStep", () => {
  const mockOnComplete = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the verification form with skip notice", () => {
    render(<VerificationStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    expect(screen.getByRole("heading", { name: /verification & kyc/i })).toBeInTheDocument();
    expect(screen.getByText(/complete verification later/i)).toBeInTheDocument();
  });

  it("removes any legacy KYC data from localStorage on mount", () => {
    // Seed localStorage with legacy data
    localStorage.setItem("onboarding_verification", JSON.stringify({
      legalName: "John Doe",
      idNumber: "123456789",
    }));

    render(<VerificationStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    // Verify it was cleaned up
    expect(localStorage.getItem("onboarding_verification")).toBeNull();
  });

  it("calls onBack when back button is clicked", () => {
    render(<VerificationStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it("allows skipping verification and calls onComplete", async () => {
    render(<VerificationStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    const skipButton = screen.getByRole("button", { name: /skip for now/i });
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("does not write any data to localStorage when submitted", async () => {
    render(<VerificationStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    const skipButton = screen.getByRole("button", { name: /skip for now/i });
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    // Assert nothing was written to localStorage
    expect(localStorage.getItem("onboarding_verification")).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});
