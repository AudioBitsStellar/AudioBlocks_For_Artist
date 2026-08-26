import { useEffect, useRef } from "react";
import { USER_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePut } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { extractApiError, ApiError } from "@/api/axios";
import { updateProfilePayload, AuthUser } from "@/types";

/**
 * Normalizes an unknown error into the `ApiError` shape we standardize on.
 *
 * Why this exists: the axios response interceptor (see `@/api/axios`) already
 * runs `extractApiError` once and rejects with a plain `{status, message, code}`
 * object. That object is **not** an `Error` instance, so passing it back
 * through `extractApiError` a second time falls through to the
 * `return { status: 0, message: "Unknown error" }` fallback and silently
 * strips the HTTP status (which `useHandleError` needs in order to map
 * 400/401/403/404/422/500 to user-friendly copy).
 *
 * This wrapper is idempotent: if the value already has the `{status: number,
 * message: string}` shape produced by the interceptor, it is passed through
 * unchanged; otherwise it is funneled through `extractApiError` as usual.
 *
 * TODO(issue #104 follow-up): the same double-normalization bug affects
 * every service that consumes the axios response interceptor. Move this
 * helper (or its equivalent idempotency guard) into `app/src/api/axios.ts`
 * so all services benefit from a single source of truth.
 */
function normalizeError(error: unknown): ApiError {
  if (
    error !== null &&
    typeof error === "object" &&
    // Only treat plain object literals as already-normalized Axios-interceptor
    // rejections. This narrows the over-broad `in` checks so things like
    // arrays, `Error` subclasses, or class instances are still routed through
    // `extractApiError` (which knows how to unwrap them properly).
    Object.getPrototypeOf(error) === Object.prototype &&
    "status" in error &&
    typeof (error as Record<string, unknown>).status === "number" &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  ) {
    return error as ApiError;
  }
  return extractApiError(error);
}

const useArtistServices = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  /**
   * Fetches the signed-in artist's profile. Not cached (`staleTime: 0`) — the
   * profile is refetched on every mount since it may change from other tabs/devices.
   *
   * Errors from the GET are normalized to the `ApiError` shape produced by
   * `normalizeError` (issue #104) and surfaced through `useHandleError`,
   * which maps HTTP status codes to user-friendly messages. To avoid spamming
   * toasts on every background refetch (e.g. on window focus), the error
   * toast fires at most once per failed response value.
   *
   * @param enabled - Whether the query should run.
   * @returns A React Query result: `{ data: { user: AuthUser } | undefined, isLoading, isError, error, refetch, ... }`.
   * @throws Never throws directly — failures surface via the returned `error`/`isError` fields and a single toast per failure.
   */
  const useGetArtistProfile = (enabled: boolean) => {
    const query = useGet<{ user: AuthUser }>(["get-artist-profile"], `${USER_ENDPOINTS.PROFILE}`, {
      enabled,
      staleTime: 0,
    });

    // Track the last error fingerprint we already toasted so React Query
    // background refetches (window focus / mount) for the same failure
    // don't re-fire the same toast. A genuine new failure has a different
    // `.status`/`.message` and passes this guard.
    const lastErrorRef = useRef<string | null>(null);

    useEffect(() => {
      // Only clear the dedup fingerprint when the error genuinely
      // resolves (a successful recovery or a fresh refetch resets the
      // error back to a successful or pending state). We deliberately
      // do NOT clear on `!query.isError` alone while `query.error` is
      // still set: that would cause the same toast to re-fire on every
      // query transition.
      if (!query.error) {
        lastErrorRef.current = null;
      }
      if (!query.isError) return;

      let apiError: ApiError;
      try {
        apiError = normalizeError(query.error);
      } catch {
        // Last-resort fallback so a broken normalizer never produces
        // an unhandled error in artist-related flows.
        apiError = {
          status: 0,
          message: "An unexpected error occurred while loading your profile.",
        };
      }

      const fingerprint = `${apiError.status}:${apiError.message}`;
      if (lastErrorRef.current === fingerprint) return;
      lastErrorRef.current = fingerprint;

      handleError(apiError);
    }, [query.isError, query.error, handleError]);

    return query;
  };

  /**
   * Updates the signed-in artist's profile. Shows a success/error toast
   * automatically. Failure errors are normalized through `normalizeError`
   * so the status-aware switch inside `useHandleError` works (issue #104).
   *
   * Note: unlike `useGetArtistProfile`, this mutation intentionally does NOT
   * dedupe the error toast. Each `.mutate()`/`mutateAsync()` call is a
   * deliberate, user-initiated retry, so a fresh toast on each failure gives
   * the user immediate feedback for their most recent attempt.
   *
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with an `updateProfilePayload`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useUpdateArtistProfile = () => {
    return usePut<updateProfilePayload>(USER_ENDPOINTS.UPDATE_PROFILE, {
      onSuccess(response: { message?: string }) {
        handleSuccess(response?.message || "Profile updated successfully!");
      },
      onError(error: unknown) {
        let apiError: ApiError;
        try {
          apiError = normalizeError(error);
        } catch {
          apiError = {
            status: 0,
            message: "An unexpected error occurred while updating your profile.",
          };
        }
        handleError(apiError);
      },
    });
  };

  return {
    useGetArtistProfile,
    useUpdateArtistProfile,
  };
};

export default useArtistServices;
