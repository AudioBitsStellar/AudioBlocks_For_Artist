import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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
import { getStoredVisibility, setTrackVisibility } from "@/services/trackVisibilityService";

/** Resolves the pending PATCH by hand so a test can control success or failure. */
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

const rowPicker = (title: string) =>
  screen.getByLabelText(`Visibility of ${title}`) as HTMLSelectElement;

describe("My Music track visibility (issue #458)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("starts tracks on the public default, since that is how they behaved before the setting existed", async () => {
    renderMyMusic();
    await waitFor(() => expect(rowPicker("Golden Skies")).toBeInTheDocument());
    expect(rowPicker("Golden Skies").value).toBe("public");
    expect(rowPicker("Neon Hearts").value).toBe("public");
  });

  it("saves a row change to the API and records it for the next visit", async () => {
    mockPatch.mockReturnValue(Promise.resolve({ data: {} }));
    renderMyMusic();
    await waitFor(() => expect(rowPicker("Golden Skies")).toBeInTheDocument());

    fireEvent.change(rowPicker("Golden Skies"), { target: { value: "private" } });

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        "/song/1",
        expect.objectContaining({ id: 1, title: "Golden Skies", visibility: "private" })
      )
    );
    expect(getStoredVisibility(1)).toBe("private");
    await waitFor(() => expect(rowPicker("Golden Skies").value).toBe("private"));
  });

  it("reverts the picker and forgets the choice when the save fails", async () => {
    const request = deferred<{ data: unknown }>();
    mockPatch.mockReturnValue(request.promise);
    renderMyMusic();
    await waitFor(() => expect(rowPicker("Golden Skies")).toBeInTheDocument());

    fireEvent.change(rowPicker("Golden Skies"), { target: { value: "unlisted" } });
    expect(rowPicker("Golden Skies").value).toBe("unlisted");

    await waitFor(() => request.reject(new Error("Server exploded")));
    await waitFor(() => expect(rowPicker("Golden Skies").value).toBe("public"));
    expect(getStoredVisibility(1)).toBeUndefined();
  });

  it("keeps a saved visibility across a reload", () => {
    setTrackVisibility(2, "private");
    renderMyMusic();
    expect(rowPicker("Neon Hearts").value).toBe("private");
  });

  it("shows a listener only the public tracks, in both the picker and the filtered view", async () => {
    setTrackVisibility(1, "unlisted");
    setTrackVisibility(2, "private");
    renderMyMusic();
    await waitFor(() => expect(rowPicker("Golden Skies")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Filter tracks by visibility"), {
      target: { value: "discoverable" },
    });

    await waitFor(() => expect(screen.queryByText("Golden Skies")).not.toBeInTheDocument());
    expect(screen.queryByText("Neon Hearts")).not.toBeInTheDocument();
    expect(screen.getByText("Beyond the Stars")).toBeInTheDocument();
  });

  it("can narrow the list to a single visibility mode", async () => {
    setTrackVisibility(2, "private");
    renderMyMusic();
    await waitFor(() => expect(rowPicker("Golden Skies")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Filter tracks by visibility"), {
      target: { value: "private" },
    });

    await waitFor(() => expect(screen.queryByText("Golden Skies")).not.toBeInTheDocument());
    expect(screen.getByText("Neon Hearts")).toBeInTheDocument();
  });

  it("opens the edit dialog on the track's current visibility and saves the new one", async () => {
    setTrackVisibility(4, "unlisted");
    mockPatch.mockReturnValue(Promise.resolve({ data: {} }));
    renderMyMusic();
    await waitFor(() => expect(rowPicker("Still Waters")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Edit Still Waters" }));
    const dialog = await screen.findByRole("dialog");
    const picker = within(dialog).getByLabelText(/^visibility/i) as HTMLSelectElement;
    expect(picker.value).toBe("unlisted");

    fireEvent.change(picker, { target: { value: "private" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith(
        "/song/4",
        expect.objectContaining({ title: "Still Waters", visibility: "private" })
      )
    );
    await waitFor(() => expect(rowPicker("Still Waters").value).toBe("private"));
    expect(getStoredVisibility(4)).toBe("private");
  });
});
