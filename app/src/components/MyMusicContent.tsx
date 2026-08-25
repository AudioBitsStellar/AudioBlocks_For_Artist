'use client';

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  FolderSearch,
  GripVertical,
  Heart,
  MessageCircle,
  MoreVertical,
  Play,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import ConfirmationDialog from './shared/ConfirmationDialog';
import EmptyState from './shared/EmptyState';

const SONG_ORDER_STORAGE_KEY = 'my-music-track-order';

interface Album {
  id: number;
  title: string;
  artist: string;
  type: string;
  image: string;
}

interface Song {
  id: number;
  title: string;
  albumName: string;
  artist: string;
  duration: string;
  value: string;
  likes: number;
  comments: number;
  downloads: number;
  thumbnail: string;
}

interface MyMusicContentProps {
  onAlbumSelect?: (album: Album | null) => void;
}

const albums: Album[] = [
  {
    id: 1,
    title: 'Echoes of the Soul',
    artist: 'Misty Brown',
    type: 'New Album',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&auto=format&q=80',
  },
  {
    id: 2,
    title: 'Midnight Vibes',
    artist: 'Alex Johnson',
    type: 'EP',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop&auto=format&q=80',
  },
  {
    id: 3,
    title: 'Electric Dreams',
    artist: 'Sarah Williams',
    type: 'Single',
    image: 'https://images.unsplash.com/photo-1516280440619-37996c4e5b4e?w=400&h=400&fit=crop&auto=format&q=80',
  },
  {
    id: 4,
    title: 'Serenity Falls',
    artist: 'Marcus Chen',
    type: 'New Album',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafbd?w=400&h=400&fit=crop&auto=format&q=80',
  },
  {
    id: 5,
    title: 'Cosmic Journey',
    artist: 'Elena Martinez',
    type: 'Remix',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&auto=format&q=80',
  },
];

const initialSongs: Song[] = [
  { id: 1, title: 'Golden Skies', albumName: 'Echoes of the Soul', artist: 'Misty Brown', duration: '3:42', value: '$12.50', likes: 124, comments: 18, downloads: 86, thumbnail: albums[0].image },
  { id: 2, title: 'Neon Hearts', albumName: 'Midnight Vibes', artist: 'Alex Johnson', duration: '4:08', value: '$10.00', likes: 98, comments: 12, downloads: 64, thumbnail: albums[1].image },
  { id: 3, title: 'Electric Dreams', albumName: 'Electric Dreams', artist: 'Sarah Williams', duration: '3:25', value: '$8.75', likes: 156, comments: 24, downloads: 102, thumbnail: albums[2].image },
  { id: 4, title: 'Still Waters', albumName: 'Serenity Falls', artist: 'Marcus Chen', duration: '5:12', value: '$15.00', likes: 76, comments: 9, downloads: 42, thumbnail: albums[3].image },
  { id: 5, title: 'Beyond the Stars', albumName: 'Cosmic Journey', artist: 'Elena Martinez', duration: '4:36', value: '$11.25', likes: 211, comments: 31, downloads: 148, thumbnail: albums[4].image },
  { id: 6, title: 'Afterglow', albumName: 'Echoes of the Soul', artist: 'Misty Brown', duration: '3:58', value: '$9.50', likes: 87, comments: 11, downloads: 59, thumbnail: albums[0].image },
  { id: 7, title: 'City Lights', albumName: 'Midnight Vibes', artist: 'Alex Johnson', duration: '3:16', value: '$7.50', likes: 133, comments: 16, downloads: 91, thumbnail: albums[1].image },
  { id: 8, title: 'Open Skies', albumName: 'Serenity Falls', artist: 'Marcus Chen', duration: '4:44', value: '$13.00', likes: 65, comments: 7, downloads: 38, thumbnail: albums[3].image },
];

