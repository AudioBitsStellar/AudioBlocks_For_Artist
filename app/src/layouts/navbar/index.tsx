'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import Image from 'next/image';
import { Variants, motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Variants for animation
  const menuVariants: Variants = {
    hidden: { x: '100%' },
    visible: {
      x: 0,
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
        when: 'beforeChildren',
        staggerChildren: 0.1,
      },
    },
    exit: {
      x: '100%',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  };

  return (
    <>
      <nav
        className={`w-full z-30 sticky top-0 py-4 transition-all duration-300 ${
          scrolled ? 'bg-[#0f0f0f]/80 backdrop-blur-lg ' : ''
        }`}
      >
        <div className="flex h-[51px] items-center justify-between py-4 max-w-11/12 mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Image src="/logo2.png" height={100} width={100} alt="AudioBlocks Logo" />
          </div>

          {/* Desktop Nav - Removed nav items */}

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
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D2045B]"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Slide-in Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 right-0 bottom-0 w-4/5 max-w-xs bg-[#000] z-50 shadow-lg border-l border-gray-900"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <Image src="/logo2.png" height={40} width={40} alt="AudioBlocks Logo" />
                <button onClick={() => setIsMenuOpen(false)}>
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="flex flex-col gap-4 px-6 py-6">
                <motion.div variants={itemVariants}>
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="mt-6 w-full px-4 py-2 rounded-full bg-[#D2045B] hover:bg-[#B8043F] text-white font-medium text-sm flex justify-center items-center gap-2"
                  >
                    Sign in
                    <div className="bg-black rounded-full p-1">
                      <ArrowRight className="h-4 w-4 rotate-[300deg]" />
                    </div>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};

export default Navbar;


