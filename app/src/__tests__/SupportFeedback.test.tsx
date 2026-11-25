import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SupportFeedbackModal from "@/components/support/SupportFeedbackModal";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Support contact and in-app feedback modal (#779)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the floating entry point trigger button", () => {
    render(<SupportFeedbackModal />);

    const trigger = screen.getByTestId("support-feedback-trigger");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("Support & Feedback");
  });

  it("opens modal dialog when trigger button is clicked", () => {
    render(<SupportFeedbackModal />);

    fireEvent.click(screen.getByTestId("support-feedback-trigger"));

    expect(screen.getByTestId("support-feedback-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Support & Feedback" })).toBeInTheDocument();
  });

  it("switches to the Contact Support tab and displays direct support email", () => {
    render(<SupportFeedbackModal />);

    fireEvent.click(screen.getByTestId("support-feedback-trigger"));
    fireEvent.click(screen.getByRole("button", { name: /contact support/i }));

    expect(screen.getByText("Direct Artist Support")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /support@audioblocks\.com/i })).toHaveAttribute(
      "href",
      "mailto:support@audioblocks.com"
    );
  });

  it("validates empty feedback and submits valid feedback with toast notification", async () => {
    render(<SupportFeedbackModal />);

    fireEvent.click(screen.getByTestId("support-feedback-trigger"));

    const submitBtn = screen.getByRole("button", { name: /submit feedback/i });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByLabelText(/your feedback/i);
    fireEvent.change(textarea, {
      target: { value: "Great platform! Please add batch flac upload." },
    });

    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Thank you for your feedback! Our team will review it."
      );
    });

    const stored = JSON.parse(localStorage.getItem("audioblocks:artist-feedback") || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].message).toBe("Great platform! Please add batch flac upload.");
    expect(stored[0].category).toBe("general");
  });

  it("closes modal on Escape key press", () => {
    render(<SupportFeedbackModal />);

    fireEvent.click(screen.getByTestId("support-feedback-trigger"));
    expect(screen.getByTestId("support-feedback-dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("support-feedback-dialog")).toBeNull();
  });
});
