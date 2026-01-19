
import { Search, Filter, ChevronLeft, ChevronRight, ArrowLeft, Play, MoreVertical, Clock, Heart, MessageCircle, FolderDown, X, Upload, Music, Trash2, RotateCw, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { MusicFormValues } from '@/types';
import { useForm } from 'react-hook-form';
import { MUSIC_GENRES } from '../shared/music_genre';

const Album = () => {

  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; status: 'uploading' | 'success' | 'failed' } | null>(null);
  const [albumMusicFiles, setAlbumMusicFiles] = useState<Array<{ id: number; name: string; size: string; progress: number; timeLeft: number; status: 'uploading' | 'success' | 'failed' }>>([]);
  const albumFileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const coverInputRef = useRef<HTMLInputElement>(null);
   const nextFileId = useRef(1);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MusicFormValues>();


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


  const onSubmit = (data: MusicFormValues) => {
    console.log('Form submitted:', {
      ...data,
      coverImage,
      uploadedFile,
    });

    reset();
    setCoverImage(null);
    setUploadedFile(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="space-y-5  col-span-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">
            Album Title <span className="text-[#D2045B]">*</span>
          </label>
          <input
            {...register('albumTitle', { required: true })}
            placeholder="Enter Album Title"
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white">
            Genre <span className="text-[#D2045B]">*</span>
          </label>
          <select
            {...register('genre', { required: true })}
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white focus:border-[#885FA8] focus:outline-none"
          >
            <option value="" disabled>
              Select genre
            </option>

            {MUSIC_GENRES.map((genre) => (
              <option key={genre} value={genre} className="bg-[#161616]">
                {genre}
              </option>
            ))}
          </select>

        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white">
            Song Title <span className="text-[#D2045B]">*</span>
          </label>
          <input
            {...register('songTitle', { required: true })}
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
              {...register('purchasePrice', { required: true })}
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
          onClick={handleSubmit(onSubmit)}
          className="w-[131px] rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white text-[14px] font-semibold px-6 py-3 transition-colors mt-6"
        >
          Add Album
        </button>
      </div>




      {/* Right Column - Media Uploads */}
      <div className="space-y-6  col-span-1">
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

      </div>
    </div>
  )
}

export default Album