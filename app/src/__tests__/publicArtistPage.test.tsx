import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArtistPage, { generateMetadata } from "@/app/artist/[handle]/page";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/lib/publicArtistProfile", () => ({
  fetchPublicArtistProfile: mocks.fetch,
  displayNameFromHandle: (id: string) => id,
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
const params = Promise.resolve({ handle: "12345678-1234-1234-1234-123456789abc" });
beforeEach(() => vi.clearAllMocks());
describe("public artist server page", () => {
  it("returns 404 for an unknown artist in both page and metadata", async () => {
    mocks.fetch.mockResolvedValue({ status: "not-found" });
    await expect(ArtistPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(generateMetadata({ params })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("renders private profiles without profile details or structured data", async () => {
    mocks.fetch.mockResolvedValue({ status: "private" });
    const { container } = render(await ArtistPage({ params }));
    expect(screen.getByRole("heading", { name: "Private artist profile" })).toBeInTheDocument();
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
    expect(await generateMetadata({ params })).toMatchObject({
      robots: { index: false, follow: false },
    });
  });
  it("uses backend title, bio and OG image for real metadata", async () => {
    mocks.fetch.mockResolvedValue({
      status: "ok",
      profile: {
        id: "artist",
        handle: "real-artist",
        name: "Real Artist",
        bio: "Actual artist biography",
        profileImage: "https://images.test/artist.png",
      },
    });
    const metadata = await generateMetadata({ params });
    expect(JSON.stringify(metadata.title)).toContain("Real Artist");
    expect(metadata.description).toContain("Actual artist biography");
    expect(JSON.stringify(metadata.openGraph)).toContain("https://images.test/artist.png");
  });
});
