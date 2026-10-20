"use client";

import { useState, useEffect } from "react";
import { FormProvider } from "react-hook-form";
import { updateProfilePayload } from "@/types";
import MusicLoader from "@/components/MusicLoader";
import VerificationApplicationModal from "@/components/common/modals/VerificationApplicationModal";
import {
  getVerificationStatus,
  approveVerification,
  type VerificationStatus,
} from "@/services/verificationService";
import { analytics } from "@/lib/analytics";
import { useProfileForm } from "@/hooks/useProfileForm";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileMediaEditor from "@/components/profile/ProfileMediaEditor";
import ProfileBioForm from "@/components/profile/ProfileBioForm";
import VerificationStatusCard from "@/components/profile/VerificationStatusCard";
import ProfileSettingsTab from "@/components/profile/ProfileSettingsTab";
import OnChainProfileTab from "@/components/profile/OnChainProfileTab";

function ProfileFormSkeleton() {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-16 mt-6"
      aria-hidden="true"
      data-testid="profile-skeleton"
    >
      <div className="space-y-5">
        {[48, 120, 48, 48].map((height, i) => (
          <div key={i} className="flex flex-col mt-7">
            <div className="h-4 w-32 rounded bg-[#2A2A2A] animate-pulse mb-2" />
            <div
              className="rounded-2xl bg-[#FFFFFF0A] animate-pulse w-full max-w-[660px]"
              style={{ height: `${height}px` }}
            />
          </div>
        ))}
        <div className="h-11 w-[131px] rounded-lg bg-[#2A2A2A] animate-pulse mt-6" />
      </div>
      <div className="border border-[#2A2A2A] mt-12 bg-[#161616] p-6 flex flex-col w-full max-w-[244px] h-[321px] rounded-2xl">
        <div className="w-full aspect-square rounded-lg bg-[#2A2A2A] animate-pulse mb-4" />
        <div className="h-4 w-20 rounded bg-[#2A2A2A] animate-pulse mb-2" />
        <div className="h-3 w-full rounded bg-[#2A2A2A] animate-pulse mb-4 flex-1" />
        <div className="h-9 w-full rounded-lg bg-[#2A2A2A] animate-pulse" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "onchain">("profile");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("unverified");
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    commentsOnSongs: false,
    salesAndRoyalties: true,
    platformAlerts: true,
  });

  const { formMethods, isProfileLoading, isSubmitting, onSubmit } = useProfileForm({
    onProfileImageChange: setProfileImage,
  });

  const { handleSubmit, formState: { isValid } } = formMethods;

  useEffect(() => {
    setVerificationStatus(getVerificationStatus());
  }, []);

  const handleSimulateApproval = () => {
    setVerificationStatus(approveVerification());
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCropStart = (src: string) => {
    setCropSrc(src);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
  };

  const handleImageChange = (url: string) => {
    setProfileImage(url);
  };

  return (
    <FormProvider {...formMethods}>
      <ProfileHeader />

      {/* Verification Status */}
      <VerificationStatusCard
        status={verificationStatus}
        onApplyClick={() => setIsVerificationModalOpen(true)}
        onSimulateApprovalClick={handleSimulateApproval}
      />

      <VerificationApplicationModal
        open={isVerificationModalOpen}
        onOpenChange={setIsVerificationModalOpen}
        onSubmitted={() => setVerificationStatus("pending")}
      />

      {/* Tabs */}
      <div
        className="flex items-center gap-2 overflow-x-auto border-b border-[#2A2A2A]"
        role="tablist"
      >
        <button
          onClick={() => setActiveTab("profile")}
          role="tab"
          aria-selected={activeTab === "profile"}
          aria-controls="profile-panel"
          className={`whitespace-nowrap px-4 py-3 font-semibold transition-colors rounded-t-lg sm:px-6 ${
            activeTab === "profile"
              ? "bg-[#D2045B] text-white"
              : "bg-transparent text-gray-400 hover:text-white"
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          role="tab"
          aria-selected={activeTab === "settings"}
          aria-controls="settings-panel"
          className={`whitespace-nowrap px-4 py-3 font-semibold transition-colors rounded-t-lg sm:px-6 ${
            activeTab === "settings"
              ? "bg-[#D2045B] text-white"
              : "bg-transparent text-gray-400 hover:text-white"
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab("onchain")}
          role="tab"
          aria-selected={activeTab === "onchain"}
          aria-controls="onchain-panel"
          className={`whitespace-nowrap px-4 py-3 font-semibold transition-colors rounded-t-lg sm:px-6 ${
            activeTab === "onchain"
              ? "bg-[#D2045B] text-white"
              : "bg-transparent text-gray-400 hover:text-white"
          }`}
        >
          On-chain
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && isProfileLoading && <ProfileFormSkeleton />}
      {activeTab === "profile" && !isProfileLoading && (
        <div
          id="profile-panel"
          role="tabpanel"
          className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-16 mt-6"
        >
          {/* Left Column - Form Fields */}
          <div>
            <ProfileBioForm />
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || !isValid}
              className={`${
                isSubmitting || !isValid ? "opacity-70 cursor-not-allowed" : ""
              } w-[131px] rounded-lg cursor-pointer bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-3 transition-colors mt-6`}
            >
              {isSubmitting ? <MusicLoader small /> : "Save"}
            </button>
          </div>

          {/* Right Column - Profile Image */}
          <ProfileMediaEditor
            profileImage={profileImage}
            onImageChange={handleImageChange}
            onCropStart={handleCropStart}
            onCropCancel={handleCropCancel}
            cropSrc={cropSrc}
          />
        </div>
      )}

      {activeTab === "settings" && (
        <ProfileSettingsTab
          notifications={notifications}
          onNotificationChange={handleNotificationChange}
        />
      )}

      {activeTab === "onchain" && <OnChainProfileTab />}
    </FormProvider>
  );
}
