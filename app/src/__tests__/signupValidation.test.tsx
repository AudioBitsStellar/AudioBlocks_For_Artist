import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "@/app/signup/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock authService
const mockMutateAsync = vi.fn();
vi.mock("@/services/authService", () => ({
  default: () => ({
    useRegisterEmail: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }),
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Signup Form Validation (Issue #98)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields and disables submit button initially", () => {
    render(<SignupPage />);

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /sign up/i });
    expect(submitBtn).toBeDisabled();
  });

  it("shows email format error for invalid email", async () => {
    render(<SignupPage />);
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "not-an-email");

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });

    // Clear and fix email
    await user.clear(emailInput);
    await user.type(emailInput, "valid.artist@example.com");

    await waitFor(() => {
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });
  });

  it("shows password length and complexity errors", async () => {
    render(<SignupPage />);
    const user = userEvent.setup();

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, "short");

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    await user.clear(passwordInput);
    await user.type(passwordInput, "12345678");

    await waitFor(() => {
      expect(screen.getByText(/password must contain at least one letter/i)).toBeInTheDocument();
    });

    await user.clear(passwordInput);
    await user.type(passwordInput, "Password123!");

    await waitFor(() => {
      expect(screen.queryByText(/password must/i)).not.toBeInTheDocument();
    });
  });

  it("enables submit button only when all fields are valid", async () => {
    render(<SignupPage />);
    const user = userEvent.setup();

    const submitBtn = screen.getByRole("button", { name: /sign up/i });
    expect(submitBtn).toBeDisabled();

    await user.type(screen.getByLabelText(/display name/i), "Artist Name");
    await user.type(screen.getByLabelText(/username/i), "artist_user");
    await user.type(screen.getByLabelText(/email/i), "artist@example.com");
    await user.type(screen.getByLabelText(/password/i), "ValidPass123!");

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });
});
