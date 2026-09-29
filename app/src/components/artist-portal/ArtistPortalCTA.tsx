"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const ArtistPortalCTA = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div
          className="relative overflow-hidden rounded-3xl p-12 md:p-16 text-center"
          style={{
            background: "linear-gradient(135deg, #D2045B 0%, #885FA8 100%)",
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-3xl"></div>

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-sm text-white font-medium">Join 1000+ Artists</span>
            </div>

            <h2 className="font-['Poppins'] font-bold text-4xl md:text-5xl text-white">
              Ready to Transform Your Music Career?
            </h2>

            <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto">
              Sign up today and start minting, earning, and connecting with your fans on the blockchain
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link
                href="/artist-portal/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-gray-100 text-[#D2045B] font-bold text-base flex justify-center items-center gap-3 cursor-pointer transition-all duration-200 hover:scale-105 shadow-lg"
              >
                Create Your Account
                <div className="bg-[#D2045B] rounded-full p-1.5">
                  <ArrowRight className="h-4 w-4 text-white rotate-[-45deg]" />
                </div>
              </Link>

              <Link
                href="/"
                className="text-white hover:text-white/80 font-medium text-base underline transition-colors"
              >
                Learn more about AudioBlocks
              </Link>
            </div>

            <div className="pt-8 flex flex-wrap justify-center gap-8 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>Free to join</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span>Start earning immediately</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistPortalCTA;
