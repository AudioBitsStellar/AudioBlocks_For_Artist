import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ArtistSocialLinksSection from "@/components/artist/ArtistSocialLinksSection";

describe("ArtistSocialLinksSection Component (#386)", () => {
  it("renders social links correctly with platform handles", () => {
    render(
      <ArtistSocialLinksSection
        website="https://artist.com"
        twitter="@artist_official"
        stellarAddress="GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
      />
    );

    expect(screen.getByText("Social & Online Presence")).toBeInTheDocument();
    expect(screen.getByText("artist.com")).toBeInTheDocument();
    expect(screen.getByText("@artist_official")).toBeInTheDocument();
    expect(screen.getByText("GBBBBB...BBBBBB")).toBeInTheDocument();
  });

  it("returns null when no social links exist", () => {
    const { container } = render(<ArtistSocialLinksSection />);
    expect(container).toBeEmptyDOMElement();
  });
});
