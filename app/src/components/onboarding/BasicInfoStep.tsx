"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArtistBasicInfo } from "@/types/onboarding";
import MusicLoader from "@/components/MusicLoader";

interface BasicInfoStepProps {
  onComplete: () => void;
}

const GENRES = [
  "Hip-Hop",
  "R&B",
  "Pop",
  "Rock",
  "Electronic",
  "Jazz",
  "Country",
  "Classical",
  "Reggae",
  "Latin",
  "Afrobeat",
  "Other",
];

export default function BasicInfoStep({ onComplete }: BasicInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    watch,
  } = useForm<ArtistBasicInfo>({
    mode: "onChange",
  });

  const selectedGenres = watch("genre") || [];

  const onSubmit = async (data: ArtistBasicInfo) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      localStorage.setItem("onboarding_basic_info", JSON.stringify(data));
      toast.success("Basic information saved!");
      onComplete();
    } catch (error) {
      toast.error("Failed to save information. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Basic Information</h2>
        <p className="text-[#A3A3A3]">Tell us about yourself as an artist</p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="artistName" className="text-sm font-medium text-white mb-2">
          Artist Name <span className="text-red-500">*</span>
        </label>
        <input
          id="artistName"
          {...register("artistName", {
            required: "Artist name is required",
            minLength: { value: 2, message: "Artist name must be at least 2 characters" },
          })}
          placeholder="Your stage name"
          maxLength={100}
          aria-invalid={errors.artistName ? "true" : "false"}
          aria-describedby={errors.artistName ? "artistName-error" : undefined}
          className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            border: errors.artistName ? "1px solid #EF4444" : "none",
          }}
        />
        {errors.artistName && (
          <span id="artistName-error" role="alert" className="text-xs text-red-500 mt-1">
            {errors.artistName.message}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <label htmlFor="bio" className="text-sm font-medium text-white mb-2">
          Bio <span className="text-red-500">*</span>
        </label>
        <textarea
          id="bio"
          {...register("bio", {
            required: "Bio is required",
            minLength: { value: 50, message: "Bio must be at least 50 characters" },
            maxLength: { value: 500, message: "Bio must not exceed 500 characters" },
          })}
          placeholder="Tell your fans about your music journey..."
          rows={4}
          maxLength={500}
          aria-invalid={errors.bio ? "true" : "false"}
          aria-describedby={errors.bio ? "bio-error" : undefined}
          className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 py-3 rounded-2xl resize-none"
          style={{
            background: "#FFFFFF0A",
            border: errors.bio ? "1px solid #EF4444" : "none",
          }}
        />
        {errors.bio && (
          <span id="bio-error" role="alert" className="text-xs text-red-500 mt-1">
            {errors.bio.message}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-white mb-2">
          Genre(s) <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {GENRES.map((genre) => (
            <label
              key={genre}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedGenres?.includes(genre)
                  ? "bg-[#D2045B] text-white"
                  : "bg-[#FFFFFF0A] text-[#A3A3A3] hover:bg-[#FFFFFF15]"
              }`}
            >
              <input
                type="checkbox"
                value={genre}
                {...register("genre", {
                  required: "Please select at least one genre",
                })}
                className="sr-only"
              />
              <span className="text-sm">{genre}</span>
            </label>
          ))}
        </div>
        {errors.genre && (
          <span role="alert" className="text-xs text-red-500 mt-1">
            {errors.genre.message}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <label htmlFor="website" className="text-sm font-medium text-white mb-2">
          Website
        </label>
        <input
          id="website"
          type="url"
          {...register("website", {
            pattern: {
              value: /^https?:\/\/.+/,
              message: "Please enter a valid URL",
            },
          })}
          placeholder="https://yourwebsite.com"
          className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            border: errors.website ? "1px solid #EF4444" : "none",
          }}
        />
        {errors.website && (
          <span role="alert" className="text-xs text-red-500 mt-1">
            {errors.website.message}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Social Media</h3>
        
        <div className="flex flex-col">
          <label htmlFor="twitter" className="text-sm font-medium text-white mb-2">
            Twitter/X
          </label>
          <input
            id="twitter"
            {...register("socialMedia.twitter")}
            placeholder="@yourusername"
            className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
            style={{ background: "#FFFFFF0A" }}
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="instagram" className="text-sm font-medium text-white mb-2">
            Instagram
          </label>
          <input
            id="instagram"
            {...register("socialMedia.instagram")}
            placeholder="@yourusername"
            className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
            style={{ background: "#FFFFFF0A" }}
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="spotify" className="text-sm font-medium text-white mb-2">
            Spotify Artist URL
          </label>
          <input
            id="spotify"
            {...register("socialMedia.spotify")}
            placeholder="https://open.spotify.com/artist/..."
            className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
            style={{ background: "#FFFFFF0A" }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className={`${
          !isValid || isSubmitting
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-[#B8043F]"
        } w-full rounded-lg bg-[#D2045B] text-white font-semibold px-6 py-3 transition-colors`}
      >
        {isSubmitting ? <MusicLoader small /> : "Continue"}
      </button>
    </form>
  );
}
