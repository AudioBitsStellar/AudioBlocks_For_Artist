import { SONG_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, useOptimisticMutation, usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { featureFlags } from "@/lib/featureFlags";
import type { TrackVisibility } from "@/services/trackVisibilityService";
import type { ReuploadSongDTO, SongVersion } from "@/types/api";

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
  lyrics?: string;
  language?: string;
  lyricsRightsConfirmed?: boolean;
  tags?: string[];
  aiDescriptionApproved?: boolean;
}

export interface TrackTagsPayload {
  id: number | string;
  tags: string[];
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
  lyrics?: string;
  language?: string;
  lyricsRightsConfirmed?: boolean;
  tags?: string[];
  aiDescriptionApproved?: boolean;
}

/** Simulated latency for the mock-data path so the optimistic state is observable. */
const MOCK_REQUEST_DELAY_MS = 400;

export function formatAiServiceError(error: unknown): string {
  const err = error as { status?: number; response?: { status?: number }; message?: string };
  const status = err?.status ?? err?.response?.status;
  const msg = (err?.message ?? "").toLowerCase();
  if (status === 429 || msg.includes("budget") || msg.includes("quota")) {
    return "AI budget limit reached. Please try again later or enter the text manually.";
  }
  if (status === 503 || msg.includes("kill") || msg.includes("disabled")) {
    return "AI features are temporarily unavailable (kill switch active).";
  }
  return err?.message || "Failed to generate AI draft.";
}

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
          ...(edit.lyrics !== undefined ? { lyrics: edit.lyrics } : {}),
          ...(edit.language !== undefined ? { language: edit.language } : {}),
          ...(edit.lyricsRightsConfirmed !== undefined
            ? { lyricsRightsConfirmed: edit.lyricsRightsConfirmed }
            : {}),
          ...(edit.tags !== undefined ? { tags: edit.tags } : {}),
          ...(edit.aiDescriptionApproved !== undefined
            ? { aiDescriptionApproved: edit.aiDescriptionApproved }
            : {}),
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

interface UseUpdateTrackTagsOptions {
  onOptimistic: (payload: TrackTagsPayload) => (() => void) | void;
}

const useTrackServices = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

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

  const useUpdateTrackTags = ({ onOptimistic }: UseUpdateTrackTagsOptions) =>
    useOptimisticMutation<TrackEditResponse, TrackTagsPayload>({
      method: "put",
      endpoint: (payload) => SONG_ENDPOINTS.TAGS(payload.id),
      request: featureFlags.useMockTracks
        ? () =>
            new Promise<TrackEditResponse>((resolve) =>
              setTimeout(() => resolve({}), MOCK_REQUEST_DELAY_MS)
            )
        : undefined,
      onOptimistic,
      onSuccess: (response) => handleSuccess(response?.message || "Tags updated!"),
      onError: (error) =>
        handleError(
          `Couldn't save your tag changes, so they were reverted.${error.message ? ` (${error.message})` : ""}`
        ),
    });

  const useDraftTrackDescription = (trackId: string | number) =>
    usePost<{ data?: { description?: string }; description?: string }>(
      SONG_ENDPOINTS.DRAFT_DESCRIPTION(trackId)
    );

  const useTranscribeTrackLyrics = (trackId: string | number) =>
    usePost<{ data?: { lyrics?: string; language?: string }; lyrics?: string }>(
      SONG_ENDPOINTS.TRANSCRIBE_LYRICS(trackId)
    );

  const useGetTrackVersions = (trackId: string | number, enabled = true) =>
    useGet<{ data?: SongVersion[]; versions?: SongVersion[] }>(
      ["song-versions", String(trackId)],
      SONG_ENDPOINTS.VERSIONS(trackId),
      { enabled: enabled && !featureFlags.useMockTracks }
    );

  const useReuploadTrack = (trackId: string | number) =>
    usePost<{ data?: SongVersion; message?: string }, ReuploadSongDTO>(
      SONG_ENDPOINTS.REUPLOAD(trackId),
      {
        onSuccess: (res) => handleSuccess(res?.message || "New track version uploaded!"),
        onError: (err) => handleError(err.message || "Failed to upload new track version."),
        invalidateQueries: [["song-versions", String(trackId)]],
      }
    );

  return {
    useUpdateTrack,
    useUpdateTrackTags,
    useDraftTrackDescription,
    useTranscribeTrackLyrics,
    useGetTrackVersions,
    useReuploadTrack,
  };
};

export default useTrackServices;
