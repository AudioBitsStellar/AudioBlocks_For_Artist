import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BasicInfoStep from "@/components/onboarding/BasicInfoStep";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("BasicInfoStep", () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the basic info form", () => {
    render(<BasicInfoStep onComplete={mockOnComplete} />);

    expect(screen.getByRole("heading", { name: /basic information/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/artist name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByText(/genre\(s\)/i)).toBeInTheDocument();
  });

  it("shows validation errors for required fields", async () => {
    render(<BasicInfoStep onComplete={mockOnComplete} />);

    const submitButton = screen.getByRole("button", { name: /continue/i });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when all required fields are filled", async () => {
    render(<BasicInfoStep onComplete={mockOnComplete} />);

    const artistNameInput = screen.getByLabelText(/artist name/i);
    const bioInput = screen.getByLabelText(/bio/i);
    const hipHopCheckbox = screen.getByRole("checkbox", { name: /hip-hop/i });

    fireEvent.change(artistNameInput, { target: { value: "Test Artist" } });
    fireEvent.change(bioInput, {
      target: { value: "This is a test bio that is definitely more than 50 characters long." },
    });
    fireEvent.click(hipHopCheckbox);

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /continue/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("calls onComplete when form is submitted successfully", async () => {
    render(<BasicInfoStep onComplete={mockOnComplete} />);

    const artistNameInput = screen.getByLabelText(/artist name/i);
    const bioInput = screen.getByLabelText(/bio/i);
    const hipHopCheckbox = screen.getByRole("checkbox", { name: /hip-hop/i });

    fireEvent.change(artistNameInput, { target: { value: "Test Artist" } });
    fireEvent.change(bioInput, {
      target: { value: "This is a test bio that is definitely more than 50 characters long." },
    });
    fireEvent.click(hipHopCheckbox);

    await waitFor(async () => {
      const submitButton = screen.getByRole("button", { name: /continue/i });
      expect(submitButton).not.toBeDisabled();
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });
});
