import { SONG_ENDPOINTS } from "@/api/api-endpoint";
import { useOptimisticMutation } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { featureFlags } from "@/lib/featureFlags";
import type { TrackVisibility } from "@/services/trackVisibilityService";

/** The editable fields of a track, plus the id of the track being edited. */
export interface TrackEditPayload {
  id: number | string;
  title: string;
  albumName: string;
  /** Omitted leaves the track's current visibility alone. */
  visibility?: TrackVisibility;
  /** #396 — omitted leaves the current genre alone; "" clears it. */
  genre?: string;
  /** #396 — omitted leaves the current description alone; "" clears it. */
  description?: string;
}

export interface TrackEditResponse {
  message?: string;
}

interface EditableTrack {
  id: number | string;
  title: string;
  albumName: string;
  visibility?: TrackVisibility;
  genre?: string;
  description?: string;
}

/** Simulated latency for the mock-data path so the optimistic state is observable. */
const MOCK_REQUEST_DELAY_MS = 400;

/**
 * Returns `tracks` with the edited track's `title`, `albumName` and (when the
 * edit carries them) `visibility`, `genre` and `description` replaced. Every other track, and every other
 * field of this one, is left untouched, and the input array is not mutated.
 */
export function applyTrackEdit<T extends EditableTrack>(tracks: T[], edit: TrackEditPayload): T[] {
  return tracks.map((track) =>
    track.id === edit.id
      ? {
          ...track,
          title: edit.title,
          albumName: edit.albumName,
          ...(edit.visibility ? { visibility: edit.visibility } : {}),
          ...(edit.genre !== undefined ? { genre: edit.genre } : {}),
          ...(edit.description !== undefined ? { description: edit.description } : {}),
        }
      : track
  );
}

interface UseUpdateTrackOptions {
  /**
   * Applies the edit to UI state the caller owns *before* the server responds.
   * Return a function that restores the previous state — it runs if the save fails.
   */
  onOptimistic: (edit: TrackEditPayload) => (() => void) | void;
}

const useTrackServices = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  /**
   * Saves edits to a track's title and album with an optimistic UI update.
   *
   * The change appears immediately via `onOptimistic`; if the request fails
   * the change is rolled back and an error toast explains that nothing was
   * saved. With mock data enabled (`NEXT_PUBLIC_USE_MOCK_DATA=true`) the request
   * is simulated locally instead of calling the API.
   *
   * @param options - `onOptimistic` applies the edit to the caller's state and returns its undo function.
   * @returns A React Query mutation: call `.mutate(edit)` or `.mutateAsync(edit)` with a `TrackEditPayload`.
   * @throws Never throws directly — failures surface via the rolled-back UI, the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useUpdateTrack = ({ onOptimistic }: UseUpdateTrackOptions) =>
    useOptimisticMutation<TrackEditResponse, TrackEditPayload>({
      method: "patch",
      endpoint: (edit) => SONG_ENDPOINTS.UPDATE(edit.id),
      request: featureFlags.useMockTracks
        ? () =>
            new Promise<TrackEditResponse>((resolve) =>
              setTimeout(() => resolve({}), MOCK_REQUEST_DELAY_MS)
            )
        : undefined,
      onOptimistic,
      onSuccess: (response) => handleSuccess(response?.message || "Track updated!"),
      onError: (error) =>
        handleError(
          `Couldn't save your changes, so they were reverted.${error.message ? ` (${error.message})` : ""}`
        ),
    });

  return { useUpdateTrack };
};

export default useTrackServices;
