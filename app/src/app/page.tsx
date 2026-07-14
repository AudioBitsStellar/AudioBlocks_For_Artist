import type { Metadata } from 'next';
import ArtistHubHero from '@/components/common/artist-hub/ArtistHubHero';
import ArtistFeatures from '@/components/common/artist-hub/ArtistFeatures';
import ArtistUpgrade from '@/components/common/artist-hub/ArtistUpgrade';
import Navbar from '@/layouts/navbar';
import Footer from '@/layouts/footer';
import GoToTopButton from '@/components/common/home/GoToTopButton';

export const metadata: Metadata = {
  title: 'AudioBlocks — Music NFT Platform for Artists on Stellar',
  description:
    'Upload, mint, and sell your music as NFTs on the Stellar blockchain. AudioBlocks gives artists full control over royalties, events, and fan engagement.',
  openGraph: {
    title: 'AudioBlocks — Music NFT Platform for Artists on Stellar',
    description:
      'Upload, mint, and sell your music as NFTs on the Stellar blockchain. Full control over royalties, events, and fan engagement.',
    type: 'website',
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
