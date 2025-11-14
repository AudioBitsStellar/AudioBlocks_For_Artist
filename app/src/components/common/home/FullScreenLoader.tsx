'use client';
import { Loader2 } from 'lucide-react';

const FullScreenLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent bg-opacity-60 backdrop-blur-sm">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-[#D2045B] animate-ping opacity-30"></div>

        <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-r-transparent border-b-[#D2045B] border-l-pink-600 animate-spin"></div>

        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-pink-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default FullScreenLoader;

