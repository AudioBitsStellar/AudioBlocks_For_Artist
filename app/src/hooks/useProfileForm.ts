/**
 * Hook for managing profile form data and mutations.
 * Centralizes profile loading and updating logic.
 */

import { useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileFormSchema } from "@/types/formValidation";
import { updateProfilePayload } from "@/types";
import useArtistServices, { mapBackendUserProfile } from "@/services/artistServices";
import { useToast } from "@/hooks/useToastHandler";
import { isRetryableError, getErrorMessage } from "@/utils/errorRecovery";
import { encodeHtmlEntities } from "@/utils/textEncoder";

interface UseProfileFormOptions {
  onProfileImageChange?: (url: string) => void;
}

export function useProfileForm(options?: UseProfileFormOptions) {
  const { useUpdateArtistProfile, useGetArtistProfile } = useArtistServices();
  const updateProfileMutation = useUpdateArtistProfile();
  const { isLoading: isProfileLoading, data: profileResponse } = useGetArtistProfile(true);
  const toast = useToast();

  const formMethods = useForm<updateProfilePayload>({
    resolver: zodResolver(profileFormSchema),
    mode: "onChange",
  });

  const { setValue } = formMethods;

  // Load profile data into form
  useEffect(() => {
    if (!profileResponse) return;
    const profile = mapBackendUserProfile(profileResponse);
    if (profile.username) setValue("username", profile.username);
    if (profile.bio) setValue("bio", profile.bio);
    if (profile.website) setValue("website", profile.website);
    if (profile.twitter) setValue("twitter", profile.twitter);
    if (profile.profileImage) options?.onProfileImageChange?.(profile.profileImage);
  }, [profileResponse, setValue, options]);

  const onSubmit = async (data: updateProfilePayload) => {
    const formData = new FormData();

    formData.append("username", data.username);
    formData.append("bio", encodeHtmlEntities(data.bio || ""));
    formData.append("website", data.website || "");
    formData.append("twitter", data.twitter || "");

    if (data.profileImage instanceof File) {
      formData.append("profileImage", data.profileImage);
    }

    updateProfileMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Profile saved successfully!");
      },
      onError: (err: unknown) => {
        const message = getErrorMessage(err);
        toast.error(
          isRetryableError(err)
            ? `Couldn't save your profile — check your connection and try again. (${message})`
            : message || "Couldn't save your profile."
        );
      },
    });
  };

  return {
    formMethods,
    isProfileLoading,
    isSubmitting: updateProfileMutation.isPending,
    onSubmit,
  };
}
