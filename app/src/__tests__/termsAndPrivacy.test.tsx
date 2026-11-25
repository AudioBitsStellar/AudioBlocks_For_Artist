import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsPage, { TERMS_VERSION, TERMS_EFFECTIVE_DATE } from "@/app/terms/page";
import PrivacyPage, { PRIVACY_VERSION, PRIVACY_EFFECTIVE_DATE } from "@/app/privacy/page";
import Footer from "@/layouts/footer";

describe("Terms and Privacy Pages & Acceptance (#778)", () => {
  it("renders the versioned Terms of Service page with expected sections", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Version ${TERMS_VERSION}`, "i"))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Effective Date: ${TERMS_EFFECTIVE_DATE}`, "i"))).toBeInTheDocument();

    // Verify key sections
    expect(screen.getByText(/1\. Acceptance of Terms/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Music Ownership & Licensing/i)).toBeInTheDocument();
    expect(screen.getByText(/You retain 100% ownership of your music/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Royalties & Stellar Soroban Contracts/i)).toBeInTheDocument();
  });

  it("renders the versioned Privacy Policy page with expected sections", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Version ${PRIVACY_VERSION}`, "i"))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Effective Date: ${PRIVACY_EFFECTIVE_DATE}`, "i"))).toBeInTheDocument();

    // Verify key sections
    expect(screen.getByText(/1\. Information We Collect/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Stellar Blockchain Public Transparency/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Your Rights & Privacy Inquiries/i)).toBeInTheDocument();
  });

  it("contains working links to /terms and /privacy in the shared footer", () => {
    render(<Footer />);

    const termsLink = screen.getByRole("link", { name: /terms of service/i });
    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });

    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href", "/terms");

    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute("href", "/privacy");
  });
});

