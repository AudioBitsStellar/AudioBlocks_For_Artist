"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import Modal from "@/components/shared/Modal";
import CharacterCount from "@/components/common/CharacterCount";
import {
  LYRICS_MAX_LENGTH,
  normalizeSongTag,
  SONG_LANGUAGES,
  TAG_MAX_COUNT,
  TAG_MAX_LENGTH,
  TRACK_DESCRIPTION_MAX_LENGTH,
  TRACK_TITLE_MAX_LENGTH,
  trackEditSchema,
} from "@/types/formValidation";
import {
  describeVisibility,
  TRACK_VISIBILITY_OPTIONS,
  type TrackVisibility,
} from "@/services/trackVisibilityService";
import useTrackServices, { formatAiServiceError } from "@/services/trackService";
import { MUSIC_GENRES } from "@/components/shared/music_genre";

/** Max description length, matching the upload form (#396). */
const DESCRIPTION_MAX = TRACK_DESCRIPTION_MAX_LENGTH;
/** Max title length, matching trackEditSchema. */
const TITLE_MAX = TRACK_TITLE_MAX_LENGTH;

export interface EditableTrackFields {
  title: string;
  albumName: string;
  visibility: TrackVisibility;
  /** "" when not set. */
  genre: string;
  /** "" when not set. */
  description: string;
  language?: string;
  lyrics?: string;
  lyricsRightsConfirmed?: boolean;
  tags?: string[];
  aiDescriptionApproved?: boolean;
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
    language?: string;
    lyrics?: string;
    lyricsRightsConfirmed?: boolean;
    tags?: string[];
    aiGeneratedDescription?: string;
    aiDescriptionApproved?: boolean;
  } | null;
  /** Album names offered in the album picker. */
  albumOptions: string[];
  /** Whether the artist has opted in to AI Studio features. Defaults to true when unspecified. */
  aiStudioEnabled?: boolean;
  onEnableAiStudio?: () => void;
  /** Called with the validated values. The modal closes right after, so callers should apply the edit optimistically. */
  onSave: (values: EditableTrackFields) => void;
}

