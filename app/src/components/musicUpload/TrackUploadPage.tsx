"use client";

import React, { useState } from "react";
import { UploadCloud, Music, CheckCircle2, AlertCircle } from "lucide-react";
import { GenreTagSelector } from "@/components/GenreTagSelector";
import useUploadServices from "@/services/uploadService";
import { useRouter } from "next/navigation";

export const TrackUploadPage: React.FC = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { useUploadSong } = useUploadServices();
  const uploadSongMutation = useUploadSong();

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.type.startsWith("audio/")) {
        setFile(selected);
      } else {
        setStatusMessage({
          type: "error",
          text: "Please upload a valid audio file (.mp3, .wav, .flac).",
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !genre) {
      setStatusMessage({
        type: "error",
        text: "Please fill in all required fields (Audio file, Title, Genre).",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await uploadSongMutation.mutateAsync({
        fileId: `track-${Date.now()}`,
        totalChunks: 1,
        title,
        description,
        genre,
        composer: "Artist",
        coverArtPath: coverArt ? coverArt.name : "",
      });

      setStatusMessage({
        type: "success",
        text: "Track uploaded successfully and published to Stellar Network!",
      });
      setTimeout(() => router.push("/dashboard/my-music"), 1500);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to upload track. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload New Track</h1>
        <p className="text-gray-400 text-sm mt-1">
          Publish your track to AudioBlock on the Stellar Blockchain.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800"
              : "bg-red-950/60 text-red-300 border border-red-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Audio File Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="border-2 border-dashed border-gray-700 hover:border-pink-500 rounded-xl p-8 text-center bg-[#121214] transition-colors cursor-pointer"
        >
          <input
            type="file"
            accept="audio/*"
            id="audio-upload"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
          <label htmlFor="audio-upload" className="cursor-pointer space-y-3 block">
            <UploadCloud className="h-10 w-10 text-pink-500 mx-auto" />
            {file ? (
              <p className="text-pink-400 font-semibold text-sm flex items-center justify-center gap-2">
                <Music className="h-4 w-4" /> {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}{" "}
                MB)
              </p>
            ) : (
              <div>
                <p className="text-white font-medium text-base">
                  Drag & drop your audio file here, or click to browse
                </p>
                <p className="text-gray-400 text-xs mt-1">Supports MP3, WAV, FLAC up to 50MB</p>
              </div>
            )}
          </label>
        </div>

        {/* Track Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="track-title" className="block text-sm font-medium text-gray-200 mb-1">
                Track Title <span className="text-pink-500">*</span>
              </label>
              <input
                id="track-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Celestial Beats"
                required
                className="w-full bg-[#18181B] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="track-desc" className="block text-sm font-medium text-gray-200 mb-1">
                Description
              </label>
              <textarea
                id="track-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Story behind the song..."
                className="w-full bg-[#18181B] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Issue #387: Genre & Tags Selection */}
          <div className="bg-[#121214] border border-gray-800 rounded-xl p-4">
            <GenreTagSelector
              selectedGenre={genre}
              selectedTags={tags}
              onGenreChange={setGenre}
              onTagsChange={setTags}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
          <button
            type="submit"
            disabled={isSubmitting || !file}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-all shadow-md cursor-pointer"
          >
            {isSubmitting ? "Uploading to Stellar..." : "Publish Track"}
          </button>
        </div>
      </form>
    </div>
  );
};
