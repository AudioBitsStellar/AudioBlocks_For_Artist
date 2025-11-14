'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import Breadcrumb from '@/components/Breadcrumb';
import MyMusicContent from '@/components/MyMusicContent';
import { Plus } from 'lucide-react';

interface Album {
  id: number;
  title: string;
  artist: string;
  type: string;
  image: string;
}

export default function MyMusicPage() {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showAddMusic, setShowAddMusic] = useState(false);

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
    <div className="flex min-h-screen bg-[#151918]">
      <Sidebar />
      <div className="flex-1 ml-64 min-w-0 flex flex-col">
        <TopHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8">
          <Breadcrumb
            items={breadcrumbItems}
            action={
              !showAddMusic && (
                <button 
                  onClick={() => setShowAddMusic(true)}
                  className="bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Music
                </button>
              )
            }
          />
          <MyMusicContent onAlbumSelect={setSelectedAlbum} showAddMusic={showAddMusic} onCloseAddMusic={() => setShowAddMusic(false)} />
        </main>
      </div>
    </div>
  );
}

