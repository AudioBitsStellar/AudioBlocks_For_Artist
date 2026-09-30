"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/shared/Modal";
import { trackEditSchema } from "@/types/formValidation";
import {
  describeVisibility,
  TRACK_VISIBILITY_OPTIONS,
  type TrackVisibility,
} from "@/services/trackVisibilityService";
import { MUSIC_GENRES } from "@/components/shared/music_genre";

/** Max description length, matching the upload form (#396). */
const DESCRIPTION_MAX = 500;
/** Max title length, matching trackEditSchema. */
const TITLE_MAX = 100;

export interface EditableTrackFields {
  title: string;
  albumName: string;
  visibility: TrackVisibility;
  /** "" when not set. */
  genre: string;
  /** "" when not set. */
  description: string;
}

interface EditTrackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The track being edited; the form is re-initialised when the modal opens or the track's id changes. */
  track: {
    id: number | string;
    title: string;
    albumName: string;
    /** Effective visibility, already resolved by the caller. */
    visibility: TrackVisibility;
    genre?: string;
    description?: string;
  } | null;
  /** Album names offered in the album picker. */
  albumOptions: string[];
  /** Called with the validated values. The modal closes right after, so callers should apply the edit optimistically. */
  onSave: (values: EditableTrackFields) => void;
}

