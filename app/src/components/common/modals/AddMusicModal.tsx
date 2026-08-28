"use client";

import Image from "next/image";
import { Upload, Music, Clock, CheckCircle2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Modal from "@/components/shared/Modal";
import {
  formatScheduledAt,
  getScheduledReleases,
  publishDueReleases,
  scheduleRelease,
  type ScheduledRelease,
} from "@/services/scheduledReleaseService";

interface AddMusicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = "song" | "album";
type PublishMode = "now" | "schedule";

const DEFAULT_FORM = {
  songTitle: "",
  albumTitle: "",
  genre: "",
  releaseDate: "",
  marketPrice: "",
};

function ScheduledReleasesList({ releases }: { releases: ScheduledRelease[] }) {
  if (releases.length === 0) return null;

  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#161616] p-6">
      <h3 className="text-white font-semibold mb-4">Scheduled Releases</h3>
      <ul className="space-y-3">
        {releases.map((release) => (
          <li
            key={release.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-3"
          >
            <div>
              <p className="text-sm text-white font-medium">{release.title}</p>
              <p className="text-xs text-[#A3A3A3]">{formatScheduledAt(release.scheduledAt)}</p>
            </div>
            {release.status === "published" ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle2 className="h-4 w-4" /> Published
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-[#A3A3A3]">
                <Clock className="h-4 w-4" /> Scheduled
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AddMusicModal({ open, onOpenChange }: AddMusicModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("song");
  const [publishMode, setPublishMode] = useState<PublishMode>("now");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [scheduledReleases, setScheduledReleases] = useState<ScheduledRelease[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const sync = () => {
      publishDueReleases();
      setScheduledReleases([...getScheduledReleases()]);
    };
    sync();
    const intervalId = setInterval(sync, 5000);
    return () => clearInterval(intervalId);
  }, [open]);

  const handleFieldChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (mode === "song" && !form.songTitle.trim()) {
      newErrors.songTitle = "Song title is required";
    }
    if (mode === "album" && !form.albumTitle.trim()) {
      newErrors.albumTitle = "Album title is required";
    }
    if (!form.genre.trim()) {
      newErrors.genre = "Genre is required";
    }
    if (publishMode === "now") {
      if (!form.releaseDate.trim()) {
        newErrors.releaseDate = "Release date is required";
      } else if (!/^\d{2}-\d{2}-\d{4}$/.test(form.releaseDate.trim())) {
        newErrors.releaseDate = "Release date must be in DD-MM-YYYY format";
      }
    } else {
      if (!form.releaseDate.trim()) {
        newErrors.releaseDate = "Scheduled date & time is required";
      } else if (new Date(form.releaseDate).getTime() <= Date.now()) {
        newErrors.releaseDate = "Scheduled date & time must be in the future";
      }
    }
    if (!form.marketPrice.trim()) {
      newErrors.marketPrice = "Market price is required";
    } else if (isNaN(Number(form.marketPrice.trim()))) {
      newErrors.marketPrice = "Market price must be a valid number";
    }
    if (mode === "song" && !uploadedFile) {
      newErrors.uploadedFile = "Audio file is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (publishMode === "schedule") {
      const scheduledAt = new Date(form.releaseDate).toISOString();
      scheduleRelease({
        title: mode === "song" ? form.songTitle.trim() : form.albumTitle.trim(),
        mode,
        genre: form.genre.trim(),
        scheduledAt,
      });
      setScheduledReleases([...getScheduledReleases()]);
      toast.success(`Release scheduled for ${formatScheduledAt(scheduledAt)}`);
      onOpenChange(false);
      setForm(DEFAULT_FORM);
      setPublishMode("now");
      setCoverImage(null);
      setUploadedFile(null);
      return;
    }

    console.log("Form submitted:", { mode, form, coverImage, uploadedFile });
    onOpenChange(false);

    // Redirect to the Song.tsx or Album.tsx flow based on selection (which are rendered inside /dashboard/upload-music)
    router.push(`/dashboard/upload-music?mode=${mode}`);

    // Reset form
    setForm(DEFAULT_FORM);
    setCoverImage(null);
    setUploadedFile(null);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      contentClassName="max-w-6xl"
      closeAriaLabel="Close add music dialog"
    >
      <div className="space-y-6">
        {/* Mode Selection */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode("album")}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              mode === "album"
                ? "bg-[#D2045B] text-white"
                : "bg-transparent text-white hover:bg-white/5"
            }`}
          >
            Add Album
          </button>
          <button
            onClick={() => setMode("song")}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              mode === "song"
                ? "bg-[#D2045B] text-white"
                : "bg-transparent text-white hover:bg-white/5"
            }`}
          >
            Add Song
          </button>
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
                onChange={handleFieldChange("songTitle")}
                placeholder="Add Song Title"
                maxLength={100}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
              />
              {errors.songTitle && <p className="text-red-500 text-xs">{errors.songTitle}</p>}
              {form.songTitle.length >= 90 && (
                <p
                  className={`text-xs text-right ${form.songTitle.length >= 100 ? "text-red-500" : "text-yellow-500"}`}
                >
                  {form.songTitle.length}/100
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Album Title <span className="text-[#D2045B]">*</span>
              </label>
              <input
                value={form.albumTitle}
                onChange={handleFieldChange("albumTitle")}
                placeholder="Enter Album Title"
                maxLength={100}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
              />
              {errors.albumTitle && <p className="text-red-500 text-xs">{errors.albumTitle}</p>}
              {form.albumTitle.length >= 90 && (
                <p
                  className={`text-xs text-right ${form.albumTitle.length >= 100 ? "text-red-500" : "text-yellow-500"}`}
                >
                  {form.albumTitle.length}/100
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Genre <span className="text-[#D2045B]">*</span>
              </label>
              <input
                value={form.genre}
                onChange={handleFieldChange("genre")}
                placeholder="Add Genre of song"
                maxLength={50}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
              />
              {errors.genre && <p className="text-red-500 text-xs">{errors.genre}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Publish</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPublishMode("now");
                    setForm((prev) => ({ ...prev, releaseDate: "" }));
                    setErrors((prev) => ({ ...prev, releaseDate: "" }));
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    publishMode === "now"
                      ? "bg-[#D2045B] text-white"
                      : "bg-transparent text-white border border-[#2A2A2A] hover:bg-white/5"
                  }`}
                >
                  Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPublishMode("schedule");
                    setForm((prev) => ({ ...prev, releaseDate: "" }));
                    setErrors((prev) => ({ ...prev, releaseDate: "" }));
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    publishMode === "schedule"
                      ? "bg-[#D2045B] text-white"
                      : "bg-transparent text-white border border-[#2A2A2A] hover:bg-white/5"
                  }`}
                >
                  Schedule for Later
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                {publishMode === "now" ? "Song Release Date" : "Scheduled Publish Date & Time"}{" "}
                <span className="text-[#D2045B]">*</span>
              </label>
              {publishMode === "now" ? (
                <input
                  value={form.releaseDate}
                  onChange={handleFieldChange("releaseDate")}
                  placeholder="DD-MM-YYYY"
                  maxLength={10}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                />
              ) : (
                <input
                  type="datetime-local"
                  value={form.releaseDate}
                  onChange={handleFieldChange("releaseDate")}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
                />
              )}
              {errors.releaseDate && <p className="text-red-500 text-xs">{errors.releaseDate}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Market Price <span className="text-[#D2045B]">*</span>
              </label>
              <input
                value={form.marketPrice}
                onChange={handleFieldChange("marketPrice")}
                placeholder="Add Price of Song"
                maxLength={20}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none"
              />
              {errors.marketPrice && <p className="text-red-500 text-xs">{errors.marketPrice}</p>}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors mt-6"
            >
              {publishMode === "schedule" ? "Schedule Release" : "Add Music"}
            </button>
          </div>

          {/* Right Column - Media Uploads */}
          <div className="space-y-6">
            {/* Add Music Cover Section */}
            <div className="rounded-lg border border-[#2A2A2A] bg-[#161616] p-6">
              <h3 className="text-white font-semibold mb-2">Add Music Cover</h3>
              <p className="text-sm text-[#A3A3A3] mb-4">
                Make your song stand out with a striking cover image
              </p>

              {coverImage ? (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                  <Image src={coverImage} alt="Music cover" fill className="object-cover" />
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
                  Drag & drop your files here or{" "}
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
              {errors.uploadedFile && (
                <p className="text-red-500 text-xs mt-2">{errors.uploadedFile}</p>
              )}
            </div>
          </div>
        </div>

        <ScheduledReleasesList releases={scheduledReleases} />
      </div>
    </Modal>
  );
}
