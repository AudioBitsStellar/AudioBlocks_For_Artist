import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/services/uploadService", () => ({
  default: () => ({ useUploadSong: () => ({ mutateAsync: vi.fn(), isPending: false }) }),
}));
vi.mock("@/components/GenreTagSelector", () => ({
  GenreTagSelector: () => null,
}));

import { TrackUploadPage } from "../TrackUploadPage";

describe("TrackUploadPage text limits", () => {
  it("caps the track title at 100 characters and counts it", () => {
    render(<TrackUploadPage />);
    const title = screen.getByLabelText(/Track Title/);

    expect(title).toHaveAttribute("maxLength", "100");
    expect(screen.getByText("0/100")).toBeInTheDocument();

    fireEvent.change(title, { target: { value: "Night Drive" } });
    expect(screen.getByText("11/100")).toBeInTheDocument();
  });

  it("caps the description at 500 characters and shows a warning near the limit", () => {
    render(<TrackUploadPage />);
    const description = screen.getByLabelText("Description");

    expect(description).toHaveAttribute("maxLength", "500");

    fireEvent.change(description, { target: { value: "x".repeat(450) } });
    expect(screen.getByText("450/500")).toHaveClass("text-yellow-500");
  });

  it("rejects audio files larger than the upload limit", () => {
    render(<TrackUploadPage />);
    const oversizedFile = new File(["audio"], "oversized.mp3", { type: "audio/mpeg" });
    Object.defineProperty(oversizedFile, "size", { value: 201 * 1024 * 1024 });

    fireEvent.change(screen.getByLabelText(/Drag & drop your audio/i), {
      target: { files: [oversizedFile] },
    });

    expect(screen.getByText(/File too large.*200 MB/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish Track/i })).toBeDisabled();
  });
});
