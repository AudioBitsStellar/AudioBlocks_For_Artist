'use client';

import { Search, Filter, ChevronLeft, ChevronRight, ArrowLeft, Play, MoreVertical, Clock, Heart, MessageCircle, FolderDown, X, Upload, Music, Trash2, RotateCw, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { MUSIC_GENRES } from './shared/music_genre';
import { MusicFormValues } from '@/types';
import { useForm } from 'react-hook-form';
import ConfirmationDialog from './shared/ConfirmationDialog';

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



export default function MyMusicContent({ onAlbumSelect }: MyMusicContentProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; songId: number | null }>({
    isOpen: false,
    songId: null
  });

  const handleDeleteConfirm = () => {
    if (deleteConfirmation.songId !== null) {
      setSongs(prev => prev.filter(s => s.id !== deleteConfirmation.songId));
    }
  };


  const albumTitles = [
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
  ];

  const artists = [
    'Misty Brown',
    'Alex Johnson',
    'Sarah Williams',
    'Marcus Chen',
    'Elena Martinez',
    'David Thompson',
    'Lisa Anderson',
    'Ryan Cooper',
    'Amanda Lee',
    'Chris Parker',
  ];

  const albumTypes = [
    'New Album',
    'EP',
    'Single',
    'New Album',
    'Remix',
    'Live',
    'New Album',
    'EP',
    'Single',
    'New Album',
  ];

  const imageIds = [
    '1493225457124-a3eb161ffa5f',
    '1511671782779-c97d3d27a1d4',
    '1516280440619-37996c4e5b4e',
    '1470229722913-7c0e2dbbafbd',
    '1493225457124-a3eb161ffa5f',
    '1511671782779-c97d3d27a1d4',
    '1516280440619-37996c4e5b4e',
    '1470229722913-7c0e2dbbafbd',
    '1493225457124-a3eb161ffa5f',
    '1511671782779-c97d3d27a1d4',
    '1516280440619-37996c4e5b4e',
    '1470229722913-7c0e2dbbafbd',
    '1493225457124-a3eb161ffa5f',
    '1511671782779-c97d3d27a1d4',
  ];

  // Create 15 albums for scrolling
  const albums = Array.from({ length: 15 }, (_, i) => {
    const imageId = imageIds[i % imageIds.length];
    return {
      id: i + 1,
      title: albumTitles[i % albumTitles.length],
      artist: artists[i % artists.length],
      type: albumTypes[i % albumTypes.length],
      image: `https://images.unsplash.com/photo-${imageId}?w=400&h=400&fit=crop&auto=format&q=80`,
    };
  });

  const filteredAlbums = albums.filter(album => {
    const matchesSearch = album.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          album.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || album.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Generate random song data for an album
  const generateSongs = (album: Album): Song[] => {
    const songTitles = [
      'Relax and Unwind', 'Midnight Dreams', 'Electric Pulse', 'Silent Echo', 'Neon Nights',
      'Crystal Clear', 'Thunder Road', 'Starlight', 'Ocean Breeze', 'City Lights',
      'Desert Wind', 'Mountain Peak', 'Rainy Days', 'Summer Vibes', 'Winter Storm'
    ];

    const numSongs = Math.floor(Math.random() * 8) + 5; // 5-12 songs per album
    const generatedSongs: Song[] = [];
    const imageId = imageIds[Math.floor(Math.random() * imageIds.length)];

    for (let i = 0; i < numSongs; i++) {
      const minutes = Math.floor(Math.random() * 20) + 1; // 1-20 minutes
      const seconds = Math.floor(Math.random() * 60);
      const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const value = `${Math.floor(Math.random() * 900) + 100} ABT`;
      const likes = Math.floor(Math.random() * 20000) + 1000;
      const comments = Math.floor(Math.random() * 20000) + 1000;
      const downloads = Math.floor(Math.random() * 20000) + 1000;

      generatedSongs.push({
        id: i + 1,
        title: songTitles[i % songTitles.length],
        albumName: album.title,
        artist: album.artist,
        duration,
        value,
        likes,
        comments,
        downloads,
        thumbnail: `https://images.unsplash.com/photo-${imageId}?w=100&h=100&fit=crop&auto=format&q=80`
      });
    }

    return generatedSongs;
  };

  const handleAlbumClick = (album: Album) => {
    const generatedSongs = generateSongs(album);
    setSongs(generatedSongs);
    setSelectedAlbum(album);
    onAlbumSelect?.(album);
  };

  // If an album is selected, show the song list
  if (selectedAlbum) {
    return (
      <div>
        {/* Header with title and Search/Filter */}
        <div className="flex items-center justify-between mb-6 flex-nowrap gap-4">
          <h1 className="text-white text-3xl font-bold shrink-0">{selectedAlbum.title}</h1>
          <div className="flex items-center gap-3 flex-nowrap min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
              <input
                type="text"
                placeholder="Search Songs"
                aria-label="Search songs"
                className="bg-[#161616] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 text-sm w-full"
              />
            </div>
            <button className="bg-[#161616] border border-gray-700 rounded-lg px-4 py-2 text-white hover:border-purple-600 transition-colors flex items-center gap-2 shrink-0">
              <Filter size={20} aria-hidden="true" />
              <span className="text-sm">Filter</span>
            </button>
          </div>
        </div>

        {/* Songs List */}
        <div className="bg-[#161616] border border-gray-800 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-800">
            {songs.map((song, index) => (
              <div
                key={song.id}
                className={`px-6 py-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer group ${index === 0 ? 'bg-[#1a1a1a]' : ''
                  }`}
              >
                <div className="flex items-center gap-4">
                  {/* Number */}
                  <div className="w-8 text-center text-gray-400 group-hover:text-white transition-colors text-sm" aria-label={`Song number ${index + 1}`}>
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 shrink-0 relative">
                    <Image
                      src={song.thumbnail}
                      alt={`${song.title} cover art`}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors truncate">
                      {song.title}
                    </h3>
                    <p className="text-gray-400 text-xs truncate">{song.albumName}</p>
                    <p className="text-gray-500 text-xs truncate">{song.artist}</p>
                  </div>

                  {/* Duration */}
                  <div className="text-gray-400 text-sm w-16 text-right" aria-label={`Duration: ${song.duration}`}>
                    {song.duration}
                  </div>

                  {/* Value */}
                  <div className="text-gray-400 text-sm w-20 text-right" aria-label={`Value: ${song.value}`}>
                    {song.value}
                  </div>

                  {/* Engagement Metrics */}
                  <div className="flex items-center gap-4" aria-label={`Likes: ${(song.likes / 1000).toFixed(1)}K, Comments: ${(song.comments / 1000).toFixed(1)}K, Downloads: ${(song.downloads / 1000).toFixed(1)}K`}>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Heart size={16} aria-hidden="true" />
                      <span>{(song.likes / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <MessageCircle size={16} aria-hidden="true" />
                      <span>{(song.comments / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <FolderDown size={16} aria-hidden="true" />
                      <span>{(song.downloads / 1000).toFixed(1)}K</span>
                    </div>
                  </div>

                  {/* Delete Song */}
                  <button 
                    onClick={() => setDeleteConfirmation({ isOpen: true, songId: song.id })}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                    aria-label={`Delete ${song.title}`}
                  >
                    <Trash2 size={20} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ConfirmationDialog
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ isOpen: false, songId: null })}
          onConfirm={handleDeleteConfirm}
          title="Delete Song"
          message="Are you sure you want to delete this song? This action is permanent and cannot be undone."
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-3xl font-bold">My Music</h1>
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search my music"
              aria-label="Search my music"
              className="bg-[#161616] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 text-sm w-64"
            />
          </div>
          {/* Filter Dropdown */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filter albums by type"
              className="bg-[#161616] border border-gray-700 rounded-lg pl-4 pr-10 py-2 text-white hover:border-purple-600 transition-colors text-sm focus:outline-none cursor-pointer appearance-none"
            >
              <option value="all">All Types</option>
              <option value="new album">Albums</option>
              <option value="ep">EPs</option>
              <option value="single">Singles</option>
              <option value="remix">Remixes</option>
              <option value="live">Live</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Albums Grid */}
      <div className="relative overflow-hidden">
        {/* Left navigation arrow */}
        <button
          onClick={scrollLeft}
          aria-label="Scroll albums left"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#885FA8] bg-opacity-80 flex items-center justify-center hover:bg-opacity-100 transition-all shadow-lg pointer-events-auto"
        >
          <ChevronLeft size={20} className="text-white" aria-hidden="true" />
        </button>

        {/* Right navigation arrow */}
        <button
          onClick={scrollRight}
          aria-label="Scroll albums right"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#885FA8] bg-opacity-80 flex items-center justify-center hover:bg-opacity-100 transition-all shadow-lg pointer-events-auto"
        >
          <ChevronRight size={20} className="text-white" aria-hidden="true" />
        </button>

        {/* Scrollable album cards */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide pl-12 pr-12"
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
          aria-label="Albums carousel"
          role="region"
        >
          {filteredAlbums.map((album) => (
            <div
              key={album.id}
              className="shrink-0 w-64 cursor-pointer group"
              onClick={() => handleAlbumClick(album)}
              role="button"
              tabIndex={0}
              aria-label={`View album: ${album.title} by ${album.artist}`}
            >
              <div className="relative mb-3">
                <div className="w-64 h-64 rounded-lg relative overflow-hidden bg-gray-800 group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={album.image}
                    alt={`${album.title} cover art`}
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center z-10 pointer-events-none">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                      <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
                        <Play size={24} className="text-white ml-1" fill="white" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-purple-400 transition-colors">{album.title}</h3>
                <p className="text-gray-400 text-sm mb-1">{album.artist}</p>
                <span className="inline-block bg-purple-600/20 text-purple-400 text-xs px-2 py-1 rounded">
                  {album.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}