import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import TrackDetailPage from "@/app/dashboard/my-music/tracks/[trackId]/page";
import AlbumDetailPage from "@/app/dashboard/my-music/albums/[albumId]/page";
import EventDetailPage from "@/app/dashboard/events/[eventId]/page";
import CheckInPage from "@/app/dashboard/events/[eventId]/check-in/page";
import { generateMetadata as generateArtistPageMetadata } from "@/app/artist/[handle]/page";

vi.mock("@/components/PathBreadcrumb", () => ({
  default: () => <nav aria-label="Breadcrumb" />,
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockCheckInScanner({ eventId }: { eventId: string }) {
      return <div data-testid="check-in-scanner">scanner:{eventId}</div>;
    };
  },
}));

vi.mock("@/lib/publicArtistProfile", () => ({
  displayNameFromHandle: (handle: string) => handle,
  fetchPublicArtistProfile: vi.fn().mockResolvedValue({
    status: "ok",
    profile: {
      id: "artist-1",
      handle: "tems",
      name: "Tems",
      bio: "Singer and songwriter",
    },
  }),
}));

describe("Next.js 16 async route params (#580)", () => {
  it("unwraps Promise params on TrackDetailPage", async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <TrackDetailPage params={Promise.resolve({ trackId: "track-42" })} />
        </Suspense>
      );
    });

    expect(screen.getByRole("heading", { name: "track-42" })).toBeInTheDocument();
  });

  it("unwraps Promise params on AlbumDetailPage", async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AlbumDetailPage params={Promise.resolve({ albumId: "album-99" })} />
        </Suspense>
      );
    });

    expect(screen.getByRole("heading", { name: "album-99" })).toBeInTheDocument();
  });

  it("unwraps Promise params on EventDetailPage", async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <EventDetailPage params={Promise.resolve({ eventId: "evt-7" })} />
        </Suspense>
      );
    });

    expect(screen.getByRole("heading", { name: "evt-7" })).toBeInTheDocument();
  });

  it("unwraps Promise params on CheckInPage and passes eventId to CheckInScanner", async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <CheckInPage params={Promise.resolve({ eventId: "evt-check-12" })} />
        </Suspense>
      );
    });

    expect(screen.getByTestId("check-in-scanner")).toHaveTextContent("scanner:evt-check-12");
  });

  it("awaits Promise params in /artist/[handle] generateMetadata", async () => {
    const metadata = await generateArtistPageMetadata({
      params: Promise.resolve({ handle: "tems" }),
    });

    expect(String(metadata.title)).toContain("Tems");
  });
});
