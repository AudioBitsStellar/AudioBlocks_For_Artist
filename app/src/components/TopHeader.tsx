'use client';

import { Search, Bell, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TopHeader({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();

      setCurrentDate(
        now.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );

      setCurrentTime(
        now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZoneName: 'short',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sticky top-0 z-30 h-20 bg-[#161616] flex items-center justify-between px-4 md:px-8 flex-shrink-0 border-b border-white/10">

      {/* LEFT */}
      <div className="flex items-center gap-4">

        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden text-white"
        >
          <Menu size={26} />
        </button>

        {/* Welcome */}
        <div>
          <h2 className="text-white text-lg md:text-xl font-bold">
            Welcome, Pete Lisk
          </h2>
          <p className="text-gray-400 text-xs md:text-sm mt-0.5">
            {currentDate} | {currentTime}
          </p>
        </div>
      </div>

      {/* CENTER - Search (hidden on small mobile) */}
      <div className="hidden md:flex flex-1 max-w-xl mx-8">
        <div className="relative w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by artists, songs or albums"
            className="w-full bg-[#2A2A2A] rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        <button className="relative text-white hover:text-gray-300 transition-colors">
          <Bell size={24} strokeWidth={2} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#161616]" />
        </button>

        <Link
          href="/dashboard/profile"
          className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-gray-700 hover:border-gray-500 transition-colors"
        >
          <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
            <svg
              className="w-7 h-7 md:w-8 md:h-8 text-gray-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
