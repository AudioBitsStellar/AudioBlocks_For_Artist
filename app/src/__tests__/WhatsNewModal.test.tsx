import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WhatsNewModal, { WHATS_NEW_STORAGE_KEY } from "@/components/WhatsNewModal";
import type { ChangelogRelease } from "@/lib/changelog";

const mockRelease: ChangelogRelease = {
  version: "0.2.0",
  date: "2026-11-20",
  sections: [
    {
      type: "Added",
      entries: [
        {
          summary: "Accessible upload progress and live regions",
          issueNumbers: [672],
          raw: "Accessible upload progress (#672)",
        },
        {
          summary: "Track edit modal and unsaved guard",
          issueNumbers: [396],
          raw: "Track edit modal (#396)",
        },
      ],
    },
    {
      type: "Fixed",
      entries: [
        {
          summary: "Fee calculation rounding on testnet",
          issueNumbers: [450],
          raw: "Fee calculation rounding (#450)",
        },
      ],
    },
  ],
};

describe("WhatsNewModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders when open and displays release version and entries", () => {
    const handleClose = vi.fn();
    render(
      <WhatsNewModal
        isOpen={true}
        onClose={handleClose}
        latestRelease={mockRelease}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("What's New")).toBeInTheDocument();
    expect(screen.getByText(/Version 0.2.0/)).toBeInTheDocument();
    expect(screen.getByText("Accessible upload progress and live regions")).toBeInTheDocument();
    expect(screen.getByText("Track edit modal and unsaved guard")).toBeInTheDocument();
    expect(screen.getByText("Fee calculation rounding on testnet")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<WhatsNewModal isOpen={false} onClose={vi.fn()} latestRelease={mockRelease} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <WhatsNewModal
        isOpen={true}
        onClose={handleClose}
        latestRelease={mockRelease}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /close what's new/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("persists dismissal in localStorage when 'Don't show again' is checked", () => {
    const handleClose = vi.fn();
    render(
      <WhatsNewModal
        isOpen={true}
        onClose={handleClose}
        latestRelease={mockRelease}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /don't show again/i });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBe("0.2.0");
  });
});
