'use client';

import { Search, Bell, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TopHeader({
  onMenuClick,
  sidebarOpen = false,
}: {
  onMenuClick: () => void;
  sidebarOpen?: boolean;
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
    <header className="sticky top-0 z-30 bg-[#161616] flex-shrink-0 border-b border-white/10">
      {/* Main row */}
      <div className="h-16 sm:h-20 flex items-center justify-between px-4 md:px-8">

        {/* LEFT */}
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-nav"
            className="md:hidden text-white p-1 -ml-1 rounded focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <Menu size={26} />
          </button>

          {/* Welcome */}
          <div>
            <h2 className="text-white text-base sm:text-lg md:text-xl font-bold leading-tight">
              Welcome, Pete Lisk
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              {currentDate} | {currentTime}
            </p>
          </div>
        </div>

        {/* CENTER - Search (hidden on mobile, shown md+) */}
        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="search"
              placeholder="Search by artists, songs or albums"
              aria-label="Search"
              className="w-full bg-[#2A2A2A] rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            aria-label="Notifications"
            className="relative text-white hover:text-gray-300 transition-colors"
          >
            <Bell size={24} strokeWidth={2} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#161616]" />
          </button>

          <Link
            href="/dashboard/profile"
            aria-label="Go to profile"
            className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-gray-700 hover:border-gray-500 transition-colors"
          >
            <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-300"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* Mobile search row (shown on sm only) */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="search"
            placeholder="Search artists, songs or albums"
            aria-label="Search"
            className="w-full bg-[#2A2A2A] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
      </div>
    </header>
  );
}
