import { useFormContext, useWatch } from "react-hook-form";
import { updateProfilePayload } from "@/types";

/**
 * Form section for profile bio, website, and social links.
 * Displays form fields with validation errors.
 */
export default function ProfileBioForm() {
  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext<updateProfilePayload>();

  const bioLength = watch("bio")?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* Display Name */}
      <div className="flex flex-col mt-7">
        <label htmlFor="display-name" className="text-sm font-medium text-white mb-2">
          Display name <span className="text-[#D2045B]">*</span>
        </label>
        <input
          id="display-name"
          {...register("username")}
          placeholder="Add Display name"
          maxLength={50}
          aria-invalid={errors.username ? "true" : "false"}
          aria-describedby={errors.username ? "username-error" : undefined}
          className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 w-full max-w-[660px] h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            backdropFilter: "blur(40px)",
            border: errors.username ? "1px solid #ef4444" : "none",
          }}
        />
        {errors.username && (
          <p id="username-error" className="text-[10px] text-red-500 mt-1" role="alert">
            {errors.username.message}
          </p>
        )}
      </div>

      {/* Bio */}
      <div className="flex flex-col mt-7">
        <label htmlFor="short-bio" className="text-sm font-medium text-white mb-2">
          Short bio
        </label>
        <textarea
          id="short-bio"
          {...register("bio")}
          placeholder="Tell about yourself in a few words"
          maxLength={500}
          aria-invalid={errors.bio ? "true" : "false"}
          aria-describedby={errors.bio ? "bio-error" : undefined}
          className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 py-3 resize-none w-full max-w-[660px] h-[120px] rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            backdropFilter: "blur(40px)",
            border: errors.bio ? "1px solid #ef4444" : "none",
          }}
        />
        {errors.bio && (
          <p id="bio-error" className="text-[10px] text-red-500 mt-1" role="alert">
            {errors.bio.message}
          </p>
        )}
        <p
          className={`text-[10px] mt-1 text-right ${
            bioLength >= 500
              ? "text-red-500"
              : bioLength >= 450
                ? "text-yellow-500"
                : "text-[#6F6F6F]"
          }`}
        >
          {bioLength}/500
        </p>
      </div>

      {/* Website */}
      <div className="flex flex-col mt-7">
        <label htmlFor="website-url" className="text-sm font-medium text-white mb-2">
          Website URL
        </label>
        <input
          id="website-url"
          {...register("website")}
          placeholder="https://"
          maxLength={500}
          aria-invalid={errors.website ? "true" : "false"}
          aria-describedby={errors.website ? "website-error" : undefined}
          className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 w-full max-w-[660px] h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            backdropFilter: "blur(40px)",
            border: errors.website ? "1px solid #ef4444" : "none",
          }}
        />
        {errors.website && (
          <p id="website-error" className="text-[10px] text-red-500 mt-1" role="alert">
            {errors.website.message}
          </p>
        )}
      </div>

      {/* Twitter/X */}
      <div className="flex flex-col mt-7">
        <label htmlFor="twitter-username" className="text-sm font-medium text-white mb-2">
          X (Twitter)
        </label>
        <input
          id="twitter-username"
          {...register("twitter")}
          placeholder="Enter your X username"
          maxLength={50}
          aria-invalid={errors.twitter ? "true" : "false"}
          aria-describedby={errors.twitter ? "twitter-error" : undefined}
          className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 w-full max-w-[660px] h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            backdropFilter: "blur(40px)",
            border: errors.twitter ? "1px solid #ef4444" : "none",
          }}
        />
        {errors.twitter && (
          <p id="twitter-error" className="text-[10px] text-red-500 mt-1" role="alert">
            {errors.twitter.message}
          </p>
        )}
      </div>
    </div>
  );
}
