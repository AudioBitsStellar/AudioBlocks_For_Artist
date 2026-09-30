import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/**
 * The artist's own catalog on /dashboard/my-music: how a long track list pages
 * (#427), how search and the album filter narrow it (#428), and what an empty
 * or unmatchable list says (#425).
 */

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
    // The catalog under test is the track list; no albums come back, so the
    // album filter is built purely from the artist's own tracks.
    useGetAlbums: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }),
  }),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string; src: string }) => <img alt={props.alt} src={props.src} />,
}));

import MyMusicContent from "@/components/MyMusicContent";

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

/** The catalog ships 12 tracks, 10 to a page. */
const pagination = () => screen.getByRole("navigation", { name: "Track list pages" });

describe("My Music track list pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A saved order from another test would reorder the catalog.
    localStorage.clear();
  });

  it("pages the track list and reports the range", () => {
    renderMyMusic();

    expect(within(pagination()).getByText(/Page 1 of 2/)).toBeInTheDocument();
    expect(screen.getByText("Golden Skies")).toBeInTheDocument();
    // Track 11 of 12 lives on the second page.
    expect(screen.queryByText("Velvet Sky")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("shows the next page of tracks and stops at the last one", () => {
    renderMyMusic();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(within(pagination()).getByText(/Page 2 of 2/)).toBeInTheDocument();
    expect(screen.getByText("Velvet Sky")).toBeInTheDocument();
    expect(screen.getByText("Last Train Home")).toBeInTheDocument();
    expect(screen.queryByText("Golden Skies")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("returns to the first page", () => {
    renderMyMusic();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(within(pagination()).getByText(/Page 1 of 2/)).toBeInTheDocument();
    expect(screen.getByText("Golden Skies")).toBeInTheDocument();
  });
});

describe("My Music catalog search and filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("matches every word of a search against title, album and artist", () => {
    renderMyMusic();

    fireEvent.change(screen.getByLabelText("Search tracks"), {
      target: { value: "midnight neon" },
    });

    expect(screen.getByText("Neon Hearts")).toBeInTheDocument();
    // Same album, but the title doesn't contain "neon".
    expect(screen.queryByText("City Lights")).not.toBeInTheDocument();
    expect(screen.queryByText("Golden Skies")).not.toBeInTheDocument();
    expect(screen.getByText("1 track of 12 tracks")).toBeInTheDocument();
  });

  it("filters the list down to one album", () => {
    renderMyMusic();

    fireEvent.change(screen.getByLabelText("Filter tracks by album"), {
      target: { value: "Midnight Vibes" },
    });

    expect(screen.getByText("Neon Hearts")).toBeInTheDocument();
    expect(screen.getByText("City Lights")).toBeInTheDocument();
    expect(screen.getByText("Paper Planes")).toBeInTheDocument();
    expect(screen.queryByText("Golden Skies")).not.toBeInTheDocument();
  });

  it("offers only albums the artist actually has", () => {
    renderMyMusic();

    const albumNames = within(screen.getByLabelText("Filter tracks by album"))
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(albumNames).toEqual([
      "All albums",
      "Cosmic Journey",
      "Echoes of the Soul",
      "Electric Dreams",
      "Midnight Vibes",
      "Serenity Falls",
    ]);
  });

  it("explains an empty result set and clears the filters again", () => {
    renderMyMusic();

    fireEvent.change(screen.getByLabelText("Search tracks"), {
      target: { value: "no-such-track" },
    });

    expect(screen.getByText("No tracks found")).toBeInTheDocument();
    expect(screen.queryByText("Golden Skies")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.queryByText("No tracks found")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search tracks")).toHaveValue("");
    expect(screen.getByText("Golden Skies")).toBeInTheDocument();
  });

  it("returns to the first page of results after a new search", () => {
    renderMyMusic();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByText("Golden Skies")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search tracks"), { target: { value: "neon" } });
    expect(screen.getByText("Neon Hearts")).toBeInTheDocument();

    // Clearing the search restores the full catalog, from the top.
    fireEvent.change(screen.getByLabelText("Search tracks"), { target: { value: "" } });
    expect(within(pagination()).getByText(/Page 1 of 2/)).toBeInTheDocument();
    expect(screen.getByText("Golden Skies")).toBeInTheDocument();
  });
});
