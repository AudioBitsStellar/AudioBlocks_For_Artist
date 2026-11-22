"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const MobileMenu = dynamic(() => import("./MobileMenu"), {
  ssr: false,
});

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasOpenedMenu, setHasOpenedMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleMenuToggle = () => {
    if (!isMenuOpen) setHasOpenedMenu(true);
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`w-full z-30 sticky top-0 py-4 transition-all duration-300 ${
          scrolled ? "bg-[#0f0f0f]/80 backdrop-blur-lg " : ""
        }`}
      >
        <div className="flex h-[51px] items-center justify-between py-4 max-w-11/12 mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Image src="/logo2.png" height={100} width={100} alt="AudioBlocks Logo" />
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/artist-portal"
              className="text-white hover:text-[#D2045B] font-medium transition-colors"
            >
              For Artists
            </Link>
          </div>

          {/* Sign In */}
          <div className="hidden md:flex">
            <Link
              href="/login"
              className="px-4 cursor-pointer py-2 gap-3 rounded-full bg-[#D2045B] hover:bg-[#B8043F] flex justify-between items-center text-white font-bold transition-all duration-200 whitespace-nowrap text-sm hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Sign in
              <div className="bg-black rounded-full p-1">
                <ArrowRight className="h-4 w-4 rotate-[300deg]" />
              </div>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={handleMenuToggle}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              className="flex items-center justify-center min-w-11 min-h-11 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D2045B]"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </button>
          </div>
        </div>

        {hasOpenedMenu && (
          <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        )}
      </nav>
    </>
  );
};

export default Navbar;
