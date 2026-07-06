import type { Metadata } from 'next';
import ArtistHubHero from '@/components/common/artist-hub/ArtistHubHero';
import ArtistFeatures from '@/components/common/artist-hub/ArtistFeatures';
import ArtistUpgrade from '@/components/common/artist-hub/ArtistUpgrade';
import Navbar from '@/layouts/navbar';
import Footer from '@/layouts/footer';
import GoToTopButton from '@/components/common/home/GoToTopButton';

export const metadata: Metadata = {
  title: 'AudioBlocks for Artists | Music, Merch, and Web3 Fan Tools',
  description:
    'AudioBlocks helps artists showcase music, grow fan engagement, manage releases, and unlock Web3-ready tools from one artist platform.',
  openGraph: {
    title: 'AudioBlocks for Artists',
    description:
      'Showcase music, manage artist growth, and connect fans with Web3-ready creator tools on AudioBlocks.',
    type: 'website',
    siteName: 'AudioBlocks',
  },
};

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
