"use client";

import { useForm } from "react-hook-form";
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

export default function VerificationStep({ onComplete, onBack }: VerificationStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ArtistVerification>({
    mode: "onChange",
  });

  const onSubmit = async (data: ArtistVerification) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      localStorage.setItem("onboarding_verification", JSON.stringify(data));
      toast.success("Verification information saved!");
      onComplete();
    } catch (error) {
      toast.error("Failed to save verification. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Verification & KYC</h2>
        <p className="text-[#A3A3A3]">We need to verify your identity to comply with regulations</p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="legalName" className="text-sm font-medium text-white mb-2">
          Legal Name <span className="text-red-500">*</span>
        </label>
        <input
          id="legalName"
          {...register("legalName", {
            required: "Legal name is required",
            minLength: { value: 2, message: "Legal name must be at least 2 characters" },
          })}
          placeholder="Your full legal name"
          maxLength={100}
          aria-invalid={errors.legalName ? "true" : "false"}
          aria-describedby={errors.legalName ? "legalName-error" : undefined}
          className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            border: errors.legalName ? "1px solid #EF4444" : "none",
          }}
        />
        {errors.legalName && (
          <span id="legalName-error" role="alert" className="text-xs text-red-500 mt-1">
            {errors.legalName.message}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <label htmlFor="dateOfBirth" className="text-sm font-medium text-white mb-2">
          Date of Birth <span className="text-red-500">*</span>
        </label>
        <input
          id="dateOfBirth"
          type="date"
          {...register("dateOfBirth", {
            required: "Date of birth is required",
            validate: (value) => {
              const birthDate = new Date(value);
              const today = new Date();
              const age = today.getFullYear() - birthDate.getFullYear();
              return age >= 18 || "You must be at least 18 years old";
            },
          })}
          max={new Date().toISOString().split("T")[0]}
          aria-invalid={errors.dateOfBirth ? "true" : "false"}
          aria-describedby={errors.dateOfBirth ? "dateOfBirth-error" : undefined}
          className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            border: errors.dateOfBirth ? "1px solid #EF4444" : "none",
          }}
        />
        {errors.dateOfBirth && (
          <span id="dateOfBirth-error" role="alert" className="text-xs text-red-500 mt-1">
            {errors.dateOfBirth.message}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <label htmlFor="country" className="text-sm font-medium text-white mb-2">
          Country <span className="text-red-500">*</span>
        </label>
        <select
          id="country"
          {...register("country", { required: "Country is required" })}
          aria-invalid={errors.country ? "true" : "false"}
          aria-describedby={errors.country ? "country-error" : undefined}
          className="text-white focus:outline-none px-4 h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            border: errors.country ? "1px solid #EF4444" : "none",
          }}
        >
          <option value="">Select your country</option>
          {COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
        {errors.country && (
          <span id="country-error" role="alert" className="text-xs text-red-500 mt-1">
            {errors.country.message}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <label htmlFor="idType" className="text-sm font-medium text-white mb-2">
          ID Type <span className="text-red-500">*</span>
        </label>
        <select
          id="idType"
          {...register("idType", { required: "ID type is required" })}
          aria-invalid={errors.idType ? "true" : "false"}
          aria-describedby={errors.idType ? "idType-error" : undefined}
          className="text-white focus:outline-none px-4 h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            border: errors.idType ? "1px solid #EF4444" : "none",
          }}
        >
          <option value="">Select ID type</option>
          {ID_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.idType && (
          <span id="idType-error" role="alert" className="text-xs text-red-500 mt-1">
            {errors.idType.message}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <label htmlFor="idNumber" className="text-sm font-medium text-white mb-2">
          ID Number <span className="text-red-500">*</span>
        </label>
        <input
          id="idNumber"
          {...register("idNumber", {
            required: "ID number is required",
            minLength: { value: 5, message: "ID number must be at least 5 characters" },
          })}
          placeholder="Enter your ID number"
          maxLength={50}
          aria-invalid={errors.idNumber ? "true" : "false"}
          aria-describedby={errors.idNumber ? "idNumber-error" : undefined}
          className="text-white placeholder:text-[#6F6F6F] focus:outline-none px-4 h-12 rounded-2xl"
          style={{
            background: "#FFFFFF0A",
            border: errors.idNumber ? "1px solid #EF4444" : "none",
          }}
        />
        {errors.idNumber && (
          <span id="idNumber-error" role="alert" className="text-xs text-red-500 mt-1">
            {errors.idNumber.message}
          </span>
        )}
      </div>

      <div
        className="p-4 rounded-lg"
        style={{ background: "#FFFFFF0A", border: "1px solid #2A2A2A" }}
      >
        <p className="text-white text-sm mb-2">
          <strong>Document Upload (Optional)</strong>
        </p>
        <p className="text-[#A3A3A3] text-xs mb-4">
          You can upload your ID document and proof of address now, or do it later from your profile
          settings
        </p>

        <div className="space-y-3">
          <div>
            <label htmlFor="idDocument" className="text-sm text-white mb-1 block">
              ID Document
            </label>
            <input
              id="idDocument"
              type="file"
              accept="image/*,.pdf"
              {...register("idDocument")}
              className="text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#D2045B] file:text-white file:cursor-pointer hover:file:bg-[#B8043F]"
            />
          </div>

          <div>
            <label htmlFor="proofOfAddress" className="text-sm text-white mb-1 block">
              Proof of Address
            </label>
            <input
              id="proofOfAddress"
              type="file"
              accept="image/*,.pdf"
              {...register("proofOfAddress")}
              className="text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#D2045B] file:text-white file:cursor-pointer hover:file:bg-[#B8043F]"
            />
          </div>
        </div>
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
          disabled={!isValid || isSubmitting}
          className={`${
            !isValid || isSubmitting
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:bg-[#B8043F]"
          } flex-1 rounded-lg bg-[#D2045B] text-white font-semibold px-6 py-3 transition-colors`}
        >
          {isSubmitting ? <MusicLoader small /> : "Continue"}
        </button>
      </div>
    </form>
  );
}
