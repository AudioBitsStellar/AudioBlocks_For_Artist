import { USER_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePut } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { updateProfilePayload, AuthUser } from "@/types";

const useArtistServices = () => {
	const handleSuccess = useHandleSuccess();
	const handleError = useHandleError();

	const useGetArtistProfile = (enabled: boolean) => {
		return useGet<{ user: AuthUser }>(
			["get-artist-profile"],
			`${USER_ENDPOINTS.PROFILE}`,
			{
				enabled,
				staleTime: 0,
			},
		);
	};

	const useUpdateArtistProfile = () => {
		return usePut<updateProfilePayload>(USER_ENDPOINTS.UPDATE_PROFILE, {
			onSuccess(response: any) {
				handleSuccess(response.message || "Profile updated successfully!");
			},
			onError(error) {
				handleError(error.message || "Failed to update profile.");
			},
		});
	};

	return {
		useGetArtistProfile,
		useUpdateArtistProfile,
	};
};

export default useArtistServices;
