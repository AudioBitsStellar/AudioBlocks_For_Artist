import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mutateAsync = vi.fn();
vi.mock("@/services/albumService", () => ({
  default: () => ({ useCreateAlbum: () => ({ mutateAsync, isPending: false }) }),
}));
vi.mock("@/hooks/useToastHandler", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/components/shared/music_genre", () => ({ MUSIC_GENRES: ["Pop", "Rock"] }));

import ReleaseFlow from "../ReleaseFlow";

const cover = new File(["c"], "cover.png", { type: "image/png" });
const audio = (n: string) => new File(["a"], n, { type: "audio/mpeg" });

beforeEach(() => mutateAsync.mockReset().mockResolvedValue({}));

describe("ReleaseFlow (#398)", () => {
  it("blocks Next and shows errors until details are valid", () => {
    render(<ReleaseFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Album title is required")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Album details" })).toBeInTheDocument();
  });

  it("creates an EP end to end with reordered tracks", async () => {
    render(<ReleaseFlow />);

    fireEvent.click(screen.getByLabelText(/^EP/));
    fireEvent.change(screen.getByLabelText(/EP title/), { target: { value: "Night Drive" } });
    fireEvent.change(screen.getByLabelText(/Genre/), { target: { value: "Pop" } });
    fireEvent.change(screen.getByLabelText("Upload cover image"), { target: { files: [cover] } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("heading", { name: /Tracks/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Upload track audio files"), {
      target: { files: [audio("One.mp3"), audio("Two.mp3")] },
    });
    expect(screen.getByLabelText("Track 1 title")).toHaveValue("One");
    fireEvent.click(screen.getByRole("button", { name: "Move track 2 up" }));
    expect(screen.getByLabelText("Track 1 title")).toHaveValue("Two");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByTestId("review-title")).toHaveTextContent("Night Drive");
    fireEvent.click(screen.getByRole("button", { name: "Publish EP" }));
    await vi.waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    const fd = mutateAsync.mock.calls[0][0] as FormData;
    expect(fd.get("releaseType")).toBe("ep");
    expect(JSON.parse(fd.get("trackTitles") as string)).toEqual(["Two", "One"]);
  });
});
