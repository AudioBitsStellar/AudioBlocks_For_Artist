'use client';

import { useState } from 'react';
import Breadcrumb from '@/components/Breadcrumb';
import MyMusicContent from '@/components/MyMusicContent';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Album {
  id: number;
  title: string;
  artist: string;
  type: string;
  image: string;
}

export default function MyMusicPage() {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const route = useRouter();

  const handleBreadcrumbClick = () => {
    setSelectedAlbum(null);
  };

  const breadcrumbItems = selectedAlbum
    ? [
      { label: 'My Music', onClick: handleBreadcrumbClick },
      { label: 'collection' },
      { label: selectedAlbum.title, isActive: true },
    ]
    : [
      { label: 'Overview', href: '/dashboard/overview' },
      { label: 'My Music', isActive: true },
    ];

  return (
    <>
      <Breadcrumb
        items={breadcrumbItems}
        action={
          <button
            onClick={() => route.push('/dashboard/upload-music')}
            className="bg-[#D2045B] cursor-pointer hover:bg-[#B8043F] text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Music
          </button>

        }
      />
      <ErrorBoundary fallbackTitle="Failed to load your music library">
        <MyMusicContent onAlbumSelect={setSelectedAlbum} />
      </ErrorBoundary>

    </>
  );
}

