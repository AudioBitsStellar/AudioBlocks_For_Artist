import ArtistHubHero from '@/components/common/artist-hub/ArtistHubHero';
import ArtistFeatures from '@/components/common/artist-hub/ArtistFeatures';
import ArtistUpgrade from '@/components/common/artist-hub/ArtistUpgrade';
import Navbar from '@/layouts/navbar';
import Footer from '@/layouts/footer';
import GoToTopButton from '@/components/common/home/GoToTopButton';

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