export default function EditTrackModal({
  open,
  onOpenChange,
  track,
  albumOptions,
  aiStudioEnabled = true,
  onEnableAiStudio,
  onSave,
}: EditTrackModalProps) {
  const { useDraftTrackDescription, useTranscribeTrackLyrics } = useTrackServices();
  const draftDescriptionMutation = useDraftTrackDescription(track?.id ?? 0);
  const transcribeLyricsMutation = useTranscribeTrackLyrics(track?.id ?? 0);

  const [aiOptedIn, setAiOptedIn] = useState(aiStudioEnabled);
  const [aiDraftText, setAiDraftText] = useState<string | null>(
    track?.aiGeneratedDescription ?? null
  );
  const [aiError, setAiError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);

  useEffect(() => {
    setAiOptedIn(aiStudioEnabled);
  }, [aiStudioEnabled]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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
      language: track?.language ?? "",
      lyrics: track?.lyrics ?? "",
      lyricsRightsConfirmed: track?.lyricsRightsConfirmed ?? Boolean(track?.lyrics?.trim()),
      tags: track?.tags ?? [],
      aiDescriptionApproved: track?.aiDescriptionApproved ?? false,
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
        language: current.language ?? "",
        lyrics: current.lyrics ?? "",
        lyricsRightsConfirmed: current.lyricsRightsConfirmed ?? Boolean(current.lyrics?.trim()),
        tags: current.tags ?? [],
        aiDescriptionApproved: current.aiDescriptionApproved ?? false,
      });
      setAiDraftText(current.aiGeneratedDescription ?? null);
      setAiError(null);
      setTagInput("");
      setTagError(null);
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
  const lyricsValue = watch("lyrics") ?? "";
  const selectedTags = watch("tags") ?? [];

  const handleAddTag = (raw: string) => {
    const normalized = normalizeSongTag(raw);
    if (!normalized) return;
    if (normalized.length > TAG_MAX_LENGTH) {
      setTagError(`Tag must be ${TAG_MAX_LENGTH} characters or less.`);
      return;
    }
    if (selectedTags.includes(normalized)) {
      setTagError(`Tag "${normalized}" is already added.`);
      return;
    }
    if (selectedTags.length >= TAG_MAX_COUNT) {
      setTagError(`Maximum limit of ${TAG_MAX_COUNT} tags reached.`);
      return;
    }
    setTagError(null);
    setValue("tags", [...selectedTags, normalized], { shouldDirty: true, shouldValidate: true });
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagError(null);
    setValue(
      "tags",
      selectedTags.filter((t) => t !== tagToRemove),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && selectedTags.length > 0) {
      e.preventDefault();
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const handleDraftDescription = async () => {
    setAiError(null);
    try {
      const res = await draftDescriptionMutation.mutateAsync({});
      const draft = res?.data?.description ?? res?.description ?? "";
      if (draft) {
        setAiDraftText(draft);
      }
    } catch (err) {
      setAiError(formatAiServiceError(err));
    }
  };

  const handleApproveAiDraft = () => {
    if (aiDraftText === null) return;
    setValue("description", aiDraftText.slice(0, DESCRIPTION_MAX), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("aiDescriptionApproved", true, { shouldDirty: true });
    setAiDraftText(null);
  };

  const handleDiscardAiDraft = () => {
    setAiDraftText(null);
    setValue("aiDescriptionApproved", false, { shouldDirty: true });
  };

  const handleTranscribeLyrics = async () => {
    setAiError(null);
    try {
      const res = await transcribeLyricsMutation.mutateAsync({
        language: watch("language") || undefined,
      });
      const draftLyrics = res?.data?.lyrics ?? res?.lyrics ?? "";
      if (draftLyrics) {
        setValue("lyrics", draftLyrics, { shouldDirty: true, shouldValidate: true });
        if (res?.data?.language && !watch("language")) {
          setValue("language", res.data.language, { shouldDirty: true });
        }
      }
    } catch (err) {
      setAiError(formatAiServiceError(err));
    }
  };

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

        {/* Tags Editor */}
        <div className="space-y-2">
          <label htmlFor="edit-track-tag-input" className="text-sm font-medium text-white">
            Tags (Max {TAG_MAX_COUNT})
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <TagIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="edit-track-tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                disabled={selectedTags.length >= TAG_MAX_COUNT}
                placeholder="Add tag and press Enter..."
                className="w-full bg-[#18181B] border border-gray-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={() => handleAddTag(tagInput)}
              disabled={!tagInput.trim() || selectedTags.length >= TAG_MAX_COUNT}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {tagError && (
            <p className="text-xs text-red-400" role="alert">
              {tagError}
            </p>
          )}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1" aria-label="Selected Tags">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-pink-300 rounded-full text-xs font-medium border border-pink-500/20"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="edit-track-description" className="text-sm font-medium text-white">
              Description
            </label>
            <div className="flex items-center gap-3">
              {aiOptedIn && (
                <button
                  type="button"
                  onClick={handleDraftDescription}
                  disabled={draftDescriptionMutation.isPending}
                  className="text-xs font-medium text-[#D2045B] hover:underline disabled:opacity-50"
                >
                  {draftDescriptionMutation.isPending
                    ? "Drafting..."
                    : "Draft description with AI"}
                </button>
              )}
              <CharacterCount
                id="edit-track-description-count"
                length={descriptionLength}
                max={DESCRIPTION_MAX}
              />
            </div>
          </div>

          {!aiOptedIn && (
            <div className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-xs text-gray-300">
              <span>Enable AI Studio to draft descriptions and transcribe lyrics.</span>
              <button
                type="button"
                onClick={() => {
                  setAiOptedIn(true);
                  onEnableAiStudio?.();
                }}
                className="font-semibold text-[#D2045B] hover:underline"
              >
                Enable AI Studio
              </button>
            </div>
          )}

          <textarea
            id="edit-track-description"
            rows={3}
            {...register("description")}
            maxLength={DESCRIPTION_MAX}
            aria-invalid={errors.description ? "true" : "false"}
            aria-describedby={
              errors.description
                ? "edit-track-description-count edit-track-description-error"
                : "edit-track-description-count"
            }
            placeholder="Tell listeners about this track"
            className={`w-full resize-none rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${errors.description ? "border-red-500" : "border-[#2A2A2A]"}`}
          />
          {errors.description && (
            <p id="edit-track-description-error" role="alert" className="text-xs text-red-500">
              {errors.description.message}
            </p>
          )}

          {aiDraftText !== null && (
            <div className="space-y-2 rounded-lg border border-[#885FA8]/50 bg-[#161616] p-3">
              <label htmlFor="edit-track-ai-draft" className="block text-xs font-medium text-white">
                AI draft
              </label>
              <textarea
                id="edit-track-ai-draft"
                rows={3}
                value={aiDraftText}
                maxLength={DESCRIPTION_MAX}
                onChange={(e) => setAiDraftText(e.target.value)}
                className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#885FA8] focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDiscardAiDraft}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-[#A3A3A3] hover:text-white"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleApproveAiDraft}
                  className="rounded-full bg-[#D2045B] px-4 py-1 text-xs font-semibold text-white hover:bg-[#B8043F]"
                >
                  Approve
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Language & Lyrics */}
        <div className="space-y-2">
          <label htmlFor="edit-track-language" className="text-sm font-medium text-white">
            Language
          </label>
          <select
            id="edit-track-language"
            {...register("language")}
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-4 py-3 text-white focus:border-[#885FA8] focus:outline-none"
          >
            <option value="">Not set</option>
            {SONG_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="edit-track-lyrics" className="text-sm font-medium text-white">
              Lyrics
            </label>
            <div className="flex items-center gap-3">
              {aiOptedIn && (
                <button
                  type="button"
                  onClick={handleTranscribeLyrics}
                  disabled={transcribeLyricsMutation.isPending}
                  className="text-xs font-medium text-[#D2045B] hover:underline disabled:opacity-50"
                >
                  {transcribeLyricsMutation.isPending ? "Transcribing..." : "Transcribe with AI"}
                </button>
              )}
              <span className="text-xs text-gray-400">
                {lyricsValue.length}/{LYRICS_MAX_LENGTH}
              </span>
            </div>
          </div>
          <textarea
            id="edit-track-lyrics"
            rows={4}
            maxLength={LYRICS_MAX_LENGTH}
            {...register("lyrics")}
            placeholder="Paste or type song lyrics"
            aria-invalid={errors.lyrics ? "true" : "false"}
            aria-describedby={errors.lyrics ? "edit-track-lyrics-error" : undefined}
            className={`w-full resize-none rounded-lg border bg-[#161616] px-4 py-3 text-white placeholder:text-[#6F6F6F] focus:border-[#885FA8] focus:outline-none ${errors.lyrics ? "border-red-500" : "border-[#2A2A2A]"}`}
          />
          {errors.lyrics && (
            <p id="edit-track-lyrics-error" role="alert" className="text-xs text-red-500">
              {errors.lyrics.message}
            </p>
          )}

          {Boolean(lyricsValue.trim()) && (
            <div className="space-y-1 pt-1">
              <label className="flex items-start gap-2 text-xs text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("lyricsRightsConfirmed")}
                  className="mt-0.5 rounded border-[#2A2A2A] bg-[#161616] text-[#D2045B] focus:ring-[#885FA8]"
                />
                <span>
                  I own or have licensed the rights to publish these lyrics{" "}
                  <span className="text-[#D2045B]">*</span>
                </span>
              </label>
              {errors.lyricsRightsConfirmed && (
                <p className="text-xs text-red-500" role="alert">
                  {errors.lyricsRightsConfirmed.message}
                </p>
              )}
            </div>
          )}
        </div>

        {aiError && (
          <p role="alert" className="text-xs text-red-500">
            {aiError}
          </p>
        )}

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
