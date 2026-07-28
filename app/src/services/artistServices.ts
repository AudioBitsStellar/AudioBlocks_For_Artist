import { USER_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePut } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { updateProfilePayload, AuthUser } from "@/types";

const useArtistServices = () => {
	const handleSuccess = useHandleSuccess();
	const handleError = useHandleError();

	/**
	 * Fetches the signed-in artist's profile. Not cached (`staleTime: 0`) — the
	 * profile is refetched on every mount since it may change from other tabs/devices.
	 *
	 * @param enabled - Whether the query should run.
	 * @returns A React Query result: `{ data: { user: AuthUser } | undefined, isLoading, isError, error, refetch, ... }`.
	 * @throws Never throws directly — request failures surface via the returned `error`/`isError` fields.
	 */
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

	/**
	 * Updates the signed-in artist's profile. Shows a success/error toast automatically.
	 *
	 * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with an `updateProfilePayload`.
	 * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
	 */
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
