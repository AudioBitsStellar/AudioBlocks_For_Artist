/**
 * Tests for Issue #611: Save recent searches on submit/commit, not on every keystroke.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SearchModal from "@/components/SearchModal";
import { getRecentSearches, clearRecentSearches } from "@/utils/search";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: false, error: null }),
}));

// Stable static objects to prevent infinite render loops in React
const staticAlbums = {
  data: [
    { id: "alb-1", title: "Summer Waves" },
    { id: "alb-2", title: "Midnight Memories" },
  ],
};
const staticEvents = {
  items: [{ id: "evt-1", title: "Summer Fest 2026", date: "2026-07-20", time: "18:00" }],
};
const staticMerch = {
  items: [{ id: "mrc-1", title: "Summer T-Shirt", price: "$25" }],
};

vi.mock("@/services/albumService", () => ({
  default: () => ({
    useGetAlbums: () => ({ data: staticAlbums, isLoading: false }),
  }),
}));

vi.mock("@/services/eventsService", () => ({
  default: () => ({
    useGetEvents: () => ({ data: staticEvents, isLoading: false }),
  }),
}));

vi.mock("@/services/merchService", () => ({
  default: () => ({
    useGetMerches: () => ({ data: staticMerch, isLoading: false }),
  }),
}));

describe("SearchModal – Recent Searches on Submit (Issue #611)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRecentSearches();
  });

  it("does NOT save recent searches while user is typing keystrokes without committing", () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: /search input/i });

    // Type "s", "su", "sum" without Enter or selecting result
    fireEvent.change(input, { target: { value: "s" } });
    expect(getRecentSearches()).toEqual([]);

    fireEvent.change(input, { target: { value: "su" } });
    expect(getRecentSearches()).toEqual([]);

    fireEvent.change(input, { target: { value: "sum" } });
    expect(getRecentSearches()).toEqual([]);
  });

  it("commits and saves recent search when user presses Enter", () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: /search input/i });

    fireEvent.change(input, { target: { value: "summer" } });
    expect(getRecentSearches()).toEqual([]);

    // Press Enter
    fireEvent.keyDown(input, { key: "Enter" });

    const recent = getRecentSearches();
    expect(recent).toEqual(["summer"]);
  });

  it("does not commit queries shorter than 2 characters on Enter", () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: /search input/i });

    fireEvent.change(input, { target: { value: "s" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(getRecentSearches()).toEqual([]);
  });

  it("commits and saves exactly one recent search when selecting a result", async () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: /search input/i });

    // Type "summer"
    fireEvent.change(input, { target: { value: "summer" } });
    expect(getRecentSearches()).toEqual([]);

    // Select the "Summer Waves" album result
    const albumButton = await screen.findByRole("button", { name: /summer waves/i });
    fireEvent.click(albumButton);

    const recent = getRecentSearches();
    expect(recent).toEqual(["summer"]);
    expect(pushMock).toHaveBeenCalledWith("/dashboard/albums/alb-1");
  });

  it("auto-commits search after 1s debounce when results are showing", async () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: /search input/i });

    // Type "summer"
    fireEvent.change(input, { target: { value: "summer" } });
    expect(getRecentSearches()).toEqual([]);

    // Wait for 1.1s debounce
    await waitFor(
      () => {
        expect(getRecentSearches()).toEqual(["summer"]);
      },
      { timeout: 2500 }
    );
  });

  it("deduplicates case-insensitively when committed", () => {
    render(<SearchModal isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: /search input/i });

    // Commit "Summer" via Enter
    fireEvent.change(input, { target: { value: "Summer" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(getRecentSearches()).toEqual(["Summer"]);

    // Commit "summer" via Enter
    fireEvent.change(input, { target: { value: "summer" } });
    fireEvent.keyDown(input, { key: "Enter" });

    const recent = getRecentSearches();
    expect(recent).toEqual(["summer"]);
    expect(recent).toHaveLength(1);
  });
});
