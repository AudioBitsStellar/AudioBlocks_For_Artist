'use client';

import { ChevronRight, ChevronLeft, ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';
import useAlbumServices from '@/services/albumService';
import { featureFlags } from '@/lib/featureFlags';
import { Album } from '@/types';

const MOCK_ALBUMS: Album[] = [
  { id: '1', title: 'Echoes of the Soul', coverArtUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop' },
  { id: '2', title: 'Midnight Vibes', coverArtUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop' },
  { id: '3', title: 'Electric Dreams', coverArtUrl: 'https://images.unsplash.com/photo-1516280440619-37996c4e5b4e?w=400&h=400&fit=crop' },
  { id: '4', title: 'Serenity Falls', coverArtUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafbd?w=400&h=400&fit=crop' },
  { id: '5', title: 'Cosmic Journey', coverArtUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop' },
];

function AlbumCarousel({ albums }: { albums: Album[] }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  if (albums.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-xl font-semibold">My Albums</h2>
        </div>
        <p className="text-gray-400 text-sm">No albums yet. Create your first album to see it here.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-semibold">My Albums</h2>
        <button className="w-8 h-8 rounded-full bg-[#885FA8] flex items-center justify-center hover:bg-[#7A4F98] transition-colors">
          <ArrowUpRight size={16} className="text-white" />
        </button>
      </div>
      <div className="relative w-full overflow-hidden">
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#885FA8] bg-opacity-80 flex items-center justify-center hover:bg-opacity-100 transition-all shadow-lg pointer-events-auto"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#885FA8] bg-opacity-80 flex items-center justify-center hover:bg-opacity-100 transition-all shadow-lg pointer-events-auto"
        >
          <ChevronRight size={20} className="text-white" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide pl-12 pr-12"
          style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
        >
          {albums.map((album) => (
            <div key={album.id} className="flex-shrink-0 w-48">
              <div className="w-48 h-48 rounded-lg mb-2 relative overflow-hidden bg-gray-800">
                {album.coverArtUrl ? (
                  <img src={album.coverArtUrl} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Cover</div>
                )}
              </div>
              <p className="text-white text-sm text-center">{album.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlbumCarouselSkeleton() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-semibold">My Albums</h2>
      </div>
      <div className="flex gap-4 overflow-hidden pl-12 pr-12">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-48 animate-pulse">
            <div className="w-48 h-48 rounded-lg mb-2 bg-gray-800" />
            <div className="h-3 bg-gray-700 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveMyAlbums() {
  const { useGetAlbums } = useAlbumServices();
  const { data, isLoading, isError } = useGetAlbums();

  if (isLoading) return <AlbumCarouselSkeleton />;

  if (isError) {
    return (
      <div className="w-full">
        <h2 className="text-white text-xl font-semibold mb-4">My Albums</h2>
        <p className="text-red-400 text-sm">Failed to load albums. Please try again later.</p>
      </div>
    );
  }

  return <AlbumCarousel albums={data?.data ?? []} />;
}

export default function MyAlbums() {
  if (featureFlags.useMockAlbums) {
    return <AlbumCarousel albums={MOCK_ALBUMS} />;
  }
  return <LiveMyAlbums />;
}
