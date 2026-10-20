import { useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useFormContext } from "react-hook-form";
import { updateProfilePayload } from "@/types";
import { useToast } from "@/hooks/useToastHandler";
import { PROFILE_IMAGE_RULES, toAcceptAttribute, validateFile } from "@/utils/fileValidation";

const ImageCropper = dynamic(() => import("@/components/ImageCropper"));

interface ProfileMediaEditorProps {
  profileImage: string | null;
  onImageChange: (url: string) => void;
  onCropStart: (src: string) => void;
  onCropCancel: () => void;
  cropSrc: string | null;
}

/**
 * Avatar and banner upload editor for the profile section.
 * Uses ImageCropper for image cropping before upload.
 */
export default function ProfileMediaEditor({
  profileImage,
  onImageChange,
  onCropStart,
  onCropCancel,
  cropSrc,
}: ProfileMediaEditorProps) {
  const { register, setValue } = useFormContext<updateProfilePayload>();
  const profileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { valid, error } = validateFile(file, PROFILE_IMAGE_RULES);
    if (!valid) {
      toast.error(error ?? "Invalid profile image");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onCropStart(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be reselected after cancel
    e.target.value = "";
  };

  const handleCropComplete = (blob: Blob) => {
    const croppedFile = new File([blob], "profile-avatar.jpg", { type: "image/jpeg" });
    // Cropping re-encodes the image, so re-check the size the backend will actually receive.
    const { valid, error } = validateFile(croppedFile, PROFILE_IMAGE_RULES);
    if (!valid) {
      toast.error(error ?? "Invalid profile image");
      onCropCancel();
      return;
    }
    setValue("profileImage", croppedFile);
    onImageChange(URL.createObjectURL(blob));
    onCropCancel();
  };

  return (
    <>
      <div className="border border-[#2A2A2A] mt-12 bg-[#161616] p-6 flex flex-col w-full max-w-[244px] h-[321px] rounded-2xl">
        {profileImage ? (
          <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
            <Image
              src={profileImage}
              alt="Artist profile image"
              fill
              sizes="(max-width: 640px) 80px, (max-width: 1024px) 160px, 160px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-full aspect-square rounded-lg bg-linear-to-br from-gray-600 to-gray-800 mb-4 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-24 h-24 text-gray-400"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>
        )}

        <h3 className="text-white font-semibold mb-2 text-sm">Profile</h3>
        <p className="text-xs text-[#A3A3A3] mb-4 flex-1">
          Make your artist profile stand out with a striking cover image
        </p>

        <input
          type="file"
          accept={toAcceptAttribute(PROFILE_IMAGE_RULES)}
          className="hidden"
          {...register("profileImage")}
          ref={profileInputRef}
          onChange={handleProfileImageUpload}
          aria-label="Upload profile image"
        />

        <button
          onClick={() => profileInputRef.current?.click()}
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] text-white px-4 py-2 hover:bg-[#1a1a1a] transition-colors text-sm"
        >
          Add Cover
        </button>
      </div>

      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          aspect={1}
          onCropComplete={handleCropComplete}
          onCancel={onCropCancel}
        />
      )}
    </>
  );
}
