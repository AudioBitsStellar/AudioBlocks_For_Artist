import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import UploadProgressBar from "../UploadProgressBar";
import { milestoneMessage, nextMilestone } from "../uploadAnnouncements";

describe("UploadProgressBar (#672)", () => {
  it("exposes progressbar semantics and updates them as progress changes", () => {
    const { rerender } = render(<UploadProgressBar fileName="song.mp3" progress={45} />);
    const bar = screen.getByRole("progressbar", { name: "Upload progress for song.mp3" });

    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "45");
    expect(bar).toHaveAttribute("aria-valuetext", "Uploading song.mp3, 45%");

    rerender(<UploadProgressBar fileName="song.mp3" progress={80} />);
    expect(bar).toHaveAttribute("aria-valuenow", "80");
    expect(bar).toHaveAttribute("aria-valuetext", "Uploading song.mp3, 80%");
  });

  it("clamps out-of-range values", () => {
    render(<UploadProgressBar fileName="a.mp3" progress={140} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("has no axe violations", async () => {
    const { container } = render(<UploadProgressBar fileName="song.mp3" progress={30} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("drops the transition when the user prefers reduced motion", () => {
    const { container } = render(<UploadProgressBar fileName="a.mp3" progress={10} />);
    expect(container.querySelector(".motion-reduce\\:transition-none")).not.toBeNull();
  });
});

describe("upload announcements", () => {
  it("announces only milestone crossings", () => {
    expect(nextMilestone(10, 0)).toBeNull();
    expect(nextMilestone(26, 0)).toBe(25);
    expect(nextMilestone(30, 25)).toBeNull();
    expect(nextMilestone(80, 25)).toBe(75);
    expect(nextMilestone(100, 75)).toBe(100);
  });

  it("builds readable messages", () => {
    expect(milestoneMessage("a.mp3", 50)).toBe("Uploading a.mp3, 50%");
    expect(milestoneMessage("a.mp3", 100)).toMatch(/fully uploaded/);
  });
});
