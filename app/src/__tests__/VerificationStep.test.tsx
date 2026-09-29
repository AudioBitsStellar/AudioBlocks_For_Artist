import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VerificationStep from "@/components/onboarding/VerificationStep";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
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

  it("renders the verification form", () => {
    render(<VerificationStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    expect(screen.getByRole("heading", { name: /verification & kyc/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/legal name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
  });

  it("shows validation error when age is under 18", async () => {
    render(<VerificationStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    const dobInput = screen.getByLabelText(/date of birth/i);
    const today = new Date();
    const underageDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
    
    fireEvent.change(dobInput, { target: { value: underageDate.toISOString().split("T")[0] } });
    fireEvent.blur(dobInput);

    await waitFor(() => {
      expect(screen.getByText(/you must be at least 18 years old/i)).toBeInTheDocument();
    });
  });

  it("calls onBack when back button is clicked", () => {
    render(<VerificationStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it("enables submit button when all required fields are filled", async () => {
    render(<VerificationStep onComplete={mockOnComplete} onBack={mockOnBack} />);

    const legalNameInput = screen.getByLabelText(/legal name/i);
    const dobInput = screen.getByLabelText(/date of birth/i);
    const countrySelect = screen.getByLabelText(/country/i);
    const idTypeSelect = screen.getByLabelText(/id type/i);
    const idNumberInput = screen.getByLabelText(/id number/i);

    const adultDate = new Date(1990, 0, 1);

    fireEvent.change(legalNameInput, { target: { value: "John Doe" } });
    fireEvent.change(dobInput, { target: { value: adultDate.toISOString().split("T")[0] } });
    fireEvent.change(countrySelect, { target: { value: "United States" } });
    fireEvent.change(idTypeSelect, { target: { value: "passport" } });
    fireEvent.change(idNumberInput, { target: { value: "A12345678" } });

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /continue/i });
      expect(submitButton).not.toBeDisabled();
    });
  });
});
