'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import ClaimArtistNameModal from '@/components/common/modals/ClaimArtistNameModal';

const ArtistHubHero = () => {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [stars, setStars] = useState<Array<{ id: number; top: number; left: number }>>([]);

  // Generate stars only on client side to prevent hydration mismatch
  useEffect(() => {
    setStars(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
      }))
    );
  }, []);


  const handleClaimProfile = () => {
    setIsClaimModalOpen(true);
  };

  const handleUploadTrack = () => {
    // UI only - no navigation
    alert('Upload New Track - UI only');
  };

  return (
    <>
      <section className="min-h-screen flex flex-col items-center justify-normal relative overflow-hidden">
        {/* Starry Background Effect */}
        <div className="absolute inset-0 opacity-30">
          {/* Scattered white dots for starry effect */}
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                top: `${star.top}%`,
                left: `${star.left}%`,
              }}
            />
          ))}
        </div>

        {/* Text Content */}
        <div className="relative z-10 max-w-6xl mt-20 mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Main Heading */}
          <div className="max-w-[580px] space-y-4">
            <h1 className="font-['Poppins'] font-extrabold text-[48px] leading-[100%] tracking-[0%] text-center text-white">
              Monetize, Grow & Engage
            </h1>

            <p className="font-['Inter'] font-medium text-[20px] leading-[150%] tracking-[-2%] text-center text-[#A3A3A3] max-w-3xl mx-auto">
              Build a real music career with tools designed to help you connect with your fans and get
              paid.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative z-20">
            <button
              onClick={handleClaimProfile}
              type="button"
              className="relative z-30 mt-6 w-[189px] h-[48px] px-4 py-2 rounded-full bg-[#D2045B] hover:bg-[#B8043F] text-white font-medium text-sm flex justify-center items-center gap-2 cursor-pointer transition pointer-events-auto"
            >
              Claim Your Profile
              <div className="bg-black rounded-full p-1">
                <ArrowRight className="h-4 w-4 rotate-300" />
              </div>
            </button>

            <button
              onClick={handleUploadTrack}
              className="mt-6 w-[189px] h-[48px] px-4 py-2 rounded-full bg-transparent border border-[#885FA8] hover:bg-[#B8043F] text-white font-medium text-sm flex justify-center items-center gap-2 cursor-pointer transition"
            >
              Upload New Track
              <div className="bg-black rounded-full p-1">
                <ArrowRight className="h-4 w-4 rotate-300" />
              </div>
            </button>
          </div>
        </div>

        {/* Hero Image at Center */}
        <div className="relative z-10 mt-12 flex justify-center">
          <div className="relative w-[1145px] h-[494px]">
            <Image src="/artist_hub/HeroImage.png" alt="Hero Image" fill className="object-contain" />
          </div>
        </div>
      </section>
      {/* Render modal outside section to avoid overflow-hidden clipping */}
      {isClaimModalOpen && (
        <ClaimArtistNameModal open={isClaimModalOpen} onOpenChange={setIsClaimModalOpen} />
      )}
    </>
  );
};

export default ArtistHubHero;
