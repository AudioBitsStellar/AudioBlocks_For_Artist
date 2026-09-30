"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Music, Users, TrendingUp } from "lucide-react";

const ArtistPortalHero = () => {
  const [stars, setStars] = useState<Array<{ id: number; top: number; left: number }>>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
      }))
    );
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden pt-20 pb-16">
      <div className="absolute inset-0 opacity-30">
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D2045B]/10 border border-[#D2045B]/20 mb-4">
          <div className="w-2 h-2 bg-[#D2045B] rounded-full animate-pulse"></div>
          <span className="text-sm text-[#D2045B] font-medium">Artist Portal</span>
        </div>

        <div className="space-y-6">
          <h1 className="font-['Poppins'] font-extrabold text-5xl md:text-6xl lg:text-7xl leading-tight text-white">
            Your Music.
            <br />
            <span className="text-[#D2045B]">Your Rules.</span>
          </h1>

          <p className="font-['Inter'] font-medium text-lg md:text-xl text-[#A3A3A3] max-w-3xl mx-auto">
            Join AudioBlocks and take control of your music career. Mint NFTs, engage with fans, and
            earn transparent royalties on the Stellar blockchain.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/artist-portal/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#D2045B] hover:bg-[#B8043F] text-white font-bold text-base flex justify-center items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Get Started for Free
            <div className="bg-black rounded-full p-1.5">
              <ArrowRight className="h-4 w-4 rotate-[-45deg]" />
            </div>
          </Link>

          <Link
            href="#features"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-transparent border-2 border-[#885FA8] hover:bg-[#885FA8]/10 text-white font-bold text-base flex justify-center items-center gap-3 cursor-pointer transition-all duration-200"
          >
            Learn More
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#161616]/50 border border-[#2A2A2A]">
            <div className="p-3 rounded-full bg-[#D2045B]/10">
              <Music className="h-6 w-6 text-[#D2045B]" />
            </div>
            <h3 className="text-white font-bold text-lg">Mint Music NFTs</h3>
            <p className="text-[#A3A3A3] text-sm text-center">
              Turn your tracks into tradeable assets
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#161616]/50 border border-[#2A2A2A]">
            <div className="p-3 rounded-full bg-[#885FA8]/10">
              <Users className="h-6 w-6 text-[#885FA8]" />
            </div>
            <h3 className="text-white font-bold text-lg">Engage Fans</h3>
            <p className="text-[#A3A3A3] text-sm text-center">
              Build direct relationships with your audience
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#161616]/50 border border-[#2A2A2A]">
            <div className="p-3 rounded-full bg-[#D2045B]/10">
              <TrendingUp className="h-6 w-6 text-[#D2045B]" />
            </div>
            <h3 className="text-white font-bold text-lg">Earn More</h3>
            <p className="text-[#A3A3A3] text-sm text-center">
              Keep more of what you earn with transparent royalties
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-16 flex justify-center w-full px-4">
        <div className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-[#2A2A2A] shadow-2xl">
          <Image
            src="/artist_hub/HeroImage.png"
            alt="AudioBlocks Artist Dashboard Preview"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default ArtistPortalHero;
