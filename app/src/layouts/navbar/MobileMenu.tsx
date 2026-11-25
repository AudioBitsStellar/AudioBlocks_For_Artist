"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuVariants: Variants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  exit: {
    x: "100%",
    transition: { duration: 0.3, ease: "easeInOut" },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={menuVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed top-0 right-0 bottom-0 w-4/5 max-w-xs bg-[#000] z-50 shadow-lg border-l border-gray-900"
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <Image src="/logo2.png" height={40} width={40} alt="AudioBlocks Logo" />
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="flex items-center justify-center min-w-11 min-h-11"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          <div className="flex flex-col gap-4 px-6 py-6">
            <motion.div variants={itemVariants}>
              <Link
                href="/artist-portal"
                onClick={onClose}
                className="text-white hover:text-[#D2045B] font-medium py-2 block transition-colors"
              >
                For Artists
              </Link>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Link
                href="/login"
                onClick={onClose}
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
  );
}
