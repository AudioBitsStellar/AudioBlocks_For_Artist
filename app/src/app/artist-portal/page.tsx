import type { Metadata } from "next";
import ArtistPortalHero from "@/components/artist-portal/ArtistPortalHero";
import ArtistPortalFeatures from "@/components/artist-portal/ArtistPortalFeatures";
import ArtistPortalCTA from "@/components/artist-portal/ArtistPortalCTA";
import Navbar from "@/layouts/navbar";
import Footer from "@/layouts/footer";
import { generateMetadata } from "@/utils/metadata";

export const metadata: Metadata = generateMetadata({
  title: "Artist Portal — Join AudioBlocks",
  description:
    "Welcome to the AudioBlocks Artist Portal. Sign up to mint music NFTs, connect with fans, and earn transparent royalties on Stellar.",
  url: "/artist-portal",
});

export default function ArtistPortalPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <ArtistPortalHero />
        <ArtistPortalFeatures />
        <ArtistPortalCTA />
      </main>
      <Footer />
    </>
  );
}