function AlbumSkeletonRow() {
  return (
    <div className="flex gap-6 overflow-hidden pl-12 pr-12" aria-hidden="true" data-testid="my-music-skeleton">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="w-64 shrink-0">
          <div className="mb-3 h-64 w-64 animate-pulse rounded-lg bg-gray-800" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-20 animate-pulse rounded bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyMusicContent({ onAlbumSelect }: MyMusicContentProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [draggedSongId, setDraggedSongId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [reorderMessage, setReorderMessage] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; songId: number | null }>({
    isOpen: false,
    songId: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const savedOrder = window.localStorage.getItem(SONG_ORDER_STORAGE_KEY);
      if (!savedOrder) return;
      const order = JSON.parse(savedOrder) as number[];
      const positions = new Map(order.map((id, index) => [id, index]));
      setSongs((current) => [...current].sort((a, b) => (positions.get(a.id) ?? current.length) - (positions.get(b.id) ?? current.length)));
    } catch {
      window.localStorage.removeItem(SONG_ORDER_STORAGE_KEY);
    }
  }, []);

  const persistSongs = (nextSongs: Song[]) => {
    setSongs(nextSongs);
    window.localStorage.setItem(SONG_ORDER_STORAGE_KEY, JSON.stringify(nextSongs.map((song) => song.id)));
  };

  const moveSong = (songId: number, targetId: number) => {
    if (songId === targetId) return;
    const fromIndex = songs.findIndex((song) => song.id === songId);
    const toIndex = songs.findIndex((song) => song.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const nextSongs = [...songs];
    const [movedSong] = nextSongs.splice(fromIndex, 1);
    nextSongs.splice(toIndex, 0, movedSong);
    persistSongs(nextSongs);
    setReorderMessage(`${movedSong.title} moved to position ${toIndex + 1}`);
  };

  const moveSongBy = (songId: number, offset: number) => {
    const index = songs.findIndex((song) => song.id === songId);
    const targetIndex = index + offset;
    if (index < 0 || targetIndex < 0 || targetIndex >= songs.length) return;
    moveSong(songId, songs[targetIndex].id);
  };

  const filteredSongs = useMemo(() => songs.filter((song) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = song.title.toLowerCase().includes(query) || song.albumName.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query);
    const matchesFilter = filterType === 'all' || song.albumName === filterType;
    return matchesSearch && matchesFilter;
  }), [songs, searchQuery, filterType]);

  const selectAlbum = (album: Album | null) => {
    setSelectedAlbum(album);
    onAlbumSelect?.(album);
    setFilterType(album?.title ?? 'all');
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmation.songId === null) return;
    persistSongs(songs.filter((song) => song.id !== deleteConfirmation.songId));
    setDeleteConfirmation({ isOpen: false, songId: null });
  };

  return (
    <div className="w-full text-white">
      <section className="mb-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Albums</h2>
          <div className="flex gap-2">
            <button type="button" aria-label="Scroll albums left" onClick={() => scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' })} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#885FA8] hover:bg-[#7A4F98]"><ChevronLeft size={20} /></button>
            <button type="button" aria-label="Scroll albums right" onClick={() => scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' })} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#885FA8] hover:bg-[#7A4F98]"><ChevronRight size={20} /></button>
          </div>
        </div>
        {isLoading ? <AlbumSkeletonRow /> : (
          <div ref={scrollContainerRef} className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {albums.map((album) => (
              <button type="button" key={album.id} onClick={() => selectAlbum(selectedAlbum?.id === album.id ? null : album)} className={`group w-48 shrink-0 text-center ${selectedAlbum?.id === album.id ? 'text-pink-400' : 'text-white'}`}>
                <Image src={album.image} alt={album.title} width={192} height={192} className="mb-3 h-48 w-48 rounded-lg object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
                <span className="block truncate font-medium">{album.title}</span>
                <span className="block truncate text-sm text-gray-400">{album.artist}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">My Tracks</h2>
            <p className="mt-1 text-sm text-gray-400">Drag tracks to customize their listing order.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search tracks" aria-label="Search tracks" className="w-52 rounded-lg border border-gray-700 bg-[#161616] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-pink-500" />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#161616] px-3 text-sm text-gray-300">
              <Filter size={16} aria-hidden="true" />
              <select value={filterType} onChange={(event) => { setFilterType(event.target.value); setSelectedAlbum(null); }} aria-label="Filter tracks by album" className="bg-transparent py-2.5 outline-none">
                <option value="all">All albums</option>
                {albums.map((album) => <option key={album.id} value={album.title}>{album.title}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div aria-live="polite" className="sr-only">{reorderMessage}</div>
        {filteredSongs.length === 0 ? (
          <EmptyState icon={FolderSearch} title="No tracks found" description="Try adjusting your search or album filter." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#111111]">
            <div className="hidden grid-cols-[40px_1fr_140px_100px_100px_100px_48px] items-center gap-4 border-b border-gray-800 px-4 py-3 text-xs uppercase tracking-wide text-gray-500 md:grid">
              <span aria-hidden="true" /><span>Track</span><span>Duration</span><span>Likes</span><span>Comments</span><span>Downloads</span><span aria-hidden="true" />
            </div>
            {filteredSongs.map((song, index) => {
              const fullIndex = songs.findIndex((item) => item.id === song.id);
              const isDragging = draggedSongId === song.id;
              const isDropTarget = dropTargetId === song.id && draggedSongId !== song.id;
              return (
                <div key={song.id} draggable onDragStart={(event) => { setDraggedSongId(song.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(song.id)); }} onDragOver={(event) => { event.preventDefault(); setDropTargetId(song.id); }} onDragLeave={() => setDropTargetId(null)} onDrop={(event) => { event.preventDefault(); const sourceId = Number(event.dataTransfer.getData('text/plain')); moveSong(sourceId, song.id); setDraggedSongId(null); setDropTargetId(null); }} onDragEnd={() => { setDraggedSongId(null); setDropTargetId(null); }} className={`grid grid-cols-[40px_1fr_48px] items-center gap-4 border-b border-gray-800 px-4 py-3 transition-all duration-200 last:border-b-0 md:grid-cols-[40px_1fr_140px_100px_100px_100px_48px] ${isDragging ? 'scale-[0.99] opacity-40' : ''} ${isDropTarget ? 'border-t-2 border-t-pink-500 bg-pink-500/10' : 'hover:bg-white/[0.03]'}`}>
                  <button type="button" draggable={false} aria-label={`Drag ${song.title} to reorder`} title="Drag to reorder" className="flex h-10 w-10 cursor-grab items-center justify-center rounded text-gray-500 hover:bg-white/10 hover:text-white active:cursor-grabbing"><GripVertical size={20} /></button>
                  <div className="flex min-w-0 items-center gap-3">
                    <Image src={song.thumbnail} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded object-cover" />
                    <div className="min-w-0"><p className="truncate font-medium">{song.title}</p><p className="truncate text-sm text-gray-400">{song.artist} · {song.albumName}</p></div>
                  </div>
                  <span className="hidden text-sm text-gray-400 md:block"><Clock size={14} className="mr-1 inline" />{song.duration}</span>
                  <span className="hidden text-sm text-gray-400 md:block"><Heart size={14} className="mr-1 inline" />{song.likes}</span>
                  <span className="hidden text-sm text-gray-400 md:block"><MessageCircle size={14} className="mr-1 inline" />{song.comments}</span>
                  <span className="hidden text-sm text-gray-400 md:block"><Download size={14} className="mr-1 inline" />{song.downloads}</span>
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" aria-label={`Move ${song.title} up`} disabled={fullIndex === 0} onClick={() => moveSongBy(song.id, -1)} className="hidden h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white disabled:invisible md:flex"><ArrowUp size={15} /></button>
                    <button type="button" aria-label={`Move ${song.title} down`} disabled={fullIndex === songs.length - 1} onClick={() => moveSongBy(song.id, 1)} className="hidden h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white disabled:invisible md:flex"><ArrowDown size={15} /></button>
                    <button type="button" aria-label={`Play ${song.title}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-600 hover:bg-pink-500"><Play size={15} fill="currentColor" /></button>
                    <button type="button" aria-label={`More actions for ${song.title}`} onClick={() => setDeleteConfirmation({ isOpen: true, songId: song.id })} className="flex h-9 w-9 items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white"><MoreVertical size={18} /></button>
                  </div>
                  <div className="col-span-2 flex gap-2 text-xs text-gray-400 md:hidden"><span>{song.duration}</span><span>·</span><span>{song.likes} likes</span><span>·</span><span>{index + 1} of {filteredSongs.length}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmationDialog isOpen={deleteConfirmation.isOpen} onClose={() => setDeleteConfirmation({ isOpen: false, songId: null })} onConfirm={handleDeleteConfirm} title="Delete track" message="Are you sure you want to delete this track? This action cannot be undone." confirmText="Delete" />
    </div>
  );
}

export { MyMusicContent };
