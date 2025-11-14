'use client';

import { Search, Filter, ChevronLeft, ChevronRight, ArrowLeft, Play, MoreVertical, Clock, Heart, MessageCircle, FolderDown, X, Upload, Music, Trash2, RotateCw, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import Image from 'next/image';

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
  showAddMusic?: boolean;
  onCloseAddMusic?: () => void;
}

type Mode = 'song' | 'album';

const DEFAULT_FORM = {
  songTitle: '',
  albumTitle: '',
  genre: '',
  releaseDate: '',
  marketPrice: '',
  purchasePrice: '',
};

export default function MyMusicContent({ onAlbumSelect, showAddMusic = false, onCloseAddMusic }: MyMusicContentProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [mode, setMode] = useState<Mode>('song');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; status: 'uploading' | 'success' | 'failed' } | null>(null);
  const [albumMusicFiles, setAlbumMusicFiles] = useState<Array<{ id: number; name: string; size: string; progress: number; timeLeft: number; status: 'uploading' | 'success' | 'failed' }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const albumFileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const coverInputRef = useRef<HTMLInputElement>(null);
  const nextFileId = useRef(1);

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
    '1516280440619-37996c4e5b4e',
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

  const handleBackClick = () => {
    setSelectedAlbum(null);
    setSongs([]);
    onAlbumSelect?.(null);
  };

  const handleFieldChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' b';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' kb';
    return (bytes / (1024 * 1024)).toFixed(1) + ' mb';
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileSize = formatFileSize(file.size);
      setUploadedFile({ name: file.name, size: fileSize, status: 'uploading' });
      
      // Simulate upload process
      setTimeout(() => {
        // Randomly set to success or failed for demo
        const success = Math.random() > 0.3;
        setUploadedFile({ name: file.name, size: fileSize, status: success ? 'success' : 'failed' });
      }, 2000);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const fileSize = formatFileSize(file.size);
      setUploadedFile({ name: file.name, size: fileSize, status: 'uploading' });
      
      // Simulate upload process
      setTimeout(() => {
        const success = Math.random() > 0.3;
        setUploadedFile({ name: file.name, size: fileSize, status: success ? 'success' : 'failed' });
      }, 2000);
    }
  };

  const handleRetry = () => {
    if (uploadedFile) {
      setUploadedFile({ ...uploadedFile, status: 'uploading' });
      setTimeout(() => {
        const success = Math.random() > 0.3;
        setUploadedFile({ ...uploadedFile, status: success ? 'success' : 'failed' });
      }, 2000);
    }
  };

  const handleDelete = () => {
    setUploadedFile(null);
  };

  const handleAddAnotherMusic = () => {
    const newId = nextFileId.current++;
    setAlbumMusicFiles([...albumMusicFiles, { 
      id: newId, 
      name: '', 
      size: '', 
      progress: 0, 
      timeLeft: 0, 
      status: 'uploading' 
    }]);
  };

  const handleAlbumFileUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileSize = formatFileSize(file.size);
      setAlbumMusicFiles(prev => {
        const existing = prev.find(f => f.id === id);
        if (existing) {
          return prev.map(f => 
            f.id === id ? { ...f, name: file.name, size: fileSize, progress: 0, timeLeft: 15, status: 'uploading' } : f
          );
        } else {
          return [...prev, { id, name: file.name, size: fileSize, progress: 0, timeLeft: 15, status: 'uploading' }];
        }
      });

      // Simulate upload progress
      let progress = 0;
      let timeLeft = 15;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        timeLeft = Math.max(0, timeLeft - 1);
        
        if (progress >= 100) {
          progress = 100;
          timeLeft = 0;
          clearInterval(interval);
          setAlbumMusicFiles(prev => prev.map(f => 
            f.id === id ? { ...f, progress: 100, timeLeft: 0, status: 'success' } : f
          ));
        } else {
          setAlbumMusicFiles(prev => prev.map(f => 
            f.id === id ? { ...f, progress: Math.min(100, progress), timeLeft } : f
          ));
        }
      }, 500);
    }
  };

  const handleDeleteAlbumFile = (id: number) => {
    setAlbumMusicFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = () => {
    console.log('Form submitted:', { mode, form, coverImage, uploadedFile });
    onCloseAddMusic?.();
    setForm(DEFAULT_FORM);
    setCoverImage(null);
    setUploadedFile(null);
  };

  // If Add Music form should be shown
  if (showAddMusic) {
    return (
      <div>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-white text-3xl font-bold">Add Music</h1>
          <button
            onClick={onCloseAddMusic}
            className="rounded-full p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selection */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setMode('album')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              mode === 'album'
                ? 'bg-[#D2045B] text-white'
                : 'bg-transparent text-white hover:bg-white/5'
            }`}
          >
            Add Album
          </button>
          <button
            onClick={() => setMode('song')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              mode === 'song'
                ? 'bg-[#D2045B] text-white'
                : 'bg-transparent text-white hover:bg-white/5'
            }`}
          >
            Add Song
          </button>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
          {/* Left Column - Form Fields */}
          <div className="space-y-5">
            {mode === 'album' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Album Title <span className="text-[#D2045B]">*</span>
                  </label>
                  <input
                    value={form.albumTitle}
                    onChange={handleFieldChange('albumTitle')}
                    placeholder="Enter Album Title"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Genre <span className="text-[#D2045B]">*</span>
                  </label>
                  <input
                    value={form.genre}
                    onChange={handleFieldChange('genre')}
                    placeholder="Add Genre of song"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Song Title <span className="text-[#D2045B]">*</span>
                  </label>
                  <input
                    value={form.songTitle}
                    onChange={handleFieldChange('songTitle')}
                    placeholder="Add Song Title"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                      Purchase Price <span className="text-[#D2045B]">*</span>
                    </label>
                    <input
                      value={form.purchasePrice}
                      onChange={handleFieldChange('purchasePrice')}
                      placeholder="Add Song Title"
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                      Upload Music <span className="text-[#D2045B]">*</span>
                    </label>
                    {albumMusicFiles.length === 0 ? (
                      <div>
                        <input
                          ref={(el) => {
                            if (el) albumFileInputRefs.current.set(0, el);
                          }}
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleAlbumFileUpload(0, e);
                            }
                          }}
                          className="hidden"
                        />
                        <button
                          onClick={() => albumFileInputRefs.current.get(0)?.click()}
                          className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white hover:bg-[#1a1a1a] transition-colors text-left text-sm"
                        >
                          Choose file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {albumMusicFiles.map((file) => (
                          <div key={file.id} className="bg-[#1a1a1a] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center shrink-0">
                                  <Play size={12} className="text-[#A3A3A3] ml-0.5" fill="#A3A3A3" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-white truncate">{file.name || 'Choose file'}</p>
                                  {file.name && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-[10px] text-[#A3A3A3]">{file.size}</p>
                                      {file.status === 'uploading' && (
                                        <span className="text-[10px] text-[#A3A3A3]">
                                          {Math.round(file.progress)}% {file.timeLeft > 0 && `(${file.timeLeft} sec left)`}
                                        </span>
                                      )}
                                      {file.status === 'success' && (
                                        <span className="text-[10px] text-green-500 font-medium">Upload finished</span>
                                      )}
                                      {file.status === 'failed' && (
                                        <span className="text-[10px] text-red-500 font-medium">Upload failed</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {file.name && (
                                <button
                                  onClick={() => handleDeleteAlbumFile(file.id)}
                                  className="p-1 text-[#A3A3A3] hover:text-white transition-colors shrink-0"
                                  title="Delete file"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            {file.status === 'uploading' && file.name && (
                              <div className="mt-2">
                                <div className="w-full h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                                    style={{ width: `${file.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {!file.name && (
                              <div>
                                <input
                                  ref={(el) => {
                                    if (el) albumFileInputRefs.current.set(file.id, el);
                                  }}
                                  type="file"
                                  accept="audio/*"
                                  onChange={(e) => handleAlbumFileUpload(file.id, e)}
                                  className="hidden"
                                />
                                <button
                                  onClick={() => albumFileInputRefs.current.get(file.id)?.click()}
                                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-2 text-white hover:bg-[#1a1a1a] transition-colors text-left text-xs mt-2"
                                >
                                  Choose file
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleAddAnotherMusic}
                    className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center hover:bg-[#3A3A3A] transition-colors"
                  >
                    <Plus size={16} className="text-white" />
                  </button>
                  <span className="text-sm text-white">Add Another music</span>
                  <button 
                    onClick={handleAddAnotherMusic}
                    className="px-4 py-1.5 rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-[131px] rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white text-[14px] font-semibold px-6 py-3 transition-colors mt-6"
                >
                  Add Album
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Song Title <span className="text-[#D2045B]">*</span>
                  </label>
                  <input
                    value={form.songTitle}
                    onChange={handleFieldChange('songTitle')}
                    placeholder="Add Song Title"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Album Title <span className="text-[#D2045B]">*</span>
                  </label>
                  <input
                    value={form.albumTitle}
                    onChange={handleFieldChange('albumTitle')}
                    placeholder="Enter Album Title"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Genre <span className="text-[#D2045B]">*</span>
                  </label>
                  <input
                    value={form.genre}
                    onChange={handleFieldChange('genre')}
                    placeholder="Add Genre of song"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Song Release Date <span className="text-[#D2045B]">*</span>
                  </label>
                  <input
                    value={form.releaseDate}
                    onChange={handleFieldChange('releaseDate')}
                    placeholder="DD-MM-YYYY"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Market Price <span className="text-[#D2045B]">*</span>
                  </label>
                  <input
                    value={form.marketPrice}
                    onChange={handleFieldChange('marketPrice')}
                    placeholder="Add Price of Song"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-[131px] rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors mt-6"
                >
                  Add Music
                </button>
              </>
            )}
          </div>

          {/* Right Column - Media Uploads */}
          <div className="space-y-6">
            {/* Add Music Cover Section */}
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6 w-full flex flex-col" style={{ height: '321px' }}>
              {coverImage ? (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                  <Image
                    src={coverImage}
                    alt="Music cover"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-teal-500 via-purple-500 to-pink-500 mb-4 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-yellow-400 border-8 border-red-500 relative z-10"></div>
                    <div className="absolute left-8 top-12 w-24 h-24 rounded-full bg-purple-400 opacity-80"></div>
                    <div className="absolute right-8 bottom-12 w-20 h-20 rounded-full bg-purple-600 opacity-60"></div>
                  </div>
                </div>
              )}
              
              <h3 className="text-white font-semibold mb-2">Add Music Cover</h3>
              <p className="text-sm text-[#A3A3A3] mb-4 flex-1">Make your song stand out with a striking cover image</p>
              
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <button
                onClick={() => coverInputRef.current?.click()}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] text-white px-4 py-2 hover:bg-[#1a1a1a] transition-colors"
              >
                Add Cover
              </button>
            </div>

            {/* Upload Music Section - Only show for Add Song mode */}
            {mode === 'song' && (
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6 w-full flex flex-col overflow-hidden" style={{ height: '192.33px' }}>
                <h3 className="text-white font-semibold mb-3 text-sm">Upload Music</h3>
                
                {!uploadedFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-3 text-center mb-3 flex-1 flex flex-col items-center justify-center min-h-0"
                  >
                    <p className="text-xs text-[#A3A3A3]">
                      Drag & drop your files here or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-white underline hover:text-[#D2045B]"
                      >
                        Choose files
                      </button>
                    </p>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-3 text-center mb-3 flex-1 flex flex-col items-center justify-center min-h-0"
                  >
                    <p className="text-xs text-[#A3A3A3]">
                      {uploadedFile.status === 'uploading' ? 'Uploading...' : 'Drag & drop your files here or'}{' '}
                      {uploadedFile.status !== 'uploading' && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-white underline hover:text-[#D2045B]"
                        >
                          Choose files
                        </button>
                      )}
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleMusicUpload}
                  className="hidden"
                />

                <div className="shrink-0">
                  <p className="text-xs font-semibold text-white mb-1.5">Uploaded</p>
                  {uploadedFile ? (
                    <div className="bg-[#1a1a1a] rounded-lg p-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-[#2A2A2A] flex items-center justify-center shrink-0">
                          <Play size={12} className="text-[#A3A3A3] ml-0.5" fill="#A3A3A3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate">{uploadedFile.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-[#A3A3A3]">{uploadedFile.size}</p>
                            {uploadedFile.status === 'failed' && (
                              <span className="text-[10px] text-red-500 font-medium">Upload failed</span>
                            )}
                            {uploadedFile.status === 'success' && (
                              <span className="text-[10px] text-green-500 font-medium">Upload finished</span>
                            )}
                            {uploadedFile.status === 'uploading' && (
                              <span className="text-[10px] text-yellow-500 font-medium">Uploading...</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {uploadedFile.status === 'failed' && (
                          <button
                            onClick={handleRetry}
                            className="p-1 text-[#A3A3A3] hover:text-white transition-colors"
                            title="Retry upload"
                          >
                            <RotateCw size={14} />
                          </button>
                        )}
                        <button
                          onClick={handleDelete}
                          className="p-1 text-[#A3A3A3] hover:text-white transition-colors"
                          title="Delete file"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#A3A3A3]">No uploads added to the queue</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If an album is selected, show the song list
  if (selectedAlbum) {
    return (
      <div>
        {/* Header with title and Search/Filter */}
        <div className="flex items-center justify-between mb-6 flex-nowrap gap-4">
          <h1 className="text-white text-3xl font-bold shrink-0">{selectedAlbum.title}</h1>
          <div className="flex items-center gap-3 flex-nowrap min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search Songs"
                className="bg-[#161616] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 text-sm w-full"
              />
            </div>
            <button className="bg-[#161616] border border-gray-700 rounded-lg px-4 py-2 text-white hover:border-purple-600 transition-colors flex items-center gap-2 shrink-0">
              <Filter size={20} />
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
                className={`px-6 py-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer group ${
                  index === 0 ? 'bg-[#1a1a1a]' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Number */}
                  <div className="w-8 text-center text-gray-400 group-hover:text-white transition-colors text-sm">
                    {index + 1}
                  </div>
                  
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 shrink-0 relative">
                    <Image
                      src={song.thumbnail}
                      alt={song.title}
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
                  <div className="text-gray-400 text-sm w-16 text-right">
                    {song.duration}
                  </div>
                  
                  {/* Value */}
                  <div className="text-gray-400 text-sm w-20 text-right">
                    {song.value}
                  </div>
                  
                  {/* Engagement Metrics */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Heart size={16} />
                      <span>{(song.likes / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <MessageCircle size={16} />
                      <span>{(song.comments / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <FolderDown size={16} />
                      <span>{(song.downloads / 1000).toFixed(1)}K</span>
                    </div>
                  </div>
                  
                  {/* More Options */}
                  <button className="text-gray-400 hover:text-white transition-colors p-2">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search my music"
              className="bg-[#161616] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 text-sm w-64"
            />
          </div>
          {/* Filter Button */}
          <button className="bg-[#161616] border border-gray-700 rounded-lg px-4 py-2 text-white hover:border-purple-600 transition-colors flex items-center gap-2">
            <Filter size={20} />
            <span className="text-sm">Filter</span>
          </button>
        </div>
      </div>

      {/* Albums Grid */}
      <div className="relative overflow-hidden">
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
          className="flex gap-6 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide pl-12 pr-12"
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {albums.map((album) => (
            <div 
              key={album.id} 
              className="shrink-0 w-64 cursor-pointer group"
              onClick={() => handleAlbumClick(album)}
            >
              <div className="relative mb-3">
                <div className="w-64 h-64 rounded-lg relative overflow-hidden bg-gray-800 group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={album.image}
                    alt={album.title}
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0  bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center z-10 pointer-events-none">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                      <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
                        <Play size={24} className="text-white ml-1" fill="white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-purple-400 transition-colors">{album.title}</h3>
                <p className="text-gray-400 text-sm mb-1">{album.artist}</p>
                <span className="inline-block bg-purple-600 bg-opacity-20 text-purple-400 text-xs px-2 py-1 rounded">
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

