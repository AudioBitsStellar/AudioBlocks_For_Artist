import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/login/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockMutateAsync = vi.fn();
vi.mock("@/services/authService", () => ({
  default: () => ({
    useLoginEmail: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("js-cookie", () => ({
  default: { set: vi.fn(), get: vi.fn(), remove: vi.fn() },
}));

describe("Login form validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows required errors and does not submit an empty form", async () => {
    render(<LoginPage />);

    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("rejects a malformed email address", async () => {
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), "not-an-email");
    await userEvent.type(screen.getByLabelText(/password/i), "hunter2");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("submits valid credentials", async () => {
    mockMutateAsync.mockResolvedValue({ token: "jwt" });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), "artist@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "hunter2");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: "artist@example.com",
        password: "hunter2",
      });
    });
  });
});
