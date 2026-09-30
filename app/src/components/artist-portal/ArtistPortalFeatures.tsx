"use client";

import Image from "next/image";
import { Wallet, BarChart3, Zap, Shield } from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "Web3 Integration",
    description: "Seamless Stellar wallet integration with embedded wallet support for new users",
    image: "/artist_hub/Web3_tools.svg",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Track your earnings, fan engagement, and music performance in real-time",
    image: "/artist_hub/Artist_insight.svg",
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    description: "Get paid instantly with blockchain-powered transparent royalty distribution",
    image: "/artist_hub/Earn_it.svg",
  },
  {
    icon: Shield,
    title: "Full Control",
    description: "You own your music, your data, and your relationship with fans",
    image: "/artist_hub/Artist_dashboard.svg",
  },
];

const ArtistPortalFeatures = () => {
  return (
    <section id="features" className="py-20 px-4 bg-gradient-to-b from-black to-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-['Poppins'] font-bold text-4xl md:text-5xl text-white mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-[#A3A3A3] text-lg md:text-xl max-w-2xl mx-auto">
            AudioBlocks provides artists with powerful tools to grow their career and connect with
            fans
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-8 rounded-3xl bg-[#161616] border border-[#2A2A2A] hover:border-[#D2045B]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#D2045B]/10"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between">
                    <div className="p-4 rounded-2xl bg-[#D2045B]/10 group-hover:bg-[#D2045B]/20 transition-colors">
                      <Icon className="h-8 w-8 text-[#D2045B]" />
                    </div>
                    {feature.image && (
                      <div className="relative w-20 h-20">
                        <Image
                          src={feature.image}
                          alt={feature.title}
                          fill
                          className="object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-white font-bold text-2xl">{feature.title}</h3>
                    <p className="text-[#A3A3A3] text-base leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ArtistPortalFeatures;
