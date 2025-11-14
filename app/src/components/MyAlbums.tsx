'use client';

import { ChevronRight, ChevronLeft, ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';

export default function MyAlbums() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const albumNames = [
    'Echoes of the Soul',
    'Midnight Vibes',
    'Electric Dreams',
    'Serenity Falls',
    'Cosmic Journey',
    'Urban Legends',
    'Golden Hour',
    'Night Drive',
    'Ocean Waves',
    'Mountain Peak',
    'Desert Storm',
    'City Lights',
    'Rainy Days',
    'Summer Breeze',
    'Winter Blues',
    'Spring Awakening',
    'Autumn Leaves',
    'Starlight Express',
    'Thunder Road',
    'Silent Echo',
  ];

  const imageIds = [
    '1493225457124-a3eb161ffa5f',
    '1511671782779-c97d3d27a1d4',
    '1516280440619-37996c4e5b4e',
    '1493225457124-a3eb161ffa5f',
    '1470229722913-7c0e2dbbafbd',
    '1493225457124-a3eb161ffa5f',
    '1516280440619-37996c4e5b4e',
    '1493225457124-a3eb161ffa5f',
    '1511671782779-c97d3d27a1d4',
    '1470229722913-7c0e2dbbafbd',
    '1493225457124-a3eb161ffa5f',
    '1516280440619-37996c4e5b4e',
    '1511671782779-c97d3d27a1d4',
    '1493225457124-a3eb161ffa5f',
    '1470229722913-7c0e2dbbafbd',
    '1516280440619-37996c4e5b4e',
    '1511671782779-c97d3d27a1d4',
    '1493225457124-a3eb161ffa5f',
    '1470229722913-7c0e2dbbafbd',
    '1516280440619-37996c4e5b4e',
  ];

  // Create lots of albums for scrolling
  const albums = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    title: albumNames[i % albumNames.length],
    image: `https://images.unsplash.com/photo-${imageIds[i % imageIds.length]}?w=400&h=400&fit=crop`,
  }));

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-semibold">My Albums</h2>
        <button className="w-8 h-8 rounded-full bg-[#885FA8] flex items-center justify-center hover:bg-[#7A4F98] transition-colors">
          <ArrowUpRight size={16} className="text-white" />
        </button>
      </div>
      <div className="relative w-full overflow-hidden">
        {/* Left navigation arrow */}
        <button 
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#885FA8] bg-opacity-80 flex items-center justify-center hover:bg-opacity-100 transition-all shadow-lg pointer-events-auto"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        
        {/* Right navigation arrow */}
        <button 
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#885FA8] bg-opacity-80 flex items-center justify-center hover:bg-opacity-100 transition-all shadow-lg pointer-events-auto"
        >
          <ChevronRight size={20} className="text-white" />
        </button>

        {/* Scrollable album cards */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide pl-12 pr-12"
          style={{ 
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {albums.map((album) => (
            <div key={album.id} className="flex-shrink-0 w-48">
              <div className="w-48 h-48 rounded-lg mb-2 relative overflow-hidden bg-gray-800">
                <img
                  src={album.image}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-white text-sm text-center">{album.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

