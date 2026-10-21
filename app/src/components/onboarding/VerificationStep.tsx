"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { toast } from "sonner";
import { ArtistVerification } from "@/types/onboarding";
import MusicLoader from "@/components/MusicLoader";

interface VerificationStepProps {
  onComplete: () => void;
  onBack: () => void;
}

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Nigeria",
  "South Africa",
  "Ghana",
  "Kenya",
  "Brazil",
  "Mexico",
  "Other",
];

const ID_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "national_id", label: "National ID" },
];

/**
 * One-time cleanup of legacy KYC data from localStorage.
 * This runs on mount to purge any previously stored sensitive data.
 */
function cleanupLegacyKYCData() {
  if (typeof window === "undefined") return;
  
  try {
    const keysToRemove = ["onboarding_verification"];
    keysToRemove.forEach((key) => {
      if (window.localStorage.getItem(key)) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    // Storage access error - silent fail
  }
}

export default function VerificationStep({ onComplete, onBack }: VerificationStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ArtistVerification>({
    mode: "onChange",
  });

  // Cleanup legacy KYC data on mount
  useEffect(() => {
    cleanupLegacyKYCData();
  }, []);

  const onSubmit = async (data: ArtistVerification) => {
    try {
      // TODO: Backend endpoint not yet available (#628)
      // Instead of storing in localStorage, we direct artists to complete verification
      // in Settings → Verification after onboarding is complete.
      // For now, we simply skip this step.
      
      toast.info("Verification can be completed later from Settings → Verification");
      onComplete();
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Verification & KYC</h2>
        <p className="text-[#A3A3A3]">
          For now, you can complete verification later from your profile settings.
        </p>
      </div>

      <div
        className="p-4 rounded-lg"
        style={{ background: "#FFFFFF0A", border: "1px solid #2A2A2A" }}
        role="alert"
      >
        <p className="text-white text-sm mb-2">
          <strong>Complete Verification Later</strong>
        </p>
        <p className="text-[#A3A3A3] text-xs">
          Identity verification can be completed from Settings → Verification after you finish
          onboarding. This step is not required to continue.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-[#2A2A2A] text-white font-semibold px-6 py-3 hover:bg-[#FFFFFF0A] transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${
            isSubmitting
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:bg-[#B8043F]"
          } flex-1 rounded-lg bg-[#D2045B] text-white font-semibold px-6 py-3 transition-colors`}
        >
          {isSubmitting ? <MusicLoader small /> : "Skip for Now"}
        </button>
      </div>
    </form>
  );
}
