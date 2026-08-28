import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import VerificationApplicationModal from "@/components/common/modals/VerificationApplicationModal";
import { getVerificationStatus, getVerificationApplication } from "@/services/verificationService";

describe("VerifiedBadge", () => {
  it("renders a verified label", () => {
    render(<VerifiedBadge />);
    expect(screen.getByRole("img", { name: /verified artist/i })).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });
});

describe("VerificationApplicationModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not render when closed", () => {
    render(
      <VerificationApplicationModal open={false} onOpenChange={() => {}} onSubmitted={() => {}} />
    );
    expect(screen.queryByText("Apply for Verification")).not.toBeInTheDocument();
  });

  it("shows validation errors when submitting an empty form", () => {
    render(
      <VerificationApplicationModal open={true} onOpenChange={() => {}} onSubmitted={() => {}} />
    );

    fireEvent.click(screen.getByRole("button", { name: /submit application/i }));

    expect(screen.getByText("Legal name is required")).toBeInTheDocument();
    expect(screen.getByText("A link proving your identity is required")).toBeInTheDocument();
    expect(getVerificationStatus()).toBe("unverified");
  });

  it("submits a valid application, persists it, and notifies the caller", () => {
    const onOpenChange = vi.fn();
    const onSubmitted = vi.fn();

    render(
      <VerificationApplicationModal
        open={true}
        onOpenChange={onOpenChange}
        onSubmitted={onSubmitted}
      />
    );

    fireEvent.change(screen.getByLabelText(/legal name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/proof of identity link/i), {
      target: { value: "https://example.com/jane" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit application/i }));

    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(getVerificationStatus()).toBe("pending");
    expect(getVerificationApplication()).toEqual({
      legalName: "Jane Doe",
      proofUrl: "https://example.com/jane",
    });
  });
});
