/**
 * Toast ids for async flows that toast from more than one layer (service
 * mutation + component). Passing the same id makes the later toast replace
 * the earlier one, so each action ends in exactly one toast.
 *
 * Kept out of hooks/useToastHandler so tests that mock the hook still get
 * the real ids.
 */
export const TOAST_IDS = {
  upload: "song-upload",
  mint: "song-mint",
  profileSave: "profile-save",
} as const;
