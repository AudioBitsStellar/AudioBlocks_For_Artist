import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockPatch, mockHandleSuccess, mockHandleError } = vi.hoisted(() => ({
  mockPatch: vi.fn(),
  mockHandleSuccess: vi.fn(),
  mockHandleError: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn().mockResolvedValue({ patch: mockPatch }),
}));

vi.mock("@/hooks/useToastHandler", () => ({
  useHandleSuccess: () => mockHandleSuccess,
  useHandleError: () => mockHandleError,
}));

vi.mock("@/services/albumService", () => ({
  default: () => ({
    useGetAlbums: () => ({ data: undefined, isLoading: false }),
  }),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string; src: string }) => <img alt={props.alt} src={props.src} />,
}));

import MyMusicContent from "@/components/MyMusicContent";
import { applyTrackEdit } from "@/services/trackService";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderMyMusic() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MyMusicContent />
    </QueryClientProvider>
  );
}

/** Opens the edit dialog for "Golden Skies", renames it, and clicks Save. */
async function renameGoldenSkies(newTitle: string) {
  fireEvent.click(screen.getByRole("button", { name: "Edit Golden Skies" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/track title/i), { target: { value: newTitle } });
  fireEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));
}

describe("applyTrackEdit", () => {
  const tracks = [
    { id: 1, title: "A", albumName: "X", likes: 3 },
    { id: 2, title: "B", albumName: "Y", likes: 4 },
  ];

  it("replaces only the edited track's title and album, without mutating the input", () => {
    const result = applyTrackEdit(tracks, { id: 2, title: "B2", albumName: "X" });
    expect(result).toEqual([tracks[0], { id: 2, title: "B2", albumName: "X", likes: 4 }]);
    expect(tracks[1].title).toBe("B");
  });

  it("returns an equal list when the id does not match", () => {
    expect(applyTrackEdit(tracks, { id: 99, title: "Z", albumName: "Z" })).toEqual(tracks);
  });
});

describe("My Music optimistic track edits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows the new title immediately, before the server responds", async () => {
    const request = deferred<{ data: unknown }>();
    mockPatch.mockReturnValue(request.promise);
    renderMyMusic();

    await renameGoldenSkies("Golden Hour");

    // Visible while the PATCH is still pending.
    expect(await screen.findByText("Golden Hour")).toBeInTheDocument();
    expect(screen.queryByText("Golden Skies")).not.toBeInTheDocument();
    expect(mockHandleSuccess).not.toHaveBeenCalled();

    await act(async () => {
      request.resolve({ data: {} });
    });

    await waitFor(() => expect(mockHandleSuccess).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Golden Hour")).toBeInTheDocument();
    // The dialog always submits the track's effective visibility (#458).
    expect(mockPatch).toHaveBeenCalledWith("/song/1", {
      id: 1,
      title: "Golden Hour",
      albumName: "Echoes of the Soul",
      visibility: "public",
    });
  });

  it("rolls the title back and reports the error when the save fails", async () => {
    const request = deferred<{ data: unknown }>();
    mockPatch.mockReturnValue(request.promise);
    renderMyMusic();

    await renameGoldenSkies("Golden Hour");
    expect(await screen.findByText("Golden Hour")).toBeInTheDocument();

    await act(async () => {
      request.reject(new Error("Server exploded"));
    });

    await waitFor(() => expect(screen.getByText("Golden Skies")).toBeInTheDocument());
    expect(screen.queryByText("Golden Hour")).not.toBeInTheDocument();
    expect(mockHandleError).toHaveBeenCalledWith(expect.stringContaining("reverted"));
    expect(mockHandleSuccess).not.toHaveBeenCalled();
  });

  it("does not disturb other tracks when one edit is rolled back", async () => {
    const request = deferred<{ data: unknown }>();
    mockPatch.mockReturnValue(request.promise);
    renderMyMusic();

    await renameGoldenSkies("Golden Hour");
    await act(async () => {
      request.reject(new Error("fail"));
    });

    await waitFor(() => expect(screen.getByText("Golden Skies")).toBeInTheDocument());
    for (const title of ["Neon Hearts", "Electric Dreams", "Still Waters", "Afterglow"]) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    }
  });

  it("validates the title and does not save an empty one", async () => {
    renderMyMusic();

    fireEvent.click(screen.getByRole("button", { name: "Edit Golden Skies" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/track title/i), { target: { value: "  " } });

    expect(await within(dialog).findByText("Track title is required")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(mockPatch).not.toHaveBeenCalled());
    expect(screen.getByText("Golden Skies")).toBeInTheDocument();
  });
});
