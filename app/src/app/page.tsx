import type { Metadata } from "next";
import ArtistHubHero from "@/components/common/artist-hub/ArtistHubHero";
import ArtistFeatures from "@/components/common/artist-hub/ArtistFeatures";
import ArtistUpgrade from "@/components/common/artist-hub/ArtistUpgrade";
import Navbar from "@/layouts/navbar";
import Footer from "@/layouts/footer";
import GoToTopButton from "@/components/common/home/GoToTopButton";
import { generateMetadata } from "@/utils/metadata";

export const metadata: Metadata = generateMetadata({
  title: "AudioBlocks for Artists — Mint, Distribute & Earn Royalties on Stellar",
  description:
    "AudioBlocks is the artist-first platform for minting music NFTs, distributing tracks, and earning transparent on-chain royalties on the Stellar network.",
  url: "/",
});

export default function Home() {
  return (
    <>
      <Navbar />
      <ArtistHubHero />
      <ArtistFeatures />
      <ArtistUpgrade />
      <Footer />
      <GoToTopButton />
    </>
  );
}