export default function EditTrackModal({
  open,
  onOpenChange,
  track,
  albumOptions,
  onSave,
}: EditTrackModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditableTrackFields>({
    resolver: zodResolver(trackEditSchema),
    mode: "onChange",
    defaultValues: {
      title: track?.title ?? "",
      albumName: track?.albumName ?? "",
      visibility: track?.visibility ?? "private",
      genre: track?.genre ?? "",
      description: track?.description ?? "",
    },
  });

  // Re-initialise only on open / a different track — not on every change to `track`
  // (e.g. an optimistic update or rollback landing while the user is typing).
  const trackRef = useRef(track);
  trackRef.current = track;
  const trackId = track?.id;
  useEffect(() => {
    const current = trackRef.current;
    if (open && current) {
      reset({
        title: current.title,
        albumName: current.albumName,
        visibility: current.visibility,
        genre: current.genre ?? "",
        description: current.description ?? "",
      });
    }
  }, [open, trackId, reset]);

  // #396 — unsaved-changes guard. Every way of closing (Cancel, the X,
  // Escape, clicking outside) goes through requestClose; a dirty form asks
  // before discarding instead of silently throwing the edits away.
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useEffect(() => {
    if (!open) setConfirmDiscard(false);
  }, [open]);

  const requestClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  const discardAndClose = () => {
    setConfirmDiscard(false);
    reset();
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) onOpenChange(true);
    else requestClose();
  };

  const selectedVisibility = watch("visibility");
  const titleLength = (watch("title") ?? "").length;
  const descriptionLength = (watch("description") ?? "").length;

  // Keep the track's current album selectable even if it isn't in the list.
  const albums =
    track && !albumOptions.includes(track.albumName)
      ? [track.albumName, ...albumOptions]
      : albumOptions;

  const submit = (values: EditableTrackFields) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Edit track"
      subtitle="My Music"
      size="md"
      closeAriaLabel="Close edit track dialog"
    >
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="edit-track-title" className="text-sm font-medium text-white">
              Track title <span className="text-[#D2045B]">*</span>
            </label>
            <span className="text-xs text-gray-400">
              {titleLength}/{TITLE_MAX}
            </span>
          </div>
          <input
            id="edit-track-title"
            {...register("title")}
            maxLength={TITLE_MAX}
            aria-invalid={errors.title ? "true" : "false"}
            aria-describedby={errors.title ? "edit-track-title-error" : undefined}
            className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${errors.title ? "border-red-500" : "border-[#2A2A2A]"}`}
          />
          {errors.title && (
            <p id="edit-track-title-error" role="alert" className="text-xs text-red-500">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-track-album" className="text-sm font-medium text-white">
            Album <span className="text-[#D2045B]">*</span>
          </label>
          <select
            id="edit-track-album"
            {...register("albumName")}
            aria-invalid={errors.albumName ? "true" : "false"}
            aria-describedby={errors.albumName ? "edit-track-album-error" : undefined}
            className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white focus:border-[#885FA8] focus:outline-none ${errors.albumName ? "border-red-500" : "border-[#2A2A2A]"}`}
          >
            {albums.map((album) => (
              <option key={album} value={album}>
                {album}
              </option>
            ))}
          </select>
          {errors.albumName && (
            <p id="edit-track-album-error" role="alert" className="text-xs text-red-500">
              {errors.albumName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-track-visibility" className="text-sm font-medium text-white">
            Visibility <span className="text-[#D2045B]">*</span>
          </label>
          <select
            id="edit-track-visibility"
            {...register("visibility")}
            aria-invalid={errors.visibility ? "true" : "false"}
            aria-describedby="edit-track-visibility-hint"
            className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white focus:border-[#885FA8] focus:outline-none ${errors.visibility ? "border-red-500" : "border-[#2A2A2A]"}`}
          >
            {TRACK_VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p id="edit-track-visibility-hint" className="text-xs text-gray-400">
            {describeVisibility(selectedVisibility)}
          </p>
          {errors.visibility && (
            <p id="edit-track-visibility-error" role="alert" className="text-xs text-red-500">
              {errors.visibility.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-track-genre" className="text-sm font-medium text-white">
            Genre
          </label>
          <select
            id="edit-track-genre"
            {...register("genre")}
            aria-invalid={errors.genre ? "true" : "false"}
            aria-describedby={errors.genre ? "edit-track-genre-error" : undefined}
            className={`w-full rounded-lg border bg-[#161616] px-4 py-3 text-white focus:border-[#885FA8] focus:outline-none ${errors.genre ? "border-red-500" : "border-[#2A2A2A]"}`}
          >
            <option value="">Not set</option>
            {MUSIC_GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
          {errors.genre && (
            <p id="edit-track-genre-error" role="alert" className="text-xs text-red-500">
              {errors.genre.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="edit-track-description" className="text-sm font-medium text-white">
              Description
            </label>
            <span
              className={`text-xs ${descriptionLength > DESCRIPTION_MAX ? "text-red-500" : "text-gray-400"}`}
              aria-live="polite"
            >
              {descriptionLength}/{DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            id="edit-track-description"
            rows={3}
            {...register("description")}
            aria-invalid={errors.description ? "true" : "false"}
            aria-describedby={errors.description ? "edit-track-description-error" : undefined}
            placeholder="Tell listeners about this track"
            className={`w-full resize-none rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${errors.description ? "border-red-500" : "border-[#2A2A2A]"}`}
          />
          {errors.description && (
            <p id="edit-track-description-error" role="alert" className="text-xs text-red-500">
              {errors.description.message}
            </p>
          )}
        </div>

        {confirmDiscard && (
          <div
            role="alert"
            className="rounded-lg border border-[#D2045B]/40 bg-[#D2045B]/10 p-4 text-sm text-white"
          >
            <p className="font-semibold">Discard unsaved changes?</p>
            <p className="mt-1 text-xs text-gray-300">
              Your edits to this track haven&apos;t been saved and will be lost.
            </p>
            <div className="mt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="rounded-full px-4 py-1.5 text-xs font-semibold text-[#A3A3A3] transition hover:text-white"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={discardAndClose}
                className="rounded-full bg-[#D2045B] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#B8043F]"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={requestClose}
            className="rounded-full border border-transparent px-6 py-2 text-sm font-semibold text-[#A3A3A3] transition hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isDirty}
            className="rounded-full bg-[#D2045B] px-8 py-2 text-sm font-semibold text-white transition hover:bg-[#B8043F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

export { EditTrackModal };
