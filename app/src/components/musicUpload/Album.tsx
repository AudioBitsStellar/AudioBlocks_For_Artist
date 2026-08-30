import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Play,
  MoreVertical,
  Clock,
  Heart,
  MessageCircle,
  FolderDown,
  X,
  Upload,
  Music,
  Trash2,
  Plus,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { MusicFormValues } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { albumFormSchema } from "@/types/formValidation";
import { MUSIC_GENRES } from "../shared/music_genre";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useToast } from "@/hooks/useToastHandler";
import useAlbumServices from "@/services/albumService";

const Album = () => {
  const toast = useToast();
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [albumMusicFiles, setAlbumMusicFiles] = useState<
    Array<{
      id: number;
      name: string;
      size: string;
      file: File | null;
    }>
  >([]);
  const albumFileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const coverInputRef = useRef<HTMLInputElement>(null);
  const nextFileId = useRef(1);

  const { useCreateAlbum } = useAlbumServices();
  const createAlbum = useCreateAlbum();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MusicFormValues>({
    resolver: zodResolver(albumFormSchema),
    mode: "onChange",
  });

  const watchedValues = watch();
  const { restore, clearSavedData } = useAutoSave(
    "upload-album",
    watchedValues as Record<string, unknown>,
    isSubmitting || createAlbum.isPending
  );

  useEffect(() => {
    const saved = restore();
    if (saved) {
      reset(saved as MusicFormValues);
      toast.success("Draft restored");
    }
  }, []);

  const isBusy = isSubmitting || createAlbum.isPending;

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " b";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " kb";
    return (bytes / (1024 * 1024)).toFixed(1) + " mb";
  };

  const handleAddAnotherMusic = () => {
    const newId = nextFileId.current++;
    setAlbumMusicFiles([
      ...albumMusicFiles,
      {
        id: newId,
        name: "",
        size: "",
        file: null,
      },
    ]);
  };

  const handleAlbumFileUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSize = formatFileSize(file.size);
    setAlbumMusicFiles((prev) => {
      const existing = prev.find((f) => f.id === id);
      if (existing) {
        return prev.map((f) => (f.id === id ? { ...f, name: file.name, size: fileSize, file } : f));
      }
      return [...prev, { id, name: file.name, size: fileSize, file }];
    });
  };

  const handleDeleteAlbumFile = (id: number) => {
    setAlbumMusicFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const onSubmit = async (data: MusicFormValues) => {
    const songFiles = albumMusicFiles.filter((f): f is typeof f & { file: File } => !!f.file);

    if (!coverFile || songFiles.length === 0) {
      toast.error("Please add a cover image and at least one song file");
      return;
    }

    const formData = new FormData();
    formData.append("albumTitle", data.albumTitle);
    formData.append("genre", data.genre);
    formData.append("songTitle", data.songTitle);
    formData.append("purchasePrice", data.purchasePrice);
    formData.append("cover", coverFile);
    songFiles.forEach(({ file }) => formData.append("songs", file));

    try {
      await createAlbum.mutateAsync(formData);

      clearSavedData();
      toast.success("Album uploaded successfully!");
      reset();
      setCoverImage(null);
      setCoverFile(null);
      setAlbumMusicFiles([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="space-y-5  col-span-2">
        <div className="space-y-2">
          <label htmlFor="album-title" className="text-sm font-medium text-white">
            Album Title <span className="text-[#D2045B]">*</span>
          </label>
          <input
            id="album-title"
            {...register("albumTitle")}
            placeholder="Enter Album Title"
            maxLength={100}
            aria-invalid={errors.albumTitle ? "true" : "false"}
            className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${errors.albumTitle ? "border-red-500" : "border-[#2A2A2A]"}`}
          />
          {errors.albumTitle && (
            <p className="text-[10px] text-red-500" role="alert">
              {errors.albumTitle.message}
            </p>
          )}
          {(watchedValues.albumTitle?.length ?? 0) >= 90 && (
            <p
              className={`text-[10px] text-right ${(watchedValues.albumTitle?.length ?? 0) >= 100 ? "text-red-500" : "text-yellow-500"}`}
            >
              {watchedValues.albumTitle?.length ?? 0}/100
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="album-genre" className="text-sm font-medium text-white">
            Genre <span className="text-[#D2045B]">*</span>
          </label>
          <select
            id="album-genre"
            {...register("genre")}
            aria-invalid={errors.genre ? "true" : "false"}
            className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white focus:border-[#885FA8] focus:outline-none ${errors.genre ? "border-red-500" : "border-[#2A2A2A]"}`}
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
          {errors.genre && (
            <p className="text-[10px] text-red-500" role="alert">
              {errors.genre.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="album-song-title" className="text-sm font-medium text-white">
            Song Title <span className="text-[#D2045B]">*</span>
          </label>
          <input
            id="album-song-title"
            {...register("songTitle")}
            placeholder="Add Song Title"
            maxLength={100}
            aria-invalid={errors.songTitle ? "true" : "false"}
            className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${errors.songTitle ? "border-red-500" : "border-[#2A2A2A]"}`}
          />
          {errors.songTitle && (
            <p className="text-[10px] text-red-500" role="alert">
              {errors.songTitle.message}
            </p>
          )}
          {(watchedValues.songTitle?.length ?? 0) >= 90 && (
            <p
              className={`text-[10px] text-right ${(watchedValues.songTitle?.length ?? 0) >= 100 ? "text-red-500" : "text-yellow-500"}`}
            >
              {watchedValues.songTitle?.length ?? 0}/100
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="album-purchase-price" className="text-sm font-medium text-white">
              Purchase Price <span className="text-[#D2045B]">*</span>
            </label>
            <input
              id="album-purchase-price"
              {...register("purchasePrice")}
              placeholder="Add Price of Song"
              maxLength={20}
              aria-invalid={errors.purchasePrice ? "true" : "false"}
              className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${errors.purchasePrice ? "border-red-500" : "border-[#2A2A2A]"}`}
            />
            {errors.purchasePrice && (
              <p className="text-[10px] text-red-500" role="alert">
                {errors.purchasePrice.message}
              </p>
            )}
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
                  aria-label="Upload album music file"
                />
                <button
                  onClick={() => albumFileInputRefs.current.get(0)?.click()}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white hover:bg-[#1a1a1a] transition-colors text-left text-sm"
                  disabled={isBusy}
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
                          <p className="text-xs text-white truncate">
                            {file.name || "Choose file"}
                          </p>
                          {file.name && (
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-[#A3A3A3]">{file.size}</p>
                              <span className="text-[10px] text-[#A3A3A3]">Ready to upload</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {file.name && (
                        <button
                          onClick={() => handleDeleteAlbumFile(file.id)}
                          className="p-1 text-[#A3A3A3] hover:text-white transition-colors shrink-0"
                          title="Delete file"
                          aria-label="Delete file"
                          disabled={isBusy}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
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
                          aria-label="Upload album music file"
                        />
                        <button
                          onClick={() => albumFileInputRefs.current.get(file.id)?.click()}
                          className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-2 text-white hover:bg-[#1a1a1a] transition-colors text-left text-xs mt-2"
                          disabled={isBusy}
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
            aria-label="Add another music track"
            disabled={isBusy}
          >
            <Plus size={16} className="text-white" />
          </button>
          <span className="text-sm text-white">Add Another music</span>
          <button
            onClick={handleAddAnotherMusic}
            className="px-4 py-1.5 rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white text-sm font-medium transition-colors"
            disabled={isBusy}
          >
            Add
          </button>
        </div>

        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isBusy || !isValid}
          className={`w-[131px] rounded-lg font-semibold px-6 py-3 transition-colors mt-6 ${isBusy || !isValid ? "opacity-70 cursor-not-allowed bg-[#8a8a8a]" : "bg-[#D2045B] hover:bg-[#B8043F]"} text-white`}
        >
          {isBusy ? "Uploading..." : "Add Album"}
        </button>
      </div>

      {/* Right Column - Media Uploads */}
      <div className="space-y-6  col-span-1">
        {/* Add Music Cover Section */}
        <div
          className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-6 w-full flex flex-col"
          style={{ height: "321px" }}
        >
          {coverImage ? (
            <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
              <Image src={coverImage} alt="Music cover" fill className="object-cover" unoptimized />
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
          <p className="text-sm text-[#A3A3A3] mb-4 flex-1">
            Make your song stand out with a striking cover image
          </p>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
            aria-label="Upload cover image"
          />
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={isBusy}
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] text-white px-4 py-2 hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Cover
          </button>
        </div>
      </div>
    </div>
  );
};

export default Album;
