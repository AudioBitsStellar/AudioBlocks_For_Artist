'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import { X, Upload, Music } from 'lucide-react';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface AddMusicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = 'song' | 'album';

const DEFAULT_FORM = {
  songTitle: '',
  albumTitle: '',
  genre: '',
  releaseDate: '',
  marketPrice: '',
};

export default function AddMusicModal({ open, onOpenChange }: AddMusicModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('song');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file.name);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (mode === 'song' && !form.songTitle.trim()) {
      newErrors.songTitle = 'Song title is required';
    }
    if (mode === 'album' && !form.albumTitle.trim()) {
      newErrors.albumTitle = 'Album title is required';
    }
    if (!form.genre.trim()) {
      newErrors.genre = 'Genre is required';
    }
    if (!form.releaseDate.trim()) {
      newErrors.releaseDate = 'Release date is required';
    } else if (!/^\d{2}-\d{2}-\d{4}$/.test(form.releaseDate.trim())) {
      newErrors.releaseDate = 'Release date must be in DD-MM-YYYY format';
    }
    if (!form.marketPrice.trim()) {
      newErrors.marketPrice = 'Market price is required';
    } else if (isNaN(Number(form.marketPrice.trim()))) {
      newErrors.marketPrice = 'Market price must be a valid number';
    }
    if (mode === 'song' && !uploadedFile) {
      newErrors.uploadedFile = 'Audio file is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    console.log('Form submitted:', { mode, form, coverImage, uploadedFile });
    onOpenChange(false);
    
    // Redirect to the Song.tsx or Album.tsx flow based on selection (which are rendered inside /dashboard/upload-music)
    router.push(`/dashboard/upload-music?mode=${mode}`);

    // Reset form
    setForm(DEFAULT_FORM);
    setCoverImage(null);
    setUploadedFile(null);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" style={{ zIndex: 100000 }} />
        <Dialog.Content
          className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
          style={{ zIndex: 100001 }}
        >
          <div className="w-full max-w-6xl rounded-3xl border border-[#2A2A2A] bg-[#0F0F0F] p-8 shadow-2xl my-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
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
              <Dialog.Close asChild>
                <button className="rounded-full p-2 text-gray-400 transition hover:bg-white/5 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Main Content - Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Form Fields */}
              <div className="space-y-5">
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
                  {errors.songTitle && <p className="text-red-500 text-xs">{errors.songTitle}</p>}
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
                  {errors.albumTitle && <p className="text-red-500 text-xs">{errors.albumTitle}</p>}
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
                  {errors.genre && <p className="text-red-500 text-xs">{errors.genre}</p>}
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
                  {errors.releaseDate && <p className="text-red-500 text-xs">{errors.releaseDate}</p>}
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
                  {errors.marketPrice && <p className="text-red-500 text-xs">{errors.marketPrice}</p>}
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors mt-6"
                >
                  Add Music
                </button>
              </div>

              {/* Right Column - Media Uploads */}
              <div className="space-y-6">
                {/* Add Music Cover Section */}
                <div className="rounded-lg border border-[#2A2A2A] bg-[#161616] p-6">
                  <h3 className="text-white font-semibold mb-2">Add Music Cover</h3>
                  <p className="text-sm text-[#A3A3A3] mb-4">Make your song stand out with a striking cover image</p>
                  
                  {coverImage ? (
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                      <Image
                        src={coverImage}
                        alt="Music cover"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-[#111111] border border-[#2A2A2A] mb-4 flex items-center justify-center">
                      <Music className="h-16 w-16 text-[#6F6F6F]" />
                    </div>
                  )}
                  
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

                {/* Upload Music Section */}
                <div className="rounded-lg border border-[#2A2A2A] bg-[#161616] p-6">
                  <h3 className="text-white font-semibold mb-4">Upload Music</h3>
                  
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-8 text-center mb-4"
                  >
                    <Upload className="h-8 w-8 text-[#6F6F6F] mx-auto mb-2" />
                    <p className="text-sm text-[#A3A3A3] mb-2">
                      Drag & drop your files here or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-white underline hover:text-[#D2045B]"
                      >
                        Choose files
                      </button>
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleMusicUpload}
                    className="hidden"
                  />

                  {uploadedFile && (
                    <div className="mb-2">
                      <p className="text-sm text-white">Uploaded</p>
                      <p className="text-xs text-[#A3A3A3]">{uploadedFile}</p>
                    </div>
                  )}
                  
                  {!uploadedFile && (
                    <p className="text-xs text-[#A3A3A3]">No uploads added to the queue</p>
                  )}
                  {errors.uploadedFile && <p className="text-red-500 text-xs mt-2">{errors.uploadedFile}</p>}
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

